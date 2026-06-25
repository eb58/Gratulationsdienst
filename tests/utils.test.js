import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatIban,
  isValidEmail,
  isValidIban,
  isValidPostalCode,
  normalizeAmount,
  normalizeDigits,
  normalizeEmail,
  normalizeIban
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
