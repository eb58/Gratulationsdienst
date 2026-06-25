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
const domElement = () => ({
  classList: classList(),
  dataset: {},
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
  focus() {},
  insertAdjacentHTML() {}
});
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
  '#toast': domElement()
};
globalThis.document = {
  body: { classList: classList() },
  addEventListener: (type, handler) => { listeners[type] = handler; },
  removeEventListener: () => {},
  querySelector: selector => elements[selector] || null,
  querySelectorAll: () => []
};
globalThis.addEventListener = (type, handler) => { listeners[type] = handler; };
globalThis.requestAnimationFrame = callback => callback();

await import('../app.js');
const { state } = await import('../modules/state.js');

beforeEach(() => {
  state.quittungBetrag = '';
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
