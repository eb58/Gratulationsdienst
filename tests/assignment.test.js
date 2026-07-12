import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

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

const assignment = await import('../modules/assignment.js');
const { state } = await import('../modules/state.js');
const { SOKO_QUESTIONNAIRE_IMPORTED_STATUS } = await import('../modules/sokoQuestionnaire.js');

const {
  activeCitizens,
  documentCitizens,
  duplicateKey,
  editableStreetAssignment,
  filteredCitizens,
  groupForCitizen,
  houseNumberValue,
  isCheckedCitizen,
  isDeceasedCitizen,
  isPrintedCitizen,
  isReceiptGroupReady,
  leaderForGroup,
  normalizeStreetName,
  preciseStreetAssignment,
  receiptCitizens,
  receiptCitizensForReadyGroups,
  receiptReviewCitizens,
  receiptReviewCitizensForGroup,
  ruleMatchesHouseNo,
  selectedCitizen,
  streetAssignment,
  streetByName,
  wantsVisit
} = assignment;

const baseCitizen = patch => ({
  id: 'C-1',
  firstName: 'Erika',
  lastName: 'Mustermann',
  street: 'Musterstraße',
  houseNo: '12',
  postalCode: '13437',
  birthDate: '1936-06-01',
  status: 'geprüft',
  wish: 'Besuch erwünscht',
  ...patch
});

const resetState = () => {
  state.data = {
    citizens: [],
    sokoGroups: [
      { id: 'SOKO 01', leaderId: 'M-1' },
      { id: 'SOKO 02', leaderId: 'M-2' }
    ],
    sokoMembers: [
      { id: 'M-1', firstName: 'Lea' },
      { id: 'M-2', firstName: 'Max' }
    ],
    streets: [
      {
        id: 'STR-1',
        name: 'Musterstraße',
        district: 'Tegel',
        groupId: '',
        rules: [
          { plz: '13437', ortsteil: 'Tegel', soko: '01', von: '1', bis: '19', art: 'G' },
          { plz: '13437', ortsteil: 'Wittenau', soko: '02', von: '1', bis: '19', art: 'U' }
        ]
      },
      {
        id: 'STR-2',
        name: 'Nebenstraße (privat)',
        district: 'Frohnau',
        groupId: 'SOKO 02',
        rules: []
      }
    ],
    senders: [],
    templates: []
  };
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.selectedCitizenId = '';
  delete globalThis.findeSoko;
};

beforeEach(resetState);
afterEach(resetState);

describe('citizen status helpers', () => {
  it('classifies printed, checked and visit citizens', () => {
    assert.equal(isPrintedCitizen({ status: 'gedruckt' }), true);
    assert.equal(isPrintedCitizen({ status: 'geprüft' }), false);
    assert.equal(isCheckedCitizen({ status: 'geprüft' }), true);
    assert.equal(isCheckedCitizen({ status: 'gedruckt' }), true);
    assert.equal(isCheckedCitizen({ status: SOKO_QUESTIONNAIRE_IMPORTED_STATUS }), false);
    assert.equal(isCheckedCitizen({ status: 'offen' }), false);
    assert.equal(wantsVisit({ wish: 'Besuch erwünscht' }), true);
    assert.equal(wantsVisit({ wish: 'per Post' }), false);
    assert.equal(isDeceasedCitizen({ wish: 'verstorben' }), true);
    assert.equal(isDeceasedCitizen({ wish: 'keine' }), false);
  });

  it('returns neither printed nor archived citizens as active', () => {
    state.data.citizens = [
      baseCitizen({ id: 'active', status: 'geprüft' }),
      baseCitizen({ id: 'printed', status: 'gedruckt' }),
      baseCitizen({ id: 'archived', status: 'archiviert' })
    ];

    assert.deepEqual(activeCitizens().map(citizen => citizen.id), ['active']);
    assert.deepEqual(filteredCitizens().map(citizen => citizen.id), ['active', 'printed']);
  });
});

