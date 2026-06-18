import { $, $$ } from './utils.js';
import { canAccessView, state } from './state.js';
import { authView, viewTitles, views } from './views.js';
import { confirmDialog } from './fields.js';
import { mountGrids } from './grid.js';

const focusElement = selector => {
  const element = selector ? document.querySelector(selector) : null;
  if (element?.focus) element.focus({ preventScroll: true });
};

export const applyPendingFocus = () => {
  const focusTarget = state.focusTarget || (state.dialog ? ".dialog-box [data-autofocus]" : "");
  state.focusTarget = "";
  requestAnimationFrame(() => {
    if (focusTarget) {
      focusElement(focusTarget);
      return;
    }
    if (state.dialog) focusElement(".dialog-box");
  });
};

export const render = () => {
  const locked = !state.auth.ready || state.auth.setupRequired || !state.auth.user;
  if (!canAccessView(state.view)) state.view = "dashboard";
  $("#page-title").textContent = locked ? state.auth.setupRequired ? "Ersteinrichtung" : "Anmeldung" : viewTitles[state.view];
  document.body.classList.toggle("auth-locked", locked);
  $$("[data-admin-only]").forEach(element => { element.hidden = state.auth.user?.role !== "admin"; });
  $("#topbar-actions").innerHTML = state.auth.user && !locked ? `
    <div class="user-chip">
      <button type="button" class="user-chip-profile" data-nav="profile" title="Mein Zugang öffnen">
        <span class="user-chip-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
        <span><em>Angemeldet als</em><strong>${state.auth.user.displayName || state.auth.user.email}</strong></span>
      </button>
      <button type="button" class="user-chip-logout" data-action="auth-logout" title="Abmelden" aria-label="Abmelden">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"></path><path d="M9 12h11"></path><path d="m17 9 3 3-3 3"></path></svg>
      </button>
    </div>
  ` : "";
  $$(".nav button").forEach(button => button.classList.toggle("active", button.dataset.nav === state.view));
  $("#view").className = `view view-${state.view}`;
  $("#view").innerHTML = locked ? authView() : `${views[state.view]()}${confirmDialog()}`;
  mountGrids();
  applyPendingFocus();
};
