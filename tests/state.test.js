import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html' };
globalThis.window = globalThis;
const domElement = () => ({
  textContent: '',
  className: '',
  innerHTML: '',
  hidden: false,
  style: { setProperty() {}, removeProperty() {} },
  classList: { add() {}, remove() {}, toggle() {} },
  querySelector: () => null,
  querySelectorAll: () => []
});
globalThis.document = {
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  querySelector: () => domElement(),
  querySelectorAll: () => []
};
globalThis.requestAnimationFrame = callback => callback();
globalThis.ResizeObserver = class {
  observe() { /* no-op im Test */ }
  disconnect() { /* no-op im Test */ }
};
globalThis.SOKO_STRASSENVERZEICHNIS = {
  'Teststraße': [{ plz: '13437', ortsteil: 'Tegel', soko: '01' }]
};

const stateModule = await import('../modules/state.js');
const {
  canAccessView,
  collectionVersionMap,
  dataForPersistence,
  hasBackendData,
  isConflictError,
  isAdmin,
  mergeById,
  normalizeLoadedData,
  normalizeTemplate,
  normalizeTemplates,
  loadData,
  loadCollectionData,
  saveData,
  saveQuittungSettings,
  setAuthSession,
  state,
  usesLocalDataStorage,
  writableCollections
} = stateModule;

beforeEach(() => {
  globalThis.location.protocol = 'file:';
  state.auth.user = { role: 'admin' };
  state.auth.token = '';
  state.auth.message = '';
  state.collectionVersions = {};
  state.collectionBaselines = {};
  state.localChangeVersion = 0;
  globalThis.localStorage.clear();
});

describe('collection merging', () => {
  it('merges defaults with existing entries and appends custom entries', () => {
    assert.deepEqual(mergeById(
      [{ id: 'A', value: 'existing' }, { id: 'C', value: 'custom' }],
      [{ id: 'A', value: 'default' }, { id: 'B', value: 'default' }]
    ), [
      { id: 'A', value: 'existing' },
      { id: 'B', value: 'default' },
      { id: 'C', value: 'custom' }
    ]);
  });

  it('filters existing entries with the keep predicate', () => {
    assert.deepEqual(mergeById(
      [{ id: 'A', active: false }, { id: 'C', active: true }],
      [{ id: 'A', active: true }],
      item => item.active
    ), [
      { id: 'A', active: true },
      { id: 'C', active: true }
    ]);
  });
});

describe('template normalization', () => {
  it('fills missing template fields from defaults', () => {
    const normalized = normalizeTemplate({ id: 'T-001', name: 'Custom', format: '' });
    assert.equal(normalized.name, 'Custom');
    assert.equal(normalized.format, 'Quadratkarte 210 mm');
    assert.equal(normalized.backgroundImage, '');
  });

  it('keeps default templates and appends custom templates', () => {
    const normalized = normalizeTemplates([{ id: 'custom', name: 'Eigene Vorlage' }]);
    assert.ok(normalized.some(template => template.id === 'T-001'));
    assert.ok(normalized.some(template => template.id === 'custom' && template.format === 'DIN A4 Brief'));
  });
});

describe('loaded data normalization', () => {
  it('filters stale SOKO entries and merges generated streets', () => {
    const normalized = normalizeLoadedData({
      sokoGroups: [{ id: 'SOKO 99' }],
      sokoMembers: [{ id: 'M-99', groupId: 'SOKO 99' }],
      streets: [],
      templates: []
    });

    assert.equal(normalized.sokoGroups.some(group => group.id === 'SOKO 99'), false);
    assert.equal(normalized.sokoMembers.some(member => member.groupId === 'SOKO 99'), false);
    assert.ok(normalized.streets.some(street => street.name === 'Teststraße'));
  });
  it('removes transient questionnaire images from loaded and persisted data', () => {
    const data = {
      citizens: [{ id: 'G-1', firstName: 'Ada', sokoQuestionnaireImages: [{ image: 'data:image/jpeg;base64,xxx' }] }],
      sokoGroups: [],
      sokoMembers: [],
      streets: [],
      templates: []
    };

    assert.equal(normalizeLoadedData(data).citizens[0].sokoQuestionnaireImages, undefined);
    assert.equal(dataForPersistence(data).citizens[0].sokoQuestionnaireImages, undefined);
    assert.equal(data.citizens[0].sokoQuestionnaireImages.length, 1);
  });
});

