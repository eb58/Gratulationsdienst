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
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.SOKO_STRASSENVERZEICHNIS = {
  'Teststraße': [{ plz: '13437', ortsteil: 'Tegel', soko: '01' }]
};

const stateModule = await import('../modules/state.js');
const {
  canAccessView,
  dataForPersistence,
  hasBackendData,
  isAdmin,
  mergeById,
  normalizeLoadedData,
  normalizeTemplate,
  normalizeTemplates,
  saveQuittungSettings,
  state,
  writableCollections
} = stateModule;

beforeEach(() => {
  state.auth.user = { role: 'admin' };
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
