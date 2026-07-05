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
  honouredTestAges,
  monthAfterNext,
  mortalityWeightedTestAges,
  testHouseNo,
  testBirthDate,
  testCsvRow,
  testCsvText,
  testFirstNames,
  testLastNames,
  seedCsvRows,
  seedCsv,
  rollingSimulationDate,
  questionnaireCitizenPatch
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

  it('keeps the SOKO order even across groups (round-robin) while picking within a group', () => {
    const groups = groupedTestAssignments(streets);
    const balanced = balancedTestAssignments(groups, 4, () => 0);
    assert.deepEqual(balanced.map(a => a.rule.soko), ['01', '02', '01', '02']);
  });

  it('randomly picks a different street within a group', () => {
    const groups = [{ soko: '01', assignments: [{ rule: { soko: '01' }, street: { name: 'A' } }, { rule: { soko: '01' }, street: { name: 'B' } }] }];
    assert.equal(balancedTestAssignments(groups, 1, () => 0)[0].street.name, 'A');
    assert.equal(balancedTestAssignments(groups, 1, () => 0.99)[0].street.name, 'B');
  });
});

describe('testHouseNo', () => {
  it('picks a rule-conforming house number from the candidate range', () => {
    // ungerade 1..19 -> [1,3,5,7,9,11,13,15,17,19]
    assert.equal(testHouseNo({ von: '1', bis: '19', art: 'U' }, () => 0), '1');
    assert.equal(testHouseNo({ von: '1', bis: '19', art: 'U' }, () => 0.99), '19');
    // gerade 2..18
    assert.equal(testHouseNo({ von: '2', bis: '19', art: 'G' }, () => 0), '2');
    assert.equal(testHouseNo({ von: '2', bis: '19', art: 'G' }, () => 0.5), '10');
  });

  it('spreads house numbers for an open range instead of always returning 1', () => {
    const rule = { von: '', bis: '', art: 'F' };
    const values = new Set(Array.from({ length: 50 }, () => testHouseNo(rule)));
    assert.ok(values.size > 10, `erwartet viele verschiedene Hausnummern, bekam ${values.size}`);
  });

  it('falls back to the rule bounds when no candidate matches', () => {
    assert.equal(testHouseNo({ von: '500', bis: '500', art: 'F' }, () => 0), '500');
  });
});

describe('testBirthDate', () => {
  it('uses the given age, month and day', () => {
    const year = new Date().getFullYear();
    assert.equal(testBirthDate(0, '06', 85), `${year - 85}-06-01`);
    assert.equal(testBirthDate(4, '06', 101), `${year - 101}-06-05`);
    assert.equal(testBirthDate(5, '12', 90), `${year - 90}-12-06`);
  });

  it('falls back to the current month when none is given', () => {
    assert.match(testBirthDate(0, ''), /^\d{4}-\d{2}-01$/);
  });
});

describe('monthAfterNext', () => {
  it('returns the month after next including year wrap', () => {
    assert.equal(monthAfterNext(new Date(2026, 5, 26)), '08');
    assert.equal(monthAfterNext(new Date(2026, 10, 15)), '01');
    assert.equal(monthAfterNext(new Date(2026, 11, 15)), '02');
  });
});

describe('mortalityWeightedTestAges', () => {
  it('keeps all honoured ages visible when enough rows are generated', () => {
    assert.deepEqual(mortalityWeightedTestAges(honouredTestAges.length), honouredTestAges);
  });

  it('weights test ages by expected mortality', () => {
    const ageCounts = mortalityWeightedTestAges(38).reduce((map, age) => ({ ...map, [age]: (map[age] || 0) + 1 }), {});

    assert.ok(ageCounts[85] > ageCounts[90], '85 soll häufiger als 90 sein');
    assert.ok(ageCounts[90] > ageCounts[95], '90 soll häufiger als 95 sein');
    assert.ok(ageCounts[95] > ageCounts[100], '95 soll häufiger als 100 sein');
    assert.equal(ageCounts[101], 1);
  });

  it('uses higher old-age weights for women than for men', () => {
    const femaleAges = mortalityWeightedTestAges(60, Array.from({ length: 60 }, () => 'Frau'));
    const maleAges = mortalityWeightedTestAges(60, Array.from({ length: 60 }, () => 'Herr'));
    const oldWomen = femaleAges.filter(age => age >= 95).length;
    const oldMen = maleAges.filter(age => age >= 95).length;
    const centenarianWomen = femaleAges.filter(age => age >= 100).length;
    const centenarianMen = maleAges.filter(age => age >= 100).length;

    assert.ok(oldWomen > oldMen, 'Frauen sollen ab 95 häufiger vertreten sein');
    assert.ok(centenarianWomen > centenarianMen, 'Frauen sollen ab 100 häufiger vertreten sein');
  });
});

describe('test CSV row and text', () => {
  it('maps a row with PLZ and district fallbacks', () => {
    const assignment = { street: streets[0], rule: streets[0].rules[0] };
    const row = testCsvRow(0, { salutation: 'Frau', firstName: 'Anna', lastName: 'Berger' }, assignment, '06', () => 0);

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

describe('seed CSV generation', () => {
  it('returns structured seed rows and matching CSV text', () => {
    const { assignments, rows } = seedCsvRows(streets, 4, () => '06', () => 0);
    const csv = seedCsv(streets, 4, () => '06', () => 0);

    assert.equal(assignments.length, 4);
    assert.equal(rows.length, 4);
    assert.equal(csv.split('\n').length, 5);
    assert.deepEqual(assignments.map(assignment => assignment.rule.soko), ['01', '02', '01', '02']);
    assert.deepEqual([...new Set(rows.map(row => row.Geburtsdatum.slice(5, 7)))], ['06']);
  });

  it('spreads rolling simulation dates across twelve months', () => {
    const dates = Array.from({ length: 12 }, (_, index) => rollingSimulationDate(index, 12, 3, new Date(2026, 5, 28)));
    const local = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    assert.equal(local(dates[0]), '2025-08-03');
    assert.equal(local(dates.at(-1)), '2026-07-03');
  });

  it('builds questionnaire patches with deterministic distributions', () => {
    const citizen = { id: 'G-1', salutation: 'Frau', birthDate: '1940-08-01' };
    const patch = questionnaireCitizenPatch(citizen, 0, 500);

    assert.equal(patch.status, 'gedruckt');
    assert.equal(patch.wish, 'keine');
    assert.equal(patch.weddingAnniversary, 'Goldene Hochzeit');
    assert.equal(patch.weddingDate, `${Number(patch.printedAt.slice(0, 4)) - 50}-${patch.printedAt.slice(5)}`);
    assert.equal(patch.spouseName.length > 0, true);
  });
});

describe('shuffledTestValues', () => {
  it('returns a permutation with the same elements', () => {
    const shuffled = shuffledTestValues(testLastNames);
    assert.equal(shuffled.length, testLastNames.length);
    assert.deepEqual([...shuffled].sort(), [...testLastNames].sort());
    assert.equal(testFirstNames.length, 80);
  });
});