describe('backend and permission helpers', () => {
  it('detects backend data from persisted collections', () => {
    assert.equal(hasBackendData({ citizens: [] }), false);
    assert.equal(hasBackendData({ citizens: [{ id: 'C-1' }] }), true);
  });

  it('allows admin views only for admins and limits writable collections', () => {
    state.auth.user = { role: 'user' };
    assert.equal(isAdmin(), false);
    assert.equal(canAccessView('soko'), false);
    assert.equal(canAccessView('dashboard'), true);
    assert.equal(writableCollections().includes('sokoMembers'), false);

    state.auth.user = { role: 'admin' };
    assert.equal(isAdmin(), true);
    assert.equal(canAccessView('soko'), true);
    assert.equal(writableCollections().includes('sokoMembers'), true);
  });

  it('uses browser data storage only in file mode', async () => {
    assert.equal(usesLocalDataStorage(), true);
    state.data = { ...state.data, citizens: [{ id: 'G-local', firstName: 'Lokal' }] };
    saveData();
    assert.match(localStorage.getItem('gratulationsdienst'), /G-local/);

    globalThis.location.protocol = 'http:';
    globalThis.fetch = () => Promise.resolve({ ok: true, json: async () => [] });
    state.auth.token = 'token';
    localStorage.setItem('gratulationsdienst', JSON.stringify({ citizens: [{ id: 'G-old' }] }));
    await saveData();

    assert.equal(usesLocalDataStorage(), false);
    assert.equal(localStorage.getItem('gratulationsdienst'), null);
  });

  it('ignores stale browser data in backend mode', () => {
    localStorage.setItem('gratulationsdienst', JSON.stringify({ citizens: [{ id: 'G-old' }] }));
    globalThis.location.protocol = 'http:';

    assert.equal(loadData().citizens.some(citizen => citizen.id === 'G-old'), false);
  });

  it('sichert Web-Änderungen ohne Token als Pending-Kopie und meldet die abgelaufene Anmeldung', async () => {
    globalThis.location.protocol = 'http:';
    state.auth.token = '';
    state.auth.user = null;
    state.data = {
      citizens: [{ id: 'G-pending', firstName: 'Lokal' }],
      sokoGroups: [], sokoMembers: [], streets: [], senders: [], templates: []
    };
    const realWarn = console.warn;
    console.warn = () => {};
    try {
      await saveData();
    } finally {
      console.warn = realWarn;
    }

    assert.match(localStorage.getItem('gratulationsdienst.pending'), /G-pending/);
    assert.match(state.auth.message, /Anmeldung abgelaufen/);
  });

  it('übernimmt Pending-Daten nach erneutem Login in den State', () => {
    globalThis.location.protocol = 'http:';
    localStorage.setItem('gratulationsdienst.pending', JSON.stringify({ citizens: [{ id: 'G-pending', firstName: 'Gerettet' }] }));

    setAuthSession({ token: 'token', user: { role: 'admin' } });

    assert.equal(state.data.citizens.some(citizen => citizen.id === 'G-pending' && citizen.firstName === 'Gerettet'), true);
  });

  it('builds version maps for backend optimistic locking', () => {
    assert.deepEqual(collectionVersionMap([
      { id: 'G-1', _version: 3 },
      { id: 'G-2' },
      { id: 'G-3', _version: '7' }
    ]), { 'G-1': '3', 'G-3': '7' });
  });

  it('speichert eine geaenderte Collection in einem einzigen Bulk-Request', async () => {
    const calls = [];
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.collectionVersions = { citizens: { 'G-1': '3' } };
    state.collectionBaselines = { citizens: { 'G-1': { id: 'G-1', firstName: 'Grace' } } };
    state.data = {
      citizens: [{ id: 'G-1', firstName: 'Ada' }],
      sokoGroups: [],
      sokoMembers: [],
      streets: [],
      senders: [],
      templates: []
    };
    localStorage.setItem('gratulationsdienst.pending', JSON.stringify({ citizens: [{ id: 'G-1', firstName: 'Ada' }] }));
    globalThis.fetch = (/** @type {string} */ url, options = {}) => {
      const path = url.replace(/.*\/php-api/, '');
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ method: options.method || 'GET', path, body });
      return Promise.resolve({
        ok: true,
        json: async () => body.items.map(item => ({ ...item, _version: '4' }))
      });
    };

    await saveData();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'PUT');
    assert.equal(calls[0].path, '/citizens');
    assert.deepEqual(calls[0].body.knownVersions, { 'G-1': '3' });
    assert.equal(calls[0].body.items[0].firstName, 'Ada');
    assert.equal(state.data.citizens[0]._version, '4');
    assert.deepEqual(state.collectionVersions.citizens, { 'G-1': '4' });
    assert.deepEqual(state.collectionBaselines.citizens['G-1'], { id: 'G-1', firstName: 'Ada' });
    assert.equal(localStorage.getItem('gratulationsdienst.pending'), null);
  });

  it('speichert viele neue Jubilare (z.B. aus Testdaten-Erzeugung) in einem Request statt vieler Einzelaufrufe', async () => {
    const calls = [];
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.collectionVersions = {};
    state.collectionBaselines = { citizens: {} };
    state.data = {
      citizens: Array.from({ length: 500 }, (_, i) => ({ id: `G-${i}`, firstName: `Person ${i}` })),
      sokoGroups: [],
      sokoMembers: [],
      streets: [],
      senders: [],
      templates: []
    };
    globalThis.fetch = (/** @type {string} */ url, options = {}) => {
      const path = url.replace(/.*\/php-api/, '');
      const body = options.body ? JSON.parse(options.body) : null;
      calls.push({ method: options.method || 'GET', path });
      return Promise.resolve({ ok: true, json: async () => body.items.map(item => ({ ...item, _version: '1' })) });
    };

    await saveData();

    assert.equal(calls.filter(call => call.path === '/citizens').length, 1);
    assert.equal(state.data.citizens.length, 500);
    assert.ok(state.collectionBaselines.citizens['G-499']);
  });

  it('verliert keine neuen Jubilare, wenn ein zweiter Speichervorgang startet, waehrend der erste noch laeuft', async () => {
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.collectionVersions = { citizens: { 'A': '1', 'B': '1' } };
    state.collectionBaselines = { citizens: { A: { id: 'A' }, B: { id: 'B' } } };
    state.data = {
      citizens: [{ id: 'A' }, { id: 'B' }],
      sokoGroups: [], sokoMembers: [], streets: [], senders: [], templates: []
    };

    let resolveFirstPut;
    const firstPutPromise = new Promise(resolve => { resolveFirstPut = resolve; });
    const calls = [];
    globalThis.fetch = (/** @type {string} */ url, options = {}) => {
      const path = url.replace(/.*\/php-api/, '');
      const body = options.body ? JSON.parse(options.body) : null;
      if (options.method === 'PUT' && path === '/citizens') {
        const callIndex = calls.push({ body }) - 1;
        return callIndex === 0
          ? firstPutPromise
          : Promise.resolve({ ok: true, json: async () => body.items.map(item => ({ ...item, _version: '1' })) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    };

    // Aktion 1: alle Jubilare loeschen; der PUT-Request startet und haengt (firstPutPromise)
    state.data.citizens = [];
    const firstSave = saveData();
    await new Promise(resolve => setTimeout(resolve, 0)); // sicherstellen, dass der erste PUT bereits mit leerem state.data losgeschickt wurde

    // Aktion 2: 500 neue Jubilare erzeugen, bevor der erste Speichervorgang beim Server angekommen ist
    state.data.citizens = Array.from({ length: 500 }, (_, i) => ({ id: `G-${i}` }));
    const secondSave = saveData();

    resolveFirstPut({ ok: true, json: async () => [] });
    await Promise.all([firstSave, secondSave]);

    const citizensPutBodies = calls.map(call => call.body.items.length);
    assert.ok(citizensPutBodies.includes(500), `erwartete einen PUT mit 500 Jubilaren, gesendet wurden: ${citizensPutBodies.join(', ')}`);
    assert.equal(Object.keys(state.collectionBaselines.citizens).length, 500);
  });

  it('reloads backend data after a save conflict', async () => {
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.collectionVersions = { citizens: { 'G-1': '1' } };
    state.collectionBaselines = { citizens: { 'G-1': { id: 'G-1', firstName: 'Alt' } } };
    state.data = {
      citizens: [{ id: 'G-1', firstName: 'Lokal', _version: '1' }],
      sokoGroups: [],
      sokoMembers: [],
      streets: [],
      senders: [],
      templates: []
    };
    globalThis.fetch = (/** @type {string} */ url, options = {}) => {
      const method = options.method || 'GET';
      const path = url.replace(/.*\/php-api/, '');
      if (method === 'PUT' && path === '/citizens') {
        return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'parallel', collection: 'citizens', id: 'G-1' }) });
      }
      if (method === 'GET' && path === '/citizens') {
        return Promise.resolve({ ok: true, json: async () => [{ id: 'G-1', firstName: 'Remote', _version: '2' }] });
      }
      if (method === 'GET' && path === '/settings/receipt') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    };

    const realWarn = console.warn;
    console.warn = () => {};
    try {
      await saveData();
    } finally {
      console.warn = realWarn;
    }

    assert.equal(isConflictError({ status: 409 }), true);
    assert.equal(state.data.citizens[0].firstName, 'Remote');
    assert.deepEqual(state.collectionVersions.citizens, { 'G-1': '2' });
  });

  it('sichert lokale Änderungen, wenn der Backend-Save mit 401 abläuft', async () => {
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.collectionVersions = { citizens: { 'G-1': '1' } };
    state.collectionBaselines = { citizens: { 'G-1': { id: 'G-1', firstName: 'Alt' } } };
    state.data = {
      citizens: [{ id: 'G-1', firstName: 'Neu', _version: '1' }],
      sokoGroups: [], sokoMembers: [], streets: [], senders: [], templates: []
    };
    globalThis.fetch = () => Promise.resolve({ ok: false, status: 401, json: async () => ({ error: 'abgelaufen' }) });
    const realWarn = console.warn;
    console.warn = () => {};
    try {
      await saveData();
    } finally {
      console.warn = realWarn;
    }

    assert.equal(state.auth.token, '');
    assert.match(state.auth.message, /Anmeldung abgelaufen/);
    assert.match(localStorage.getItem('gratulationsdienst.pending'), /Neu/);
  });

  it('does not let a stale backend load overwrite local imports', async () => {
    globalThis.location.protocol = 'http:';
    state.auth.token = 'token';
    state.auth.user = { role: 'admin' };
    state.data = {
      citizens: [],
      sokoGroups: [],
      sokoMembers: [],
      streets: [],
      senders: [],
      templates: []
    };
    let resolveCitizens;
    const citizensPromise = new Promise(resolve => { resolveCitizens = resolve; });
    globalThis.fetch = (/** @type {string} */ url, options = {}) => {
      const method = options.method || 'GET';
      const path = url.replace(/.*\/php-api/, '');
      if (method === 'GET' && path === '/citizens') return citizensPromise;
      if (method === 'GET' && path === '/settings/receipt') return Promise.resolve({ ok: true, json: async () => ({}) });
      if (method === 'POST' && path === '/citizens') {
        const body = JSON.parse(options.body);
        return Promise.resolve({ ok: true, json: async () => ({ ...body, _version: '2' }) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    };

    const loadPromise = loadCollectionData();
    state.data.citizens = [{ id: 'G-2026-001', firstName: 'Importiert' }];
    await saveData();
    resolveCitizens({ ok: true, json: async () => [] });
    await loadPromise;

    assert.equal(state.data.citizens.length, 1);
    assert.equal(state.data.citizens[0].firstName, 'Importiert');
  });
});

describe('receipt settings', () => {
  it('normalizes and stores receipt settings in file mode', async () => {
    const saved = await saveQuittungSettings({ quittungBetrag: '9,50' });
    assert.deepEqual(saved, {
      quittungBetrag: '9,50',
      quittungTelefon: '90294 4055',
      quittungKapitel: '3930',
      quittungTitel: '68154'
    });
    assert.equal(state.quittungBetrag, '9,50');
  });
});
