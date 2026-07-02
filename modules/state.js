import { STORAGE_KEY, MONTH_KEY, QUITTUNG_MONTH_KEY, QUITTUNG_SETTINGS_KEY, MAP_MONTH_KEY, CLEANUP_MONTHS_KEY, API_BASE, storedSplit, repairStoredText, toast, normalize, cleanupMonthsValue, safeStorageSetItem } from './utils.js';
import { defaultData, buildStreetData } from './domain.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen

const AUTH_TOKEN_KEY = "gd_auth_token";
const storedAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
};
const clearStoredAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};
const defaultQuittungSettings = {
  quittungBetrag: "8,50",
  quittungTelefon: "90294 4055",
  quittungKapitel: "3930",
  quittungTitel: "68154"
};
const quittungSettingKeys = Object.keys(defaultQuittungSettings);
const normalizeQuittungSettings = settings => Object.fromEntries(quittungSettingKeys.map(key => [key, String(settings?.[key] ?? defaultQuittungSettings[key])]));
const applyQuittungSettings = settings => {
  const normalized = normalizeQuittungSettings(settings);
  Object.assign(state, normalized);
  safeStorageSetItem(localStorage, QUITTUNG_SETTINGS_KEY, JSON.stringify(normalized), "Quittungs-Einstellungen");
  return normalized;
};
const storedQuittungSettings = () => {
  try {
    return normalizeQuittungSettings(JSON.parse(localStorage.getItem(QUITTUNG_SETTINGS_KEY)));
  } catch {
    return defaultQuittungSettings;
  }
};

export const mergeById = (existing, defaults, keep = () => true) => {
  const existingItems = existing || [];
  return [
    ...defaults.map(item => ({ ...item, ...existingItems.find(entry => entry.id === item.id && keep(entry)) })),
    ...existingItems.filter(item => keep(item) && !defaults.some(entry => entry.id === item.id))
  ];
};

export const normalizeTemplate = template => {
  const fallback = defaultData.templates.find(t => t.id === template.id) || {};
  return {
    ...fallback,
    ...template,
    format: template.format || fallback.format || "DIN A4 Brief",
    backgroundImage: template.backgroundImage || fallback.backgroundImage || "",
    backBackgroundImage: template.backBackgroundImage || fallback.backBackgroundImage || ""
  };
};

export const normalizeTemplates = templates => [
  ...defaultData.templates.map(template => normalizeTemplate({ ...template, ...(templates || []).find(t => t.id === template.id) })),
  ...(templates || []).filter(template => !defaultData.templates.some(t => t.id === template.id)).map(normalizeTemplate)
];

const mergeStreets = (existing, generated) => {
  const knownNames = new Set(existing.map(s => normalize(s.name)));
  return [...existing, ...generated.filter(s => !knownNames.has(normalize(s.name)))];
};
const withoutTransientCitizenFields = citizen => {
  const { sokoQuestionnaireImages, ...persisted } = citizen || {};
  return persisted;
};
export const dataForPersistence = data => ({
  ...data,
  citizens: Array.isArray(data?.citizens) ? data.citizens.map(withoutTransientCitizenFields) : data?.citizens
});

export const collectionVersionMap = items => Object.fromEntries((items || [])
  .filter(item => item?.id && item._version)
  .map(item => [item.id, String(item._version)]));

const withoutVersion = item => {
  const { _version, ...persisted } = item || {};
  return persisted;
};
const sortKeys = value => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
};
const itemSignature = item => JSON.stringify(sortKeys(withoutVersion(item)));
const itemsById = items => Object.fromEntries((items || []).filter(item => item?.id).map(item => [item.id, item]));
const collectionBaselineMap = items => Object.fromEntries((items || [])
  .filter(item => item?.id)
  .map(item => [item.id, withoutVersion(item)]));
const persistedCollectionItems = (data, collection) => dataForPersistence(data)[collection] || [];

const refreshCollectionBaseline = collection => {
  state.collectionBaselines[collection] = collectionBaselineMap(persistedCollectionItems(state.data, collection));
};

