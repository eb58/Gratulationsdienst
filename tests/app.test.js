import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

const listeners = {};
const classList = () => {
  const classes = new Set();
  return {
    add: value => classes.add(value),
    remove: value => classes.delete(value),
    contains: value => classes.has(value),
    toggle: (value, force) => {
      const enabled = force ?? !classes.has(value);
      if (enabled) classes.add(value);
      else classes.delete(value);
      return enabled;
    }
  };
};
const hint = () => ({ classList: classList(), textContent: '' });
const fieldHost = fieldHint => ({ querySelector: selector => selector === '.field-hint' ? fieldHint : null });
const attrs = () => {
  const values = {};
  return {
    getAttribute: key => values[key],
    setAttribute: (key, value) => { values[key] = String(value); },
    attrs: values
  };
};
const domElement = () => ({
  classList: classList(),
  dataset: {},
  ...attrs(),
  style: {
    setProperty() {},
    removeProperty() {}
  },
  textContent: '',
  innerHTML: '',
  className: '',
  hidden: false,
  querySelector: () => null,
  querySelectorAll: () => [],
  toggleAttribute(name, force) { this[name] = Boolean(force); },
  focus() { this.focused = true; },
  insertAdjacentHTML() {}
});
const eventTarget = ({ dataset = {}, closest = {}, matches = () => false, value = '', files = null } = {}) => {
  const element = {
    dataset,
    value,
    files,
    classList: classList(),
    closest: selector => closest[selector] || null,
    matches
  };
  return element;
};
const input = ({ value = '', type = 'text', dataset = {}, fieldHint = null } = {}) => {
  const element = {
    value,
    type,
    dataset,
    classList: classList(),
    closest: selector => {
      if (selector === 'form') return null;
      if (selector === '[data-filter]') return dataset.filter ? element : null;
      if (selector === '[data-bind]') return dataset.bind ? element : null;
      if (selector === "input[type='email']") return type === 'email' ? element : null;
      if (selector === '[data-iban-field]') return 'ibanField' in dataset ? element : null;
      if (selector === '[data-amount-field]') return 'amountField' in dataset ? element : null;
      if (selector === '[data-postal-code-field]') return 'postalCodeField' in dataset ? element : null;
      if (selector === '[data-digits-field]:not([data-postal-code-field])') return 'digitsField' in dataset && !('postalCodeField' in dataset) ? element : null;
      if (selector === '.field') return fieldHint ? fieldHost(fieldHint) : null;
      return null;
    }
  };
  return element;
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
const elements = {
  '#page-title': domElement(),
  '#topbar-actions': domElement(),
  '#view': domElement(),
  '#toast': domElement(),
  '#busy-indicator': domElement(),
  '#map-soko-info': domElement(),
  '[data-action="save-citizen"]': domElement(),
  '[data-nav-toggle]': domElement(),
  '[data-sidebar-toggle]': domElement()
};
elements['#map-soko-info'].dataset = {};
globalThis.document = {
  body: { classList: classList() },
  addEventListener: (type, handler) => { listeners[type] = handler; },
  removeEventListener: () => {},
  querySelector: selector => elements[selector] || null,
  querySelectorAll: selector => selector === '[data-sidebar-toggle]' ? [elements['[data-sidebar-toggle]']] : []
};
globalThis.addEventListener = (type, handler) => { listeners[type] = handler; };
globalThis.requestAnimationFrame = callback => callback();

await import('../app.js');
const { state } = await import('../modules/state.js');

beforeEach(() => {
  state.quittungBetrag = '';
  state.filters = { q: '', month: 'alle', groupId: 'alle', age: 'alle', status: 'alle', occasion: 'Geburtstag' };
  state.auth.user = { id: 'u1', email: 'admin@example.test', role: 'admin', active: true };
  state.view = 'dashboard';
  state.focusTarget = '';
  elements['#view'].focused = false;
  elements['#map-soko-info'].dataset = {};
  elements['#map-soko-info'].innerHTML = '';
  document.body.classList.remove('nav-open');
  document.body.classList.remove('sidebar-collapsed');
  localStorage.clear();
});

describe('app input validation handler', () => {
  it('updates email invalid state and hint text live', () => {
    const fieldHint = hint();
    const element = input({ value: 'ungueltig', type: 'email', fieldHint });

    listeners.input({ target: element });

    assert.equal(element.classList.contains('invalid'), true);
    assert.equal(fieldHint.textContent, 'E-Mail-Adresse ist ungültig');

    element.value = 'test@example.de';
    listeners.input({ target: element });

    assert.equal(element.classList.contains('invalid'), false);
    assert.equal(fieldHint.textContent, '');
  });

  it('normalizes bound amount fields before writing state', () => {
    const element = input({ value: 'abc8.509', dataset: { amountField: '', bind: 'quittungBetrag' } });

    listeners.input({ target: element });

    assert.equal(element.value, '8,50');
    assert.equal(state.quittungBetrag, '8,50');
  });

  it('validates postal codes live', () => {
    const fieldHint = hint();
    const element = input({ value: '13 43x', dataset: { digitsField: '', postalCodeField: '' }, fieldHint });

    listeners.input({ target: element });

    assert.equal(element.value, '1343');
    assert.equal(element.classList.contains('invalid'), true);
    assert.equal(fieldHint.textContent, 'PLZ muss 5 Ziffern haben');
  });
});

describe('app click handler', () => {
  it('focuses the main view from the skip link', () => {
    let prevented = false;
    const skipLink = {};
    const target = eventTarget({ closest: { '.skip-link': skipLink } });

    listeners.click({ target, preventDefault: () => { prevented = true; } });

    assert.equal(prevented, true);
    assert.equal(state.focusTarget, '#view');
    assert.equal(elements['#view'].focused, true);
  });

  it('toggles the mobile navigation button state', () => {
    const toggle = { ...attrs() };
    const target = eventTarget({ closest: { '[data-nav-toggle]': toggle } });

    listeners.click({ target });

    assert.equal(document.body.classList.contains('nav-open'), true);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(toggle.getAttribute('aria-label'), 'Menü schließen');
  });

  it('toggles and persists the desktop sidebar state', () => {
    const toggle = elements['[data-sidebar-toggle]'];
    const target = eventTarget({ closest: { '[data-sidebar-toggle]': toggle } });

    listeners.click({ target });

    assert.equal(document.body.classList.contains('sidebar-collapsed'), true);
    assert.equal(localStorage.getItem('gd_sidebar_collapsed'), '1');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(toggle.getAttribute('aria-label'), 'Menue ausklappen');

    listeners.click({ target });

    assert.equal(document.body.classList.contains('sidebar-collapsed'), false);
    assert.equal(localStorage.getItem('gd_sidebar_collapsed'), '0');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  });

  it('changes views through nav clicks and closes nav when already active', () => {
    const nav = { dataset: { nav: 'import' } };
    const target = eventTarget({ closest: { '[data-nav]': nav } });

    listeners.click({ target });

    assert.equal(state.view, 'import');

    document.body.classList.add('nav-open');
    listeners.click({ target });

    assert.equal(document.body.classList.contains('nav-open'), false);
  });

  it('stores focus target for delegated actions', () => {
    const action = { dataset: { action: 'unknown-action', id: 'G-1' }, closest: selector => selector === '[data-id]' ? { dataset: { id: 'G-1' } } : null };
    const target = eventTarget({ closest: { '[data-action]': action } });

    listeners.click({ target });

    assert.equal(state.focusTarget, '[data-action="unknown-action"][data-id="G-1"]');
  });
});

describe('app filter and change handlers', () => {
  it('updates filters and persists the month filter from input events', () => {
    const element = input({ value: '06', dataset: { filter: '1' } });
    element.name = 'month';

    listeners.input({ target: element });

    assert.equal(state.filters.month, '06');
    assert.equal(localStorage.getItem('gd_month_filter'), '06');
  });

  it('normalizes plain digit inputs and updates bound state values', () => {
    state.customValue = '';
    const element = input({ value: 'a12b', dataset: { digitsField: '', bind: 'customValue' } });

    listeners.input({ target: element });

    assert.equal(element.value, '12');
    assert.equal(state.customValue, '12');
  });

  it('enforces the cleanup month minimum on bound input', () => {
    state.cleanupMonths = 6;
    const element = input({ value: '5', dataset: { bind: 'cleanupMonths' } });

    listeners.input({ target: element });

    assert.equal(element.value, '6');
    assert.equal(state.cleanupMonths, 6);
  });

  it('prevents form submissions', () => {
    let prevented = false;

    listeners.submit({ preventDefault: () => { prevented = true; } });

    assert.equal(prevented, true);
  });

  it('enables citizen save after wish changes', () => {
    const saveButton = elements['[data-action="save-citizen"]'];
    saveButton.classList.add('btn-disabled');
    const target = eventTarget({ matches: selector => selector === '[name="wish"]' });

    listeners.change({ target });

    assert.equal(saveButton.classList.contains('btn-disabled'), false);
  });

  it('updates map month and refreshes the map info panel', () => {
    const target = eventTarget({ value: '07', matches: selector => selector === '#map-month-select' });
    elements['#map-soko-info'].dataset.groupId = 'offen';

    listeners.change({ target });

    assert.equal(state.mapMonth, '07');
    assert.equal(localStorage.getItem('gd_map_month'), '07');
    assert.match(elements['#map-soko-info'].innerHTML, /Über eine SOKO/);
  });

  it('persists bound receipt month changes', () => {
    const bound = eventTarget({ dataset: { bind: 'quittungMonat' }, value: '08' });
    const target = eventTarget({ closest: { '[data-bind]': bound } });

    listeners.change({ target });

    assert.equal(state.quittungMonat, '08');
    assert.equal(localStorage.getItem('gd_quittung_month'), '08');
  });

  it('loads import files and runs the import action', async () => {
    const file = { text: async () => 'Vorname;Nachname\nErika;Mustermann' };
    const target = eventTarget({ files: [file], matches: selector => selector === '#import-file' });

    listeners.change({ target });
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(state.importText, 'Vorname;Nachname\nErika;Mustermann');
  });

  it('shows a busy signal while import files are processed', async () => {
    let resolveText;
    const textPromise = new Promise(resolve => { resolveText = resolve; });
    const file = { text: () => textPromise };
    const target = eventTarget({ files: [file], matches: selector => selector === '#import-file' });

    listeners.change({ target });

    assert.equal(document.body.classList.contains('is-busy'), true);
    assert.equal(document.body.classList.contains('is-busy-visible'), true);
    assert.equal(elements['#busy-indicator'].hidden, false);

    resolveText('Vorname;Nachname\nErika;Mustermann');
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(document.body.classList.contains('is-busy'), false);
    assert.equal(document.body.classList.contains('is-busy-visible'), false);
    assert.equal(elements['#busy-indicator'].hidden, true);
  });
});

describe('app splitters and lifecycle handlers', () => {
  it('resizes split panes with pointer events and persists the result', () => {
    const split = { getBoundingClientRect: () => ({ left: 100, width: 200 }), style: { setProperty: (key, value) => { split.style[key] = value; } } };
    const splitter = {
      dataset: { splitter: 'print' },
      closest: selector => selector === '.print-split' ? split : null,
      setPointerCapture: id => { splitter.captured = id; },
      releasePointerCapture: id => { splitter.released = id; }
    };
    const target = eventTarget({ closest: { '[data-splitter]': splitter } });
    let prevented = false;

    listeners.pointerdown({ target, pointerId: 7, preventDefault: () => { prevented = true; } });
    listeners.pointermove({ clientX: 230 });
    listeners.pointerup({});

    assert.equal(prevented, true);
    assert.equal(state.printSplit, 65);
    assert.equal(split.style['--print-left'], '65%');
    assert.equal(localStorage.getItem('gratulationsdienst.splitters'), '{"print":65}');
    assert.equal(splitter.released, 7);
  });

  it('resizes split panes with keyboard arrows', () => {
    state.templateSplit = 50;
    const split = { style: { setProperty: (key, value) => { split.style[key] = value; } } };
    const splitter = {
      dataset: { splitter: 'template' },
      closest: selector => selector === '.template-split' ? split : null,
      setAttribute: (key, value) => { splitter[key] = value; }
    };
    const target = eventTarget({ closest: { '[data-splitter]': splitter } });
    let prevented = false;

    listeners.keydown({ target, key: 'ArrowRight', preventDefault: () => { prevented = true; } });

    assert.equal(prevented, true);
    assert.equal(state.templateSplit, 54);
    assert.equal(split.style['--template-left'], '54%');
    assert.equal(splitter['aria-valuenow'], '54');
  });

  it('resizes split panes found by data-split containers', () => {
    state.citizenDetailSplit = 42;
    const split = { getBoundingClientRect: () => ({ left: 0, width: 200 }), style: { setProperty: (key, value) => { split.style[key] = value; } } };
    const splitter = {
      dataset: { splitter: 'citizenDetail' },
      closest: selector => selector === '[data-split="citizenDetail"]' ? split : null,
      setPointerCapture: id => { splitter.captured = id; },
      releasePointerCapture: id => { splitter.released = id; }
    };
    const target = eventTarget({ closest: { '[data-splitter]': splitter } });

    listeners.pointerdown({ target, pointerId: 9, preventDefault: () => {} });
    listeners.pointermove({ clientX: 120 });
    listeners.pointerup({});

    assert.equal(state.citizenDetailSplit, 60);
    assert.equal(split.style['--citizenDetail-left'], '60%');
    assert.equal(localStorage.getItem('gratulationsdienst.splitters'), '{"citizenDetail":60}');
  });

  it('marks dirty forms on beforeunload', () => {
    const control = { name: 'firstName', value: 'Neu', type: 'text', disabled: false };
    const form = {
      dataset: { initialValues: JSON.stringify([['firstName', 'Erika']]) },
      elements: [control],
      getAttribute: key => key === 'id' ? 'citizen-form' : '',
      querySelectorAll: () => []
    };
    const previousQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = selector => selector === 'form' ? [form] : [];
    listeners.input({ target: { ...control, closest: selector => selector === 'form' ? form : null } });
    const event = { preventDefault: () => { event.prevented = true; }, returnValue: undefined };

    listeners.beforeunload(event);

    document.querySelectorAll = previousQuerySelectorAll;
    assert.equal(event.prevented, true);
    assert.equal(event.returnValue, '');
  });
});

describe('app map hover handlers', () => {
  it('updates map info on group hover and clears it on mouseout', () => {
    const group = { dataset: { groupId: 'offen', streetName: 'Teststraße' } };
    const target = eventTarget({ closest: { '[data-group-id]': group } });

    listeners.mouseover({ target });

    assert.equal(elements['#map-soko-info'].dataset.groupId, 'offen');
    assert.match(elements['#map-soko-info'].innerHTML, /Über eine SOKO/);

    listeners.mouseout({ target, relatedTarget: null });

    assert.equal(elements['#map-soko-info'].dataset.groupId, '');
  });
});
