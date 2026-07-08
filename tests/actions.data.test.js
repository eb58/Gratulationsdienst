// Unit-Tests der Daten-, CRUD-, Dialog- und Import-Actions aus actions.js.
// Gleiche Strategie wie actions.auth.test.js: render.js per Module-Mock zum No-Op,
// state echt (mit defaultData), apiRequest über gestubbtes fetch (Pfad-Router für User-CRUD).
// Nicht abgedeckt (DOM-/Print-/Datei-Seiteneffekte ohne nennenswerte Logik): print-*, soko-print,
// insert-token, upload-template-background.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

// Stubs für $(selector): Formulare (FormData + querySelectorAll) und Einzelfelder (#doc-* etc.).
const nodes = {};
const setForm = (selector, entries, extra = {}) => {
  nodes[selector] = {
    _entries: Object.entries(entries),
    querySelectorAll: sel => sel === "input[type='email']" ? (extra.emailInputs || [])
      : sel === '[data-postal-code-field]' ? (extra.postalInputs || [])
      : sel === '[data-rule-row]' ? (extra.ruleRows || []) : []
  };
};
const setField = (selector, value) => { nodes[selector] = { value }; };
const fieldInput = (value, dataset = {}) => ({ value, dataset, classList: { add() {}, remove() {}, toggle() {} } });
const ruleRow = data => ({ querySelector: name => { const m = name.match(/\[name="(.+?)"\]/); return m ? { value: String(data[m[1]] ?? '') } : null; } });

let lastBlobParts = null;
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => callback();
globalThis.FormData = class { constructor(form) { this._entries = form?._entries || []; } entries() { return this._entries; } };
globalThis.Blob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
URL.createObjectURL = blob => { lastBlobParts = blob.parts; return 'blob:x'; }; // echten URL-Konstruktor erhalten
URL.revokeObjectURL = () => {};
globalThis.document = {
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  addEventListener() {},
  removeEventListener() {},
  querySelector: selector => nodes[selector] || null, // unbekannt (#toast, #bank) -> null
  querySelectorAll: () => [],
  createElement: () => ({ click() {}, setAttribute() {}, style: {}, set href(v) {}, set download(v) {} })
};

// fetch-Router: Antworten je "METHOD /pfad" registrierbar; protokolliert die Aufrufe.
const routes = new Map();
let calls = [];
const route = (key, payload, { ok = true, status = 200 } = {}) => routes.set(key, { ok, status, payload });
globalThis.fetch = (url, options = {}) => {
  const method = options.method || 'GET';
  const path = url.replace(/.*\/php-api/, '');
  const body = options.body ? JSON.parse(options.body) : null;
  const request = { method, path, body, headers: options.headers || null };
  calls.push(request);
  const routeResponse = routes.get(`${method} ${path}`);
  const res = routeResponse
    ? { ...routeResponse, json: async () => typeof routeResponse.payload === 'function' ? routeResponse.payload(request) : routeResponse.payload }
    : { ok: true, status: 200, json: async () => ({}) };
  return Promise.resolve(res);
};

// Echtes SOKO-Strassenverzeichnis laden (Script, kein ES-Modul) -> setzt window.SOKO_STRASSENVERZEICHNIS,
// das buildStreetData() (in defaultData) beim Import von domain.js auswertet.
(0, eval)(readFileSync(new URL('../public/data/soko-strassenverzeichnis.js', import.meta.url), 'utf8'));

mock.module('../modules/render.js', {
  namedExports: { render: () => {}, renderDialog: () => {}, applyPendingFocus: () => {} }
});

const { actions } = await import('../modules/actions.js');
const { state } = await import('../modules/state.js');
const { defaultData } = await import('../modules/domain.js');
const { monthAfterNext } = await import('../modules/testdata.js');
const { normalizeAmount, nextId } = await import('../modules/utils.js');
const { filteredCitizens } = await import('../modules/assignment.js');

const idEvent = id => ({ target: { closest: () => ({ dataset: { id } }) } });
beforeEach(() => {
  for (const key of Object.keys(nodes)) delete nodes[key];
  routes.clear();
  calls = [];
  lastBlobParts = null;
  localStorage.clear();
  state.data = structuredClone(defaultData);
  state.dialog = null;
  state.focusTarget = '';
  state.selectedCitizenId = '';
  state.selectedMemberId = state.data.sokoMembers[0]?.id || '';
  state.selectedStreetId = state.data.streets[0].id;
  state.selectedSenderId = state.data.senders[0].id;
  state.selectedTemplateId = state.data.templates[0].id;
  state.selectedUserId = '';
  state.importText = '';
  state.importMissingCitizens = [];
  state.generatedDocs = [];
  state.printBackground = true;
  state.showMapPeople = true;
  state.collectionVersions = { citizens: {}, weddingAnniversaries: {}, sokoGroups: {}, sokoMembers: {}, streets: {}, senders: {}, templates: {} };
  state.collectionBaselines = { citizens: {}, weddingAnniversaries: {}, sokoGroups: {}, sokoMembers: {}, streets: {}, senders: {}, templates: {} };
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.gridApis = {};
  state.auth.user = { id: 'demo', email: 'demo@local', role: 'admin' };
  state.auth.token = '';
  state.auth.users = [];
});

afterEach(() => {
  mock.timers.reset();
});

