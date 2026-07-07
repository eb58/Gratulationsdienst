import { normalize, escapeHtml, formatDate, safeStorageSetItem, birthdayMonth } from './utils.js';
import { streetGroupDisplay, sokoColors } from './domain.js';
import { state } from './state.js';
import { filteredCitizens, groupForCitizen } from './assignment.js';
import { SOKO_QUESTIONNAIRE_IMPORTED_STATUS } from './sokoQuestionnaire.js';
import { render, renderDialog } from './render.js'; // Zyklus OK: render wird nur in Event-Callbacks aufgerufen
import { renderCitizenDetail, renderRegionAssignment } from './views.js'; // Zyklus OK: lazy
import { requestDirtyFormLeave } from './dirtyForms.js';
import { loadQuestionnairePagesForCitizen } from './questionnairePages.js';
import { loadScript } from './scriptLoader.js';
import { weddingAnniversaryLabel } from './weddingAnniversaries.js';

let agGridPromise = null;
export const ensureAgGrid = () => agGridPromise ||= loadScript(`${import.meta.env?.BASE_URL ?? "/"}vendor/ag-grid-community.min.js`);

export const gridTheme = () => globalThis.agGrid?.themeQuartz?.withParams ? globalThis.agGrid.themeQuartz.withParams({
  accentColor: "#0f5d58",
  borderColor: "#d9d5ca",
  browserColorScheme: "light",
  fontFamily: "Berlin Type, BerlinType, Berlin Type Office, Segoe UI, Arial, sans-serif",
  headerBackgroundColor: "#fbfaf7",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#f1f7f5",
  selectedRowBackgroundColor: "#d8efe8"
}) : undefined;

export const badgeCell = (value, tone = "") => `<span class="pill ${tone}">${escapeHtml(value)}</span>`;
const renderCitizenDetailWithQuestionnaires = () => {
  renderCitizenDetail();
  const citizenId = state.selectedCitizenId;
  loadQuestionnairePagesForCitizen(citizenId).then(pages => {
    if (pages.length && state.selectedCitizenId === citizenId) renderCitizenDetail();
  });
};
const accentBadgeCell = (value, color) => `
  <span class="pill" style="color:${color}">
    ${escapeHtml(value)}
  </span>
`;
const sokoBadgeCell = value => value === "offen"
  ? badgeCell("offen", "red")
  : accentBadgeCell(value, sokoColors[value] || "#0f5d58");
const statusBadgeCell = value => {
  if (value === "offen") return badgeCell(value, "gold");
  if (value === "verschwunden") return badgeCell(value, "red");
  const color = value === "importiert" ? "#315a8c"
    : value === "geprüft" ? "#2f7d4f"
    : value === SOKO_QUESTIONNAIRE_IMPORTED_STATUS ? "#7a4f9f"
    : value === "gedruckt" ? "#0f5d58"
    : "#66706d";
  return accentBadgeCell(value, color);
};
const wishBadgeCell = value => {
  const normalized = normalize(value);
  const tone = normalized === "keine" ? "red"
    : normalized === "offen" || !normalized ? "gold"
    : normalized.startsWith("besuch") ? "green"
    : "";
  return badgeCell(value || "offen", tone);
};
const agTheme = () => { const theme = gridTheme(); return theme ? { theme } : {}; };

