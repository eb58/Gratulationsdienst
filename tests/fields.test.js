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

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.SOKO_STRASSENVERZEICHNIS = {
  'Teststraße': [{ soko: '01' }, { soko: '02' }]
};

const fields = await import('../modules/fields.js');
const { state } = await import('../modules/state.js');

const {
  emailField,
  field,
  ibanField,
  postalCodeField,
  selectField,
  streetRuleRows,
  textField
} = fields;

beforeEach(() => {
  state.data.sokoGroups = [
    { id: 'SOKO 01', region: 'Tegel' },
    { id: 'SOKO 02', region: 'Wittenau' }
  ];
});

describe('basic field renderers', () => {
  it('escapes text input values and labels', () => {
    const html = field('name', 'Name', '<script>');
    assert.match(html, /value="&lt;script&gt;"/);
    assert.match(html, /<label for="name">Name<\/label>/);
  });

  it('renders select and textarea fields', () => {
    assert.match(selectField('group', 'Gruppe', 'B', [['A', 'Alpha'], ['B', 'Beta']]), /value="B" selected/);
    assert.match(selectField('group', 'Gruppe', 'B', [['B', 'Beta']], '', 'required'), /<select id="group" name="group" required>/);
    assert.match(textField('note', 'Notiz', '<x>'), /&lt;x&gt;/);
  });
});

describe('validated fields', () => {
  it('renders email validation hints', () => {
    assert.match(emailField('email', 'E-Mail', 'ungueltig'), /class="invalid"/);
    assert.match(emailField('email', 'E-Mail', 'ungueltig'), /E-Mail-Adresse ist ungültig/);
    assert.doesNotMatch(emailField('email', 'E-Mail', 'test@example.de'), /E-Mail-Adresse ist ungültig/);
  });

  it('renders postal code validation attributes and hints', () => {
    const invalid = postalCodeField('postalCode', 'PLZ', '1343');
    assert.match(invalid, /data-postal-code-field/);
    assert.match(invalid, /class="invalid"/);
    assert.match(invalid, /PLZ muss 5 Ziffern haben/);
  });

  it('renders IBAN validation attributes and hints', () => {
    assert.match(ibanField('bank', 'IBAN', 'DE88 3704 0044 0532 0130 00'), /IBAN-Prüfziffer ist ungültig/);
    assert.match(ibanField('bank', 'IBAN', 'DE89 3704 0044 0532 0130 00'), /IBAN gültig/);
    assert.match(ibanField('bank', 'IBAN', ''), /data-iban-field/);
  });
});

describe('street rule rows', () => {
  it('marks invalid postal codes and selects existing SOKO rules', () => {
    const html = streetRuleRows({
      district: 'Tegel',
      rules: [{ id: 'R-1', plz: '1343', ortsteil: 'Tegel', soko: '02', art: 'G' }]
    });

    assert.match(html, /name="plz" class="invalid"/);
    assert.match(html, /value="02" selected/);
    assert.match(html, /value="G" selected/);
  });
});