describe('Auswahl- und Sortier-Actions', () => {
  it('setzen die jeweilige Auswahl-Id aus dem Event', () => {
    actions['select-citizen'](idEvent('G-1'));
    assert.equal(state.selectedCitizenId, 'G-1');
    actions['select-member'](idEvent('SM-9'));
    assert.equal(state.selectedMemberId, 'SM-9');
    actions['select-street'](idEvent('STR-0007'));
    assert.equal(state.selectedStreetId, 'STR-0007');
    actions['select-template'](idEvent('T-003'));
    assert.equal(state.selectedTemplateId, 'T-003');
  });

  it('sort-dashboard schaltet Richtung bei gleichem Schlüssel um', () => {
    state.dashboardSort = { key: 'group', dir: 'asc' };
    actions['sort-dashboard']({ target: { closest: () => ({ dataset: { sortKey: 'group' } }) } });
    assert.deepEqual(state.dashboardSort, { key: 'group', dir: 'desc' });
    actions['sort-dashboard']({ target: { closest: () => ({ dataset: { sortKey: 'name' } }) } });
    assert.deepEqual(state.dashboardSort, { key: 'name', dir: 'desc' });
  });

  it('toggle-print-background übernimmt den Checkbox-Zustand', () => {
    actions['toggle-print-background']({ target: { checked: false } });
    assert.equal(state.printBackground, false);
  });
  it('toggle-map-people blendet personenbezogene Kartendaten aus', () => {
    actions['toggle-map-people']({ target: { checked: false } });

    assert.equal(state.showMapPeople, false);
  });
});

describe('SOKO-Mitglieder', () => {
  it('new-member hängt ein Mitglied an und wählt es aus', async () => {
    const before = state.data.sokoMembers.length;
    await actions['new-member']();
    assert.equal(state.data.sokoMembers.length, before + 1);
    assert.equal(state.selectedMemberId, state.data.sokoMembers.at(-1).id);
  });

  it('save-member normalisiert Felder und setzt den Gruppenleiter', async () => {
    const member = state.data.sokoMembers[0];
    setForm('#member-form', {
      _memberTab: 'billing', id: member.id, salutation: member.salutation, firstName: 'Eva', lastName: 'Muster', groupId: member.groupId,
      termFrom: member.termFrom, termTo: member.termTo,
      email: ' EVA@example.de ', postalCode: '134 37', bank: 'DE89 3704 0044 0532 0130 00',
      allowance: '35', billingAmount: '15', isLeader: 'true'
    });
    await actions['save-member']();
    const saved = state.data.sokoMembers.find(m => m.id === member.id);
    assert.equal(saved.email, 'EVA@example.de'); // normalizeEmail trimmt nur
    assert.equal(saved.postalCode, '13437');
    assert.equal(saved.bank, 'DE89 3704 0044 0532 0130 00');
    assert.equal(saved.isLeader, true);
    assert.equal(saved._memberTab, undefined);
    assert.equal(state.data.sokoGroups.find(g => g.id === member.groupId).leaderId, member.id);
  });

  it('save-member bricht bei ungültiger IBAN ab, ohne zu speichern', async () => {
    const member = state.data.sokoMembers[0];
    setForm('#member-form', {
      id: member.id, salutation: member.salutation, firstName: 'X', lastName: member.lastName,
      groupId: member.groupId, termFrom: member.termFrom, termTo: member.termTo,
      bank: 'DE00 0000', postalCode: '13437', email: ''
    });
    await actions['save-member']();
    assert.notEqual(state.data.sokoMembers.find(m => m.id === member.id).firstName, 'X');
  });

  it('save-member verlangt die Kern-Pflichtfelder', async () => {
    const member = state.data.sokoMembers[0];
    setForm('#member-form', { id: member.id, salutation: '', firstName: '', lastName: '', groupId: '', termFrom: '', termTo: '', bank: '', postalCode: '', email: '' });
    await actions['save-member']();
    assert.equal(state.data.sokoMembers.find(m => m.id === member.id).firstName, member.firstName);
  });

  it('delete-member öffnet Dialog, confirm-delete-member entfernt das Mitglied', async () => {
    const member = state.data.sokoMembers[0];
    actions['delete-member']();
    assert.equal(state.dialog.type, 'delete-member');
    assert.equal(state.dialog.memberId, member.id);
    await actions['confirm-delete-member']();
    assert.equal(state.data.sokoMembers.some(m => m.id === member.id), false);
    assert.equal(state.dialog, null);
  });

  it('export-soko erzeugt eine CSV mit Kopfzeile und Mitglied', () => {
    actions['export-soko']();
    const csv = lastBlobParts[0];
    assert.equal(csv.codePointAt(0), 0xFEFF); // BOM, damit Excel UTF-8 korrekt liest
    assert.match(csv, /"id";"anrede";"vorname"/); // csvEscape quotet jeden Wert
    assert.match(csv, new RegExp(state.data.sokoMembers[0].id));
  });

  it('reset-soko-members → confirm setzt auf die Standard-Testdaten zurück', () => {
    state.data.sokoMembers = [];
    actions['reset-soko-members']();
    assert.equal(state.dialog.type, 'reset-soko-members');
    actions['confirm-reset-soko-members']();
    assert.equal(state.data.sokoMembers.length, defaultData.sokoMembers.length);
  });
});

describe('Absender und Vorlagen', () => {
  it('save-sender speichert das Profil', async () => {
    const sender = state.data.senders[0];
    setForm('#sender-form', { id: sender.id, role: 'Neue Rolle' }, { emailInputs: [] });
    await actions['save-sender']();
    assert.equal(state.data.senders.find(s => s.id === sender.id).role, 'Neue Rolle');
  });

  it('new-template legt eine Vorlage an und wählt sie aus', async () => {
    const before = state.data.templates.length;
    await actions['new-template']();
    assert.equal(state.data.templates.length, before + 1);
    assert.equal(state.selectedTemplateId, state.data.templates.at(-1).id);
  });

  it('save-template aktualisiert updatedAt der ausgewählten Vorlage', async () => {
    setField('#template-form', undefined); // -> templateFormValues nutzt selectedTemplate()
    delete nodes['#template-form'];
    await actions['save-template']();
    assert.equal(state.data.templates[0].updatedAt.length, 10);
  });

  it('delete-template → confirm entfernt die Vorlage (nicht die letzte)', async () => {
    const target = state.data.templates[1];
    actions['delete-template'](idEvent(target.id));
    assert.equal(state.dialog.type, 'delete-template');
    await actions['confirm-delete-template']();
    assert.equal(state.data.templates.some(t => t.id === target.id), false);
  });

  it('delete-template verweigert das Löschen der letzten Vorlage', () => {
    state.data.templates = [state.data.templates[0]];
    actions['delete-template'](idEvent(state.data.templates[0].id));
    assert.equal(state.dialog, null);
  });

  it('remove-template-background → confirm leert das Hintergrundbild', async () => {
    state.data.templates[0].backgroundImage = 'data:image/png;base64,xxx';
    actions['remove-template-background']({ target: { dataset: { backgroundField: 'backgroundImage' }, closest: () => null } });
    assert.equal(state.dialog.type, 'remove-template-background');
    await actions['confirm-remove-template-background']();
    assert.equal(state.data.templates[0].backgroundImage, '');
  });
});