export const baseGridOptions = () => ({
  ...agTheme(),
  animateRows: true,
  defaultColDef: { filter: true, floatingFilter: true, resizable: true, sortable: true },
  localeText: {
    advancedFilterAnd: "UND", advancedFilterApply: "Anwenden", advancedFilterBlank: "leer",
    advancedFilterBuilder: "Filter-Assistent", advancedFilterCancel: "Abbrechen",
    advancedFilterClear: "Löschen", advancedFilterColumn: "Spalte", advancedFilterContains: "enthält",
    advancedFilterEndsWith: "endet mit", advancedFilterEquals: "gleich", advancedFilterFalse: "falsch",
    advancedFilterGreaterThan: "größer als", advancedFilterGreaterThanOrEqual: "größer oder gleich",
    advancedFilterJoin: "Verknüpfung", advancedFilterLessThan: "kleiner als",
    advancedFilterLessThanOrEqual: "kleiner oder gleich", advancedFilterNotBlank: "nicht leer",
    advancedFilterNotContains: "enthält nicht", advancedFilterNotEqual: "ungleich",
    advancedFilterOr: "ODER", advancedFilterStartsWith: "beginnt mit", advancedFilterTrue: "wahr",
    advancedFilterValue: "Wert", after: "nach", andCondition: "UND", applyFilter: "Anwenden",
    ariaAdvancedFilterBuilderItem: "Filterbedingung", ariaColumn: "Spalte",
    ariaColumnFiltered: "Spalte gefiltert", ariaColumnGroup: "Spaltengruppe",
    ariaColumnList: "Spaltenliste", ariaColumnPanelList: "Spaltenbereich",
    ariaColumnSelectAll: "Alle Spalten auswählen", ariaDateFilterInput: "Datumsfilter-Eingabe",
    ariaDefaultListName: "Liste", ariaFilterColumnsInput: "Spalten suchen",
    ariaFilterFromValue: "Filter von Wert", ariaFilterInput: "Filtereingabe",
    ariaFilterList: "Filterliste", ariaFilterMenuOpen: "Filtermenü öffnen",
    ariaFilterToValue: "Filter bis Wert", ariaFilteringOperator: "Filteroperator",
    ariaHidden: "ausgeblendet", ariaIndeterminate: "unbestimmt", ariaInputEditor: "Eingabeeditor",
    ariaMenuColumn: "Spaltenmenü öffnen", ariaPageSizeSelectorLabel: "Seitengröße",
    ariaRowDeselect: "Zeile abwählen", ariaRowSelect: "Zeile auswählen", ariaSearch: "Suche",
    ariaSortableColumn: "Sortierbare Spalte", ariaToggleVisibility: "Sichtbarkeit umschalten",
    ariaUnchecked: "nicht ausgewählt", ariaVisible: "sichtbar",
    autosizeAllColumns: "Alle Spalten automatisch anpassen",
    autosizeThisColumn: "Diese Spalte automatisch anpassen",
    before: "vor", blanks: "Leer", cancelFilter: "Abbrechen", clearFilter: "Zurücksetzen",
    columns: "Spalten", contains: "Enthält", copy: "Kopieren",
    copyWithHeaders: "Mit Überschriften kopieren", dateFormatOoo: "tt.mm.jjjj",
    endsWith: "Endet mit", equals: "Gleich", false: "Falsch", filterOoo: "Filtern...",
    first: "Erste", firstPage: "Erste Seite", greaterThan: "Größer als",
    greaterThanOrEqual: "Größer oder gleich", inRange: "Im Bereich", lessThan: "Kleiner als",
    lessThanOrEqual: "Kleiner oder gleich", last: "Letzte", lastPage: "Letzte Seite",
    loadingOoo: "Lade...", next: "Weiter", nextPage: "Nächste Seite",
    noRowsToShow: "Keine Datensätze vorhanden", notBlank: "Nicht leer",
    notContains: "Enthält nicht", notEqual: "Ungleich", of: "von", orCondition: "ODER",
    page: "Seite", pageSizeSelectorLabel: "Zeilen:", paste: "Einfügen", previous: "Zurück",
    previousPage: "Vorherige Seite", resetColumns: "Spalten zurücksetzen",
    searchOoo: "Suchen...", selectAll: "Alle auswählen",
    selectAllSearchResults: "Alle Suchergebnisse auswählen",
    sortAscending: "Aufsteigend sortieren", sortDescending: "Absteigend sortieren",
    startsWith: "Beginnt mit", to: "bis", true: "Wahr"
  },
  pagination: true,
  paginationPageSize: 20,
  paginationPageSizeSelector: [20, 50, 100],
  rowHeight: 46,
  rowSelection: { checkboxes: false, enableClickSelection: true, mode: "singleRow" },
  suppressCellFocus: true
});

