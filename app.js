import { canAccessView, isAdmin, state, loadAuthStatus, loadCollectionData, clearStoredAuthToken } from './modules/state.js';
import { MONTH_KEY, storeSplit, safeStorageSetItem, isValidEmail, normalizeIban, isValidIban, normalizeAmount, normalizeDigits, isValidPostalCode } from './modules/utils.js';
import { viewTitles, mapHoverInfoHtml, sokoMapInfoHtml } from './modules/views.js';
import { findNearestAddress } from './modules/map.js';
import { render, renderDialog } from './modules/render.js';
import { refreshGridRowData } from './modules/grid.js';
import { actions } from './modules/actions.js';
import { hasDirtyForm, requestDirtyFormLeave, trackDirtyFormChange } from './modules/dirtyForms.js';
import { runBusy } from './modules/busy.js';
import { storeTemplateAgeTextOpen } from './modules/templates.js';

globalThis.GRATULATIONSDIENST_VERSION = typeof __APP_VERSION__ === "undefined" ? "dev" : __APP_VERSION__;

const SIDEBAR_COLLAPSED_KEY = "gd_sidebar_collapsed";
const splitterKeyDelta = key => {
  if (key === "ArrowLeft") return -4;
  if (key === "ArrowRight") return 4;
  return 0;
};
const initialParams = new URLSearchParams(location.search);
const cssEscape = value => globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replaceAll('"', String.raw`\"`);
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
const closeNav = () => {
  document.body.classList.remove("nav-open");
  document.querySelector("[data-nav-toggle]")?.setAttribute("aria-expanded", "false");
};
const updateSidebarToggleState = collapsed => {
  document.querySelectorAll("[data-sidebar-toggle]").forEach(button => {
    const label = collapsed ? "Menue ausklappen" : "Menue einklappen";
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
};
const openSidebarSections = () => {
  document.querySelectorAll("details.nav-section-collapsible").forEach(section => { section.open = true; });
};
const setSidebarCollapsed = collapsed => {
  if (collapsed) openSidebarSections();
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  safeStorageSetItem(localStorage, SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0", "Menuezustand");
  updateSidebarToggleState(collapsed);
};
const restoreSidebarState = () => {
  const collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  if (collapsed) openSidebarSections();
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  updateSidebarToggleState(collapsed);
};
const guardedActionIds = {
  "select-citizen": id => id !== state.selectedCitizenId,
  "select-member": id => id !== state.selectedMemberId,
  "select-street": id => id !== state.selectedStreetId,
  "select-sender": id => id !== state.selectedSenderId,
  "select-template": id => id !== state.selectedTemplateId,
  "select-user": id => id !== state.selectedUserId
};
const guardedActions = new Set(["new-member",
  "delete-member",
  "new-template",
  "new-user",
  "load-audit",
  "load-users",
  "user-reset-password",
  "user-reset-mfa",
  "delete-user",
  "delete-template",
  "auth-logout"
]);
const busyActions = new Set([
  "auth-login",
  "auth-mfa-login",
  "auth-setup",
  "auth-reset-request",
  "auth-reset-apply",
  "auth-logout",
  "load-audit",
  "load-users",
  "save-user",
  "confirm-delete-user",
  "run-import",
  "seed-citizens",
  "confirm-reset-test-database",
  "generate-docs",
  "save-quittung-settings",
  "simulate-soko-pdf-import",
  "run-soko-pdf-import",
  "soko-print",
  "print-all-receipts"
]);
const immediateBusyActions = new Set(["run-import", "seed-citizens", "confirm-reset-test-database", "generate-docs", "simulate-soko-pdf-import", "run-soko-pdf-import"]);
const actionLeavesDirtyMask = action => {
  const id = action.closest("[data-id]")?.dataset.id || "";
  const actionName = action.dataset.action;
  return guardedActionIds[actionName]?.(id) || guardedActions.has(actionName);
};
const runActionByName = (actionName, event, options = {}) => {
  const action = actions[actionName];
  if (!action) return undefined;
  const shouldShowBusy = options.busy ?? busyActions.has(actionName);
  if (!shouldShowBusy) return action(event);
  return runBusy(() => action(event), {
    immediate: options.immediate ?? immediateBusyActions.has(actionName),
    defer: options.defer ?? immediateBusyActions.has(actionName)
  });
};
const afterViewChange = () => {
  if (state.view === "documents") runActionByName("generate-docs");
  if (state.view === "audit") runActionByName("load-audit");
  if (state.view === "users") runActionByName("load-users");
};
const isPdfFile = file => file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
const goToView = view => {
  state.view = view;
  state.focusTarget = "#view";
  closeNav();
  render();
  afterViewChange();
};
const applyFilter = (name, value) => {
  state.filters[name] = value;
  if (name === "month") safeStorageSetItem(localStorage, MONTH_KEY, value, "Monatsfilter");
  render();
};
const updateFilter = input => {
  const previous = state.filters[input.name] ?? "";
  const next = input.value;
  if (String(previous) === next) return true;
  if (hasDirtyForm()) {
    input.value = previous;
    if (!requestDirtyFormLeave(() => applyFilter(input.name, next))) renderDialog();
    return false;
  }
  applyFilter(input.name, next);
  return true;
};
const updateIbanValidity = input => {
  const normalized = normalizeIban(input.value);
  const valid = !normalized || isValidIban(normalized);
  input.classList.toggle("invalid", !valid);
  const hint = input.closest(".field")?.querySelector(".field-hint");
  if (!hint) return;
  hint.classList.toggle("error", !valid);
  hint.textContent = normalized ? valid ? "IBAN gültig" : "IBAN-Prüfziffer ist ungültig" : "Optional, mit IBAN-Prüfzifferprüfung";
};
const updateEmailValidity = input => {
  const hasValue = String(input.value ?? "").trim();
  const valid = isValidEmail(input.value);
  input.classList.toggle("invalid", !valid);
  const hint = input.closest(".field")?.querySelector(".field-hint");
  if (!hint) return;
  hint.classList.toggle("error", Boolean(hasValue && !valid));
  hint.textContent = hasValue && !valid ? "E-Mail-Adresse ist ungültig" : "";
};
const updateAmountInput = input => {
  const normalized = normalizeAmount(input.value);
  if (input.value !== normalized) input.value = normalized;
};
const updateDigitsInput = input => {
  const normalized = normalizeDigits(input.value);
  if (input.value !== normalized) input.value = normalized;
};
const updatePostalCodeValidity = input => {
  updateDigitsInput(input);
  const hasValue = String(input.value ?? "").trim();
  const valid = isValidPostalCode(input.value);
  input.classList.toggle("invalid", !valid);
  const hint = input.closest(".field")?.querySelector(".field-hint");
  if (!hint) return;
  hint.classList.toggle("error", Boolean(hasValue && !valid));
  hint.textContent = hasValue && !valid ? "PLZ muss 5 Ziffern haben" : "";
};
const boundValue = input => input.value;

const handleSkipLinkClick = skipLink => {
  if (!skipLink) return false;
  state.focusTarget = "#view";
  document.querySelector("#view")?.focus();
  return true;
};
const handleNavToggleClick = navToggle => {
  if (!navToggle) return false;
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  return true;
};
const handleSidebarToggleClick = sidebarToggle => {
  if (!sidebarToggle) return false;
  setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  return true;
};
const handleTemplateAgeTextToggle = details => {
  if (!details) return false;
  const age = Number.parseInt(details.querySelector("[data-template-age-text]")?.dataset.age || "", 10);
  if (!Number.isFinite(age)) return false;
  storeTemplateAgeTextOpen(age, details.open);
  return true;
};
const handleNavClick = nav => {
  if (!nav) return false;
  if (!state.auth.user) return true;
  if (!canAccessView(nav.dataset.nav)) return true;
  if (nav.dataset.nav === state.view) {
    closeNav();
    return true;
  }
  if (!requestDirtyFormLeave(() => goToView(nav.dataset.nav))) renderDialog();
  return true;
};
const handleActionClick = (action, event) => {
  if (!action) return false;
  const isSubmitButton = action.matches?.('button[type="submit"]') || (String(action.tagName || '').toLowerCase() === 'button' && action.type === 'submit');
  if (isSubmitButton) event.preventDefault();
  const runAction = () => {
    state.focusTarget = focusSelectorFor(action);
    runActionByName(action.dataset.action, event);
  };
  if (actionLeavesDirtyMask(action)) {
    if (!requestDirtyFormLeave(runAction)) renderDialog();
    return true;
  }
  runAction();
  return true;
};
const handleFormSubmit = (form, event) => {
  event.preventDefault();
  if (!form?.querySelector) return true;
  const submitter = event.submitter || form.querySelector('button[type="submit"][data-action]');
  const actionName = submitter?.dataset.action;
  if (!actionName) return true;
  state.focusTarget = focusSelectorFor(submitter);
  runActionByName(actionName, event);
  return true;
};

document.addEventListener("click", event => {
  const skipLink = event.target.closest(".skip-link");
  const navToggle = event.target.closest("[data-nav-toggle]");
  const sidebarToggle = event.target.closest("[data-sidebar-toggle]");
  const nav = event.target.closest("[data-nav]");
  const action = event.target.closest("[data-action]");
  const adminOnly = event.target.closest("[data-admin-only]");
  if (handleSkipLinkClick(skipLink)) { event.preventDefault(); return; }
  if (handleNavToggleClick(navToggle)) return;
  if (handleSidebarToggleClick(sidebarToggle)) return;
  if ((nav || action) && adminOnly && !isAdmin()) return;
  if (handleNavClick(nav)) return;
  handleActionClick(action, event);
});

document.addEventListener("toggle", event => {
  const details = event.target.closest(".template-age-text");
  if (handleTemplateAgeTextToggle(details)) return;
}, true);

let searchRefreshTimer = null;
document.addEventListener("input", event => {
  trackDirtyFormChange(event);
  const search = event.target.closest('input[name="q"][data-filter]');
  if (search) {
    state.filters.q = search.value;
    clearTimeout(searchRefreshTimer);
    searchRefreshTimer = setTimeout(refreshGridRowData, 120);
    return;
  }
  const input = event.target.closest("[data-filter]");
  if (input) {
    updateFilter(input);
    return;
  }
  const email = event.target.closest("input[type='email']");
  if (email) updateEmailValidity(email);
  const iban = event.target.closest("[data-iban-field]");
  if (iban) updateIbanValidity(iban);
  const amount = event.target.closest("[data-amount-field]");
  if (amount) updateAmountInput(amount);
  const postalCode = event.target.closest("[data-postal-code-field]");
  if (postalCode) updatePostalCodeValidity(postalCode);
  const digits = event.target.closest("[data-digits-field]:not([data-postal-code-field])");
  if (digits) updateDigitsInput(digits);
  const bound = event.target.closest("[data-bind]");
  if (bound) state[bound.dataset.bind] = boundValue(bound);
});

document.addEventListener("submit", event => handleFormSubmit(event.target, event));

document.addEventListener("pointerdown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`[data-split="${key}"]`) || splitter.closest(`.${key}-split`);
  if (!split) return;
  const min = Number(splitter.getAttribute?.("aria-valuemin")) || 20;
  const max = Number(splitter.getAttribute?.("aria-valuemax")) || 80;
  event.preventDefault();
  splitter.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing");
  const move = moveEvent => {
    const rect = split.getBoundingClientRect();
    const raw = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    const next = Math.max(min, Math.min(max, Math.round(raw)));
    state[`${key}Split`] = next;
    split.style.setProperty(`--${key}-left`, `${next}%`);
  };
  const done = () => {
    splitter.releasePointerCapture(event.pointerId);
    document.body.classList.remove("is-resizing");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", done);
    storeSplit(key, state[`${key}Split`]);
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", done);
});

document.addEventListener("keydown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`[data-split="${key}"]`) || splitter.closest(`.${key}-split`);
  const delta = splitterKeyDelta(event.key);
  if (!split || !delta) return;
  event.preventDefault();
  const min = Number(splitter.getAttribute?.("aria-valuemin")) || 20;
  const max = Number(splitter.getAttribute?.("aria-valuemax")) || 80;
  const next = Math.max(min, Math.min(max, state[`${key}Split`] + delta));
  state[`${key}Split`] = next;
  split.style.setProperty(`--${key}-left`, `${next}%`);
  splitter.setAttribute("aria-valuenow", String(next));
  storeSplit(key, next);
});

document.addEventListener("change", event => {
  if (event.target.dataset.action) { runActionByName(event.target.dataset.action, event); return; }
  const dirtyTracked = trackDirtyFormChange(event);
  const input = event.target.closest("[data-filter]");
  if (input) { updateFilter(input); return; }
  if (event.target.matches('[name="wish"], [name="deceased"], [name="moved"]')) { document.querySelector('[data-action="save-citizen"]')?.classList.remove("btn-disabled"); return; }
  if (event.target.matches("#doc-template, #doc-sender, #doc-month, #doc-group")) { runActionByName("generate-docs"); return; }
  const bound = event.target.closest("[data-bind]");
  if (bound) {
    state[bound.dataset.bind] = boundValue(bound);
    if (dirtyTracked) return;
    render();
    return;
  }
  const sokoPdfFile = event.target.matches("#soko-pdf-file") ? event.target.files[0] : null;
  if (sokoPdfFile) {
    runActionByName("run-soko-pdf-import", { file: sokoPdfFile }).finally(() => { event.target.value = ""; });
    return;
  }
  const file = event.target.matches("#import-file") ? event.target.files[0] : null;
  if (file && isPdfFile(file)) {
    runActionByName("run-soko-pdf-import", { file }).finally(() => { event.target.value = ""; });
    return;
  }
  if (file) runBusy(async () => {
    state.importText = await file.text();
    await runActionByName("run-import");
  }, { immediate: true, defer: true }).finally(() => { event.target.value = ""; });
});

globalThis.addEventListener("beforeunload", event => {
  if (!hasDirtyForm()) return;
  event.preventDefault();
  event.returnValue = ""; // NOSONAR: manche Browser zeigen den Verlassen-Dialog nur mit gesetztem returnValue
});

globalThis.addEventListener("gd-auth-expired", () => render());

document.addEventListener("mouseover", event => {
  const mapGroup = event.target.closest("[data-group-id]");
  if (!mapGroup) return;
  const info = document.querySelector("#map-soko-info");
  if (!info) return;
  info.dataset.groupId = mapGroup.dataset.groupId;
  info.dataset.hoverToken = "";
  info.innerHTML = mapHoverInfoHtml(mapGroup.dataset.groupId, mapGroup.dataset.streetName || "");
});

document.addEventListener("mouseout", event => {
  const mapGroup = event.target.closest("[data-group-id]");
  if (!mapGroup) return;
  const related = event.relatedTarget?.closest("[data-group-id]");
  if (related === mapGroup) return;
  const info = document.querySelector("#map-soko-info");
  if (!info) return;
  info.dataset.groupId = "";
  info.dataset.hoverToken = "";
  info.innerHTML = sokoMapInfoHtml("");
});

let pendingMapHoverFrame = null;
let latestMapHoverEvent = null;
document.addEventListener("mousemove", event => {
  if (!event.target.closest(".street-map")) return;
  latestMapHoverEvent = event;
  pendingMapHoverFrame ||= requestAnimationFrame(() => {
    pendingMapHoverFrame = null;
    const event = latestMapHoverEvent;
    const svg = event.target.closest(".street-map");
    if (!svg) return;
    const info = document.querySelector("#map-soko-info");
    const ctm = info && svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const { x, y } = pt.matrixTransform(ctm.inverse());
    const nearest = findNearestAddress(x, y, 16 / ctm.a);
    const token = nearest ? `${nearest.groupId}|${nearest.label}` : "";
    if (!nearest || info.dataset.hoverToken === token) return;
    info.dataset.hoverToken = token;
    info.dataset.groupId = nearest.groupId;
    info.innerHTML = mapHoverInfoHtml(nearest.groupId, nearest.label);
  });
});

state.view = viewTitles[initialParams.get("view")]
  ? initialParams.get("view")
  : state.view;
if (initialParams.get("resetToken")) {
  clearStoredAuthToken();
  state.auth.token = "";
  state.auth.user = null;
  state.auth.mode = "reset";
  state.auth.resetToken = initialParams.get("resetToken");
}
restoreSidebarState();
render();
runBusy(() => loadAuthStatus().then(() => {
  if (initialParams.get("resetToken")) {
    state.auth.mode = "reset";
    state.auth.resetToken = initialParams.get("resetToken");
  }
  render();
  if (state.auth.user) runBusy(() => loadCollectionData());
  if (state.auth.user && state.view === "audit") runActionByName("load-audit");
  if (state.auth.user && state.view === "users") runActionByName("load-users");
}));
