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
globalThis.requestAnimationFrame = cb => cb();
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
  createdAt: '2026-04-01',
  status: 'geprüft',
  wish: 'Besuch erwünscht'
};

beforeEach(() => {
  localStorage.clear();
  delete window.agGrid;
  state.data = {
    citizens: [citizen],
    weddingAnniversaries: [{
      id: 'WA-G-1-golden',
      citizenId: 'G-1',
      firstName: 'Erika',
      lastName: 'Mustermann',
      // Hochzeitstag bewusst auf den 31.12. gelegt, damit das Goldene-Hochzeit-Jubiläum
      // unabhängig vom Testlaufdatum innerhalb des Jahres noch in der Zukunft liegt.
      weddingAnniversary: 'Goldene Hochzeit',
      weddingDate: `${new Date().getFullYear() - 50}-12-31`,
      spouseName: 'Heinz',
      street: 'Teststraße',
      houseNo: '12',
      district: 'Tegel',
      source: 'Fragebogen',
      capturedAt: '2026-06-01'
    }],
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
  state.importMissingCitizens = [];
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
    const citizenDefinition = gridDefinitions.citizens();
    assert.deepEqual(citizenDefinition.rowData.map(row => row.id), ['G-1']);
    assert.equal(citizenDefinition.rowData[0].wish, 'Besuch erwünscht');
    assert.deepEqual(citizenDefinition.columnDefs.slice(0, 3).map(column => column.field), ['name', 'status', 'wish']);
    assert.ok(citizenDefinition.columnDefs.some(column => column.field === 'wish' && column.headerName === 'Glückwünsche'));
    assert.equal(gridDefinitions.members().rowData[0].role, 'Leitung');
    assert.equal(gridDefinitions.streets().rowData[0].ruleCount, 1);
    assert.equal(gridDefinitions.documents().rowData[0].recipient, 'Erika Mustermann');
    assert.equal(gridDefinitions.weddingAnniversaries().rowData[0].weddingAnniversary, 'Goldene Hochzeit');
  });

  it('filtert importierte Jubilare nach ausgewaehltem Monat', () => {
    state.data.citizens = [
      { ...citizen, id: 'G-6', source: 'CSV Import', birthDate: '1936-06-01' },
      { ...citizen, id: 'G-7', source: 'CSV Import', birthDate: '1936-07-01' },
      { ...citizen, id: 'G-manual', source: '', birthDate: '1936-06-01' }
    ];
    state.filters.month = '06';

    assert.deepEqual(gridDefinitions.imported().rowData.map(row => row.id), ['G-6']);

    state.filters.month = 'alle';
    assert.deepEqual(gridDefinitions.imported().rowData.map(row => row.id), ['G-6', 'G-7']);
  });

  it('ignoriert alte ImportMissing-Marker im Importgrid', () => {
    state.data.citizens = [
      { ...citizen, id: 'G-6', source: 'CSV Import', birthDate: '1936-06-01', status: 'geprüft' },
      { ...citizen, id: 'G-7', source: 'CSV Import', birthDate: '1936-06-02', status: 'geprüft' }
    ];
    state.filters.month = 'alle';
    state.importMissingCitizens = [{ id: 'G-7' }];

    const rows = gridDefinitions.imported().rowData;
    assert.deepEqual(rows.map(row => row.id), ['G-6', 'G-7']);
    assert.equal(rows.find(row => row.id === 'G-6').status, 'geprüft');
    assert.equal(rows.find(row => row.id === 'G-7').status, 'geprüft');
  });

  it('filtert das Importgrid strikt nach dem gewaehlten Monat', () => {
    state.data.citizens = [
      { ...citizen, id: 'G-6', source: 'CSV Import', birthDate: '1936-06-01' },
      { ...citizen, id: 'G-7', source: 'CSV Import', birthDate: '1936-07-01' }
    ];
    state.filters.month = '06';
    state.importMissingCitizens = [{ id: 'G-7' }];

    assert.deepEqual(gridDefinitions.imported().rowData.map(row => row.id), ['G-6']);
  });

  it('filtert Hochzeitsjubilaeen nach ausgewaehltem Monat', () => {
    state.data.weddingAnniversaries = [
      { id: 'WA-1', citizenId: 'G-1', firstName: 'Erika', lastName: 'Juni', weddingDate: '1976-06-01', weddingAnniversary: 'Goldene Hochzeit' },
      { id: 'WA-2', citizenId: 'G-2', firstName: 'Eva', lastName: 'Juli', weddingDate: '1966-07-01', weddingAnniversary: 'Diamantene Hochzeit' }
    ];
    state.filters.month = '06';

    assert.deepEqual(gridDefinitions.weddingAnniversaries().rowData.map(row => row.id), ['WA-1']);

    state.filters.month = 'alle';
    assert.deepEqual(gridDefinitions.weddingAnniversaries().rowData.map(row => row.id), ['WA-1', 'WA-2']);
  });

  it('renders SOKO and status cell badges', () => {
    const citizenDefinition = gridDefinitions.citizens();
    const sokoRenderer = citizenDefinition.columnDefs.find(column => column.field === 'groupId').cellRenderer;
    const wishRenderer = citizenDefinition.columnDefs.find(column => column.field === 'wish').cellRenderer;
    const statusRenderer = citizenDefinition.columnDefs.find(column => column.field === 'status').cellRenderer;

    assert.match(sokoRenderer({ value: 'SOKO 01' }), /style="color:/);
    assert.match(sokoRenderer({ value: 'offen' }), /pill red/);
    assert.match(wishRenderer({ value: 'Besuch erwünscht' }), /pill green/);
    assert.match(wishRenderer({ value: 'keine' }), /pill red/);
    assert.match(wishRenderer({ value: '' }), /pill gold/);
    assert.match(statusRenderer({ value: 'offen' }), /pill gold/);
    assert.match(statusRenderer({ value: 'gedruckt' }), /#0f5d58/);
  });
});

describe('mountGrid', () => {
  it('renders an empty state when AG Grid is unavailable', () => {
    const element = { dataset: { grid: 'citizens' }, innerHTML: '' };

    mountGrid(element);

    assert.match(element.innerHTML, /AG Grid wird geladen/);
  });

  it('creates grids, restores state and saves changed state', () => {
    const element = { dataset: { grid: 'citizens' }, innerHTML: '' };
    const calls = [];
    let currentColumnState = [{ colId: 'name', width: 220, sort: 'asc', sortIndex: 0 }];
    let currentPageSize = 50;
    const api = {
      applyColumnState: payload => calls.push(['applyColumnState', payload]),
      setFilterModel: payload => calls.push(['setFilterModel', payload]),
      paginationSetPageSize: payload => { calls.push(['paginationSetPageSize', payload]); currentPageSize = payload; },
      getColumnState: () => currentColumnState,
      getFilterModel: () => ({ status: { values: ['geprüft'] } }),
      paginationGetPageSize: () => currentPageSize
    };
    localStorage.setItem('gratulationsdienst.grid.citizens.state', JSON.stringify({
      columnState: [{ colId: 'birthday', width: 130 }, { colId: 'name', width: 180 }],
      sortState: [{ colId: 'birthday', sort: 'desc', sortIndex: 0 }],
      filterModel: { status: { values: ['offen'] } },
      paginationPageSize: 100
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
    currentPageSize = 100;
    definition.onPaginationChanged({ api, newPageSize: true });

    assert.equal(state.gridApis.citizens, api);
    assert.deepEqual(calls[0], ['applyColumnState', {
      state: [
        { colId: 'birthday', width: 130, sort: 'desc', sortIndex: 0 },
        { colId: 'name', width: 180 }
      ],
      applyOrder: true
    }]);
    assert.deepEqual(calls[1], ['setFilterModel', { status: { values: ['offen'] } }]);
    assert.deepEqual(calls[2], ['paginationSetPageSize', 100]);
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
    assert.equal(savedState.paginationPageSize, 100);
  });

  it('mounts every grid host found in the document', () => {
    const mounted = [];
    const elements = [{ dataset: { grid: 'citizens' } }, { dataset: { grid: 'members' } }];
    globalThis.document = { querySelectorAll: selector => selector === '[data-grid]' ? elements : [] };
    window.agGrid = { createGrid: element => mounted.push(element.dataset.grid) };

    mountGrids();

    assert.deepEqual(mounted, ['citizens', 'members']);
  });

  it('destroys the previous grid instance before mounting a new one for the same key', () => {
    const destroyCalls = [];
    const makeApi = label => ({ destroy: () => destroyCalls.push(label) });
    let created = 0;
    window.agGrid = { createGrid: (_element, options) => { created += 1; options.onGridReady({ api: makeApi(created) }); } };
    const element = { dataset: { grid: 'citizens' }, innerHTML: '' };

    mountGrid(element);
    mountGrid(element);

    assert.equal(created, 2);
    assert.deepEqual(destroyCalls, [1]);
    assert.ok(state.gridApis.citizens);
  });

  it('destroys and drops grid apis whose host disappeared from the document', () => {
    const destroyCalls = [];
    state.gridApis = {
      citizens: { destroy: () => destroyCalls.push('citizens') },
      members: { destroy: () => destroyCalls.push('members') }
    };
    globalThis.document = { querySelectorAll: selector => selector === '[data-grid]' ? [{ dataset: { grid: 'citizens' } }] : [] };
    window.agGrid = { createGrid: (_element, options) => options.onGridReady({ api: { destroy: () => {} } }) };

    mountGrids();

    assert.deepEqual(destroyCalls, ['members', 'citizens']);
    assert.ok(!('members' in state.gridApis));
    assert.ok('citizens' in state.gridApis);
  });
});
