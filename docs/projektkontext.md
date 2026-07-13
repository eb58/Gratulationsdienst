# Projektkontext

## Worum es geht

Die Anwendung bildet den Gratulationsdienst Reinickendorf ab. Schwerpunkt sind Jubilare, SOKOs, Dokumentenlauf, Import, Fragebogen und Auswertungen.

## Erste Lesereihenfolge fuer Codex

1. `docs/projektkontext.md`
2. `docs/lastenheft-kurz.md`
3. `Lastenheft.pdf`
4. `README.md`
5. `AGENTS.md`

## Wichtige Regeln

- Im Dokumentenlauf duerfen Jubilare mit Antwort `keine` nicht erscheinen.
- Die CSV-Simulation darf nur Jubilare fuer den uebernaechsten Monat generieren.
- Rueckmeldungen und Scans aus dem Fragebogen duerfen beim Neuimport nicht verloren gehen.
- Person und jaehrlicher Gratulationslauf sind getrennt: Ein neuer Lauf erhaelt eine offene Rueckmeldung; abgeschlossene Rueckmeldungen bleiben als Historie beim bisherigen Lauf.
- `deceased` und `moved` sind eigenstaendige Citizen-Flags und duerfen nicht in `wish` gespeichert werden. Beide unterdruecken Karten, Quittungen, neue Frageboegen und aktuelle Hochzeitseintraege; Fragebogenhistorie und Scans bleiben erhalten.
- Neu erzeugte Frageboegen und Scans muessen ueber ihre Lauf-ID dem passenden Gratulationslauf zugeordnet werden.
- Import- und Dokumentenlauf-Aenderungen immer mit Tests absichern.
- Textdateien als UTF-8 behandeln; bei sichtbaren Umlautfehlern die Quelle statt den Inhalt umschreiben.

## Wichtige Dateien

- `modules/assignment.js` fuer Zuweisung und Filterlogik
- `modules/actions.js` fuer Aktionen und Seed-Daten
- `modules/documents.js` fuer Dokumentenerzeugung
- `modules/sokoQuestionnaireSimulation.js` fuer Fragebogen-Simulation
- `modules/testdata.js` fuer Testdatenhilfen
- `tests/` fuer fachliche Regressionstests

## Arbeiten im Projekt

- Vor groesseren Aenderungen zuerst die betroffenen Dateien lesen.
- Fuer breitere Aenderungen `npm.cmd test` ausfuehren.
- Bei Dokumenten oder Layout zusaetzlich die passenden Spezialtests laufen lassen.
