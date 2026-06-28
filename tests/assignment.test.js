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
  groupForCitizen,
  houseNumberValue,
  isCheckedCitizen,
  isPrintedCitizen,
  isReceiptGroupReady,
  leaderForGroup,
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
  state.quittungMonat = '06';
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
  });

  it('returns only non-printed citizens as active', () => {
    state.data.citizens = [
      baseCitizen({ id: 'active', status: 'geprüft' }),
      baseCitizen({ id: 'printed', status: 'gedruckt' })
    ];

    assert.deepEqual(activeCitizens().map(citizen => citizen.id), ['active']);
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

  it('uses precise assignment from findeSoko when editable data has no group', () => {
    state.data.streets = [];
    globalThis.findeSoko = () => ({ strasse: 'Neue Straße', ortsteil: 'Tegel', soko: '02' });

    assert.deepEqual(preciseStreetAssignment(baseCitizen({ street: 'Neue Straße' })), {
      name: 'Neue Straße',
      district: 'Tegel',
      groupId: 'SOKO 02'
    });
    assert.equal(streetAssignment(baseCitizen({ street: 'Neue Straße' }))?.groupId, 'SOKO 02');
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
