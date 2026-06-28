import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

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
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => callback();
globalThis.document = {
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => []
};

let renderCitizenDetailCount = 0;

mock.module('../modules/render.js', {
  namedExports: { render: () => {}, renderDialog: () => {}, applyPendingFocus: () => {} }
});
mock.module('../modules/views.js', {
  namedExports: { renderCitizenDetail: () => { renderCitizenDetailCount += 1; } }
});
mock.module('../modules/documents.js', {
  namedExports: {
    printCurrentRun: () => '',
    completePrintRun: () => [],
    renderSokoForm: () => '',
    renderSokoQuittung: () => ''
  }
});
mock.module('../modules/sokoQuestionnairePdf.js', {
  namedExports: { parseSokoQuestionnairePdf: async () => ({ pages: [{ citizenId: 'G-1', image: 'data:image/png;base64,a' }] }) }
});
mock.module('../modules/sokoQuestionnaireSimulation.js', {
  namedExports: { createSokoQuestionnaireSimulation: async () => ({ pages: [], file: null }) }
});
mock.module('../modules/questionnairePages.js', {
  namedExports: {
    saveQuestionnairePages: async pages => pages,
    deleteAllQuestionnairePages: async () => {},
    deleteQuestionnairePagesForCitizens: async () => {}
  }
});
mock.module('../modules/sokoQuestionnaire.js', {
  namedExports: {
    applySokoQuestionnaireResults: citizens => ({
      citizens,
      pages: [{ applied: true, ok: true, citizen: { id: 'G-1' }, image: 'data:image/png;base64,a', marks: {} }]
    })
  }
});

const { actions } = await import('../modules/actions.js');
const { state } = await import('../modules/state.js');

const citizen = (id, lastName) => ({
  id,
  salutation: 'Frau',
  firstName: 'Erika',
  lastName,
  birthDate: '1936-06-01',
  street: 'Teststraße',
  houseNo: '1',
  postalCode: '13437',
  district: 'Tegel',
  wish: 'offen',
  status: 'importiert'
});

const setVisibleCitizenRows = ids => {
  state.gridApis.citizens = {
    forEachNodeAfterFilterAndSort: callback => ids.forEach((id, index) => callback({ data: { id }, rowIndex: index })),
    getRowNode: id => ({ data: { id } }),
    applyTransaction() {},
    refreshClientSideRowModel() {},
    redrawRows() {},
    paginationGetPageSize: () => 50,
    paginationGoToPage() {},
    ensureIndexVisible() {}
  };
};

beforeEach(() => {
  renderCitizenDetailCount = 0;
  state.data = {
    citizens: [citizen('G-1', 'Alpha'), citizen('G-2', 'Beta')],
    sokoGroups: [],
    sokoMembers: [],
    streets: [],
    senders: [],
    templates: []
  };
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.selectedCitizenId = 'G-2';
  state.gridApis = {};
});

describe('SOKO-PDF UI refresh', () => {
  it('keeps the currently selected visible citizen after loading questionnaires', async () => {
    setVisibleCitizenRows(['G-2', 'G-1']);

    await actions['run-soko-pdf-import']({ file: { name: 'scan.pdf', type: 'application/pdf' } });

    assert.equal(state.selectedCitizenId, 'G-2');
    assert.equal(renderCitizenDetailCount, 1);
  });

  it('selects the first visible citizen when no visible citizen is selected', async () => {
    state.selectedCitizenId = 'G-X';
    setVisibleCitizenRows(['G-2', 'G-1']);

    await actions['run-soko-pdf-import']({ file: { name: 'scan.pdf', type: 'application/pdf' } });

    assert.equal(state.selectedCitizenId, 'G-2');
  });
});