const trackCollectionState = data => {
  for (const collection of persistedCollections) {
    const items = persistedCollectionItems(data, collection);
    state.collectionVersions[collection] = collectionVersionMap(items);
    state.collectionBaselines[collection] = collectionBaselineMap(items);
  }
};

const withKnownVersion = (collection, item) => {
  const knownVersions = state.collectionVersions[collection] || {};
  const version = item?._version || knownVersions[item?.id] || "";
  return version ? { ...item, _version: version } : item;
};

const applySavedItemVersion = (collection, savedItem) => {
  if (!savedItem?.id || !savedItem._version) return;
  state.collectionVersions[collection] = { ...(state.collectionVersions[collection] || {}), [savedItem.id]: String(savedItem._version) };
  if (!Array.isArray(state.data?.[collection])) return;
  state.data[collection] = state.data[collection].map(item => item.id === savedItem.id
    ? { ...item, _version: String(savedItem._version) }
    : item);
};

const collectionOperations = (collection, items) => {
  const baseline = state.collectionBaselines[collection] || {};
  const currentById = itemsById(items);
  const operations = [];

  for (const [id, item] of Object.entries(currentById)) {
    const baselineItem = baseline[id];
    if (!baselineItem) {
      operations.push({ type: "save", collection, item: withKnownVersion(collection, item) });
      continue;
    }
    if (itemSignature(item) !== itemSignature(baselineItem)) {
      operations.push({ type: "save", collection, item: withKnownVersion(collection, item) });
    }
  }

  for (const id of Object.keys(baseline)) {
    if (!currentById[id]) operations.push({ type: "delete", collection, id, version: state.collectionVersions[collection]?.[id] || "" });
  }

  return operations;
};

export const normalizeLoadedData = data => {
  const repaired = repairStoredText(data);
  const activeGroupIds = new Set(defaultData.sokoGroups.map(group => group.id));
  return {
    ...repaired,
    citizens: Array.isArray(repaired?.citizens) ? repaired.citizens.map(withoutTransientCitizenFields) : repaired?.citizens,
    sokoGroups: mergeById(repaired?.sokoGroups, defaultData.sokoGroups, group => activeGroupIds.has(group.id)),
    sokoMembers: mergeById(repaired?.sokoMembers, defaultData.sokoMembers, member => activeGroupIds.has(member.groupId)),
    streets: mergeStreets(repaired?.streets || [], buildStreetData()),
    templates: normalizeTemplates(repaired?.templates)
  };
};

const localDataStorageEnabled = () => location.protocol === "file:";

export const loadData = () => {
  if (!localDataStorageEnabled()) return normalizeLoadedData(structuredClone(defaultData));
  try {
    return normalizeLoadedData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultData));
  } catch {
    return normalizeLoadedData(structuredClone(defaultData));
  }
};

const quittungSettings = storedQuittungSettings();

export const state = {
  view: "dashboard",
  data: loadData(),
  auth: {
    ready: location.protocol === "file:",
    setupRequired: false,
    mode: "login",
    token: storedAuthToken(),
    user: location.protocol === "file:" ? { id: "demo", email: "demo@local", displayName: "Demo", role: "admin", mfaEnabled: false, active: true } : null,
    mfaTicket: "",
    resetToken: "",
    users: [],
    mfaSetup: null
  },
  filters: { q: "", month: localStorage.getItem(MONTH_KEY) || "alle", groupId: "alle", age: "alle", status: "alle", occasion: "Geburtstag" },
  selectedCitizenId: "",
  selectedMemberId: "",
  selectedStreetId: "STR-001",
  selectedSenderId: "A-001",
  selectedTemplateId: "T-001",
  quittungBetrag: quittungSettings.quittungBetrag,
  quittungTelefon: quittungSettings.quittungTelefon,
  quittungKapitel: quittungSettings.quittungKapitel,
  quittungTitel: quittungSettings.quittungTitel,
  quittungMonat: localStorage.getItem(QUITTUNG_MONTH_KEY) || new Date().toISOString().slice(5, 7),
  cleanupMonths: cleanupMonthsValue(localStorage.getItem(CLEANUP_MONTHS_KEY)),
  mapMonth: localStorage.getItem(MAP_MONTH_KEY) || new Date().toISOString().slice(5, 7),
  importText: "",
  importSplit: storedSplit("import", 50),
  citizenSplit: storedSplit("citizen", 50),
  citizenDetailSplit: storedSplit("citizenDetail", 42, 25, 55),
  profileSplit: storedSplit("profile", 50),
  regionSplit: storedSplit("region", 50),
  templateSplit: storedSplit("template", 50),
  sokoSplit: storedSplit("soko", 50),
  senderSplit: storedSplit("sender", 50),
  printSplit: storedSplit("print", 50),
  usersSplit: storedSplit("users", 50),
  generatedDocs: [],
  cleanupPreview: null,
  printBackground: true,
  dashboardSort: { key: "group", dir: "asc" },
  selectedUserId: "",
  focusTarget: "",
  gridApis: {},
  dialog: null,
  collectionVersions: {},
  collectionBaselines: {}
};