const filteredMembers = () => state.data.sokoMembers.filter(member => {
  const haystack = normalize([member.firstName, member.lastName, member.groupId, member.email, member.phone, member.mobile].join(" "));
  return (state.filters.groupId === "alle" || member.groupId === state.filters.groupId)
    && (!state.filters.q || haystack.includes(normalize(state.filters.q)));
});


const legacyGridColumnStorageKey = gridKey => `gratulationsdienst.grid.${gridKey}.columnWidths`;
const gridStateStorageKey = gridKey => `gratulationsdienst.grid.${gridKey}.state`;
const normalizedColumnSort = sort => {
  if (sort) return { sort };
  if (sort === null) return { sort: null };
  return {};
};
const normalizedColumnState = columnState => Array.isArray(columnState)
  ? columnState
    .map(({ colId, width, sort, sortIndex }) => ({
      colId,
      width,
      ...normalizedColumnSort(sort),
      ...(Number.isFinite(sortIndex) ? { sortIndex } : {})
    }))
    .filter(item => item.colId && Number.isFinite(item.width))
  : [];
const normalizedSortState = columnState => normalizedColumnState(columnState)
  .filter(item => item.sort === "asc" || item.sort === "desc")
  .map(({ colId, sort, sortIndex }, index) => ({ colId, sort, sortIndex: Number.isFinite(sortIndex) ? sortIndex : index }));
const gridStateFromParsed = parsed => ({
  columnState: normalizedColumnState(parsed?.columnState),
  sortState: Array.isArray(parsed?.sortState)
    ? parsed.sortState.filter(item => item?.colId && (item.sort === "asc" || item.sort === "desc"))
    : normalizedSortState(parsed?.columnState),
  filterModel: parsed?.filterModel && typeof parsed.filterModel === "object" ? parsed.filterModel : {},
  paginationPageSize: Number.isFinite(parsed?.paginationPageSize) ? parsed.paginationPageSize : undefined
});
const storedGridState = gridKey => {
  try {
    const parsed = JSON.parse(localStorage.getItem(gridStateStorageKey(gridKey)) || "null");
    const gridState = gridStateFromParsed(parsed);
    if (gridState.columnState.length || gridState.sortState.length || Object.keys(gridState.filterModel).length || Number.isFinite(gridState.paginationPageSize)) return gridState;
  } catch { /* gespeicherter Grid-State nicht lesbar */ }
  try {
    const columnState = JSON.parse(localStorage.getItem(legacyGridColumnStorageKey(gridKey)) || "[]");
    return gridStateFromParsed({ columnState });
  } catch { return gridStateFromParsed(null); }
};
const restoreGridState = (gridKey, api) => {
  try {
    const gridState = storedGridState(gridKey);
    const stateByColumn = new Map(gridState.columnState.map(item => [item.colId, item]));
    gridState.sortState.forEach(({ colId, sort, sortIndex }) => {
      const existing = stateByColumn.get(colId) || { colId };
      stateByColumn.set(colId, { ...existing, sort, sortIndex });
    });
    const columnState = [...stateByColumn.values()];
    if (columnState.length) api.applyColumnState?.({ state: columnState, applyOrder: true });
    if (gridState.filterModel && Object.keys(gridState.filterModel).length) api.setFilterModel?.(gridState.filterModel);
    if (Number.isFinite(gridState.paginationPageSize)) api.paginationSetPageSize?.(gridState.paginationPageSize);
  } catch (error) {
    localStorage.removeItem(gridStateStorageKey(gridKey));
    localStorage.removeItem(legacyGridColumnStorageKey(gridKey));
    console.warn(`Tabellenlayout ${gridKey} wurde zurückgesetzt.`, error);
  }
};
const saveGridState = (gridKey, api) => {
  const columnState = normalizedColumnState(api.getColumnState?.());
  if (!columnState?.length) return;
  safeStorageSetItem(localStorage, gridStateStorageKey(gridKey), JSON.stringify({
    columnState,
    sortState: normalizedSortState(columnState),
    filterModel: api.getFilterModel?.() || {},
    paginationPageSize: api.paginationGetPageSize?.()
  }), `Tabellenlayout ${gridKey}`);
};