describe('Straßen-Zuständigkeit', () => {
  const streetForm = (street, rules) => setForm('#street-form',
    { id: street.id, name: street.name },
    { ruleRows: rules.map(ruleRow), postalInputs: [] });

  it('save-street speichert Regeln aus dem Formular', async () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', ortsteil: 'Reinickendorf', von: '1', bis: '40', art: 'F', soko: '1' }]);
    await actions['save-street']();
    assert.equal(state.data.streets.find(s => s.id === street.id).rules.length, 1);
  });

  it('save-street bricht ohne Regel ab', async () => {
    const street = state.data.streets[0];
    streetForm(street, []);
    const before = JSON.stringify(state.data.streets.find(s => s.id === street.id));
    await actions['save-street']();
    assert.equal(JSON.stringify(state.data.streets.find(s => s.id === street.id)), before);
  });

  it('add-street-rule fügt einen weiteren Abschnitt hinzu', async () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', soko: '1', art: 'F' }]);
    await actions['add-street-rule']();
    assert.equal(state.data.streets.find(s => s.id === street.id).rules.length, 2);
  });

  it('delete-street-rule verhindert das Löschen des letzten Abschnitts', async () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', soko: '1', art: 'F' }]);
    await actions['delete-street-rule']({ target: { closest: () => ({ dataset: { ruleId: 'r1' } }) } });
    // letzte Regel bleibt erhalten -> keine leere Regelliste gespeichert
    assert.ok(state.data.streets.find(s => s.id === street.id).rules.length >= 1);
  });
});

describe('Jubilare löschen und Testdaten', () => {
  it('reset-test-database wird für Nicht-Admins blockiert', () => {
    state.auth.user = { id: 'u', role: 'user' };
    actions['reset-test-database']();
    assert.equal(state.dialog, null);
  });

  it('seed-citizens erzeugt Jubilare aus den SOKO-Zuordnungen', async () => {
    assert.equal(state.data.citizens.length, 0);
    await actions['seed-citizens']();
    assert.ok(state.data.citizens.length >= 30);
    assert.deepEqual([...new Set(state.data.citizens.map(citizen => citizen.birthDate.slice(5, 7)))], [monthAfterNext()]);
  });

  it('seed-citizens lässt die aktuelle Monatsauswahl unverändert', async () => {
    state.filters = { ...state.filters, month: '05' };
    await actions['seed-citizens']();
    assert.equal(state.filters.month, '05');
  });

  it('seed-citizens simuliert bei Bestand einen ersetzenden Folge-LABO-Lauf', async () => {
    await actions['seed-citizens']();
    const initialCount = state.data.citizens.length;

    await actions['seed-citizens']();

    assert.equal(state.importText.trim().split('\n').length, initialCount + 1);
    assert.equal(state.data.citizens.length, initialCount, 'der Monatsbestand wird ersetzt statt erweitert');
    assert.equal(state.importMissingCitizens.length, 0);
  });

  it('download-labo-seed lädt die simulierten LABO-Daten als CSV herunter', async () => {
    const beforeCitizens = structuredClone(state.data.citizens);
    const beforeImportText = state.importText;

    await actions['download-labo-seed']();

    const csv = lastBlobParts[0];
    assert.equal(csv.codePointAt(0), 0xFEFF);
    assert.match(csv, /"Anrede";"Vorname";"Nachname";"Strasse";"Hausnummer";"PLZ";"Ortsteil";"Geburtsdatum";"Telefon";"Email"/);
    assert.deepEqual(state.data.citizens, beforeCitizens);
    assert.equal(state.importText, beforeImportText);
  });

  it('reset-test-database loescht Bestand, laesst Monatsauswahl unveraendert und erzeugt 500 Jahresdaten mit realistischen Fragebogenwerten', async () => {
    state.data.citizens = [{ id: 'G-old' }];
    state.data.weddingAnniversaries = [{ id: 'WA-G-old', citizenId: 'G-old' }];
    state.filters = { ...state.filters, month: '05' };

    actions['reset-test-database']();
    assert.equal(state.dialog.type, 'reset-test-database');
    assert.equal(state.data.citizens.length, 1, 'noch nicht geloescht vor Bestaetigung');

    await actions['confirm-reset-test-database']();

    assert.equal(state.dialog, null);
    assert.equal(state.filters.month, '05');

    const allCitizens = state.data.citizens;
    const idNum = citizen => Number(citizen.id.split('-').pop());
    // Die Jahressimulation vergibt zuerst IDs 001..500. Der anschließende implizite
    // LABO-Lauf ersetzt den Zielmonat vollständig durch offene Importfälle; die
    // Rückmeldungen der übrigen Monate bleiben als gedrucktes Archiv erhalten.
    const archived = allCitizens.filter(citizen => citizen.status === 'gedruckt');
    const untouched = archived;
    const openCitizens = allCitizens.filter(citizen => idNum(citizen) > 500);
    const monthCounts = Object.values(archived.reduce((map, citizen) => ({ ...map, [citizen.birthDate.slice(5, 7)]: (map[citizen.birthDate.slice(5, 7)] || 0) + 1 }), {}));
    const weddingCounts = untouched.reduce((map, citizen) => ({ ...map, [citizen.weddingAnniversary || '-']: (map[citizen.weddingAnniversary || '-'] || 0) + 1 }), {});
    const wishCounts = untouched.reduce((map, citizen) => ({ ...map, [citizen.wish]: (map[citizen.wish] || 0) + 1 }), {});
    const reference = untouched[0];

    assert.equal(allCitizens.length, 500);
    assert.equal(archived.length, 458);
    assert.equal(monthCounts.length, 11);
    assert.ok(Math.max(...monthCounts) - Math.min(...monthCounts) <= 1);
    assert.ok(untouched.every(citizen => citizen.printedAt && citizen.printedYear && Number.isFinite(citizen.printedAge)));
    assert.equal(reference.printedYear, Number(reference.printedAt.slice(0, 4)));
    assert.ok(untouched.every(citizen => citizen.wish && citizen.wish !== 'offen'));
    assert.deepEqual(wishCounts, { keine: 64, 'Besuch erwünscht': 133, 'per Post': 261 });
    assert.equal(untouched.filter(citizen => citizen.pressPublication).length, 164);
    assert.deepEqual({
      gold: weddingCounts['Goldene Hochzeit'],
      diamant: weddingCounts['Diamantene Hochzeit'],
      eisen: weddingCounts['Eiserne Hochzeit'],
      gnade: weddingCounts['Gnadenhochzeit']
    }, { gold: 20, diamant: 14, eisen: 4, gnade: 2 });
    assert.ok(untouched.filter(citizen => citizen.weddingAnniversary).every(citizen => citizen.weddingDate && citizen.spouseName));

    assert.ok(openCitizens.length > 0, 'zusätzlich zur Jahressimulation wird ein impliziter LABO-Lauf für den Zielmonat erzeugt');
    assert.ok(openCitizens.every(citizen => citizen.birthDate.slice(5, 7) === monthAfterNext()));
    assert.ok(openCitizens.every(citizen => citizen.status === 'importiert' || citizen.status === 'offen'));

    assert.equal(archived.some(citizen => citizen.birthDate.slice(5, 7) === monthAfterNext()), false);
    assert.equal(state.importMissingCitizens.length, 0);
  });
});

