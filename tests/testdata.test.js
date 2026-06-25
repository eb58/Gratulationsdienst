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

const {
  numberFrom,
  shuffledTestValues,
  testAssignments,
  groupedTestAssignments,
  balancedTestAssignments,
  testHouseNo,
  testBirthDate,
  testCsvRow,
  testCsvText,
  testFirstNames,
  testLastNames
} = await import('../modules/testdata.js');

const streets = [
  { id: 'STR-1', name: 'Astraße', district: 'Tegel', rules: [
    { soko: '02', plz: '', ortsteil: '', von: '1', bis: '19', art: 'U' },
    { soko: '', plz: '13437', ortsteil: 'Tegel', von: '', bis: '', art: 'F' }
  ] },
  { id: 'STR-2', name: 'Bweg', district: 'Wittenau', rules: [
    { soko: '01', plz: '13469', ortsteil: 'Wittenau', von: '', bis: '', art: 'F' }
  ] }
];

describe('numberFrom', () => {
  it('extracts the first integer and is NaN without digits', () => {
    assert.equal(numberFrom('12a'), 12);
    assert.equal(numberFrom('5-7'), 5);
    assert.equal(Number.isNaN(numberFrom('abc')), true);
    assert.equal(Number.isNaN(numberFrom('')), true);
  });
});

describe('test assignments', () => {
  it('flattens only rules that carry a SOKO', () => {
    const result = testAssignments(streets);
    assert.deepEqual(result.map(a => [a.street.id, a.rule.soko]), [['STR-1', '02'], ['STR-2', '01']]);
  });

  it('groups by SOKO sorted numerically', () => {
    const groups = groupedTestAssignments(streets);
    assert.deepEqual(groups.map(g => g.soko), ['01', '02']);
    assert.deepEqual(groups.map(g => g.assignments.length), [1, 1]);
  });

  it('distributes assignments round-robin across groups', () => {
    const groups = groupedTestAssignments(streets);
    const balanced = balancedTestAssignments(groups, 4);
    assert.deepEqual(balanced.map(a => a.rule.soko), ['01', '02', '01', '02']);
  });
});

describe('testHouseNo', () => {
  it('returns the first house number matching range and parity', () => {
    assert.equal(testHouseNo({ von: '1', bis: '19', art: 'U' }, 0), '1');
    assert.equal(testHouseNo({ von: '2', bis: '19', art: 'G' }, 0), '2');
    assert.equal(testHouseNo({ von: '', bis: '', art: 'F' }, 0), '1');
  });

  it('falls back to offset + 1 when nothing matches', () => {
    assert.equal(testHouseNo({ von: '1', bis: '1', art: 'G' }, 5), '6');
  });
});

describe('testBirthDate', () => {
  it('cycles ages and uses the given month and day', () => {
    const year = new Date().getFullYear();
    assert.equal(testBirthDate(0, '06'), `${year - 85}-06-01`);
    assert.equal(testBirthDate(4, '06'), `${year - 101}-06-05`);
    assert.equal(testBirthDate(5, '12'), `${year - 85}-12-06`);
  });

  it('falls back to the current month when none is given', () => {
    assert.match(testBirthDate(0, ''), /^\d{4}-\d{2}-01$/);
  });
});

describe('test CSV row and text', () => {
  it('maps a row with PLZ and district fallbacks', () => {
    const assignment = streets[0].rules[0] && { street: streets[0], rule: streets[0].rules[0] };
    const row = testCsvRow(0, { salutation: 'Frau', firstName: 'Anna', lastName: 'Berger' }, assignment, '06');

    assert.equal(row.Hausnummer, '1');
    assert.equal(row.PLZ, '13437', 'leere Regel-PLZ fällt auf Standard zurück');
    assert.equal(row.Ortsteil, 'Tegel', 'leerer Regel-Ortsteil fällt auf Straßen-Bezirk zurück');
    assert.equal(row.Geburtsdatum, `${new Date().getFullYear() - 85}-06-01`);
  });

  it('serializes rows to a quoted semicolon CSV with header', () => {
    const csv = testCsvText([{ Anrede: 'Frau', Vorname: 'Anna', Nachname: 'Berger' }]);
    const lines = csv.split('\n');

    assert.equal(lines.length, 2);
    assert.equal(lines[0], ['Anrede', 'Vorname', 'Nachname', 'Strasse', 'Hausnummer', 'PLZ', 'Ortsteil', 'Geburtsdatum', 'Telefon', 'Email'].map(h => `"${h}"`).join(';'));
    assert.equal(lines[1].startsWith('"Frau";"Anna";"Berger";""'), true);
  });
});

describe('shuffledTestValues', () => {
  it('returns a permutation with the same elements', () => {
    const shuffled = shuffledTestValues(testLastNames);
    assert.equal(shuffled.length, testLastNames.length);
    assert.deepEqual([...shuffled].sort(), [...testLastNames].sort());
    assert.equal(testFirstNames.length, 40);
  });
});