export const gridDefinitions = {
  citizens: () => ({
    ...baseGridOptions(),
    rowData: filteredCitizens().map(citizen => ({
      id: citizen.id,
      name: `${citizen.lastName}, ${citizen.firstName}`,
      birthday: citizen.birthDate,
      age: Number(new Date().getFullYear()) - Number(citizen.birthDate?.slice(0, 4)),
      address: `${citizen.street} ${citizen.houseNo}`,
      groupId: groupForCitizen(citizen)?.id || "offen",
      wish: citizen.wish || "",
      status: citizen.status
    })),
    columnDefs: [
      { headerName: "Name", field: "name", width: 220, minWidth: 150 },
      { headerName: "Status", field: "status", width: 135, minWidth: 115, cellRenderer: params => statusBadgeCell(params.value) },
      { headerName: "Glückwünsche", field: "wish", width: 155, minWidth: 130, cellRenderer: params => wishBadgeCell(params.value) },
      { headerName: "Geburtstag", field: "birthday", width: 130, minWidth: 120, valueFormatter: params => formatDate(params.value) },
      { headerName: "Alter", field: "age", width: 90, minWidth: 80, filter: "agNumberColumnFilter" },
      { headerName: "Adresse", field: "address", width: 280, minWidth: 180 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => sokoBadgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedCitizenId ? "selected" : "",
    onFirstDataRendered: params => {
      const inList = filteredCitizens().some(c => c.id === state.selectedCitizenId);
      if (!inList) {
        const first = params.api.getDisplayedRowAtIndex(0);
        if (first) { state.selectedCitizenId = first.data.id; renderCitizenDetailWithQuestionnaires(); params.api.redrawRows?.(); }
      }
    },
    onRowClicked: params => {
      saveGridState("citizens", params.api);
      if (params.data.id === state.selectedCitizenId) return;
      const selectRow = () => {
        state.selectedCitizenId = params.data.id;
        renderCitizenDetailWithQuestionnaires();
        params.api.redrawRows?.();
      };
      if (!requestDirtyFormLeave(selectRow)) { params.api.redrawRows?.(); renderDialog(); }
    }
  }),
  members: () => ({
    ...baseGridOptions(),
    rowData: filteredMembers().map(member => ({
      id: member.id,
      name: `${member.lastName}, ${member.firstName}`,
      groupId: member.groupId,
      contact: member.email || member.phone || member.mobile,
      term: `${formatDate(member.termFrom)} bis ${formatDate(member.termTo)}`,
      role: member.isLeader ? "Leitung" : "Mitglied"
    })),
    columnDefs: [
      { headerName: "Name", field: "name", width: 230, minWidth: 170 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => sokoBadgeCell(params.value) },
      { headerName: "Kontakt", field: "contact", width: 285, minWidth: 190 },
      { headerName: "Berufung", field: "term", width: 190, minWidth: 170 },
      { headerName: "Rolle", field: "role", width: 125, minWidth: 110, cellRenderer: params => params.value === "Leitung" ? badgeCell(params.value, "green") : badgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedMemberId ? "selected" : "",
    onRowClicked: params => {
      if (params.data.id === state.selectedMemberId) return;
      const selectRow = () => {
        state.selectedMemberId = params.data.id;
        render();
      };
      if (!requestDirtyFormLeave(selectRow)) { params.api.redrawRows?.(); renderDialog(); }
    }
  }),
  streets: () => ({
    ...baseGridOptions(),
    rowData: state.data.streets.map(street => ({
      id: street.id,
      name: street.name,
      district: street.district,
      groupId: streetGroupDisplay(street),
      ruleCount: street.rules?.length || 0
    })),
    columnDefs: [
      { headerName: "Straße", field: "name", width: 320, minWidth: 220 },
      { headerName: "Ortsteil", field: "district", width: 175, minWidth: 145 },
      { headerName: "Abschnitte", field: "ruleCount", width: 120, minWidth: 105, filter: "agNumberColumnFilter" },
      { headerName: "SOKO", field: "groupId", width: 210, minWidth: 125, cellRenderer: params => sokoBadgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedStreetId ? "selected" : "",
    onRowClicked: params => {
      if (params.data.id === state.selectedStreetId) return;
      const selectRow = () => {
        state.selectedStreetId = params.data.id;
        renderRegionAssignment();
        state.gridApis.streets?.redrawRows?.();
      };
      if (!requestDirtyFormLeave(selectRow)) { params.api.redrawRows?.(); renderDialog(); }
    }
  }),
  documents: () => ({
    ...baseGridOptions(),
    rowData: state.generatedDocs,
    columnDefs: [
      { headerName: "Empfänger", field: "recipient", width: 230, minWidth: 170 },
      { headerName: "Adresse", field: "address", width: 300, minWidth: 210 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => params.value ? sokoBadgeCell(params.value) : badgeCell("offen", "red") },
      { headerName: "Glückwünsche", field: "wish", width: 160, minWidth: 135 },
      { headerName: "Vorlage", field: "templateName", width: 230, minWidth: 180 }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.citizenId === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => { state.selectedCitizenId = params.data.citizenId; render(); }
  }),
  weddingAnniversaries: () => ({
    ...baseGridOptions(),
    rowData: (state.data.weddingAnniversaries || [])
      .filter(item => state.filters.weddingMonth === "alle" || item.weddingDate?.slice(5, 7) === state.filters.weddingMonth)
      .filter(item => state.showAllWeddingAnniversaries || weddingAnniversaryLabel(item.weddingDate))
      .map(item => ({
        id: item.id,
        citizenId: item.citizenId,
        name: `${item.lastName || ""}, ${item.firstName || ""}`.replace(/^, /, ""),
        weddingAnniversary: weddingAnniversaryLabel(item.weddingDate),
        weddingDate: item.weddingDate,
        spouseName: item.spouseName,
        address: `${item.street || ""} ${item.houseNo || ""}`.trim(),
        postalCode: item.postalCode,
        district: item.district,
        source: item.source,
        capturedAt: item.capturedAt
      })),
    columnDefs: [
      { headerName: "Name", field: "name", width: 220, minWidth: 160 },
      { headerName: "Jubiläum", field: "weddingAnniversary", width: 190, minWidth: 160 },
      { headerName: "Hochzeitstag", field: "weddingDate", width: 145, minWidth: 130, valueFormatter: params => formatDate(params.value) },
      { headerName: "Ehegatte", field: "spouseName", width: 170, minWidth: 140 },
      { headerName: "Adresse", field: "address", width: 240, minWidth: 170 },
      { headerName: "Ortsteil", field: "district", width: 145, minWidth: 120 },
      { headerName: "Quelle", field: "source", width: 130, minWidth: 115 },
      { headerName: "Erfasst am", field: "capturedAt", width: 135, minWidth: 120, valueFormatter: params => formatDate(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.citizenId === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => { state.selectedCitizenId = params.data.citizenId; render(); }
  }),
  imported: () => ({
    ...baseGridOptions(),
    rowData: state.data.citizens
      .filter(citizen => citizen.source === "CSV Import")
      .filter(citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month)
      .map(citizen => ({
        id: citizen.id,
        name: `${citizen.lastName}, ${citizen.firstName}`,
        birthday: citizen.birthDate,
        age: Number(new Date().getFullYear()) - Number(citizen.birthDate?.slice(0, 4)),
        address: `${citizen.street} ${citizen.houseNo}`,
        groupId: groupForCitizen(citizen)?.id || "offen",
        status: citizen.status
      })),
    columnDefs: [
      { headerName: "Name", field: "name", width: 230, minWidth: 170 },
      { headerName: "Geburtstag", field: "birthday", width: 130, minWidth: 120, valueFormatter: params => formatDate(params.value) },
      { headerName: "Alter", field: "age", width: 90, minWidth: 80, filter: "agNumberColumnFilter" },
      { headerName: "Adresse", field: "address", width: 280, minWidth: 180 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => sokoBadgeCell(params.value) },
      { headerName: "Status", field: "status", width: 135, minWidth: 115, cellRenderer: params => statusBadgeCell(params.value) }
    ],
    getRowId: params => params.data.id
  })
};

export const mountGrid = element => {
  const gridKey = element.dataset.grid;
  const definition = gridDefinitions[gridKey]?.();
  if (!definition) return;
  if (!globalThis.agGrid?.createGrid) {
    element.innerHTML = `<div class="empty-state">AG Grid wird geladen…</div>`;
    ensureAgGrid().then(() => render()).catch(() => {
      element.innerHTML = `<div class="empty-state">AG Grid konnte nicht geladen werden.</div>`;
    });
    return;
  }
  state.gridApis[gridKey]?.destroy?.();
  const storedPageSize = storedGridState(gridKey).paginationPageSize;
  if (Number.isFinite(storedPageSize)) definition.paginationPageSize = storedPageSize;
  let ready = false;
  const onGridReady = definition.onGridReady;
  definition.onGridReady = params => {
    onGridReady?.(params);
    state.gridApis[gridKey] = params.api;
    restoreGridState(gridKey, params.api);
    requestAnimationFrame(() => { ready = true; });
  };
  const onColumnResized = definition.onColumnResized;
  const onColumnMoved = definition.onColumnMoved;
  const onSortChanged = definition.onSortChanged;
  const onFilterChanged = definition.onFilterChanged;
  const onPaginationChanged = definition.onPaginationChanged;
  definition.onColumnResized = params => { onColumnResized?.(params); if (params.finished) saveGridState(gridKey, params.api); };
  definition.onColumnMoved = params => { onColumnMoved?.(params); saveGridState(gridKey, params.api); };
  definition.onSortChanged = params => { onSortChanged?.(params); saveGridState(gridKey, params.api); };
  definition.onFilterChanged = params => { onFilterChanged?.(params); saveGridState(gridKey, params.api); };
  definition.onPaginationChanged = params => { onPaginationChanged?.(params); if (ready && params.newPageSize) saveGridState(gridKey, params.api); };
  globalThis.agGrid.createGrid(element, definition);
};
// animateRows kurz aus: setGridOption("rowData", ...) waehrend einer laufenden Zeilen-Animation
// hinterlaesst sonst verwaiste .ag-row-Knoten mit doppelten row-index-Werten im DOM.
export const refreshGridRowData = () => Object.entries(state.gridApis).forEach(([gridKey, api]) => {
  api.setGridOption("animateRows", false);
  api.setGridOption("rowData", gridDefinitions[gridKey]().rowData);
  api.setGridOption("animateRows", true);
});
export const mountGrids = () => {
  const hostKeys = new Set([...document.querySelectorAll("[data-grid]")].map(element => element.dataset.grid));
  Object.keys(state.gridApis).forEach(gridKey => {
    if (hostKeys.has(gridKey)) return;
    state.gridApis[gridKey]?.destroy?.();
    delete state.gridApis[gridKey];
  });
  document.querySelectorAll("[data-grid]").forEach(mountGrid);
};