describe('Import-Lauf', () => {
  it('run-import meldet fehlende CSV', () => {
    actions['run-import']();
    assert.equal(state.data.citizens.length, 0);
  });

  it('run-import verarbeitet vorhandenen Importtext und stellt den Geburtsmonat der CSV als Filter ein', async () => {
    state.filters = { q: 'unsichtbar', month: '01', groupId: 'SOKO 99', age: '100', status: 'geprüft', occasion: 'Geburtstag' };
    localStorage.setItem('gd_month_filter', '01');
    state.importText = 'Vorname;Nachname;Strasse;Hausnummer;PLZ;Geburtsdatum\nMax;Muster;Hauptstr;1;13407;5.4.1936';
    await actions['run-import']();
    assert.ok(state.data.citizens.length > 0);
    assert.deepEqual(
      { q: state.filters.q, month: state.filters.month, groupId: state.filters.groupId, age: state.filters.age, status: state.filters.status },
      { q: '', month: '04', groupId: 'alle', age: 'alle', status: 'alle' }
    );
    assert.equal(localStorage.getItem('gd_month_filter'), '04');
    assert.equal(filteredCitizens().length, state.data.citizens.length);
    assert.equal(state.selectedCitizenId, state.data.citizens[0].id);
  });

  it('run-import bricht bei gemischten Geburtsmonaten in der CSV ab', async () => {
    state.filters = { ...state.filters, month: '01' };
    localStorage.setItem('gd_month_filter', '01');
    state.importText = 'Vorname;Nachname;Strasse;Hausnummer;PLZ;Geburtsdatum\nMax;Muster;Hauptstr;1;13407;5.4.1936\nEva;Fehlt;Hauptstr;2;13407;6.6.1940';
    await actions['run-import']();

    assert.equal(state.data.citizens.length, 0);
    assert.equal(state.filters.month, '01');
    assert.equal(localStorage.getItem('gd_month_filter'), '01');
    assert.equal(calls.length, 0);
  });

  it('run-import löscht Monats-Citizens und Fragebogen-Scans vor dem Laden der CSV-Citizens', async () => {
    state.auth.token = 'token';
    state.auth.user = { id: 'u-1', role: 'user' };
    state.data.citizens = [
      { id: 'G-1', salutation: 'Frau', firstName: 'Erika', lastName: 'Muster', street: 'Hauptstr', houseNo: '1', postalCode: '13407', district: 'Tegel', birthDate: '1936-04-05', source: 'CSV Import', status: 'geladen' },
      { id: 'G-2', salutation: 'Frau', firstName: 'Eva', lastName: 'Fehlt', street: 'Hauptstr', houseNo: '2', postalCode: '13407', district: 'Tegel', birthDate: '1936-04-06', source: 'CSV Import', status: 'geladen' },
      { id: 'G-3', salutation: 'Frau', firstName: 'Juli', lastName: 'Bleibt', street: 'Hauptstr', houseNo: '3', postalCode: '13407', district: 'Tegel', birthDate: '1936-07-06', source: 'CSV Import', status: 'geladen' }
    ];
    state.data.weddingAnniversaries = [];
    state.data.streets = defaultData.streets;
    state.collectionVersions.citizens = { 'G-1': '1', 'G-2': '1', 'G-3': '1' };
    state.collectionBaselines.citizens = {
      'G-1': { ...state.data.citizens[0], firstName: 'Alt' },
      'G-2': { ...state.data.citizens[1] },
      'G-3': { ...state.data.citizens[2] }
    };
    state.importText = 'Anrede;Vorname;Nachname;Strasse;Hausnummer;PLZ;Ortsteil;Geburtsdatum\nFrau;Erika;Muster;Hauptstr;1;13407;Tegel;5.4.1936';
    route('PUT /citizens', request => request.body.items.map((item, index) => ({ ...item, _version: `2-${index}` })));
    route('DELETE /questionnaire-pages', { ok: true });

    await actions['run-import']();

    const citizenPutIndexes = calls.map((call, index) => ({ call, index })).filter(entry => entry.call.method === 'PUT' && entry.call.path === '/citizens');
    const cleanupDeleteIndex = calls.findIndex(call => call.method === 'DELETE' && call.path === '/questionnaire-pages');
    assert.equal(citizenPutIndexes.length, 2);
    assert.ok(cleanupDeleteIndex > citizenPutIndexes[0].index);
    assert.ok(cleanupDeleteIndex < citizenPutIndexes[1].index);
    assert.deepEqual(citizenPutIndexes[0].call.body.items.map(citizen => citizen.id), ['G-3']);
    assert.deepEqual(calls[cleanupDeleteIndex].body.citizenIds.sort(), ['G-1', 'G-2']);
    assert.deepEqual(citizenPutIndexes[1].call.body.items.map(citizen => citizen.lastName), ['Bleibt', 'Muster']);
    state.auth.token = '';
  });

  it('run-import räumt Fragebogen-Scans nicht auf, wenn der Citizen-Save scheitert', async () => {
    state.auth.token = 'token';
    state.auth.user = { id: 'u-1', role: 'user' };
    state.data.citizens = [
      { id: 'G-1', salutation: 'Frau', firstName: 'Erika', lastName: 'Muster', street: 'Hauptstr', houseNo: '1', postalCode: '13407', district: 'Tegel', birthDate: '1936-04-05', source: 'CSV Import', status: 'geladen' },
      { id: 'G-2', salutation: 'Frau', firstName: 'Eva', lastName: 'Fehlt', street: 'Hauptstr', houseNo: '2', postalCode: '13407', district: 'Tegel', birthDate: '1936-04-06', source: 'CSV Import', status: 'geladen' }
    ];
    state.data.weddingAnniversaries = [];
    state.data.streets = defaultData.streets;
    state.collectionVersions.citizens = { 'G-1': '1', 'G-2': '1' };
    state.collectionBaselines.citizens = {
      'G-1': { ...state.data.citizens[0], firstName: 'Alt' },
      'G-2': { ...state.data.citizens[1] }
    };
    state.importText = 'Anrede;Vorname;Nachname;Strasse;Hausnummer;PLZ;Ortsteil;Geburtsdatum\nFrau;Erika;Muster;Hauptstr;1;13407;Tegel;5.4.1936';
    route('PUT /citizens', { error: 'conflict' }, { ok: false, status: 409 });
    route('DELETE /questionnaire-pages', { ok: true });

    await actions['run-import']();

    assert.ok(calls.some(call => call.method === 'PUT' && call.path === '/citizens'));
    assert.equal(calls.some(call => call.method === 'DELETE' && call.path === '/questionnaire-pages'), false);
    state.auth.token = '';
  });

  it('run-import ersetzt bisherige Jubilare des Importmonats', async () => {
    state.data.citizens = [
      { id: 'G-2026-001', source: 'CSV Import', firstName: 'Max', lastName: 'Muster', birthDate: '1936-04-05', street: 'Hauptstr', houseNo: '1', postalCode: '13407' },
      { id: 'G-2026-002', source: 'CSV Import', firstName: 'Eva', lastName: 'Fehlt', birthDate: '1936-04-06', street: 'Hauptstr', houseNo: '2', postalCode: '13407' }
    ];
    state.importText = 'Vorname;Nachname;Strasse;Hausnummer;PLZ;Geburtsdatum\nMax;Muster;Hauptstr;1;13407;5.4.1936';

    await actions['run-import']();

    assert.deepEqual(state.data.citizens.map(citizen => citizen.lastName), ['Muster']);
    assert.equal(state.importMissingCitizens.length, 0);
  });

  it('run-import bereinigt Hochzeitsjubilaeen des Importmonats nach importierten Personen', async () => {
    state.data.citizens = [
      { id: 'G-2026-010', source: 'CSV Import', firstName: 'Max', lastName: 'Muster', birthDate: '1936-04-05', street: 'Altstr', houseNo: '1', postalCode: '13407' },
      { id: 'G-2026-011', source: 'CSV Import', firstName: 'Eva', lastName: 'Fehlt', birthDate: '1936-04-06', street: 'Altstr', houseNo: '2', postalCode: '13407' }
    ];
    state.data.weddingAnniversaries = [
      { id: 'WA-1', citizenId: 'G-2026-010', firstName: 'Max', lastName: 'Muster', birthDate: '1936-04-05', weddingDate: '1976-04-05', spouseName: 'Maria' },
      { id: 'WA-2', citizenId: 'G-2026-011', firstName: 'Eva', lastName: 'Fehlt', birthDate: '1936-04-06', weddingDate: '1976-04-06', spouseName: 'Ernst' },
      { id: 'WA-3', citizenId: 'G-2026-099', firstName: 'Juli', lastName: 'Bleibt', birthDate: '1936-07-06', weddingDate: '1976-07-06', spouseName: 'Jan' }
    ];
    state.selectedCitizenId = 'G-2026-011';
    state.importText = 'Vorname;Nachname;Strasse;Hausnummer;PLZ;Geburtsdatum\nMax;Muster;Hauptstr;1;13407;5.4.1936';

    await actions['run-import']();

    const imported = state.data.citizens[0];
    assert.equal(imported.lastName, 'Muster');
    assert.deepEqual(state.data.weddingAnniversaries.map(item => item.id), ['WA-1', 'WA-3']);
    assert.equal(state.data.weddingAnniversaries[0].citizenId, imported.id);
    assert.equal(state.data.weddingAnniversaries[0].street, 'Hauptstr');
    assert.deepEqual(state.importMissingCitizens, []);
    assert.notEqual(state.selectedCitizenId, 'G-2026-011');
    assert.equal(state.dialog, null);
  });
});

