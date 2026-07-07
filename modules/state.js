import { STORAGE_KEY, PENDING_STORAGE_KEY, MONTH_KEY, QUITTUNG_MONTH_KEY, QUITTUNG_SETTINGS_KEY, MAP_MONTH_KEY, API_BASE, storedSplit, repairStoredText, toast, normalize, safeStorageSetItem } from './utils.js';
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
const persistentCitizens = citizens => Array.isArray(citizens) ? citizens.map(withoutTransientCitizenFields) : citizens;
export const dataForPersistence = data => ({
  ...data,
  citizens: persistentCitizens(data?.citizens)
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
  return Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b)).map(key => [key, sortKeys(value[key])]));
};
const itemSignature = item => JSON.stringify(sortKeys(withoutVersion(item)));
const itemsById = items => Object.fromEntries((items || []).filter(item => item?.id).map(item => [item.id, item]));
const collectionBaselineMap = items => Object.fromEntries((items || [])
  .filter(item => item?.id)
  .map(item => [item.id, withoutVersion(item)]));
const persistedCollectionItems = (data, collection) => dataForPersistence(data)[collection] || [];

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
    citizens: persistentCitizens(repaired?.citizens),
    weddingAnniversaries: Array.isArray(repaired?.weddingAnniversaries) ? repaired.weddingAnniversaries : [],
    sokoGroups: mergeById(repaired?.sokoGroups, defaultData.sokoGroups, group => activeGroupIds.has(group.id)),
    sokoMembers: mergeById(repaired?.sokoMembers, defaultData.sokoMembers, member => activeGroupIds.has(member.groupId)),
    streets: mergeStreets(repaired?.streets || [], buildStreetData()),
    templates: normalizeTemplates(repaired?.templates)
  };
};

const sessionExpiredMessage = "Anmeldung abgelaufen – Änderungen wurden NICHT gespeichert. Bitte neu anmelden, danach werden sie nachgespeichert.";
const pendingBackendData = () => {
  try { return normalizeLoadedData(JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY)) || null); }
  catch { return null; }
};
const storePendingBackendData = data => safeStorageSetItem(localStorage, PENDING_STORAGE_KEY, JSON.stringify(dataForPersistence(data)), "Ungespeicherte Änderungen");
const clearPendingBackendData = () => localStorage.removeItem(PENDING_STORAGE_KEY);
const notifyAuthExpired = () => {
  try { globalThis.dispatchEvent?.(new Event("gd-auth-expired")); } catch { /* ignore */ }
};
export const hasPendingBackendData = () => !!localStorage.getItem(PENDING_STORAGE_KEY);

export const loadData = () => normalizeLoadedData(structuredClone(defaultData));

const quittungSettings = storedQuittungSettings();
const storedSelectedMonth = () => localStorage.getItem(MONTH_KEY)
  || localStorage.getItem(QUITTUNG_MONTH_KEY)
  || localStorage.getItem(MAP_MONTH_KEY)
  || "alle";

export const state = {
  view: "dashboard",
  data: loadData(),
  auth: {
    ready: false,
    setupRequired: false,
    mode: "login",
    token: storedAuthToken(),
    user: null,
    mfaTicket: "",
    resetToken: "",
    users: [],
    mfaSetup: null
  },
  filters: { q: "", month: storedSelectedMonth(), groupId: "alle", age: "alle", status: "alle", occasion: "Geburtstag" },
  selectedCitizenId: "",
  selectedMemberId: "",
  selectedStreetId: "STR-001",
  selectedSenderId: "A-001",
  selectedTemplateId: "T-001",
  quittungBetrag: quittungSettings.quittungBetrag,
  quittungTelefon: quittungSettings.quittungTelefon,
  quittungKapitel: quittungSettings.quittungKapitel,
  quittungTitel: quittungSettings.quittungTitel,
  importText: "",
  importMissingCitizens: [],
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
  printBackground: true,
  showMapPeople: true,
  showAllWeddingAnniversaries: false,
  dashboardSort: { key: "group", dir: "asc" },
  selectedUserId: "",
  focusTarget: "",
  gridApis: {},
  dialog: null,
  collectionVersions: {},
  collectionBaselines: {},
  localChangeVersion: 0
};

