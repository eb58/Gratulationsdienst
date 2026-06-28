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

    assert.equal(result.rows.length, 2);
    assert.deepEqual(result.rows.map(r => r.id), ['G-2026-001', 'G-2026-002']);
    assert.equal(result.rows[0].status, 'importiert');
    assert.equal(result.rows[0].source, 'CSV Import');
    assert.equal(result.rows[1].status, 'offen');
    assert.equal(result.duplicates, 0);
  });

  it('continues ids after existing citizens', () => {
    const existing = [row({ firstName: 'Alt', lastName: 'Bestand', birthDate: '1930-01-01' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.rows[0].id, 'G-2026-002');
  });

  it('flags rows with missing mandatory fields as errors without importing them', () => {
    const result = buildImportResult([row({ lastName: '' })], [], assignTegel);

    assert.equal(result.rows.length, 0);
  });

  it('filters duplicates of existing citizens and counts them', () => {
    const existing = [row()];
    const result = buildImportResult([row(), row({ firstName: 'Neu' })], existing, assignTegel);

    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].firstName, 'Neu');
    assert.equal(result.duplicates, 1);
    assert.equal(result.printedDuplicates, 0);
  });

  it('filters duplicates within the same batch', () => {
    const result = buildImportResult([row(), row()], [], assignTegel);

    assert.equal(result.rows.length, 1);
    assert.equal(result.duplicates, 1);
  });

  it('marks duplicates of already printed citizens', () => {
    const existing = [row({ status: 'gedruckt' })];
    const result = buildImportResult([row()], existing, assignTegel);

    assert.equal(result.duplicates, 1);
    assert.equal(result.printedDuplicates, 1);
  });

});

describe('importNotice', () => {
  it('reports plain import count', () => {
    assert.equal(importNotice({ rows: [1, 2], duplicates: 0, printedDuplicates: 0 }), '2 neue Datensätze importiert.');
  });

  it('reports filtered duplicates', () => {
    assert.equal(importNotice({ rows: [1], duplicates: 3, printedDuplicates: 0 }), '1 neue Datensätze importiert. 3 Dubletten ausgefiltert.');
  });

  it('reports printed duplicates separately', () => {
    assert.equal(importNotice({ rows: [], duplicates: 3, printedDuplicates: 2 }), '0 neue Datensätze importiert. 3 Dubletten ausgefiltert, davon 2 bereits gedruckt.');
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