describe('Jubilare pruefen', () => {
  it('save-citizen speichert erfasste Hochzeitsjubilaeen in einer eigenen Collection', async () => {
    state.data.citizens = [{
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      wish: 'offen',
      status: 'geladen',
      source: 'CSV Import',
      updatedAt: '2026-06-01'
    }];
    setForm('#citizen-form', {
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      phone: '',
      email: '',
      wish: 'Besuch erwünscht',
      notes: '',
      source: 'CSV Import',
      pressPublication: 'on',
      weddingAnniversary: 'Goldene Hochzeit',
      weddingDate: '1976-06-01',
      spouseName: 'Heinz'
    });

    await actions['save-citizen']();

    assert.equal(state.data.weddingAnniversaries.length, 1);
    assert.deepEqual({
      citizenId: state.data.weddingAnniversaries[0].citizenId,
      weddingDate: state.data.weddingAnniversaries[0].weddingDate,
      spouseName: state.data.weddingAnniversaries[0].spouseName
    }, {
      citizenId: 'G-1',
      weddingDate: '1976-06-01',
      spouseName: 'Heinz'
    });
    assert.equal(state.data.weddingAnniversaries[0].weddingAnniversary, undefined, 'Jubiläums-Label wird nicht gespeichert, sondern in der UI berechnet');
  });
});

