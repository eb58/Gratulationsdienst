import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, describe, it } from 'node:test';

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

// Echtes SOKO-Strassenverzeichnis laden (Script, kein ES-Modul) -> setzt window.SOKO_STRASSENVERZEICHNIS + window.findeSoko
const dirCode = readFileSync(new URL('../public/data/soko-strassenverzeichnis.js', import.meta.url), 'utf8');
(0, eval)(dirCode);

const { buildStreetData } = await import('../modules/domain.js');
const { groupedTestAssignments, monthAfterNext, seedCsvRows } = await import('../modules/testdata.js');
const { mapImportRow } = await import('../modules/import.js');
const { buildImportResult } = await import('../modules/citizens.js');
const { streetAssignment } = await import('../modules/assignment.js');
const { state } = await import('../modules/state.js');

const pad = code => String(code).padStart(2, '0');
const counts = arr => arr.reduce((map, value) => (map[value] = (map[value] || 0) + 1, map), {});
const distinct = arr => new Set(arr).size;

const seed = () => {
  const groups = groupedTestAssignments(state.data.streets);
  const rowCount = Math.max(50, groups.length);
  const birthdayMonth = monthAfterNext();
  const { assignments, rows: csvRows } = seedCsvRows(state.data.streets, rowCount, () => birthdayMonth);
  const mapped = csvRows.map(mapImportRow);
  return { rowCount, assignments, csvRows, mapped };
};

before(() => {
  state.data.streets = buildStreetData();
  state.data.citizens = [];
});

describe('seed-citizens integration (echtes Strassenverzeichnis)', () => {
  it('findet echte SOKO-Strassen ueber normalisierte Schreibweisen', () => {
    const expected = globalThis.findeSoko('Kleine Brüderstraße', '1', '13503');

    assert.deepEqual(globalThis.findeSoko('Kleine Brüderstrasse', '1', '13503'), expected);
    assert.deepEqual(globalThis.findeSoko('Kleine Brüderstr.', '1', '13503'), expected);
  });

  it('erzeugt nur Adressen, die im Strassenverzeichnis vorhanden und aufloesbar sind', () => {
    const { csvRows } = seed();
    const directory = globalThis.SOKO_STRASSENVERZEICHNIS;
    const unbekannt = csvRows.filter(row => !directory[row.Strasse]).map(row => row.Strasse);
    assert.deepEqual(unbekannt, [], 'Strasse nicht im Verzeichnis');
    const nichtAufloesbar = csvRows.filter(row => {
      try { globalThis.findeSoko(row.Strasse, row.Hausnummer, row.PLZ); return false; }
      catch { return true; }
    }).map(row => `${row.Strasse} ${row.Hausnummer}`);
    assert.deepEqual(nichtAufloesbar, [], 'Adresse im Verzeichnis nicht aufloesbar');
  });

  it('vergibt nur regelkonforme Hausnummern (Bereich + Paritaet)', () => {
    const { csvRows, assignments } = seed();
    const verletzt = csvRows.filter((row, index) => {
      const rule = assignments[index].rule;
      const num = Number.parseInt(String(row.Hausnummer).match(/\d+/)?.[0] || '', 10);
      const from = rule.von ? Number.parseInt(rule.von) : -Infinity;
      const to = rule.bis ? Number.parseInt(rule.bis) : Infinity;
      const parity = rule.art === 'G' ? num % 2 === 0 : rule.art === 'U' ? num % 2 === 1 : true;
      return !(num >= from && num <= to && parity);
    }).map(row => `${row.Strasse} ${row.Hausnummer}`);
    assert.deepEqual(verletzt, [], 'Hausnummer ausserhalb der Regel');
  });

  it('verteilt die Zeilen gleichmaessig ueber alle SOKOs (max-min <= 1)', () => {
    const { assignments } = seed();
    const perSoko = Object.values(counts(assignments.map(a => pad(a.rule.soko))));
    assert.ok(Math.max(...perSoko) - Math.min(...perSoko) <= 1, `ungleiche Verteilung: ${JSON.stringify(perSoko)}`);
  });

  it('streut Strassen, Hausnummern und Namen ueber den Lauf', () => {
    const { rowCount, csvRows } = seed();
    assert.ok(distinct(csvRows.map(r => r.Strasse)) >= rowCount * 0.6, 'zu wenige verschiedene Strassen');
    assert.ok(distinct(csvRows.map(r => r.Hausnummer)) >= rowCount * 0.4, 'zu wenige verschiedene Hausnummern');
    assert.equal(distinct(csvRows.map(r => `${r.Vorname}|${r.Nachname}`)), rowCount, 'Namen nicht alle verschieden');
  });

  it('liefert bei zwei Laeufen unterschiedliche Strassen (echte Zufaelligkeit)', () => {
    const a = seed().csvRows.map(r => r.Strasse);
    const b = seed().csvRows.map(r => r.Strasse);
    assert.notDeepEqual(a, b, 'zwei Seed-Laeufe ergaben identische Strassen');
  });

  it('deckt alle Altersstufen mit Sterblichkeitsgewichtung ab', () => {
    const { mapped } = seed();
    const ageCounts = mapped
      .map(r => new Date().getFullYear() - Number(r.birthDate.slice(0, 4)))
      .reduce((map, age) => (map[age] = (map[age] || 0) + 1, map), {});

    [85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101].forEach(age => assert.ok(ageCounts[age], `Alter ${age} fehlt`));
    assert.ok(ageCounts[85] >= ageCounts[90], 'Sterblichkeit: 85 darf nicht seltener als 90 sein');
    assert.ok(ageCounts[90] >= ageCounts[95], 'Sterblichkeit: 90 darf nicht seltener als 95 sein');
    assert.ok(ageCounts[95] >= ageCounts[100], 'Sterblichkeit: 95 darf nicht seltener als 100 sein');
  });

  it('generiert ausschliesslich Geburtstage im uebernaechsten Monat', () => {
    const { csvRows, mapped } = seed();
    const expectedMonth = monthAfterNext();

    assert.deepEqual([...new Set(csvRows.map(row => row.Geburtsdatum.slice(5, 7)))], [expectedMonth]);
    assert.deepEqual([...new Set(mapped.map(row => row.birthDate.slice(5, 7)))], [expectedMonth]);
  });

  it('importiert restlos ohne Pflichtfeld-Fehler oder Dubletten', () => {
    const { rowCount, mapped } = seed();
    const result = buildImportResult(mapped, [], row => streetAssignment(row)?.groupId);
    assert.equal(result.newRows.length, rowCount, 'nicht alle Zeilen importiert');
    assert.equal(result.skipped, 0, 'unerwartete Dubletten');
    assert.ok(result.newRows.every(row => row.status === 'importiert'), 'nicht jede Zeile wurde einer SOKO zugeordnet');
  });
});