export const apiCollections = ["citizens", "weddingAnniversaries", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const adminCollections = ["sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const adminViews = ["soko", "regions", "map", "senders", "templates", "quittungStamm", "users"];
export const persistedCollections = apiCollections;
export const hasBackendData = data => data && persistedCollections.some(key => Array.isArray(data[key]) && data[key].length);
export const isAdmin = () => state.auth.user?.role === "admin";
export const canAccessView = view => !adminViews.includes(view) || isAdmin();
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
  if (state.auth.token && hasPendingBackendData()) state.data = pendingBackendData() || state.data;
  if (state.auth.token) safeStorageSetItem(sessionStorage, AUTH_TOKEN_KEY, state.auth.token, "Authentifizierungs-Token");
  else clearStoredAuthToken();
};
export const clearAuthSession = (message = "") => {
  clearStoredAuthToken();
  state.auth = { ...state.auth, ready: true, mode: "login", token: "", user: null, mfaTicket: "", users: [], mfaSetup: null, message };
};
export const apiRequest = (path, options = {}) => {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (state.auth.token && !headers.Authorization) headers.Authorization = `Bearer ${state.auth.token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async response => {
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    if (response.status === 401 && !path.startsWith("/auth")) { clearAuthSession(sessionExpiredMessage); notifyAuthExpired(); }
    throw Object.assign(new Error(payload.error || `API ${response.status}`), { status: response.status, payload });
  });
};
export const loadAuthStatus = () => apiRequest("/auth/status")
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
export const loadBackendCollection = collection => apiRequest(`/${collection}`).then(items => [collection, items]);
export const saveBackendCollection = (collection, items) => apiRequest(`/${collection}`, {
  method: "PUT",
  body: JSON.stringify({ items: items.map(item => withKnownVersion(collection, item)), knownVersions: state.collectionVersions[collection] || {} })
}).then(savedItems => [collection, savedItems]);
export const saveQuittungSettings = settings => {
  const normalized = normalizeQuittungSettings(settings);
  if (!state.auth.token) return Promise.resolve(applyQuittungSettings(normalized));
  return apiRequest("/settings/receipt", {
    method: "PUT",
    body: JSON.stringify(normalized)
  }).then(applyQuittungSettings);
};
export const loadBackendQuittungSettings = () => !state.auth.user || !state.auth.token
  ? Promise.resolve(null)
  : apiRequest("/settings/receipt").then(applyQuittungSettings);

export const isConflictError = error => error?.status === 409;

const handleSaveError = error => {
  if (isConflictError(error)) {
    console.warn("Datenbank-Konflikt erkannt.", error);
    toast("Daten wurden parallel geändert. Der aktuelle Stand wird neu geladen; bitte die Änderung erneut prüfen.");
    return loadCollectionData({ force: true });
  }
  if (error?.status === 401) {
    storePendingBackendData(state.data);
    state.auth.message = sessionExpiredMessage;
    notifyAuthExpired();
  }
  console.warn("Datenbank-Speicherung nicht verfügbar.", error);
  toast(error?.status === 401
    ? sessionExpiredMessage
    : "Speichern fehlgeschlagen – Änderungen sind nur lokal vorhanden.");
  return null;
};

const persistBackendCollections = async data => {
  const persisted = dataForPersistence(data);
  const changedCollections = writableCollections().filter(collection => collectionOperations(collection, persisted[collection] || []).length > 0);
  if (!changedCollections.length) { clearPendingBackendData(); return {}; }
  const results = await Promise.allSettled(changedCollections.map(collection => saveBackendCollection(collection, persisted[collection] || [])));
  results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value)
    .forEach(([collection, savedItems]) => {
      state.collectionVersions[collection] = collectionVersionMap(savedItems);
      state.collectionBaselines[collection] = collectionBaselineMap(savedItems);
      if (Array.isArray(state.data?.[collection])) {
        const versionById = new Map(savedItems.map(item => [item.id, item._version]));
        state.data[collection] = state.data[collection].map(item => versionById.has(item.id) ? { ...item, _version: versionById.get(item.id) } : item);
      }
    });
  const rejected = results.find(result => result.status === "rejected");
  if (rejected) throw rejected.reason;
  clearPendingBackendData();
  return Object.fromEntries(results.map(result => result.value));
};

let saveQueue = Promise.resolve();

export const saveCollectionData = data => {
  if (!state.auth.token) {
    storePendingBackendData(state.data);
    return Promise.resolve(handleSaveError({ status: 401, message: sessionExpiredMessage }));
  }
  saveQueue = saveQueue
    .catch(() => null)
    .then(() => persistBackendCollections(state.data))
    .catch(error => handleSaveError(error));
  return saveQueue;
};

export const saveData = () => {
  state.localChangeVersion += 1;
  localStorage.removeItem(STORAGE_KEY);
  return saveCollectionData(state.data);
};

export const loadCollectionData = ({ force = false } = {}) => {
  if (!state.auth.user || !state.auth.token) return Promise.resolve();
  const loadChangeVersion = state.localChangeVersion;
  return Promise.all([
    Promise.all(apiCollections.map(loadBackendCollection)),
    loadBackendQuittungSettings().catch(error => {
      console.warn("Quittungs-Einstellungen konnten nicht geladen werden.", error);
      return null;
    })
  ])
    .then(([entries]) => {
      if (!force && state.localChangeVersion !== loadChangeVersion) return;
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
