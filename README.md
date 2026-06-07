# Gratulationsdienst Digital - Prototyp

Statischer Browser-Prototyp für das Hauptmodul aus dem Pflichtenheft.

## Start

`index.html` direkt im Browser öffnen. AG Grid Community liegt lokal unter `vendor/`.

## Enthalten

- Jubilare-Verwaltung mit Filter, Detailmaske und Speicherung im Browser
- 12 prototypische SOKOs mit Mitgliedern und Leitungen
- Straßenverzeichnis mit SOKO-Zuordnung nach Ortsteil- und Planquadrat-Clustern
- SOKO-Straßenkarte mit lokalen OpenStreetMap-Geometrien aus Overpass
- Absenderprofile mit Briefkopf-/Unterschriftenvorschau
- Vorlageneditor mit Platzhaltern
- Dokumentlauf mit Seriendruck-Vorschau und CSV-Export
- LABO-CSV-Import mit Dubletten- und Fehlerprotokoll
- AG Grid Community für Listen, Sortierung, Filter und Pagination

Die Daten liegen lokal im `localStorage`. Über `Beispieldaten` werden sie zurückgesetzt.

Kartendaten: © OpenStreetMap-Mitwirkende. Die Straßengeometrien liegen lokal vor; die Stadtplan-Hintergrundkacheln werden bei geöffneter Kartenansicht online von `tile.openstreetmap.org` geladen.
