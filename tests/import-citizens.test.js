import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  splitCsvLine, parseCsv, cleanNumber, isTruthy, parseDate, normalizeSalutation,
  splitName, splitStreet, normalizeDistrict, wishFromFlags, movedInfo, deceasedInfo,
  buildNotes, mapRow
} from '../scripts/import-citizens.js';

describe('splitCsvLine', () => {
  it('trennt an Semikolon und trimmt', () => {
    assert.deepEqual(splitCsvLine('Müller, Max; Musterstr. 1 ; 13407'), ['Müller, Max', 'Musterstr. 1', '13407']);
  });

  it('ignoriert Semikolon innerhalb von Anführungszeichen', () => {
    assert.deepEqual(splitCsvLine('"Müller; Max";13407'), ['Müller; Max', '13407']);
  });

  it('entfernt Quotes und behandelt doppelte Quotes als Literal', () => {
    assert.deepEqual(splitCsvLine('"Haus ""Sonne""";x'), ['Haus "Sonne"', 'x']);
  });

  it('liefert leere Zelle für fehlenden Wert am Ende', () => {
    assert.deepEqual(splitCsvLine('a;'), ['a', '']);
  });
});

describe('parseCsv', () => {
  it('mappt Zeilen über Header und entfernt BOM', () => {
    assert.deepEqual(parseCsv('﻿Name;plz\nMüller, Max;13407\nMeier, Eva;13409'), [
      { Name: 'Müller, Max', plz: '13407' },
      { Name: 'Meier, Eva', plz: '13409' }
    ]);
  });

  it('füllt fehlende Spalten mit leerem String', () => {
    assert.deepEqual(parseCsv('a;b;c\n1;2'), [{ a: '1', b: '2', c: '' }]);
  });
});

describe('cleanNumber / isTruthy', () => {
  it('entfernt deutsche Dezimalreste', () => {
    assert.equal(cleanNumber('480,00'), '480');
    assert.equal(cleanNumber('1,00'), '1');
    assert.equal(cleanNumber(' 13407 '), '13407');
  });

  it('isTruthy ist false für "", "0" und "0,00"', () => {
    assert.equal(isTruthy(''), false);
    assert.equal(isTruthy('0'), false);
    assert.equal(isTruthy('0,00'), false);
    assert.equal(isTruthy('1,00'), true);
  });
});

describe('parseDate', () => {
  it('wandelt deutsches Datum nach ISO', () => {
    assert.equal(parseDate('26.03.1946'), '1946-03-26');
  });

  it('schneidet Uhrzeit ab und padded Monat/Tag', () => {
    assert.equal(parseDate('5.4.1936 00:00:00'), '1936-04-05');
  });

  it('leerer/ungültiger Wert ergibt leeren String', () => {
    assert.equal(parseDate(''), '');
    assert.equal(parseDate('keine'), '');
  });
});

describe('normalizeSalutation', () => {
  it('mappt Kürzel und Wörter auf Herr/Frau', () => {
    assert.equal(normalizeSalutation('m'), 'Herr');
    assert.equal(normalizeSalutation('Weiblich'), 'Frau');
    assert.equal(normalizeSalutation('f'), 'Frau');
  });

  it('gibt unbekannten Wert getrimmt zurück', () => {
    assert.equal(normalizeSalutation(' Divers '), 'Divers');
  });
});

describe('splitName', () => {
  it('zerlegt "Nachname, Vorname"', () => {
    assert.deepEqual(splitName('Müller, Max'), { lastName: 'Müller', firstName: 'Max' });
  });

  it('ohne Komma bleibt firstName leer', () => {
    assert.deepEqual(splitName('Müller'), { lastName: 'Müller', firstName: '' });
  });
});

describe('splitStreet', () => {
  it('trennt Straße und Hausnummer', () => {
    assert.deepEqual(splitStreet('Musterstr. 19'), { street: 'Musterstr.', houseNo: '19' });
    assert.deepEqual(splitStreet('Am Vierruthenplatz 3a'), { street: 'Am Vierruthenplatz', houseNo: '3a' });
  });

  it('ohne Nummer bleibt houseNo leer', () => {
    assert.deepEqual(splitStreet('Hauptstraße'), { street: 'Hauptstraße', houseNo: '' });
  });
});

