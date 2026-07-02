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
const route = (key, payload, { ok = true, status = 200 } = {}) => routes.set(key, { ok, status, json: async () => payload });
globalThis.fetch = (url, options = {}) => {
  const method = options.method || 'GET';
  const path = url.replace(/.*\/php-api/, '');
  calls.push({ method, path, body: options.body ? JSON.parse(options.body) : null });
  const res = routes.get(`${method} ${path}`) || { ok: true, status: 200, json: async () => ({}) };
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
const { normalizeAmount } = await import('../modules/utils.js');
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
  state.generatedDocs = [];
  state.cleanupPreview = null;
  state.printBackground = true;
  state.showMapPeople = true;
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.gridApis = {};
  state.auth.user = { id: 'demo', email: 'demo@local', role: 'admin' };
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
  it('new-member hängt ein Mitglied an und wählt es aus', () => {
    const before = state.data.sokoMembers.length;
    actions['new-member']();
    assert.equal(state.data.sokoMembers.length, before + 1);
    assert.equal(state.selectedMemberId, state.data.sokoMembers.at(-1).id);
  });

  it('save-member normalisiert Felder und setzt den Gruppenleiter', () => {
    const member = state.data.sokoMembers[0];
    setForm('#member-form', {
      id: member.id, firstName: 'Eva', lastName: 'Muster', groupId: member.groupId,
      email: ' EVA@example.de ', postalCode: '134 37', bank: 'DE89 3704 0044 0532 0130 00',
      allowance: '35', billingAmount: '15', isLeader: 'true'
    });
    actions['save-member']();
    const saved = state.data.sokoMembers.find(m => m.id === member.id);
    assert.equal(saved.email, 'EVA@example.de'); // normalizeEmail trimmt nur
    assert.equal(saved.postalCode, '13437');
    assert.equal(saved.bank, 'DE89 3704 0044 0532 0130 00');
    assert.equal(saved.isLeader, true);
    assert.equal(state.data.sokoGroups.find(g => g.id === member.groupId).leaderId, member.id);
  });

  it('save-member bricht bei ungültiger IBAN ab, ohne zu speichern', () => {
    const member = state.data.sokoMembers[0];
    setForm('#member-form', { id: member.id, firstName: 'X', bank: 'DE00 0000', postalCode: '13437', email: '' });
    actions['save-member']();
    assert.notEqual(state.data.sokoMembers.find(m => m.id === member.id).firstName, 'X');
  });

  it('delete-member öffnet Dialog, confirm-delete-member entfernt das Mitglied', () => {
    const member = state.data.sokoMembers[0];
    actions['delete-member']();
    assert.equal(state.dialog.type, 'delete-member');
    assert.equal(state.dialog.memberId, member.id);
    actions['confirm-delete-member']();
    assert.equal(state.data.sokoMembers.some(m => m.id === member.id), false);
    assert.equal(state.dialog, null);
  });

  it('export-soko erzeugt eine CSV mit Kopfzeile und Mitglied', () => {
    actions['export-soko']();
    const csv = lastBlobParts[0];
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
  it('save-sender speichert das Profil', () => {
    const sender = state.data.senders[0];
    setForm('#sender-form', { id: sender.id, role: 'Neue Rolle' }, { emailInputs: [] });
    actions['save-sender']();
    assert.equal(state.data.senders.find(s => s.id === sender.id).role, 'Neue Rolle');
  });

  it('new-template legt eine Vorlage an und wählt sie aus', () => {
    const before = state.data.templates.length;
    actions['new-template']();
    assert.equal(state.data.templates.length, before + 1);
    assert.equal(state.selectedTemplateId, state.data.templates.at(-1).id);
  });

  it('save-template aktualisiert updatedAt der ausgewählten Vorlage', () => {
    setField('#template-form', undefined); // -> templateFormValues nutzt selectedTemplate()
    delete nodes['#template-form'];
    actions['save-template']();
    assert.equal(state.data.templates[0].updatedAt.length, 10);
  });

  it('delete-template → confirm entfernt die Vorlage (nicht die letzte)', () => {
    const target = state.data.templates[1];
    actions['delete-template'](idEvent(target.id));
    assert.equal(state.dialog.type, 'delete-template');
    actions['confirm-delete-template']();
    assert.equal(state.data.templates.some(t => t.id === target.id), false);
  });

  it('delete-template verweigert das Löschen der letzten Vorlage', () => {
    state.data.templates = [state.data.templates[0]];
    actions['delete-template'](idEvent(state.data.templates[0].id));
    assert.equal(state.dialog, null);
  });

  it('remove-template-background → confirm leert das Hintergrundbild', () => {
    state.data.templates[0].backgroundImage = 'data:image/png;base64,xxx';
    actions['remove-template-background']({ target: { dataset: { backgroundField: 'backgroundImage' }, closest: () => null } });
    assert.equal(state.dialog.type, 'remove-template-background');
    actions['confirm-remove-template-background']();
    assert.equal(state.data.templates[0].backgroundImage, '');
  });
});

describe('Straßen-Zuständigkeit', () => {
  const streetForm = (street, rules) => setForm('#street-form',
    { id: street.id, name: street.name },
    { ruleRows: rules.map(ruleRow), postalInputs: [] });

  it('save-street speichert Regeln aus dem Formular', () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', ortsteil: 'Reinickendorf', von: '1', bis: '40', art: 'F', soko: '1' }]);
    actions['save-street']();
    assert.equal(state.data.streets.find(s => s.id === street.id).rules.length, 1);
  });

  it('save-street bricht ohne Regel ab', () => {
    const street = state.data.streets[0];
    streetForm(street, []);
    const before = JSON.stringify(state.data.streets.find(s => s.id === street.id));
    actions['save-street']();
    assert.equal(JSON.stringify(state.data.streets.find(s => s.id === street.id)), before);
  });

  it('add-street-rule fügt einen weiteren Abschnitt hinzu', () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', soko: '1', art: 'F' }]);
    actions['add-street-rule']();
    assert.equal(state.data.streets.find(s => s.id === street.id).rules.length, 2);
  });

  it('delete-street-rule verhindert das Löschen des letzten Abschnitts', () => {
    const street = state.data.streets[0];
    streetForm(street, [{ ruleId: 'r1', plz: '13407', soko: '1', art: 'F' }]);
    actions['delete-street-rule']({ target: { closest: () => ({ dataset: { ruleId: 'r1' } }) } });
    // letzte Regel bleibt erhalten -> keine leere Regelliste gespeichert
    assert.ok(state.data.streets.find(s => s.id === street.id).rules.length >= 1);
  });
});