describe('Jubilare pruefen (Backend)', () => {
  it('save-citizen schreibt im Backend nur den betroffenen Jubilar und das passende Hochzeitsjubilaeum', async () => {
    state.data.citizens = [{
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      wish: 'offen',
      status: 'geladen',
      source: 'CSV Import',
      updatedAt: '2026-06-01'
    }];
    state.auth.token = 'token';
    route('PUT /citizens/G-1', { ...state.data.citizens[0], updatedAt: '2026-06-01', _version: '4' });
    route('PUT /weddingAnniversaries/WA-G-1-1976-06-01', {
      id: 'WA-G-1-1976-06-01',
      citizenId: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      birthDate: '1936-06-01',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      weddingDate: '1976-06-01',
      spouseName: 'Heinz',
      source: 'Fragebogen',
      capturedAt: '2026-06-01',
      updatedAt: '2026-06-01',
      _version: '2'
    });
    setForm('#citizen-form', {
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      phone: '',
      email: '',
      wish: 'Besuch erwÃ¼nscht',
      notes: '',
      source: 'CSV Import',
      pressPublication: 'on',
      weddingAnniversary: 'Goldene Hochzeit',
      weddingDate: '1976-06-01',
      spouseName: 'Heinz'
    });

    await actions['save-citizen']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/citizens'), false);
    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/citizens/G-1'), true);
    assert.equal(state.collectionVersions.citizens['G-1'], '4');
    assert.equal(state.collectionVersions.weddingAnniversaries['WA-G-1-1976-06-01'], '2');
    state.auth.token = '';
  });

  it('save-citizen löscht ein entfallenes Hochzeitsjubiläum mit Versionsprüfung', async () => {
    state.data.citizens = [{
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      wish: 'offen',
      status: 'geladen',
      source: 'CSV Import',
      updatedAt: '2026-06-01'
    }];
    state.data.weddingAnniversaries = [{
      id: 'WA-G-1-1976-06-01',
      citizenId: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      birthDate: '1936-06-01',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      weddingDate: '1976-06-01',
      spouseName: 'Heinz',
      source: 'Fragebogen',
      capturedAt: '2026-06-01',
      updatedAt: '2026-06-01',
      _version: '2'
    }];
    state.collectionVersions.citizens['G-1'] = '4';
    state.collectionVersions.weddingAnniversaries['WA-G-1-1976-06-01'] = '2';
    state.auth.token = 'token';
    route('PUT /citizens/G-1', { ...state.data.citizens[0], updatedAt: '2026-06-01', _version: '4' });
    route('DELETE /weddingAnniversaries/WA-G-1-1976-06-01', { deleted: true });
    setForm('#citizen-form', {
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      phone: '',
      email: '',
      wish: 'Besuch erwünscht',
      notes: '',
      source: 'CSV Import',
      pressPublication: 'on',
      weddingAnniversary: '',
      weddingDate: '',
      spouseName: ''
    });

    await actions['save-citizen']();

    const deleteCall = calls.find(call => call.method === 'DELETE' && call.path === '/weddingAnniversaries/WA-G-1-1976-06-01');
    assert.equal(deleteCall?.headers?.['If-Match'], '2');
    assert.equal(state.data.weddingAnniversaries.some(item => item.id === 'WA-G-1-1976-06-01'), false);
    assert.equal(state.collectionVersions.weddingAnniversaries['WA-G-1-1976-06-01'], undefined);
    state.auth.token = '';
  });

  it('save-citizen schreibt kein Hochzeitsjubilaeum, wenn Hochzeitstag oder Ehepartner fehlt', async () => {
    state.data.citizens = [{
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      wish: 'offen',
      status: 'geladen',
      source: 'CSV Import',
      updatedAt: '2026-06-01'
    }];
    state.auth.token = 'token';
    route('PUT /citizens/G-1', { ...state.data.citizens[0], updatedAt: '2026-06-01', _version: '4' });
    setForm('#citizen-form', {
      id: 'G-1',
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Muster',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      district: 'Tegel',
      birthDate: '1936-06-01',
      phone: '',
      email: '',
      wish: 'Besuch erwünscht',
      notes: '',
      source: 'CSV Import',
      pressPublication: 'on',
      weddingAnniversary: 'Goldene Hochzeit',
      weddingDate: '',
      spouseName: 'Heinz'
    });

    await actions['save-citizen']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path.startsWith('/weddingAnniversaries/')), false);
    assert.equal(calls.some(call => call.method === 'DELETE' && call.path.startsWith('/weddingAnniversaries/')), false);
    assert.equal(state.data.weddingAnniversaries.length, 0);
    state.auth.token = '';
  });
});

