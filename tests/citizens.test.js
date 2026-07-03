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
  phone: '030 1234567',
  email: '',
  wish: 'offen',
  notes: '',
  ...patch
});

const assignTegel = item => item.street === 'Musterstraße' ? 'SOKO 01' : '';

describe('buildImportResult', () => {
  it('imports valid rows with incrementing ids and group status', () => {
    const result = buildImportResult([row(), row({ firstName: 'Hans', street: 'Ohnezuordnung' })], [], assignTegel);

    assert.equal(result.newRows.length, 2);
    assert.deepEqual(result.newRows.map(r => r.id), ['G-2026-001', 'G-2026-002']);
    assert.equal(result.newRows[0].status, 'importiert');
    assert.equal(result.newRows[0].source, 'CSV Import');
    assert.equal(result.newRows[1].status, 'offen');
    assert.equal(result.skipped, 0);
  });

  it('continues ids after existing citizens', () => {
    const existing = [row({ id: 'G-2026-001', firstName: 'Alt', lastName: 'Bestand', birthDate: '1930-01-01' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.newRows[0].id, 'G-2026-002');
  });

  it('reuses freed numbers only above the highest remaining id', () => {
    const existing = [row({ id: 'G-2026-001', firstName: 'Alt', lastName: 'Bestand', birthDate: '1930-01-01' }), row({ id: 'G-2026-005', firstName: 'Zweit', lastName: 'Bestand', birthDate: '1931-01-01' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.newRows[0].id, 'G-2026-006');
  });

  it('flags rows with missing mandatory fields as errors without importing them', () => {
    const result = buildImportResult([row({ lastName: '' })], [], assignTegel);

    assert.equal(result.newRows.length, 0);
  });

  it('merges LABO fields into existing citizens and preserves system fields', () => {
    const existing = [row({ id: 'G-2026-001', street: 'Alte Straße', houseNo: '1', wish: 'per Post', status: 'geprüft' })];
    const incoming = [row({ street: 'Neue Straße', houseNo: '99', postalCode: '13439' })];
    const result = buildImportResult(incoming, existing, assignTegel);

    assert.equal(result.newRows.length, 0);
    assert.equal(result.updates.length, 1);
    assert.equal(result.updates[0].id, 'G-2026-001');
    assert.equal(result.updates[0].street, 'Neue Straße');
    assert.equal(result.updates[0].houseNo, '99');
    assert.equal(result.updates[0].postalCode, '13439');
    assert.equal(result.updates[0].wish, 'per Post');
    assert.equal(result.updates[0].status, 'geprüft');
    assert.equal(result.skipped, 0);
  });

  it('updates printed citizens while preserving their status', () => {
    const existing = [row({ id: 'G-2026-001', status: 'gedruckt', street: 'Alte Straße' })];
    const result = buildImportResult([row({ street: 'Neue Straße' })], existing, assignTegel);

    assert.equal(result.updates.length, 1);
    assert.equal(result.updates[0].status, 'gedruckt');
    assert.equal(result.updates[0].street, 'Neue Straße');
    assert.equal(result.skipped, 0);
  });

  it('skips same-batch duplicates', () => {
    const result = buildImportResult([row(), row()], [], assignTegel);

    assert.equal(result.newRows.length, 1);
    assert.equal(result.skipped, 1);
  });

  it('flags a moved-out citizen in notes when the new address has no SOKO match', () => {
    const existing = [row({ id: 'G-2026-001', street: 'Musterstraße', notes: '' })];
    const result = buildImportResult([row({ street: 'Auswärtige Straße', houseNo: '5' })], existing, assignTegel);

    assert.equal(result.updates.length, 1);
    assert.match(result.updates[0].notes, /Keine SOKO-Zuordnung bei Reimport/);
  });

  it('does not flag a move when the new address still has a SOKO match', () => {
    const existing = [row({ id: 'G-2026-001', street: 'Alte Musterstraße', notes: '' })];
    const result = buildImportResult([row({ street: 'Musterstraße' })], existing, assignTegel);

    assert.equal(result.updates[0].notes, '');
  });

  it('skips second occurrence of an existing citizen in the same batch', () => {
    const existing = [row({ id: 'G-2026-001' })];
    const result = buildImportResult([row(), row()], existing, assignTegel);

    assert.equal(result.updates.length, 1);
    assert.equal(result.newRows.length, 0);
    assert.equal(result.skipped, 1);
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

  it('reports no changes when all lists are empty', () => {
    assert.equal(importNotice({ newRows: [], updates: [], skipped: 0 }), 'Keine Änderungen.');
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