describe('Jubilare löschen und Testdaten', () => {
  it('clear-citizens nur für Admins; confirm leert Jubilare', () => {
    state.data.citizens = [{ id: 'G-1' }];
    actions['clear-citizens']();
    assert.equal(state.dialog.type, 'clear-citizens');
    actions['confirm-clear-citizens']();
    assert.deepEqual(state.data.citizens, []);
  });

  it('clear-citizens wird für Nicht-Admins blockiert', () => {
    state.auth.user = { id: 'u', role: 'user' };
    actions['clear-citizens']();
    assert.equal(state.dialog, null);
  });

  it('delete-old-citizens erzwingt mindestens sechs Monate und löscht nur ältere Jubiläen', async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date(2026, 5, 28) });
    state.data.citizens = [
      { id: 'old-1', birthDate: '1936-10-15', createdAt: '2025-07-15' },
      { id: 'old-2', birthDate: '1936-11-20', createdAt: '2025-08-20' },
      { id: 'old-created', birthDate: '1936-12-20', createdAt: '2025-09-20' },
      { id: 'boundary', birthDate: '1936-12-28', createdAt: '2025-09-28' },
      { id: 'fresh', birthDate: '1936-01-15', createdAt: '2025-10-15' },
      { id: 'future-created', birthDate: '1936-08-01', createdAt: '2026-05-01' },
      { id: 'future', birthDate: '1936-11-01', createdAt: '2026-08-01' }
    ];
    state.selectedCitizenId = 'old-1';
    state.generatedDocs = [{ citizenId: 'old-1' }, { citizenId: 'fresh' }];
    setField('#cleanup-months', '5');

    actions['preview-old-citizens']();

    assert.equal(state.cleanupMonths, 6);
    assert.equal(localStorage.getItem('gd_cleanup_months'), '6');
    assert.equal(state.dialog, null);
    assert.deepEqual(state.cleanupPreview, { months: 6, citizenIds: ['old-1', 'old-2', 'old-created'] });

    actions['delete-old-citizens']();

    assert.equal(state.dialog.type, 'delete-old-citizens');
    assert.deepEqual(state.dialog.citizenIds, ['old-1', 'old-2', 'old-created']);

    await actions['confirm-delete-old-citizens']();

    assert.deepEqual(state.data.citizens.map(citizen => citizen.id), ['boundary', 'fresh', 'future-created', 'future']);
    assert.equal(state.selectedCitizenId, '');
    assert.deepEqual(state.generatedDocs, [{ citizenId: 'fresh' }]);
    assert.equal(state.cleanupPreview, null);
  });

  it('delete-old-citizens wird für Nicht-Admins blockiert', () => {
    state.auth.user = { id: 'u', role: 'user' };
    state.data.citizens = [{ id: 'old-1', birthDate: '1936-10-15', createdAt: '2025-07-15' }];
    actions['preview-old-citizens']();
    assert.equal(state.dialog, null);
  });

  it('delete-old-citizens öffnet ohne Vorschau keinen Löschdialog', () => {
    state.data.citizens = [{ id: 'old-1', birthDate: '1936-10-15', createdAt: '2025-07-15' }];
    actions['delete-old-citizens']();
    assert.equal(state.dialog, null);
  });

  it('seed-citizens erzeugt Jubilare aus den SOKO-Zuordnungen', () => {
    assert.equal(state.data.citizens.length, 0);
    actions['seed-citizens']();
    assert.ok(state.data.citizens.length >= 30);
    assert.deepEqual([...new Set(state.data.citizens.map(citizen => citizen.birthDate.slice(5, 7)))], [monthAfterNext()]);
  });
});

