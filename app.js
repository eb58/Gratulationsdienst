import { canAccessView, isAdmin, state, loadAuthStatus, loadCollectionData } from './modules/state.js';
import { splitStorageKey, MONTH_KEY, QUITTUNG_MONTH_KEY, MAP_MONTH_KEY, isValidEmail } from './modules/utils.js';
import { viewTitles, sokoMapInfoHtml } from './modules/views.js';
import { render } from './modules/render.js';
import { actions } from './modules/actions.js';

window.GRATULATIONSDIENST_VERSION = "20260608-6";

const initialParams = new URLSearchParams(location.search);
const cssEscape = value => globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replace(/"/g, '\\"');
const focusSelectorFor = element => {
  if (!element) return "";
  if (element.id) return `#${cssEscape(element.id)}`;
  if (element.dataset.nav) return `[data-nav="${cssEscape(element.dataset.nav)}"]`;
  if (element.dataset.action) {
    const parts = [`[data-action="${cssEscape(element.dataset.action)}"]`];
    if (element.dataset.id) parts.push(`[data-id="${cssEscape(element.dataset.id)}"]`);
    if (element.dataset.groupId) parts.push(`[data-group-id="${cssEscape(element.dataset.groupId)}"]`);
    if (element.dataset.ruleId) parts.push(`[data-rule-id="${cssEscape(element.dataset.ruleId)}"]`);
    return parts.join("");
  }
  return "";
};

document.addEventListener("click", event => {
  const skipLink = event.target.closest(".skip-link");
  const nav = event.target.closest("[data-nav]");
  const action = event.target.closest("[data-action]");
  const adminOnly = event.target.closest("[data-admin-only]");
  if (skipLink) {
    event.preventDefault();
    state.focusTarget = "#view";
    document.querySelector("#view")?.focus();
    return;
  }
  if ((nav || action) && adminOnly && !isAdmin()) return;
  if (nav) {
    if (!state.auth.user) return;
    if (!canAccessView(nav.dataset.nav)) return;
    state.view = nav.dataset.nav;
    state.focusTarget = "#view";
    render();
    if (state.view === "documents") actions["generate-docs"]();
    if (state.view === "users") actions["load-users"]();
  }
  if (action) {
    state.focusTarget = focusSelectorFor(action);
    actions[action.dataset.action]?.(event);
  }
});

document.addEventListener("input", event => {
  const input = event.target.closest("[data-filter]");
  if (input) {
    state.filters[input.name] = input.value;
    if (input.name === "month") localStorage.setItem(MONTH_KEY, input.value);
    render();
  }
  const bound = event.target.closest("[data-bind]");
  if (bound) state[bound.dataset.bind] = bound.value;
  const email = event.target.closest("input[type='email']");
  if (email) email.classList.toggle("invalid", !isValidEmail(email.value));
});

document.addEventListener("submit", event => event.preventDefault());

document.addEventListener("pointerdown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`.${key}-split`);
  if (!split) return;
  event.preventDefault();
  splitter.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing");
  const move = moveEvent => {
    const rect = split.getBoundingClientRect();
    const raw = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    const next = Math.max(20, Math.min(80, Math.round(raw)));
    state[`${key}Split`] = next;
    split.style.setProperty(`--${key}-left`, `${next}%`);
  };
  const done = () => {
    splitter.releasePointerCapture(event.pointerId);
    document.body.classList.remove("is-resizing");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", done);
    localStorage.setItem(splitStorageKey(key), String(state[`${key}Split`]));
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", done);
});

document.addEventListener("keydown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`.${key}-split`);
  const delta = event.key === "ArrowLeft" ? -4 : event.key === "ArrowRight" ? 4 : 0;
  if (!split || !delta) return;
  event.preventDefault();
  const next = Math.max(20, Math.min(80, state[`${key}Split`] + delta));
  state[`${key}Split`] = next;
  split.style.setProperty(`--${key}-left`, `${next}%`);
  splitter.setAttribute("aria-valuenow", String(next));
  localStorage.setItem(splitStorageKey(key), String(next));
});

document.addEventListener("change", event => {
  if (event.target.dataset.action) { actions[event.target.dataset.action]?.(event); return; }
  if (event.target.matches('[name="wish"]')) { document.querySelector('[data-action="save-citizen"]')?.classList.remove("btn-disabled"); return; }
  if (event.target.matches("#doc-template, #doc-sender, #doc-month, #doc-group")) { actions["generate-docs"](); return; }
  if (event.target.matches("#map-month-select")) {
    state.mapMonth = event.target.value;
    localStorage.setItem(MAP_MONTH_KEY, event.target.value);
    const info = document.querySelector("#map-soko-info");
    if (info) info.innerHTML = sokoMapInfoHtml(info.dataset.groupId || "");
    return;
  }
  const bound = event.target.closest("[data-bind]");
  if (bound) {
    state[bound.dataset.bind] = bound.value;
    if (bound.dataset.bind === "quittungMonat") localStorage.setItem(QUITTUNG_MONTH_KEY, bound.value);
    render();
    return;
  }
  const file = event.target.matches("#import-file") ? event.target.files[0] : null;
  if (file) file.text().then(text => { state.importText = text; actions["run-import"](); });
});

document.addEventListener("mouseover", event => {
  const mapGroup = event.target.closest("[data-group-id]");
  if (!mapGroup) return;
  const info = document.querySelector("#map-soko-info");
  if (!info) return;
  info.dataset.groupId = mapGroup.dataset.groupId;
  info.innerHTML = sokoMapInfoHtml(mapGroup.dataset.groupId);
});

document.addEventListener("mouseout", event => {
  const mapGroup = event.target.closest("[data-group-id]");
  if (!mapGroup) return;
  const related = event.relatedTarget?.closest("[data-group-id]");
  if (related === mapGroup) return;
  const info = document.querySelector("#map-soko-info");
  if (!info) return;
  info.dataset.groupId = "";
  info.innerHTML = sokoMapInfoHtml("");
});

state.view = viewTitles[initialParams.get("view")]
  ? initialParams.get("view")
  : state.view;
if (initialParams.get("resetToken")) {
  localStorage.removeItem("gd_auth_token");
  sessionStorage.removeItem("gd_auth_token");
  state.auth.token = "";
  state.auth.user = null;
  state.auth.mode = "reset";
  state.auth.resetToken = initialParams.get("resetToken");
}
render();
loadAuthStatus().then(() => {
  if (initialParams.get("resetToken")) {
    state.auth.mode = "reset";
    state.auth.resetToken = initialParams.get("resetToken");
  }
  render();
  if (state.auth.user) loadCollectionData();
  if (state.auth.user && state.view === "users") actions["load-users"]();
});
