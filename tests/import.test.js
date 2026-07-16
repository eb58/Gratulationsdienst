import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanCell, detectDelimiter, mapImportRow, parseCsv } from '../modules/import.js';

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
  it('maps the customer LABO export columns', () => {
    const [row] = parseCsv([
      'Anrede,Dr.-Grad,Rufname,Familienname,PLZ,Wohnort,Straße,Hs-Nr.,Bei...,Adress-Zusatz,Geburtsdatum,Staatsangehörigkeit,Alter',
      'Frau,Dr.,Helga,S.,13409,Berlin Reinickendorf,Hausotterstr.,93A ,,,1/10/1930,Deutschland,96'
    ].join('\n'));

    assert.deepEqual(mapImportRow(row), {
      salutation: 'Frau',
      doctoralDegree: 'Dr.',
      firstName: 'Helga',
      lastName: 'S.',
      street: 'Hausotterstr.',
      houseNo: '93A',
      postalCode: '13409',
      district: 'Reinickendorf',
      birthDate: '1930-10-01',
      age: '96',
      wish: 'offen',
      deceased: false,
      moved: false,
      notes: ''
    });
  });

  it('does not interpret the discarded assumed column names', () => {
    const mapped = mapImportRow({ Vorname: 'Erika', Nachname: 'Mustermann', Strasse: 'Eichborndamm', Hausnummer: '215' });

    assert.deepEqual({ firstName: mapped.firstName, lastName: mapped.lastName, street: mapped.street, houseNo: mapped.houseNo }, {
      firstName: '', lastName: '', street: '', houseNo: ''
    });
  });
});