describe('Stammdaten pruefen (Backend)', () => {
  it('new-member schreibt nur das neue Mitglied per POST', async () => {
    const id = nextId('S', state.data.sokoMembers);
    const member = { id, salutation: 'Frau', firstName: '', lastName: '', birthDate: '', groupId: state.data.sokoGroups[0].id, street: '', postalCode: '', city: '', phone: '', mobile: '', email: '', bank: '', accountHolder: '', allowance: '35,00', termFrom: '2026-07-08', termTo: '2028-12-31', billingAmount: '15,00', zpNr: '', kassenzeichen: '', misc: '', note: '', isLeader: false };
    state.auth.token = 'token';
    route('POST /sokoMembers', { ...member, _version: '1' });

    await actions['new-member']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/sokoMembers'), false);
    assert.equal(calls.some(call => call.method === 'POST' && call.path === '/sokoMembers'), true);
    assert.equal(state.collectionVersions.sokoMembers[id], '1');
    state.auth.token = '';
  });

  it('save-member schreibt Mitglied und Leitergruppe einzeln', async () => {
    const member = state.data.sokoMembers[0];
    state.auth.token = 'token';
    state.collectionVersions.sokoMembers[member.id] = '3';
    state.collectionVersions.sokoGroups[member.groupId] = '1';
    route(`PUT /sokoMembers/${member.id}`, { ...member, firstName: 'Eva', postalCode: '13437', email: 'EVA@example.de', bank: 'DE89 3704 0044 0532 0130 00', allowance: '35,00', billingAmount: '15,00', isLeader: true, _version: '4' });
    route(`PUT /sokoGroups/${member.groupId}`, { ...state.data.sokoGroups.find(group => group.id === member.groupId), leaderId: member.id, _version: '2' });
    setForm('#member-form', {
      _memberTab: 'billing', id: member.id, salutation: member.salutation, firstName: 'Eva', lastName: 'Muster', groupId: member.groupId,
      termFrom: member.termFrom, termTo: member.termTo,
      email: ' EVA@example.de ', postalCode: '134 37', bank: 'DE89 3704 0044 0532 0130 00',
      allowance: '35', billingAmount: '15', isLeader: 'true'
    });

    await actions['save-member']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/sokoMembers'), false);
    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/sokoGroups'), false);
    assert.equal(calls.find(call => call.method === 'PUT' && call.path === `/sokoMembers/${member.id}`)?.body._version, '3');
    assert.equal(calls.find(call => call.method === 'PUT' && call.path === `/sokoGroups/${member.groupId}`)?.body._version, '1');
    assert.equal(state.collectionVersions.sokoMembers[member.id], '4');
    assert.equal(state.collectionVersions.sokoGroups[member.groupId], '2');
    state.auth.token = '';
  });

  it('save-member lädt bei Konflikt nur Mitglied und Leitergruppe neu, nicht alle Citizens', async () => {
    const member = state.data.sokoMembers[0];
    state.auth.token = 'token';
    state.collectionVersions.sokoMembers[member.id] = '3';
    state.collectionVersions.sokoGroups[member.groupId] = '1';
    route(`PUT /sokoMembers/${member.id}`, { error: 'conflict' }, { ok: false, status: 409 });
    route(`GET /sokoMembers/${member.id}`, { ...member, firstName: 'Eva', _version: '4' });
    route(`GET /sokoGroups/${member.groupId}`, { ...state.data.sokoGroups.find(group => group.id === member.groupId), leaderId: member.id, _version: '2' });
    setForm('#member-form', {
      _memberTab: 'billing', id: member.id, salutation: member.salutation, firstName: 'Eva', lastName: 'Muster', groupId: member.groupId,
      termFrom: member.termFrom, termTo: member.termTo,
      email: member.email, postalCode: member.postalCode, bank: member.bank,
      allowance: member.allowance, billingAmount: member.billingAmount, isLeader: 'true'
    });

    await actions['save-member']();

    assert.equal(calls.some(call => call.method === 'GET' && call.path === '/citizens'), false);
    assert.equal(calls.some(call => call.method === 'GET' && call.path === `/sokoMembers/${member.id}`), true);
    assert.equal(calls.some(call => call.method === 'GET' && call.path === `/sokoGroups/${member.groupId}`), true);
    state.auth.token = '';
  });

  it('save-street schreibt die Zuständigkeit einzeln', async () => {
    const street = state.data.streets[0];
    state.auth.token = 'token';
    state.collectionVersions.streets[street.id] = '4';
    route(`PUT /streets/${street.id}`, { ...street, rules: [{ id: 'r1', plz: '13407', ortsteil: 'Reinickendorf', von: '1', bis: '40', art: 'F', soko: '1' }], _version: '5' });
    setForm('#street-form', { id: street.id, name: street.name }, { ruleRows: [ruleRow({ ruleId: 'r1', plz: '13407', ortsteil: 'Reinickendorf', von: '1', bis: '40', art: 'F', soko: '1' })], postalInputs: [] });

    await actions['save-street']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/streets'), false);
    assert.equal(calls.find(call => call.method === 'PUT' && call.path === `/streets/${street.id}`)?.body._version, '4');
    assert.equal(state.collectionVersions.streets[street.id], '5');
    state.auth.token = '';
  });

  it('save-sender schreibt das Profil einzeln', async () => {
    const sender = state.data.senders[0];
    state.auth.token = 'token';
    state.collectionVersions.senders[sender.id] = '2';
    route(`PUT /senders/${sender.id}`, { ...sender, role: 'Neue Rolle', _version: '3' });
    setForm('#sender-form', { id: sender.id, role: 'Neue Rolle' }, { emailInputs: [] });

    await actions['save-sender']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/senders'), false);
    assert.equal(calls.find(call => call.method === 'PUT' && call.path === `/senders/${sender.id}`)?.body._version, '2');
    assert.equal(state.collectionVersions.senders[sender.id], '3');
    state.auth.token = '';
  });

  it('save-template schreibt die Vorlage einzeln', async () => {
    const template = state.data.templates[0];
    state.auth.token = 'token';
    state.collectionVersions.templates[template.id] = '5';
    route(`PUT /templates/${template.id}`, { ...template, updatedAt: '2026-07-08', _version: '6' });
    setField('#template-form', undefined);
    delete nodes['#template-form'];

    await actions['save-template']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/templates'), false);
    assert.equal(calls.find(call => call.method === 'PUT' && call.path === `/templates/${template.id}`)?.body._version, '5');
    assert.equal(state.collectionVersions.templates[template.id], '6');
    state.auth.token = '';
  });

  it('confirm-delete-template löscht nur die ausgewählte Vorlage', async () => {
    const template = state.data.templates[1];
    state.auth.token = 'token';
    state.collectionVersions.templates[template.id] = '6';
    route(`DELETE /templates/${template.id}`, { deleted: true });
    actions['delete-template'](idEvent(template.id));

    await actions['confirm-delete-template']();

    assert.equal(calls.some(call => call.method === 'PUT' && call.path === '/templates'), false);
    assert.equal(calls.some(call => call.method === 'DELETE' && call.path === `/templates/${template.id}`), true);
    assert.equal(calls.find(call => call.method === 'DELETE' && call.path === `/templates/${template.id}`)?.headers?.['If-Match'], '6');
    assert.equal(state.data.templates.some(item => item.id === template.id), false);
    state.auth.token = '';
  });
});

