import { normalize, escapeHtml, formatDate, formatDateDe, formatStreetAddress, calculateAge } from './utils.js';
import { streetGroupDisplay } from './domain.js';
import { state } from './state.js';
import { filteredCitizens, groupForCitizen, selectedCitizen } from './assignment.js';
import { documentPreview } from './documents.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Event-Callbacks aufgerufen
import { renderRegionAssignment } from './views.js'; // Zyklus OK: lazy

export const gridTheme = () => window.agGrid?.themeQuartz?.withParams ? window.agGrid.themeQuartz.withParams({
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

const importLogSoko = item => item.groupId || item.soko || String(item.message || "").match(/SOKO \d+/)?.[0] || "";
const importLogCitizen = item => {
  const name = normalize(item.name);
  const address = normalize(item.address || formatStreetAddress(item));
  const byName = state.data.citizens.filter(citizen => normalize(`${citizen.firstName} ${citizen.lastName}`) === name);
  return address
    ? byName.find(citizen => normalize(formatStreetAddress(citizen)) === address)
    : byName.length === 1 ? byName[0] : null;
};
const importLogRow = (item, index) => {
  const citizen = item.birthDate && item.age && item.address ? null : importLogCitizen(item);
  const birthDate = item.birthDate || citizen?.birthDate || "";
  const address = item.address || (citizen ? formatStreetAddress(citizen) : "");
  return {
    ...item,
    id: `LOG-${index}`,
    address,
    birthDate,
    age: item.age || (birthDate ? calculateAge(birthDate) : "")
  };
};

const legacyGridColumnStorageKey = gridKey => `gratulationsdienst.grid.${gridKey}.columnWidths`;
const gridStateStorageKey = gridKey => `gratulationsdienst.grid.${gridKey}.state`;
const storedGridState = gridKey => {
  try {
    const parsed = JSON.parse(localStorage.getItem(gridStateStorageKey(gridKey)) || "null");
    if (parsed?.columnState?.length) return parsed;
  } catch { /* gespeicherter Grid-State nicht lesbar */ }
  try {
    const columnState = JSON.parse(localStorage.getItem(legacyGridColumnStorageKey(gridKey)) || "[]");
    return { columnState: Array.isArray(columnState) ? columnState.filter(item => item?.colId && Number.isFinite(item.width)) : [] };
  } catch { return { columnState: [] }; }
};
const restoreGridState = (gridKey, api) => {
  const gridState = storedGridState(gridKey);
  if (gridState.columnState?.length) api.applyColumnState?.({ state: gridState.columnState, applyOrder: false });
  if (gridState.filterModel && Object.keys(gridState.filterModel).length) api.setFilterModel?.(gridState.filterModel);
};
const saveGridState = (gridKey, api) => {
  const columnState = api.getColumnState?.()
    ?.map(({ colId, width, sort, sortIndex }) => ({ colId, width, sort, sortIndex }))
    .filter(item => item.colId && Number.isFinite(item.width));
  if (!columnState?.length) return;
  try { localStorage.setItem(gridStateStorageKey(gridKey), JSON.stringify({ columnState, filterModel: api.getFilterModel?.() || {} })); } catch { /* localStorage nicht verfuegbar */ }
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
      status: citizen.status
    })),
    columnDefs: [
      { headerName: "Name", field: "name", width: 220, minWidth: 150 },
      { headerName: "Geburtstag", field: "birthday", width: 130, minWidth: 120, valueFormatter: params => formatDate(params.value) },
      { headerName: "Alter", field: "age", width: 90, minWidth: 80, filter: "agNumberColumnFilter" },
      { headerName: "Adresse", field: "address", width: 280, minWidth: 180 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => params.value === "offen" ? badgeCell("offen", "red") : badgeCell(params.value) },
      { headerName: "Status", field: "status", width: 135, minWidth: 115, cellRenderer: params => `<span class="pill ${params.value === "offen" ? "gold" : params.value === "geprüft" ? "green" : ""}">${escapeHtml(params.value)}</span>` }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => { saveGridState("citizens", params.api); state.selectedCitizenId = params.data.id; render(); }
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
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => badgeCell(params.value) },
      { headerName: "Kontakt", field: "contact", width: 285, minWidth: 190 },
      { headerName: "Berufung", field: "term", width: 190, minWidth: 170 },
      { headerName: "Rolle", field: "role", width: 125, minWidth: 110, cellRenderer: params => params.value === "Leitung" ? badgeCell(params.value, "green") : badgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedMemberId ? "selected" : "",
    onRowClicked: params => { state.selectedMemberId = params.data.id; render(); }
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
      { headerName: "SOKO", field: "groupId", width: 210, minWidth: 125, cellRenderer: params => params.value === "offen" ? badgeCell("offen", "red") : badgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedStreetId ? "selected" : "",
    onRowClicked: params => {
      state.selectedStreetId = params.data.id;
      renderRegionAssignment();
      state.gridApis.streets?.redrawRows?.();
    }
  }),
  documents: () => ({
    ...baseGridOptions(),
    rowData: state.generatedDocs,
    columnDefs: [
      { headerName: "Empfänger", field: "recipient", width: 230, minWidth: 170 },
      { headerName: "Adresse", field: "address", width: 300, minWidth: 210 },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, cellRenderer: params => params.value ? badgeCell(params.value) : badgeCell("offen", "red") },
      { headerName: "Glückwünsche", field: "wish", width: 160, minWidth: 135 },
      { headerName: "Vorlage", field: "templateName", width: 230, minWidth: 180 }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.citizenId === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => { state.selectedCitizenId = params.data.citizenId; render(); }
  }),
  importLog: () => ({
    ...baseGridOptions(),
    rowData: state.data.importLog.map(importLogRow),
    columnDefs: [
      { headerName: "Zeit", field: "time", colId: "time", width: 180, minWidth: 165 },
      { headerName: "Name", field: "name", colId: "name", width: 230, minWidth: 170 },
      { headerName: "Geburtstag", field: "birthDate", colId: "birthDate", width: 130, minWidth: 120, valueFormatter: params => formatDateDe(params.value) },
      { headerName: "Alter", field: "age", colId: "age", width: 80, minWidth: 70, filter: "agNumberColumnFilter" },
      { headerName: "Straße / Hausnr.", field: "address", width: 250, minWidth: 190, valueGetter: params => params.data.address || formatStreetAddress(params.data) },
      { headerName: "Ergebnis", field: "type", width: 135, minWidth: 120, cellRenderer: params => params.value === "Fehler" ? badgeCell("Fehler", "red") : params.value === "Dublette" ? badgeCell("Dublette", "gold") : badgeCell("Importiert", "green") },
      { headerName: "SOKO", field: "groupId", width: 115, minWidth: 105, valueGetter: params => importLogSoko(params.data), cellRenderer: params => params.value ? badgeCell(params.value) : badgeCell("offen", "red") }
    ],
    getRowId: params => params.data.id
  })
};

export const mountGrid = element => {
  const gridKey = element.dataset.grid;
  const definition = gridDefinitions[gridKey]?.();
  if (!definition) return;
  if (!window.agGrid?.createGrid) {
    element.innerHTML = `<div class="empty-state">AG Grid konnte nicht geladen werden.</div>`;
    return;
  }
  const onGridReady = definition.onGridReady;
  definition.onGridReady = params => {
    onGridReady?.(params);
    state.gridApis[gridKey] = params.api;
    restoreGridState(gridKey, params.api);
  };
  const onColumnResized = definition.onColumnResized;
  const onSortChanged = definition.onSortChanged;
  const onFilterChanged = definition.onFilterChanged;
  definition.onColumnResized = params => { onColumnResized?.(params); if (params.finished) saveGridState(gridKey, params.api); };
  definition.onSortChanged = params => { onSortChanged?.(params); saveGridState(gridKey, params.api); };
  definition.onFilterChanged = params => { onFilterChanged?.(params); saveGridState(gridKey, params.api); };
  window.agGrid.createGrid(element, definition);
};
export const mountGrids = () => [...document.querySelectorAll("[data-grid]")].forEach(mountGrid);
