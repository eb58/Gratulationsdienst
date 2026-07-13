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
let saveQuestionnairePagesImpl = async pages => pages;
let simulationCitizens = null;

mock.module('../modules/render.js', {
  namedExports: { render: () => {}, renderDialog: () => {}, applyPendingFocus: () => {} }
});
mock.module('../modules/views.js', {
  namedExports: {
    renderCitizenDetail: () => { renderCitizenDetailCount += 1; },
    renderMemberDetail: () => {}
  }
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
  namedExports: {
    createSokoQuestionnaireSimulation: async citizens => {
      simulationCitizens = citizens;
      return { pages: [], file: null };
    }
  }
});
mock.module('../modules/questionnairePages.js', {
  namedExports: {
    saveQuestionnairePages: pages => saveQuestionnairePagesImpl(pages),
    deleteAllQuestionnairePages: async () => {},
    deleteQuestionnairePagesForCitizens: async () => {}
  }
});
mock.module('../modules/sokoQuestionnaire.js', {
  namedExports: {
    applySokoQuestionnaireResults: citizens => ({
      citizens: citizens.map(citizen => citizen.id === 'G-1'
        ? { ...citizen, wish: 'per Post', status: 'geladen' }
        : citizen),
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
  questionnaireCycle: '2026-06',
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
  saveQuestionnairePagesImpl = async pages => pages;
  simulationCitizens = null;
  state.data = {
    citizens: [citizen('G-1', 'Alpha'), citizen('G-2', 'Beta')],
    questionnaireCases: [],
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

  it('rolls back citizen changes when questionnaire scans cannot be saved', async () => {
    saveQuestionnairePagesImpl = async () => { throw new Error('scan save failed'); };
    const previousCitizens = structuredClone(state.data.citizens);
    const previousQuestionnaireCases = structuredClone(state.data.questionnaireCases);
    setVisibleCitizenRows(['G-1']);

    await actions['run-soko-pdf-import']({ file: { name: 'scan.pdf', type: 'application/pdf' } });

    assert.deepEqual(state.data.citizens, previousCitizens);
    assert.deepEqual(state.data.questionnaireCases, previousQuestionnaireCases);
    assert.equal(renderCitizenDetailCount, 0);
  });
});

describe('SOKO-PDF-Simulation Auswahl', () => {
  it('erzeugt Fragebögen nur für Jubilare mit Status "importiert"', async () => {
    state.data.citizens = [
      citizen('G-1', 'Alpha'),
      { ...citizen('G-2', 'Beta'), status: 'offen' },
      { ...citizen('G-3', 'Gamma'), status: 'geprüft' },
      { ...citizen('G-4', 'Delta'), status: 'geladen' },
      { ...citizen('G-5', 'Epsilon'), status: 'gedruckt' }
    ];
    setVisibleCitizenRows(['G-1', 'G-2', 'G-3', 'G-4', 'G-5']);

    await actions['simulate-soko-pdf-import']();

    assert.deepEqual(simulationCitizens.map(c => c.id), ['G-1']);
  });

  it('erzeugt keine Fragebögen für Verstorbene', async () => {
    state.data.citizens = [
      citizen('G-1', 'Alpha'),
      { ...citizen('G-2', 'Beta'), deceased: true }
    ];
    setVisibleCitizenRows(['G-1', 'G-2']);

    await actions['simulate-soko-pdf-import']();

    assert.deepEqual(simulationCitizens.map(c => c.id), ['G-1']);
  });

  it('erzeugt keine Fragebögen für aus Reinickendorf Verzogene', async () => {
    state.data.citizens = [citizen('G-1', 'Alpha'), { ...citizen('G-2', 'Beta'), moved: true }];
    setVisibleCitizenRows(['G-1', 'G-2']);

    await actions['simulate-soko-pdf-import']();

    assert.deepEqual(simulationCitizens.map(c => c.id), ['G-1']);
  });

  it('lässt Jubilare mit bereits vorhandenem Fragebogen aus', async () => {
    state.data.citizens = [
      citizen('G-1', 'Alpha'),
      { ...citizen('G-2', 'Beta'), sokoQuestionnaireImages: [{ id: 'x', importId: 'QC-G-2-2026-06' }] }
    ];
    setVisibleCitizenRows(['G-1', 'G-2']);

    await actions['simulate-soko-pdf-import']();

    assert.deepEqual(simulationCitizens.map(c => c.id), ['G-1']);
  });
});
