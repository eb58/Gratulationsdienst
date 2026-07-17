import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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

const { buildImportResult, importNotice, citizenGridRow, memberMatchesFilters, nextMemberIdAfterDelete } = await import('../modules/citizens.js');
const { streetAssignment } = await import('../modules/assignment.js');
const { state } = await import('../modules/state.js');
const { questionnaireCycleForCitizen } = await import('../modules/questionnaireCases.js');

const row = patch => ({
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Mustermann',
  street: 'Musterstraße',
  houseNo: '12',
  postalCode: '13437',
  district: 'Tegel',
  birthDate: '1936-06-01',
  age: '',
  wish: 'offen',
  notes: '',
  ...patch
});

const assignTegel = item => item.street === 'Musterstraße' ? 'SOKO 01' : '';
const idPrefix = `G-${new Date().getFullYear()}`;

describe('buildImportResult', () => {
  it('imports valid rows with incrementing ids and group status', () => {
    const result = buildImportResult([row(), row({ firstName: 'Hans', street: 'Ohnezuordnung' })], [], assignTegel);

    assert.equal(result.newRows.length, 2);
    assert.deepEqual(result.newRows.map(r => r.id), [`${idPrefix}-001`, `${idPrefix}-002`]);
    assert.equal(result.newRows[0].status, 'importiert');
    assert.equal(result.newRows[0].source, 'CSV Import');
    assert.equal(result.newRows[1].status, 'offen');
    assert.equal(result.skipped, 0);
  });

  it('continues ids after existing citizens', () => {
    const existing = [row({ id: `${idPrefix}-001`, firstName: 'Alt', lastName: 'Bestand', birthDate: '1930-01-01' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.newRows[0].id, `${idPrefix}-002`);
  });

  it('reuses freed numbers only above the highest remaining id', () => {
    const existing = [row({ id: `${idPrefix}-001`, firstName: 'Alt', lastName: 'Bestand', birthDate: '1930-01-01' }), row({ id: `${idPrefix}-005`, firstName: 'Zweit', lastName: 'Bestand', birthDate: '1931-01-01' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.newRows[0].id, `${idPrefix}-006`);
  });

  it('flags rows with missing mandatory fields as errors without importing them', () => {
    const result = buildImportResult([row({ lastName: '' })], [], assignTegel);

    assert.equal(result.newRows.length, 0);
  });

  it('startet bei einem neuen Gratulationslauf mit einer offenen Rueckmeldung', () => {
    const existing = [row({ id: 'G-2026-001', street: 'Alte Straße', houseNo: '1', wish: 'per Post', status: 'geprüft', pressPublication: true, weddingDate: '1976-06-01', spouseName: 'Ernst' })];
    const incoming = [row({ street: 'Musterstraße', houseNo: '99', postalCode: '13439' })];
    const result = buildImportResult(incoming, existing, assignTegel);

    assert.equal(result.newRows.length, 0);
    assert.equal(result.updates.length, 1);
    assert.deepEqual(result.deleted, []);
    assert.equal(result.updates[0].id, 'G-2026-001');
    assert.equal(result.updates[0].street, 'Musterstraße');
    assert.equal(result.updates[0].houseNo, '99');
    assert.equal(result.updates[0].postalCode, '13439');
    assert.equal(result.updates[0].wish, 'offen');
    assert.equal(result.updates[0].pressPublication, false);
    assert.equal(result.updates[0].weddingDate, '');
    assert.equal(result.updates[0].spouseName, '');
    assert.equal(result.updates[0].status, 'importiert');
    assert.match(result.updates[0].questionnaireCycle, /^\d{4}-06$/);
    assert.equal(result.skipped, 0);
  });

  it('bewahrt die Rueckmeldung bei einem erneuten Import desselben Laufs', () => {
    const incoming = row({ street: 'Neue Straße' });
    const questionnaireCycle = questionnaireCycleForCitizen(incoming);
    const existing = [row({ id: 'G-2026-001', questionnaireCycle, wish: 'per Post', status: 'geprüft', pressPublication: true })];
    const result = buildImportResult([incoming], existing, assignTegel);

    assert.equal(result.updates[0].wish, 'per Post');
    assert.equal(result.updates[0].pressPublication, true);
    assert.equal(result.updates[0].status, 'geprüft');
  });

  it('reaktiviert eine im selben Lauf wiederkehrende Person ohne ihren Bearbeitungsstand zu verlieren', () => {
    const incoming = row({ street: 'Neue Straße' });
    const existing = [row({ id: 'G-2026-001', archived: true, questionnaireCycle: questionnaireCycleForCitizen(incoming), wish: 'per Post', status: 'gedruckt' })];
    const result = buildImportResult([incoming], existing, assignTegel);

    assert.equal(result.updates[0].archived, false);
    assert.equal(result.updates[0].wish, 'per Post');
    assert.equal(result.updates[0].status, 'gedruckt');
  });

  it('behält das Verstorben-Flag und den Wunsch auch beim Import in einen neuen Gratulationslauf', () => {
    const existing = [row({ id: 'G-2026-001', questionnaireCycle: '2025-06', wish: 'per Post', deceased: true, status: 'geprüft' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.updates[0].wish, 'per Post');
    assert.equal(result.updates[0].deceased, true);
    assert.equal(result.updates[0].status, 'geprüft');
    assert.match(result.updates[0].questionnaireCycle, /^\d{4}-06$/);
  });

  it('behält das Verzogen-Flag bei einem unerwarteten erneuten Import', () => {
    const existing = [row({ id: 'G-2026-001', questionnaireCycle: '2025-06', wish: 'keine', moved: true, status: 'geprüft' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.updates[0].wish, 'keine');
    assert.equal(result.updates[0].moved, true);
    assert.equal(result.updates[0].status, 'geprüft');
  });

  it('setzt Status auf offen, wenn beim Import keine SOKO-Zuordnung gefunden wird', () => {
    const existing = [row({ id: 'G-2026-001', street: 'Alte Straße', status: 'geprüft' })];
    const result = buildImportResult([row({ street: 'Auswärtige Straße' })], existing, assignTegel);

    assert.equal(result.updates[0].status, 'offen');
  });

  it('setzt Status auf offen, wenn die SOKO-Zuordnung mehrdeutig ist', () => {
    state.data.streets = [{
      id: 'STR-3',
      name: 'Mehrdeutigstraße',
      district: 'Tegel',
      groupId: 'SOKO 01',
      rules: [
        { plz: '13437', ortsteil: 'Tegel', soko: '01', von: '1', bis: '20', art: 'F' },
        { plz: '13437', ortsteil: 'Wittenau', soko: '02', von: '10', bis: '30', art: 'F' }
      ]
    }];

    const result = buildImportResult([row({ street: 'Mehrdeutigstraße', houseNo: '12' })], [], streetAssignment);

    assert.equal(result.newRows[0].status, 'offen');
  });

  it('setzt einen bestehenden Jubilar bei neuer mehrdeutiger Zuordnung auf offen', () => {
    const existing = row({ questionnaireCycle: '2027-06', status: 'geprüft', wish: 'per Post' });
    const result = buildImportResult([row({ street: 'Mehrdeutigstraße', houseNo: '12' })], [existing], streetAssignment);

    assert.equal(result.updates[0].status, 'offen');
    assert.equal(result.updates[0].wish, 'per Post');
  });

  it('reaktiviert gedruckte Rueckkehrer unter ihrer stabilen Id', () => {
    const existing = [row({ id: 'G-2026-001', status: 'gedruckt', street: 'Alte Straße', printedAt: '2025-06-01', printedAge: 90, printedYear: 2025 })];
    const result = buildImportResult([row({ street: 'Musterstraße' })], existing, assignTegel);

    assert.deepEqual(result.deleted, []);
    assert.equal(result.newRows.length, 0);
    assert.equal(result.updates[0].id, 'G-2026-001');
    assert.equal(result.updates[0].status, 'importiert');
    assert.equal(result.updates[0].printedAt, '');
    assert.equal(result.updates[0].printedAge, '');
    assert.equal(result.updates[0].printedYear, '');
    assert.equal(result.updates[0].street, 'Musterstraße');
    assert.equal(result.skipped, 0);
  });

  it('skips same-batch duplicates', () => {
    const result = buildImportResult([row(), row()], [], assignTegel);

    assert.equal(result.newRows.length, 1);
    assert.equal(result.skipped, 1);
  });

  it('skips second occurrence of an existing citizen in the same batch', () => {
    const existing = [row({ id: 'G-2026-001' })];
    const result = buildImportResult([row(), row()], existing, assignTegel);

    assert.equal(result.updates.length, 1);
    assert.equal(result.newRows.length, 0);
    assert.equal(result.skipped, 1);
  });

  it('behält im Folgelauf fehlende Jubilare und meldet sie zur Prüfung', () => {
    const existing = [
      row({ id: 'G-2026-001', source: 'CSV Import', firstName: 'Erika', birthDate: '1936-06-01' }),
      row({ id: 'G-2026-002', source: 'CSV Import', firstName: 'Eva', birthDate: '1936-06-02' }),
      row({ id: 'G-2026-003', source: 'CSV Import', firstName: 'Juli', birthDate: '1936-07-01' }),
      row({ id: 'G-2026-004', source: '', firstName: 'Manuell', birthDate: '1936-06-03' })
    ];
    const result = buildImportResult([row({ firstName: 'Erika', birthDate: '1936-06-01' })], existing, assignTegel);

    assert.deepEqual(result.deleted, []);
    assert.deepEqual(result.retained.map(citizen => citizen.id), ['G-2026-001', 'G-2026-002', 'G-2026-003', 'G-2026-004']);
    assert.deepEqual(result.retained.filter(citizen => citizen.archived).map(citizen => citizen.id), ['G-2026-002', 'G-2026-004']);
    assert.deepEqual(result.missing.map(citizen => citizen.id), ['G-2026-002', 'G-2026-004']);
    assert.deepEqual(result.affectedMonths, ['06']);
  });

});

describe('importNotice', () => {
  it('reports new rows only', () => {
    assert.equal(importNotice({ newRows: [1, 2], updates: [], skipped: 0 }), '2 neue Datensätze importiert.');
  });

  it('reports updates only', () => {
    assert.equal(importNotice({ newRows: [], updates: [1, 2], skipped: 0 }), '2 Bestände aktualisiert.');
  });

  it('combines new and updated', () => {
    assert.equal(importNotice({ newRows: [1], updates: [1, 2], skipped: 3 }), '1 neue Datensätze importiert, 2 Bestände aktualisiert, 3 Dubletten übersprungen.');
  });

  it('reports deleted records', () => {
    assert.equal(importNotice({ newRows: [1], updates: [], skipped: 0, deleted: [1, 2] }), '2 Monatsdatensätze gelöscht, 1 neue Datensätze importiert.');
  });

  it('reports archived records missing from the follow-up import', () => {
    assert.equal(importNotice({ newRows: [], updates: [], skipped: 0, missing: [1, 2] }), '2 bisherige Datensätze zur Prüfung archiviert.');
  });

  it('reports no changes when all lists are empty', () => {
    assert.equal(importNotice({ newRows: [], updates: [], skipped: 0, missing: [] }), 'Keine Änderungen.');
  });
});

describe('citizenGridRow', () => {
  it('maps citizen fields and resolves the group id', () => {
    const citizen = { id: 'G-1', firstName: 'Erika', lastName: 'Mustermann', birthDate: '1936-06-01', street: 'Musterstraße', houseNo: '12', status: 'geprüft', wish: 'per Post' };

    assert.deepEqual(citizenGridRow(citizen, { id: 'SOKO 01' }), {
      id: 'G-1',
      name: 'Mustermann, Erika',
      birthday: '1936-06-01',
      age: 2026 - 1936,
      address: 'Musterstraße 12',
      groupId: 'SOKO 01',
      wish: 'per Post',
      flags: '',
      status: 'geprüft'
    });
  });

  it('falls back to "offen" without a group', () => {
    assert.equal(citizenGridRow({ id: 'G-1', firstName: 'A', lastName: 'B', street: 'S', houseNo: '1' }, null).groupId, 'offen');
  });
});

describe('member filtering', () => {
  const members = [
    { id: 'S-001', firstName: 'Lea', lastName: 'Berger', email: 'lea@example.de', phone: '', mobile: '', groupId: 'SOKO 01' },
    { id: 'S-002', firstName: 'Max', lastName: 'Klein', email: 'max@example.de', phone: '', mobile: '', groupId: 'SOKO 02' }
  ];
  const filters = patch => ({ q: '', groupId: 'alle', ...patch });

  it('matches by free text and group', () => {
    assert.equal(memberMatchesFilters(members[0], filters({ q: 'berger' })), true);
    assert.equal(memberMatchesFilters(members[0], filters({ q: 'klein' })), false);
    assert.equal(memberMatchesFilters(members[0], filters({ groupId: 'SOKO 02' })), false);
    assert.equal(memberMatchesFilters(members[0], filters({ groupId: 'SOKO 01' })), true);
  });

  it('picks the next filtered member after deletion, then any remaining', () => {
    assert.equal(nextMemberIdAfterDelete(members, 'S-001', filters({ groupId: 'SOKO 02' })), 'S-002');
    assert.equal(nextMemberIdAfterDelete(members, 'S-002', filters()), 'S-001');
    assert.equal(nextMemberIdAfterDelete(members, 'S-001', filters({ groupId: 'SOKO 99' })), 'S-002', 'fällt auf verbleibendes Mitglied zurück');
    assert.equal(nextMemberIdAfterDelete(members, 'S-001', filters({ q: 'klein' })), 'S-002');
    assert.equal(nextMemberIdAfterDelete([members[0]], 'S-001', filters()), '');
  });
});