describe('street assignment helpers', () => {
  it('extracts house numbers and matches ranges with parity', () => {
    assert.equal(houseNumberValue('12a'), 12);
    assert.equal(Number.isNaN(houseNumberValue('abc')), true);
    assert.equal(ruleMatchesHouseNo({ von: '10', bis: '20', art: 'G' }, '12a'), true);
    assert.equal(ruleMatchesHouseNo({ von: '10', bis: '20', art: 'G' }, '13'), false);
    assert.equal(ruleMatchesHouseNo({ von: '10', bis: '20', art: 'U' }, '13'), true);
    assert.equal(ruleMatchesHouseNo({ von: '', bis: '', art: 'F' }, 'abc'), true);
  });

  it('finds streets by exact name or by name without parenthesized suffix', () => {
    assert.equal(streetByName('Musterstraße')?.id, 'STR-1');
    assert.equal(streetByName('Nebenstraße')?.id, 'STR-2');
    assert.equal(streetByName('  Musterstr.  ')?.id, 'STR-1');
    assert.equal(streetByName('Musterstrasse')?.id, 'STR-1');
    assert.equal(streetByName('Muster Str')?.id, undefined);
  });

  it('normalisiert Straßennamen auf einen stabilen Vergleichsschluessel', () => {
    assert.equal(normalizeStreetName('  Musterstraße  '), 'musterstr');
    assert.equal(normalizeStreetName('Musterstrasse'), 'musterstr');
    assert.equal(normalizeStreetName('Musterstr.'), 'musterstr');
    assert.equal(normalizeStreetName('Nebenstraße (privat)'), 'nebenstr');
  });

  it('assigns editable streets by postal code, house number and parity', () => {
    assert.deepEqual(editableStreetAssignment(baseCitizen({ houseNo: '12' })), {
      ...state.data.streets[0],
      district: 'Tegel',
      groupId: 'SOKO 01',
      rule: state.data.streets[0].rules[0]
    });

    assert.equal(editableStreetAssignment(baseCitizen({ houseNo: '13' }))?.groupId, 'SOKO 02');
  });

  it('leaves streets without a matching house-number rule ungrouped instead of guessing the first rule', () => {
    const assignment = editableStreetAssignment(baseCitizen({ houseNo: '200' }));

    assert.equal(!!assignment?.groupId, false);
    assert.equal(!!streetAssignment(baseCitizen({ houseNo: '200' }))?.groupId, false);
  });

  it('uses precise assignment from findeSoko when editable data has no group', () => {
    state.data.streets = [];
    const calls = [];
    globalThis.findeSoko = (street, houseNo, postalCode) => {
      calls.push({ street, houseNo, postalCode });
      return { strasse: 'Neue Straße', ortsteil: 'Tegel', soko: '02' };
    };

    assert.deepEqual(preciseStreetAssignment(baseCitizen({ street: 'Neue Straße' })), {
      name: 'Neue Straße',
      district: 'Tegel',
      groupId: 'SOKO 02'
    });
    assert.equal(streetAssignment(baseCitizen({ street: 'Neue Straße' }))?.groupId, 'SOKO 02');
    assert.deepEqual(calls.map(call => call.street), ['Neue Straße', 'Neue Straße']);
  });

  it('finds groups and leaders from assigned citizens', () => {
    const group = groupForCitizen(baseCitizen({ houseNo: '12' }));
    assert.equal(group?.id, 'SOKO 01');
    assert.equal(leaderForGroup(group)?.id, 'M-1');
  });
});

describe('selection and receipt helpers', () => {
  it('falls back from printed selected citizens to the first active citizen', () => {
    state.data.citizens = [
      baseCitizen({ id: 'printed', status: 'gedruckt' }),
      baseCitizen({ id: 'active', status: 'geprüft' })
    ];
    state.selectedCitizenId = 'printed';

    assert.equal(selectedCitizen()?.id, 'active');
  });

  it('filters receipt citizens by month, visit wish, group and readiness', () => {
    state.filters.month = '06';
    state.data.citizens = [
      baseCitizen({ id: 'ready-visit', houseNo: '12', birthDate: '1936-06-01', status: 'geprüft', wish: 'Besuch erwünscht' }),
      baseCitizen({ id: 'ready-post', houseNo: '14', birthDate: '1936-06-02', status: 'geprüft', wish: 'per Post' }),
      baseCitizen({ id: 'open', houseNo: '16', birthDate: '1936-06-03', status: 'offen', wish: 'Besuch erwünscht' }),
      baseCitizen({ id: 'other-month', houseNo: '18', birthDate: '1936-07-01', status: 'geprüft', wish: 'Besuch erwünscht' })
    ];

    assert.deepEqual(receiptReviewCitizens().map(citizen => citizen.id), ['ready-visit', 'open']);
    assert.deepEqual(receiptCitizens().map(citizen => citizen.id), ['ready-visit', 'open']);
    assert.deepEqual(receiptReviewCitizensForGroup('SOKO 01').map(citizen => citizen.id), ['ready-visit', 'open']);
    assert.equal(isReceiptGroupReady('SOKO 01'), false);
    assert.deepEqual(receiptCitizensForReadyGroups().map(citizen => citizen.id), []);

    state.data.citizens = state.data.citizens.map(citizen => citizen.id === 'open' ? { ...citizen, status: 'geprüft' } : citizen);

    assert.equal(isReceiptGroupReady('SOKO 01'), true);
    assert.deepEqual(receiptCitizensForReadyGroups().map(citizen => citizen.id), ['ready-visit', 'open']);
  });
});

describe('document helpers', () => {
  it('excludes checked citizens who answered keine from document runs', () => {
    state.data.citizens = [
      baseCitizen({ id: 'post', status: 'geprueft', wish: 'per Post' }),
      baseCitizen({ id: 'none', status: 'geprueft', wish: 'keine' }),
      baseCitizen({ id: 'open', status: 'offen', wish: 'per Post' }),
      baseCitizen({ id: 'printed', status: 'gedruckt', wish: 'per Post' })
    ];

    assert.deepEqual(documentCitizens().map(citizen => citizen.id), ['post']);
  });

  it('excludes citizens marked as deceased from document runs', () => {
    state.data.citizens = [
      baseCitizen({ id: 'post', status: 'geprueft', wish: 'per Post' }),
      baseCitizen({ id: 'deceased', status: 'geprueft', wish: 'verstorben' })
    ];

    assert.deepEqual(documentCitizens().map(citizen => citizen.id), ['post']);
  });
});

describe('duplicate key', () => {
  it('uses normalized identifying citizen data', () => {
    const first = baseCitizen({ firstName: ' Erika ', lastName: 'Mustermann' });
    const second = baseCitizen({ firstName: 'erika', lastName: 'MUSTERMANN' });

    assert.equal(duplicateKey(first), duplicateKey(second));
  });

  it('ignores address changes — a person who moved stays the same person', () => {
    const before = baseCitizen({ street: 'Alte Straße', houseNo: '1', postalCode: '13407' });
    const after = baseCitizen({ street: 'Neue Straße', houseNo: '99', postalCode: '13439' });

    assert.equal(duplicateKey(before), duplicateKey(after));
  });
});
