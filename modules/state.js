import { STORAGE_KEY, MONTH_KEY, API_BASE, storedSplit, repairStoredText, toast } from './utils.js';
import { sampleData, buildStreetData } from './domain.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen

export const mergeById = (existing, defaults, keep = () => true) => [
  ...defaults,
  ...(existing || []).filter(item => keep(item) && !defaults.some(entry => entry.id === item.id))
];

export const normalizeTemplate = template => {
  const fallback = sampleData.templates.find(t => t.id === template.id) || {};
  return { ...fallback, ...template, format: template.format || fallback.format || "DIN A4 Brief" };
};

export const normalizeTemplates = templates => [
  ...sampleData.templates.map(template => normalizeTemplate({ ...template, ...(templates || []).find(t => t.id === template.id) })),
  ...(templates || []).filter(template => !sampleData.templates.some(t => t.id === template.id)).map(normalizeTemplate)
];

export const normalizeLoadedData = data => {
  const repaired = repairStoredText(data);
  const activeGroupIds = new Set(sampleData.sokoGroups.map(group => group.id));
  return {
    ...repaired,
    sokoGroups: mergeById(repaired?.sokoGroups, sampleData.sokoGroups, group => activeGroupIds.has(group.id)),
    sokoMembers: mergeById(repaired?.sokoMembers, sampleData.sokoMembers, member => activeGroupIds.has(member.groupId)),
    streets: repaired?.streets?.length ? repaired.streets : buildStreetData(),
    templates: normalizeTemplates(repaired?.templates)
  };
};

export const loadData = () => {
  try {
    return normalizeLoadedData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(sampleData));
  } catch {
    return normalizeLoadedData(structuredClone(sampleData));
  }
};

export const state = {
  view: "import",
  data: loadData(),
  filters: { q: "", month: localStorage.getItem(MONTH_KEY) || "alle", groupId: "alle", age: "alle", status: "alle", occasion: "Geburtstag" },
  selectedCitizenId: "G-2026-001",
  selectedMemberId: "S-001",
  selectedStreetId: "STR-001",
  selectedSenderId: "A-001",
  selectedTemplateId: "T-001",
  importText: "",
  importSplit: storedSplit("import", 42),
  citizenSplit: storedSplit("citizen", 50),
  regionSplit: storedSplit("region", 58),
  generatedDocs: [],
  printBackground: true,
  gridApis: {},
  dialog: null
};

export const apiCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates", "importLog"];
export const persistedCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const hasBackendData = data => data && persistedCollections.some(key => Array.isArray(data[key]) && data[key].length);
export const apiRequest = (path, options = {}) => fetch(`${API_BASE}${path}`, {
  ...options,
  headers: { "Content-Type": "application/json", ...options.headers }
}).then(response => response.ok ? response.json() : Promise.reject(new Error(`API ${response.status}`)));
export const loadBackendCollection = collection => apiRequest(`/${collection}`).then(items => [collection, items]);
export const saveBackendCollection = (collection, items) => apiRequest(`/${collection}`, {
  method: "PUT",
  body: JSON.stringify(items)
});

export const saveCollectionData = data => location.protocol === "file:"
  ? Promise.resolve()
  : Promise.all(apiCollections.map(collection => saveBackendCollection(collection, data[collection] || [])))
    .catch(error => console.warn("Datenbank-Speicherung nicht verfügbar.", error));

export const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  saveCollectionData(state.data);
};

export const loadCollectionData = () => {
  if (location.protocol === "file:") return;
  Promise.all(apiCollections.map(loadBackendCollection))
    .then(entries => {
      const data = Object.fromEntries(entries);
      if (!hasBackendData(data)) {
        saveCollectionData(state.data);
        return;
      }
      state.data = normalizeLoadedData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      render();
      toast("Daten aus der Datenbank geladen.");
    })
    .catch(error => console.warn("Datenbank-Laden nicht verfügbar.", error));
};
