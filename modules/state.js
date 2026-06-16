import { STORAGE_KEY, MONTH_KEY, QUITTUNG_MONTH_KEY, MAP_MONTH_KEY, API_BASE, storedSplit, repairStoredText, toast } from './utils.js';
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

export const mergeById = (existing, defaults, keep = () => true) => {
  const existingItems = existing || [];
  return [
    ...defaults.map(item => ({ ...item, ...existingItems.find(entry => entry.id === item.id && keep(entry)) })),
    ...existingItems.filter(item => keep(item) && !defaults.some(entry => entry.id === item.id))
  ];
};

export const normalizeTemplate = template => {
  const fallback = defaultData.templates.find(t => t.id === template.id) || {};
  return { ...fallback, ...template, format: template.format || fallback.format || "DIN A4 Brief" };
};

export const normalizeTemplates = templates => [
  ...defaultData.templates.map(template => normalizeTemplate({ ...template, ...(templates || []).find(t => t.id === template.id) })),
  ...(templates || []).filter(template => !defaultData.templates.some(t => t.id === template.id)).map(normalizeTemplate)
];

export const normalizeLoadedData = data => {
  const repaired = repairStoredText(data);
  const activeGroupIds = new Set(defaultData.sokoGroups.map(group => group.id));
  return {
    ...repaired,
    sokoGroups: mergeById(repaired?.sokoGroups, defaultData.sokoGroups, group => activeGroupIds.has(group.id)),
    sokoMembers: mergeById(repaired?.sokoMembers, defaultData.sokoMembers, member => activeGroupIds.has(member.groupId)),
    streets: repaired?.streets?.length ? repaired.streets : buildStreetData(),
    templates: normalizeTemplates(repaired?.templates)
  };
};

export const loadData = () => {
  try {
    return normalizeLoadedData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultData));
  } catch {
    return normalizeLoadedData(structuredClone(defaultData));
  }
};

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
  quittungSplit: storedSplit("quittung", 38),
  quittungBetrag: "8,50",
  quittungTelefon: "90294 4055",
  quittungKapitel: "3930",
  quittungTitel: "68154",
  quittungMonat: localStorage.getItem(QUITTUNG_MONTH_KEY) || new Date().toISOString().slice(5, 7),
  mapMonth: localStorage.getItem(MAP_MONTH_KEY) || new Date().toISOString().slice(5, 7),
  importText: "",
  importSplit: storedSplit("import", 42),
  citizenSplit: storedSplit("citizen", 50),
  regionSplit: storedSplit("region", 58),
  generatedDocs: [],
  printBackground: true,
  dashboardSort: { key: "group", dir: "asc" },
  selectedUserId: "",
  focusTarget: "",
  gridApis: {},
  dialog: null
};

export const apiCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates", "importLog"];
export const adminCollections = ["sokoGroups", "sokoMembers", "streets", "senders", "templates"];
export const adminViews = ["soko", "regions", "map", "senders", "templates", "quittungStamm", "users"];
export const persistedCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
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
  if (state.auth.token) sessionStorage.setItem(AUTH_TOKEN_KEY, state.auth.token);
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
export const saveBackendCollection = (collection, items) => apiRequest(`/${collection}`, {
  method: "PUT",
  body: JSON.stringify(items)
});

export const saveCollectionData = data => location.protocol === "file:"
  ? Promise.resolve()
  : !state.auth.token ? Promise.resolve()
  : Promise.all(writableCollections().map(collection => saveBackendCollection(collection, data[collection] || [])))
    .catch(error => console.warn("Datenbank-Speicherung nicht verfügbar.", error));

export const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  saveCollectionData(state.data);
};

export const loadCollectionData = () => {
  if (location.protocol === "file:") return;
  if (!state.auth.user || !state.auth.token) return;
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
