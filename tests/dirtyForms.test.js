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

// Registrierte Formulare, die document.querySelectorAll("form") zurückgibt.
let forms = [];

const control = ({ name, id, type = 'text', value = '', checked = false, disabled = false, bind } = {}) => ({
  name, id, type, value, checked, disabled, dataset: bind ? { bind } : {}
});

const form = (id, controls = []) => {
  const node = {
    dataset: {},
    elements: controls,
    getAttribute: attr => attr === 'id' ? id : null
  };
  controls.forEach(c => { c.closest = selector => selector === 'form' ? node : null; });
  return node;
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = callback => callback();
globalThis.document = {
  querySelectorAll: selector => selector === 'form' ? forms : []
};

const { state } = await import('../modules/state.js');
const {
  rememberDirtyFormBaselines, trackDirtyFormChange, hasDirtyForm,
  requestDirtyFormLeave, confirmDirtyFormLeave, cancelDirtyFormLeave
} = await import('../modules/dirtyForms.js');

beforeEach(() => {
  forms = [];
  state.dialog = null;
  state.focusTarget = null;
});

describe('rememberDirtyFormBaselines', () => {
  it('legt Baseline nur für getrackte Formular-Ids an', () => {
    const tracked = form('citizen-form', [control({ name: 'firstName', value: 'Max' })]);
    const untracked = form('search-form', [control({ name: 'q', value: 'abc' })]);
    forms = [tracked, untracked];

    rememberDirtyFormBaselines();

    assert.equal(typeof tracked.dataset.initialValues, 'string');
    assert.equal(tracked.dataset.dirty, 'false');
    assert.equal(untracked.dataset.initialValues, undefined);
  });

  it('nutzt das übergebene root statt document', () => {
    const tracked = form('member-form', [control({ name: 'name', value: 'Eva' })]);
    const root = { querySelectorAll: selector => selector === 'form' ? [tracked] : [] };

    rememberDirtyFormBaselines(root);

    assert.equal(tracked.dataset.dirty, 'false');
  });
});

describe('hasDirtyForm', () => {
  it('false direkt nach Baseline ohne Änderung', () => {
    const node = form('citizen-form', [control({ name: 'firstName', value: 'Max' })]);
    forms = [node];
    rememberDirtyFormBaselines();

    assert.equal(hasDirtyForm(), false);
  });

  it('true sobald sich ein Feldwert geändert hat', () => {
    const field = control({ name: 'firstName', value: 'Max' });
    const node = form('citizen-form', [field]);
    forms = [node];
    rememberDirtyFormBaselines();

    field.value = 'Moritz';

    assert.equal(hasDirtyForm(), true);
    assert.equal(node.dataset.dirty, 'true');
  });

  it('true für Formular ganz ohne Baseline (nie initialisiert)', () => {
    forms = [form('street-form', [control({ name: 'plz', value: '13407' })])];

    assert.equal(hasDirtyForm(), true);
  });

  it('ignoriert deaktivierte und schlüssellose Controls in der Signatur', () => {
    const node = form('user-form', [
      control({ name: 'login', value: 'admin' }),
      control({ value: 'kein-key' }),
      control({ name: 'token', value: 'x', disabled: true })
    ]);
    forms = [node];
    rememberDirtyFormBaselines();

    node.elements[2].value = 'geändert-aber-disabled';
    node.elements[1].value = 'geändert-aber-ohne-key';

    assert.equal(hasDirtyForm(), false);
  });

  it('erkennt Checkbox-Umschaltung als Änderung', () => {
    const box = control({ name: 'aktiv', type: 'checkbox', checked: false });
    const node = form('template-form', [box]);
    forms = [node];
    rememberDirtyFormBaselines();

    box.checked = true;

    assert.equal(hasDirtyForm(), true);
  });
});

describe('trackDirtyFormChange', () => {
  it('markiert getracktes Formular und meldet true', () => {
    const field = control({ name: 'firstName', value: 'Max' });
    const node = form('citizen-form', [field]);
    forms = [node];
    rememberDirtyFormBaselines();
    field.value = 'Moritz';

    assert.equal(trackDirtyFormChange({ target: field }), true);
    assert.equal(node.dataset.dirty, 'true');
  });

  it('ignoriert Events außerhalb getrackter Formulare', () => {
    const loose = { closest: () => null };
    assert.equal(trackDirtyFormChange({ target: loose }), false);
  });
});

describe('requestDirtyFormLeave', () => {
  it('führt proceed sofort aus, wenn nichts dirty ist', () => {
    let proceeded = false;
    const result = requestDirtyFormLeave(() => { proceeded = true; });

    assert.equal(result, true);
    assert.equal(proceeded, true);
    assert.equal(state.dialog, null);
  });

  it('öffnet Bestätigungsdialog und hält proceed zurück, wenn dirty', () => {
    const field = control({ name: 'firstName', value: 'Max' });
    forms = [form('citizen-form', [field])];
    rememberDirtyFormBaselines();
    field.value = 'Moritz';

    let proceeded = false;
    const result = requestDirtyFormLeave(() => { proceeded = true; });

    assert.equal(result, false);
    assert.equal(proceeded, false);
    assert.equal(state.dialog.type, 'dirty-form');
    assert.equal(state.dialog.confirmAction, 'confirm-discard-dirty');
    assert.equal(state.focusTarget, '.dialog-box [data-autofocus]');
  });
});

describe('confirmDirtyFormLeave / cancelDirtyFormLeave', () => {
  const makeDirty = () => {
    const field = control({ name: 'firstName', value: 'Max' });
    forms = [form('citizen-form', [field])];
    rememberDirtyFormBaselines();
    field.value = 'Moritz';
  };

  it('gibt das zurückgehaltene proceed zurück und schließt den Dialog', () => {
    makeDirty();
    const proceed = () => 'weiter';
    requestDirtyFormLeave(proceed);

    const returned = confirmDirtyFormLeave();

    assert.equal(returned, proceed);
    assert.equal(state.dialog, null);
  });

  it('liefert nach cancel kein proceed mehr', () => {
    makeDirty();
    requestDirtyFormLeave(() => {});

    cancelDirtyFormLeave();

    assert.equal(confirmDirtyFormLeave(), null);
  });
});
