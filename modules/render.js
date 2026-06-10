import { $, $$ } from './utils.js';
import { state } from './state.js';
import { viewTitles, views } from './views.js';
import { confirmDialog } from './fields.js';
import { mountGrids } from './grid.js';

export const render = () => {
  $("#page-title").textContent = viewTitles[state.view];
  $$(".nav button").forEach(button => button.classList.toggle("active", button.dataset.nav === state.view));
  $("#view").className = `view view-${state.view}`;
  $("#view").innerHTML = `${views[state.view]()}${confirmDialog()}`;
  mountGrids();
};
