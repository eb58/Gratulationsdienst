import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

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
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.document = { querySelectorAll: () => [] };

const grid = await import('../modules/grid.js');
const { state } = await import('../modules/state.js');

const {
  badgeCell,
  baseGridOptions,
  gridDefinitions,
  gridTheme,
  mountGrid,
  mountGrids
} = grid;

const citizen = {
  id: 'G-1',
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Mustermann',
  street: 'Teststraße',
  houseNo: '12',
  postalCode: '13437',
  district: 'Tegel',
  birthDate: '1936-06-01',
  status: 'geprüft',
  wish: 'Besuch erwünscht'
};

beforeEach(() => {
  localStorage.clear();
  delete window.agGrid;
  state.data = {
    citizens: [citizen],
    sokoGroups: [{ id: 'SOKO 01', region: 'Tegel' }],
    sokoMembers: [{
      id: 'S-001',
      firstName: 'Lea',
      lastName: 'Leitung',
      groupId: 'SOKO 01',
      email: 'lea@example.test',
      phone: '',
      mobile: '',
      termFrom: '2024-01-01',
      termTo: '2028-12-31',
      isLeader: true
    }],
    streets: [{
      id: 'STR-001',
      name: 'Teststraße',
      district: 'Tegel',
      rules: [{ plz: '13437', soko: '01', von: '1', bis: '99', art: 'F', ortsteil: 'Tegel' }]
    }],
    senders: [],
    templates: [],
    importLog: [
      { time: '10:00', type: 'Importiert', name: 'Mustermann, Erika', address: 'Teststraße 12' },
      { time: '10:01', type: 'Dublette', name: 'Doppel' }
    ]
  };
  state.generatedDocs = [{
    id: 'DOC-G-1',
    citizenId: 'G-1',
    recipient: 'Erika Mustermann',
    address: 'Teststraße 12',
    groupId: 'SOKO 01',
    wish: 'Besuch erwünscht',
    templateName: 'Standard'
  }];
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.selectedCitizenId = 'G-1';
  state.selectedMemberId = 'S-001';
  state.selectedStreetId = 'STR-001';
  state.gridApis = {};
});

describe('grid basics', () => {
  it('renders badges and base options', () => {
    assert.equal(badgeCell('<offen>', 'gold'), '<span class="pill gold">&lt;offen&gt;</span>');
    assert.equal(baseGridOptions().paginationPageSize, 20);
    assert.equal(baseGridOptions().localeText.noRowsToShow, 'Keine Datensätze vorhanden');
  });

  it('passes theme params to AG Grid when available', () => {
    window.agGrid = { themeQuartz: { withParams: params => ({ params }) } };

    const theme = gridTheme();

    assert.equal(theme.params.accentColor, '#0f5d58');
    assert.deepEqual(baseGridOptions().theme, theme);
  });
});

describe('grid definitions', () => {
  it('builds row data for the main grids', () => {
    assert.deepEqual(gridDefinitions.citizens().rowData.map(row => row.id), ['G-1']);
    assert.equal(gridDefinitions.members().rowData[0].role, 'Leitung');
    assert.equal(gridDefinitions.streets().rowData[0].ruleCount, 1);
    assert.equal(gridDefinitions.documents().rowData[0].recipient, 'Erika Mustermann');
  });

  it('maps import log rows and filters duplicates', () => {
    const definition = gridDefinitions.importLog();

    assert.equal(definition.rowData.length, 1);
    assert.equal(definition.rowData[0].birthDate, citizen.birthDate);
    assert.equal(definition.rowData[0].age, new Date().getFullYear() - 1936);
  });

  it('renders SOKO and status cell badges', () => {
    const citizenDefinition = gridDefinitions.citizens();
    const sokoRenderer = citizenDefinition.columnDefs.find(column => column.field === 'groupId').cellRenderer;
    const statusRenderer = citizenDefinition.columnDefs.find(column => column.field === 'status').cellRenderer;

    assert.match(sokoRenderer({ value: 'SOKO 01' }), /style="color:/);
    assert.match(sokoRenderer({ value: 'offen' }), /pill red/);
    assert.match(statusRenderer({ value: 'offen' }), /pill gold/);
    assert.match(statusRenderer({ value: 'gedruckt' }), /#0f5d58/);
  });
});

describe('mountGrid', () => {
  it('renders an empty state when AG Grid is unavailable', () => {
    const element = { dataset: { grid: 'citizens' }, innerHTML: '' };

    mountGrid(element);

    assert.match(element.innerHTML, /AG Grid konnte nicht geladen werden/);
  });

  it('creates grids, restores state and saves changed state', () => {
    const element = { dataset: { grid: 'citizens' }, innerHTML: '' };
    const calls = [];
    let currentColumnState = [{ colId: 'name', width: 220, sort: 'asc', sortIndex: 0 }];
    const api = {
      applyColumnState: payload => calls.push(['applyColumnState', payload]),
      setFilterModel: payload => calls.push(['setFilterModel', payload]),
      getColumnState: () => currentColumnState,
      getFilterModel: () => ({ status: { values: ['geprüft'] } })
    };
    localStorage.setItem('gratulationsdienst.grid.citizens.state', JSON.stringify({
      columnState: [{ colId: 'birthday', width: 130 }, { colId: 'name', width: 180 }],
      sortState: [{ colId: 'birthday', sort: 'desc', sortIndex: 0 }],
      filterModel: { status: { values: ['offen'] } }
    }));
    let definition;
    window.agGrid = { createGrid: (_element, options) => { definition = options; } };

    mountGrid(element);
    definition.onGridReady({ api });
    currentColumnState = [{ colId: 'birthday', width: 130, sort: 'desc', sortIndex: 0 }, { colId: 'name', width: 220, sort: 'asc', sortIndex: 1 }];
    definition.onColumnMoved({ api });
    definition.onColumnResized({ api, finished: true });
    definition.onSortChanged({ api });
    definition.onFilterChanged({ api });

    assert.equal(state.gridApis.citizens, api);
    assert.deepEqual(calls[0], ['applyColumnState', {
      state: [
        { colId: 'birthday', width: 130, sort: 'desc', sortIndex: 0 },
        { colId: 'name', width: 180 }
      ],
      applyOrder: true
    }]);
    assert.deepEqual(calls[1], ['setFilterModel', { status: { values: ['offen'] } }]);
    const savedState = JSON.parse(localStorage.getItem('gratulationsdienst.grid.citizens.state'));
    assert.deepEqual(savedState.columnState, [
      { colId: 'birthday', width: 130, sort: 'desc', sortIndex: 0 },
      { colId: 'name', width: 220, sort: 'asc', sortIndex: 1 }
    ]);
    assert.deepEqual(savedState.sortState, [
      { colId: 'birthday', sort: 'desc', sortIndex: 0 },
      { colId: 'name', sort: 'asc', sortIndex: 1 }
    ]);
    assert.deepEqual(savedState.filterModel, api.getFilterModel());
  });

  it('mounts every grid host found in the document', () => {
    const mounted = [];
    const elements = [{ dataset: { grid: 'citizens' } }, { dataset: { grid: 'members' } }];
    globalThis.document = { querySelectorAll: selector => selector === '[data-grid]' ? elements : [] };
    window.agGrid = { createGrid: element => mounted.push(element.dataset.grid) };

    mountGrids();

    assert.deepEqual(mounted, ['citizens', 'members']);
  });
});
