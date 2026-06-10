import { state, loadCollectionData } from './modules/state.js';
import { splitStorageKey, MONTH_KEY, isValidEmail } from './modules/utils.js';
import { viewTitles } from './modules/views.js';
import { render } from './modules/render.js';
import { actions } from './modules/actions.js';

window.GRATULATIONSDIENST_VERSION = "20260608-6";

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-nav]");
  const action = event.target.closest("[data-action]");
  if (nav) {
    state.view = nav.dataset.nav;
    render();
    if (state.view === "documents") actions["generate-docs"]();
  }
  if (action) actions[action.dataset.action]?.(event);
});

document.addEventListener("input", event => {
  const input = event.target.closest("[data-filter]");
  if (input) {
    state.filters[input.name] = input.value;
    if (input.name === "month") localStorage.setItem(MONTH_KEY, input.value);
    render();
  }
  const email = event.target.closest("input[type='email']");
  if (email) email.classList.toggle("invalid", !isValidEmail(email.value));
});

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
  if (event.target.matches("#doc-template, #doc-sender, #doc-month, #doc-group")) { actions["generate-docs"](); return; }
  const file = event.target.matches("#import-file") ? event.target.files[0] : null;
  if (file) file.text().then(text => { state.importText = text; actions["run-import"](); });
});

state.view = viewTitles[new URLSearchParams(location.search).get("view")]
  ? new URLSearchParams(location.search).get("view")
  : state.view;
render();
loadCollectionData();