describe('Benutzerverwaltung (apiRequest)', () => {
  it('load-users lädt die Liste und wählt den ersten Benutzer', async () => {
    route('GET /users', [{ id: 'u1', email: 'a@x' }, { id: 'u2', email: 'b@x' }]);
    await actions['load-users']();
    assert.equal(state.auth.users.length, 2);
    assert.equal(state.selectedUserId, 'u1');
  });

  it('save-user legt per POST an und lädt die Liste neu', async () => {
    setForm('#user-form', { email: 'neu@x', displayName: 'Neu', role: 'user', active: 'true' });
    route('POST /users', { id: 'u9', email: 'neu@x' });
    route('GET /users', [{ id: 'u9', email: 'neu@x' }]);
    await actions['save-user']();
    const post = calls.find(c => c.method === 'POST' && c.path === '/users');
    assert.equal(post.body.active, true);
    assert.equal(state.selectedUserId, 'u9');
    assert.equal(state.auth.users.length, 1);
  });

  it('save-user aktualisiert per PUT, wenn eine Id vorhanden ist', async () => {
    setForm('#user-form', { id: 'u1', email: 'a@x', role: 'admin', active: 'false' });
    route('PUT /users/u1', { id: 'u1', email: 'a@x' });
    route('GET /users', [{ id: 'u1', email: 'a@x' }]);
    await actions['save-user']();
    assert.ok(calls.some(c => c.method === 'PUT' && c.path === '/users/u1'));
  });

  it('user-reset-password merkt sich den Reset-Token', async () => {
    state.selectedUserId = 'u1';
    route('POST /users/u1/reset-password', { resetToken: 'tok-reset' });
    await actions['user-reset-password']();
    assert.equal(state.auth.adminResetToken, 'tok-reset');
  });

  it('delete-user → confirm-delete-user entfernt den Benutzer', async () => {
    state.auth.users = [{ id: 'u1', email: 'a@x' }, { id: 'u2', email: 'b@x' }];
    actions['delete-user'](idEvent('u1'));
    assert.equal(state.dialog.type, 'delete-user');
    route('DELETE /users/u1', {});
    await actions['confirm-delete-user']();
    assert.equal(state.auth.users.some(u => u.id === 'u1'), false);
    assert.equal(state.selectedUserId, 'u2');
  });
});

describe('Dokumente und Quittung', () => {
  it('generate-docs übernimmt Auswahl und erzeugt bei leerer Auswahl keine Dokumente', () => {
    setField('#doc-template', state.data.templates[0].id);
    setField('#doc-sender', state.data.senders[0].id);
    setField('#doc-month', 'alle');
    setField('#doc-group', 'alle');
    actions['generate-docs']();
    assert.deepEqual(state.generatedDocs, []);
    assert.equal(state.filters.month, 'alle');
    assert.equal(localStorage.getItem('gd_month_filter'), 'alle');
  });

  it('generate-docs schliesst Jubilare mit Antwort keine aus', () => {
    state.data.citizens = [
      {
        id: 'G-1',
        firstName: 'Erika',
        lastName: 'Post',
        street: 'Teststrasse',
        houseNo: '1',
        postalCode: '13437',
        birthDate: '1936-06-01',
        status: 'geprueft',
        wish: 'per Post'
      },
      {
        id: 'G-2',
        firstName: 'Max',
        lastName: 'Keine',
        street: 'Teststrasse',
        houseNo: '2',
        postalCode: '13437',
        birthDate: '1936-06-02',
        status: 'geprueft',
        wish: 'keine'
      }
    ];
    setField('#doc-template', state.data.templates[0].id);
    setField('#doc-sender', state.data.senders[0].id);
    setField('#doc-month', 'alle');
    setField('#doc-group', 'alle');

    actions['generate-docs']();

    assert.deepEqual(state.generatedDocs.map(doc => doc.citizenId), ['G-1']);
    assert.deepEqual(state.generatedDocs.map(doc => doc.wish), ['per Post']);
  });

  it('reset-selected-for-reprint setzt gedruckte Jubilare wieder auf geprüft', async () => {
    state.data.citizens = [{
      id: 'G-1',
      firstName: 'Erika',
      lastName: 'Gedruckt',
      street: 'Teststrasse',
      houseNo: '1',
      postalCode: '13437',
      birthDate: '1936-06-01',
      status: 'gedruckt',
      wish: 'per Post',
      printedAt: '2026-06-01'
    }];
    state.selectedCitizenId = 'G-1';
    state.generatedDocs = [{ citizenId: 'G-1' }];

    await actions['reset-selected-for-reprint']();

    const citizen = state.data.citizens[0];
    assert.equal(citizen.status, 'geprüft');
    assert.equal(citizen.printedAt, '2026-06-01');
    assert.deepEqual(state.generatedDocs, []);
  });

  it('save-quittung-settings speichert lokal ohne Auth-Token und normalisiert den Betrag', async () => {
    state.quittungBetrag = '9,9x';
    actions['save-quittung-settings']();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(state.quittungBetrag, normalizeAmount('9,9x'));
  });
});

describe('Dialog schließen', () => {
  it('close-dialog setzt den Dialog zurück', () => {
    state.dialog = { type: 'delete-user', userId: 'u1' };
    actions['close-dialog']();
    assert.equal(state.dialog, null);
    assert.equal(state.focusTarget, '#view');
  });
});