export const apiCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const adminCollections = ["sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const adminViews = ["soko", "regions", "map", "senders", "templates", "quittungStamm", "privacy", "users"];
export const persistedCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const hasBackendData = data => data && persistedCollections.some(key => Array.isArray(data[key]) && data[key].length);
export const isAdmin = () => state.auth.user?.role === "admin";
export const canAccessView = view => !adminViews.includes(view) || isAdmin();
export const usesLocalDataStorage = localDataStorageEnabled;
export const writableCollections = () => isAdmin()
  ? apiCollections
  : apiCollections.filter(collection => !adminCollections.includes(collection));
export const setAuthSession = session => {
  state.auth.ready = true;
  state.auth.setupRequired = false;
  state.auth.mode = "login";
  state.auth.token = session.token || "";
  state.auth.user = session.user || null;
  state.auth.mfaTicket = "";
  state.auth.resetToken = "";
  state.auth.mfaSetup = null;
  if (state.auth.token) safeStorageSetItem(sessionStorage, AUTH_TOKEN_KEY, state.auth.token, "Authentifizierungs-Token");
  else clearStoredAuthToken();
};
export const clearAuthSession = () => {
  clearStoredAuthToken();
  state.auth = { ...state.auth, ready: true, token: "", user: null, mfaTicket: "", users: [], mfaSetup: null };
};
export const apiRequest = (path, options = {}) => {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (state.auth.token && !headers.Authorization) headers.Authorization = `Bearer ${state.auth.token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async response => {
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    if (response.status === 401 && !path.startsWith("/auth")) clearAuthSession();
    throw Object.assign(new Error(payload.error || `API ${response.status}`), { status: response.status, payload });
  });
};
export const loadAuthStatus = () => {
  if (location.protocol === "file:") return Promise.resolve(state.auth);
  return apiRequest("/auth/status")
    .then(status => {
      state.auth.ready = true;
      state.auth.setupRequired = !!status.setupRequired;
      state.auth.user = status.authenticated ? status.user : null;
      state.auth.mode = status.setupRequired ? "setup" : "login";
      if (!status.authenticated) {
        state.auth.token = "";
        clearStoredAuthToken();
      }
      return state.auth;
    })
    .catch(error => {
      state.auth.ready = true;
      state.auth.user = null;
      console.warn("Anmeldestatus nicht verfügbar.", error);
      return state.auth;
    });
};
export const loadBackendCollection = collection => apiRequest(`/${collection}`).then(items => [collection, items]);
export const saveBackendItem = (collection, item) => {
  const payload = withKnownVersion(collection, item);
  const version = payload?._version || "";
  const path = version ? `/${collection}/${encodeURIComponent(item.id)}` : `/${collection}`;
  return apiRequest(path, {
    method: version ? "PUT" : "POST",
    body: JSON.stringify(payload)
  }).then(savedItem => [collection, savedItem]);
};
export const deleteBackendItem = (collection, id, version = "") => apiRequest(`/${collection}/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`, {
  method: "DELETE"
}).then(result => [collection, { id, deleted: !!result?.deleted }]);
export const saveQuittungSettings = settings => {
  const normalized = normalizeQuittungSettings(settings);
  if (location.protocol === "file:" || !state.auth.token) return Promise.resolve(applyQuittungSettings(normalized));
  return apiRequest("/settings/receipt", {
    method: "PUT",
    body: JSON.stringify(normalized)
  }).then(applyQuittungSettings);
};
export const loadBackendQuittungSettings = () => location.protocol === "file:" || !state.auth.user || !state.auth.token
  ? Promise.resolve(null)
  : apiRequest("/settings/receipt").then(applyQuittungSettings);

export const isConflictError = error => error?.status === 409;

const handleSaveError = error => {
  if (isConflictError(error)) {
    console.warn("Datenbank-Konflikt erkannt.", error);
    toast("Daten wurden parallel geändert. Der aktuelle Stand wird neu geladen; bitte die Änderung erneut prüfen.");
    return loadCollectionData();
  }
  console.warn("Datenbank-Speicherung nicht verfügbar.", error);
  return null;
};

const persistBackendCollections = async data => {
  const persisted = dataForPersistence(data);
  const operations = writableCollections().flatMap(collection => collectionOperations(collection, persisted[collection] || []));
  if (!operations.length) return {};
  const results = await Promise.allSettled(operations.map(operation => operation.type === "delete"
    ? deleteBackendItem(operation.collection, operation.id, operation.version)
    : saveBackendItem(operation.collection, operation.item)));
  results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value)
    .forEach(([collection, savedItem]) => {
      if (savedItem?.deleted) delete state.collectionVersions[collection]?.[savedItem.id];
      else applySavedItemVersion(collection, savedItem);
    });
  [...new Set(results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value[0]))]
    .forEach(refreshCollectionBaseline);
  const rejected = results.find(result => result.status === "rejected");
  if (rejected) throw rejected.reason;
  return Object.fromEntries(results.map(result => result.value));
};

let saveQueue = Promise.resolve();

export const saveCollectionData = data => {
  if (location.protocol === "file:" || !state.auth.token) return Promise.resolve();
  saveQueue = saveQueue
    .catch(() => null)
    .then(() => persistBackendCollections(state.data))
    .catch(error => handleSaveError(error));
  return saveQueue;
};

export const saveData = () => {
  if (usesLocalDataStorage()) safeStorageSetItem(localStorage, STORAGE_KEY, JSON.stringify(dataForPersistence(state.data)), "Daten");
  else localStorage.removeItem(STORAGE_KEY);
  return saveCollectionData(state.data);
};

export const loadCollectionData = () => {
  if (location.protocol === "file:") return Promise.resolve();
  if (!state.auth.user || !state.auth.token) return Promise.resolve();
  return Promise.all([
    Promise.all(apiCollections.map(loadBackendCollection)),
    loadBackendQuittungSettings().catch(error => {
      console.warn("Quittungs-Einstellungen konnten nicht geladen werden.", error);
      return null;
    })
  ])
    .then(([entries]) => {
      const data = Object.fromEntries(entries);
      if (!hasBackendData(data)) {
        state.collectionVersions = {};
        state.collectionBaselines = {};
        saveCollectionData(state.data);
        localStorage.removeItem(STORAGE_KEY);
        render();
        return;
      }
      state.data = normalizeLoadedData(data);
      trackCollectionState(state.data);
      localStorage.removeItem(STORAGE_KEY);
      if (!data.sokoGroups?.length && state.data.sokoGroups.length && isAdmin()) {
        state.collectionBaselines.sokoGroups = {};
        state.collectionBaselines.sokoMembers = {};
        saveCollectionData(state.data).catch(() => {});
      }
      render();
      toast("Daten aus der Datenbank geladen.");
    })
    .catch(error => console.warn("Datenbank-Laden nicht verfügbar.", error));
};