describe('Import-Lauf', () => {
  it('run-import meldet fehlende CSV', () => {
    actions['run-import']();
    assert.equal(state.data.citizens.length, 0);
  });

  it('run-import verarbeitet vorhandenen Importtext', () => {
    state.filters = { q: 'unsichtbar', month: '01', groupId: 'SOKO 99', age: '100', status: 'geprüft', occasion: 'Geburtstag' };
    localStorage.setItem('gd_month_filter', '01');
    state.importText = 'Vorname;Nachname;Strasse;Hausnummer;PLZ;Geburtsdatum\nMax;Muster;Hauptstr;1;13407;5.4.1936';
    actions['run-import']();
    assert.ok(state.data.citizens.length > 0);
    assert.deepEqual(
      { q: state.filters.q, month: state.filters.month, groupId: state.filters.groupId, age: state.filters.age, status: state.filters.status },
      { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle' }
    );
    assert.equal(localStorage.getItem('gd_month_filter'), 'alle');
    assert.equal(filteredCitizens().length, state.data.citizens.length);
    assert.equal(state.selectedCitizenId, state.data.citizens[0].id);
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

  it('reset-selected-for-reprint setzt gedruckte Jubilare wieder auf geprüft', () => {
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

    actions['reset-selected-for-reprint']();

    const citizen = state.data.citizens[0];
    assert.equal(citizen.status, 'geprüft');
    assert.equal(citizen.printedAt, '2026-06-01');
    assert.deepEqual(state.generatedDocs, []);
  });

  it('save-quittung-settings speichert im Datei-Modus und normalisiert den Betrag', async () => {
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