describe('normalizeDistrict', () => {
  it('mappt Ortsteil-Kürzel', () => {
    assert.equal(normalizeDistrict('wit'), 'Wittenau');
    assert.equal(normalizeDistrict('MV'), 'Märkisches Viertel');
    assert.equal(normalizeDistrict('lüb'), 'Lübars');
  });

  it('unbekanntes Kürzel bleibt Rohwert', () => {
    assert.equal(normalizeDistrict('Spandau'), 'Spandau');
  });
});

describe('wishFromFlags', () => {
  it('Priorität: nein > soko > post > offen', () => {
    assert.equal(wishFromFlags({ 'glück nein': '1', 'glück soko': '1' }), 'keine');
    assert.equal(wishFromFlags({ 'glück soko': '1', 'glück post': '1' }), 'Besuch erwünscht');
    assert.equal(wishFromFlags({ 'glück post': '1' }), 'per Post');
    assert.equal(wishFromFlags({}), 'offen');
  });
});

describe('movedInfo / deceasedInfo', () => {
  it('baut Verzugs-Hinweis aus PLZ/Ort/Straße', () => {
    assert.equal(movedInfo({ 'verzogen nach plz': '12345', 'verzogen nach ort': 'Hamburg', 'verzogen nach str': 'Weg', 'verzogen nach nr': '2' }), 'Verzogen nach 12345, Hamburg, Weg 2');
  });

  it('movedInfo leer ohne Angaben', () => {
    assert.equal(movedInfo({}), '');
  });

  it('deceasedInfo mit und ohne Datum', () => {
    assert.equal(deceasedInfo({ 'verstorben am': '01.02.2020' }), 'Verstorben am 2020-02-01');
    assert.equal(deceasedInfo({ verstorben: '1' }), 'Verstorben');
    assert.equal(deceasedInfo({}), '');
  });
});

describe('buildNotes', () => {
  it('sammelt nur vorhandene Hinweise', () => {
    assert.equal(buildNotes({ Geburtsort: 'Berlin', Staat: 'deutsch', verstorben: '1' }), 'Geburtsort: Berlin\nVerstorben');
  });

  it('listet ausländische Staatsangehörigkeit', () => {
    assert.match(buildNotes({ Staat: 'österreichisch' }), /Staatsangehörigkeit: österreichisch/);
  });
});

describe('mapRow', () => {
  const base = {
    Name: 'Müller, Max', 'Str/Nr': 'Musterstr. 19', plz: '13407', bezirk: 'wit',
    Geschlecht: 'm', Geb_Datum: '26.03.1946'
  };

  it('baut id mit laufendem Index und Kernfelder', () => {
    const row = mapRow(base, 0);
    assert.equal(row.id, 'G-2026-001');
    assert.equal(row.salutation, 'Herr');
    assert.equal(row.firstName, 'Max');
    assert.equal(row.lastName, 'Müller');
    assert.equal(row.street, 'Musterstr.');
    assert.equal(row.houseNo, '19');
    assert.equal(row.district, 'Wittenau');
    assert.equal(row.birthDate, '1946-03-26');
    assert.equal(row.status, 'importiert');
    assert.equal(row.wish, 'offen');
  });

  it('bevorzugt neu_vorname/neu_nachname', () => {
    const row = mapRow({ ...base, neu_vorname: 'Maximilian', neu_nachname: 'Müller-Lüdenscheidt' }, 4);
    assert.equal(row.id, 'G-2026-005');
    assert.equal(row.firstName, 'Maximilian');
    assert.equal(row.lastName, 'Müller-Lüdenscheidt');
  });

  it('setzt wish="keine" für Verstorbene/Verzogene', () => {
    assert.equal(mapRow({ ...base, verstorben: '1', 'glück soko': '1' }, 0).wish, 'keine');
    assert.equal(mapRow({ ...base, 'verzogen nach plz': '12345' }, 0).wish, 'keine');
  });

  it('berechnet gedruckte Felder aus Alter und Geburtsjahr', () => {
    const row = mapRow({ ...base, kartegedruckt: '1', Alter: '80,00' }, 0);
    assert.equal(row.status, 'gedruckt');
    assert.equal(row.printedAge, 80);
    assert.equal(row.printedYear, 1946 + 80);
  });
});
