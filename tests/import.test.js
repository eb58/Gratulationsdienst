import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanCell, detectDelimiter, getAny, mapImportRow, parseCsv } from '../modules/import.js';

describe('CSV delimiter detection', () => {
  it('detects semicolon, tab and comma separated headers', () => {
    assert.equal(detectDelimiter('A;B;C\n1;2;3'), ';');
    assert.equal(detectDelimiter('A\tB\tC\n1\t2\t3'), '\t');
    assert.equal(detectDelimiter('A,B,C\n1,2,3'), ',');
  });

  it('falls back to semicolon when no known delimiter is present', () => {
    assert.equal(detectDelimiter('A'), ';');
  });
});

describe('CSV parsing', () => {
  it('trims cells and removes surrounding quotes', () => {
    assert.equal(cleanCell(' "Muster" '), 'Muster');
    assert.equal(cleanCell('"Muster ""A"""'), 'Muster "A"');
  });

  it('maps rows by header names and fills missing cells with empty strings', () => {
    assert.deepEqual(parseCsv('Vorname;Nachname;PLZ\nErika;Mustermann;13437\nMax;Muster'), [
      { Vorname: 'Erika', Nachname: 'Mustermann', PLZ: '13437' },
      { Vorname: 'Max', Nachname: 'Muster', PLZ: '' }
    ]);
  });

  it('keeps delimiters and escaped quotes inside quoted cells', () => {
    assert.deepEqual(parseCsv('Vorname;Nachname;Notiz\nErika;Mustermann;"Haus; Eingang ""B"""'), [
      { Vorname: 'Erika', Nachname: 'Mustermann', Notiz: 'Haus; Eingang "B"' }
    ]);
  });

  it('keeps line breaks inside quoted cells', () => {
    assert.deepEqual(parseCsv('Vorname;Notiz\nErika;"Zeile 1\nZeile 2"'), [
      { Vorname: 'Erika', Notiz: 'Zeile 1\nZeile 2' }
    ]);
  });

  it('parses quoted cells with comma delimiter', () => {
    assert.deepEqual(parseCsv('Name,Notiz\n"Mustermann, Erika","A, B"'), [
      { Name: 'Mustermann, Erika', Notiz: 'A, B' }
    ]);
  });

  it('ignores blank lines around the data', () => {
    assert.deepEqual(parseCsv('\nVorname,Nachname\nErika,Mustermann\n\n'), [
      { Vorname: 'Erika', Nachname: 'Mustermann' }
    ]);
  });
});

describe('import row mapping', () => {
  it('uses the first non-empty value from possible column names', () => {
    assert.equal(getAny({ Name: '', Nachname: 'Muster' }, ['Name', 'Nachname']), 'Muster');
    assert.equal(getAny({ Name: 'Muster', Nachname: 'Ignored' }, ['Name', 'Nachname']), 'Muster');
    assert.equal(getAny({}, ['Name']), '');
  });

  it('maps common German import columns to citizen fields', () => {
    assert.deepEqual(mapImportRow({
      Anrede: 'Frau',
      Vorname: 'Erika',
      Nachname: 'Mustermann',
      Strasse: 'Eichborndamm',
      Hausnummer: '215',
      PLZ: '13437',
      Ortsteil: 'Wittenau',
      Geburtsdatum: '5.4.1936',
      Telefon: '030 123456',
      Email: 'erika@example.de'
    }), {
      salutation: 'Frau',
      firstName: 'Erika',
      lastName: 'Mustermann',
      street: 'Eichborndamm',
      houseNo: '215',
      postalCode: '13437',
      district: 'Wittenau',
      birthDate: '1936-04-05',
      age: '',
      phone: '030 123456',
      email: 'erika@example.de',
      wish: 'offen',
      deceased: false,
      moved: false,
      notes: ''
    });
  });

  it('normalizes slash separated dates and leaves ISO dates unchanged', () => {
    assert.equal(mapImportRow({ birthDate: '5/4/1936' }).birthDate, '1936-04-05');
    assert.equal(mapImportRow({ birthDate: '1936-04-05' }).birthDate, '1936-04-05');
  });
});
