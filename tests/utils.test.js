import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  byId,
  csvEscape,
  escapeHtml,
  formatDateDe,
  formatStreetAddress,
  formatIban,
  isValidEmail,
  isValidIban,
  isValidPostalCode,
  nextId,
  normalize,
  normalizeAmount,
  normalizeDigits,
  normalizeEmail,
  normalizeIban,
  repairMojibakeText,
  repairStoredText,
  safeStorageSetItem,
  updateItem
} from '../modules/utils.js';

describe('email validation', () => {
  it('accepts empty and syntactically valid addresses', () => {
    assert.equal(isValidEmail(''), true);
    assert.equal(isValidEmail(' person@example.de '), true);
    assert.equal(isValidEmail('vorname.nachname@sub.example.de'), true);
  });

  it('rejects malformed addresses', () => {
    assert.equal(isValidEmail('person@example'), false);
    assert.equal(isValidEmail('person@example.d'), false);
    assert.equal(isValidEmail('person@.de'), false);
    assert.equal(isValidEmail('person example@example.de'), false);
  });

  it('trims email addresses for storage', () => {
    assert.equal(normalizeEmail(' person@example.de '), 'person@example.de');
  });
});

describe('IBAN helpers', () => {
  it('normalizes and formats IBAN values', () => {
    assert.equal(normalizeIban('de89 3704 0044 0532 0130 00'), 'DE89370400440532013000');
    assert.equal(formatIban('DE89370400440532013000'), 'DE89 3704 0044 0532 0130 00');
  });

  it('validates IBAN check digits and length', () => {
    assert.equal(isValidIban('DE89 3704 0044 0532 0130 00'), true);
    assert.equal(isValidIban('DE88 3704 0044 0532 0130 00'), false);
    assert.equal(isValidIban('DE89'), false);
  });
});

describe('postal code helpers', () => {
  it('keeps digits only', () => {
    assert.equal(normalizeDigits('13 437 Berlin'), '13437');
  });

  it('allows empty postal codes and requires five digits otherwise', () => {
    assert.equal(isValidPostalCode(''), true);
    assert.equal(isValidPostalCode('13437'), true);
    assert.equal(isValidPostalCode('1343'), false);
    assert.equal(isValidPostalCode('134370'), false);
  });
});

describe('amount normalization', () => {
  it('keeps digits and a single decimal comma', () => {
    assert.equal(normalizeAmount('15,00'), '15,00');
    assert.equal(normalizeAmount('8.50'), '8,50');
    assert.equal(normalizeAmount('abc12x,345'), '12,34');
    assert.equal(normalizeAmount('12,,34'), '12,34');
  });

  it('drops unsupported characters and incomplete leading separators', () => {
    assert.equal(normalizeAmount('€ 35,00'), '35,00');
    assert.equal(normalizeAmount(',50'), '');
    assert.equal(normalizeAmount('abc'), '');
  });
});

describe('text formatting helpers', () => {
  it('normalizes text for comparisons', () => {
    assert.equal(normalize('  ÄÖÜ  '), 'äöü');
    assert.equal(normalize(null), '');
  });

  it('escapes HTML-sensitive characters', () => {
    assert.equal(escapeHtml('<span title="A&B">\'x\'</span>'), '&lt;span title=&quot;A&amp;B&quot;&gt;&#039;x&#039;&lt;/span&gt;');
  });

  it('escapes CSV values by quoting and doubling quotes', () => {
    assert.equal(csvEscape('Muster "A"'), '"Muster ""A"""');
    assert.equal(csvEscape(null), '""');
  });

  it('formats ISO dates for German display', () => {
    assert.equal(formatDateDe('2026-06-25'), '25.06.2026');
    assert.equal(formatDateDe(''), '');
  });
});

describe('collection helpers', () => {
  it('finds items by id', () => {
    const items = [{ id: 'A', value: 1 }, { id: 'B', value: 2 }];
    assert.deepEqual(byId(items, 'B'), { id: 'B', value: 2 });
    assert.equal(byId(items, 'C'), undefined);
  });

  it('updates matching items without mutating others', () => {
    const items = [{ id: 'A', value: 1 }, { id: 'B', value: 2 }];
    assert.deepEqual(updateItem(items, 'B', { value: 3, extra: true }), [
      { id: 'A', value: 1 },
      { id: 'B', value: 3, extra: true }
    ]);
  });

  it('creates the next padded id from the highest existing number', () => {
    assert.equal(nextId('S', []), 'S-001');
    assert.equal(nextId('S', [{ id: 'S-001' }, { id: 'S-002' }, { id: 'S-003' }]), 'S-004');
  });

  it('avoids collisions after deletions and ignores foreign ids', () => {
    assert.equal(nextId('S', [{ id: 'S-001' }, { id: 'S-003' }]), 'S-004');
    assert.equal(nextId('S', [{ id: 'S-002' }, { id: 'T-009' }, {}]), 'S-003');
    assert.equal(nextId('G-2026', [{ id: 'G-2026-001' }, { id: 'G-85' }]), 'G-2026-002');
  });
});

describe('address and stored text helpers', () => {
  it('formats street addresses from street and house number', () => {
    assert.equal(formatStreetAddress({ street: 'Eichborndamm', houseNo: '215' }), 'Eichborndamm 215');
    assert.equal(formatStreetAddress({ street: 'Eichborndamm', houseNo: '' }), 'Eichborndamm');
  });

  it('repairs mojibake text recursively in stored data', () => {
    assert.equal(repairMojibakeText('M\u00c3\u00bcller'), 'Müller');
    assert.equal(repairMojibakeText('M\u00c3\u0192\u00c2\u00bcller'), 'Müller');
    assert.deepEqual(repairStoredText({ name: 'M\u00c3\u0192\u00c2\u00bcller', list: ['G\u00c3\u00bcnter', 1] }), {
      name: 'Müller',
      list: ['Günter', 1]
    });
  });
});

describe('storage helpers', () => {
  it('reports quota errors as toast and console warning', () => {
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousConsoleWarn = console.warn;
    const element = {
      textContent: '',
      classList: { add() {}, remove() {} },
      style: { removeProperty() {}, setProperty() {} }
    };
    const warnings = [];
    globalThis.document = { querySelector: selector => selector === '#toast' ? element : null };
    globalThis.window = { innerWidth: 1024, innerHeight: 768 };
    globalThis.requestAnimationFrame = callback => callback();
    console.warn = (...args) => warnings.push(args);
    const error = Object.assign(new Error('Setting the value exceeded the quota.'), { name: 'QuotaExceededError' });
    const storage = { setItem: () => { throw error; } };

    try {
      assert.equal(safeStorageSetItem(storage, 'gratulationsdienst', '{}', 'Daten'), false);
      assert.match(element.textContent, /Browser-Speicher ist voll/);
      assert.match(warnings[0][0], /Storage-Quota/);
      assert.equal(warnings[0][1], error);
    } finally {
      globalThis.document = previousDocument;
      globalThis.window = previousWindow;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      console.warn = previousConsoleWarn;
    }
  });
});
