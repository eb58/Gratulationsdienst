# Gratulationsdienst Digital

Gratulationsdienst Reinickendorf

## Dokumentation

- [Übersicht der Installationswege](INSTALLATIONSANLEITUNG.md)
- [Installation mit Docker](INSTALLATION_DOCKER.md)
- [Installation ohne Docker](INSTALLATION_OHNE_DOCKER.md)
- [Entwicklung und Release-Build](ENTWICKLUNG.md)
- [Technische Dokumentation](TECHNISCHE_DOKUMENTATION.md)
- [Projektkontext fuer Codex](docs/projektkontext.md)

## Enthalten

- Jubilare-Verwaltung mit Filter, Detailmaske und Speicherung im Browser
- 12 prototypische SOKOs mit Mitgliedern und Leitungen
- Straßenverzeichnis mit SOKO-Zuordnung nach Ortsteil- und Planquadrat-Clustern
- SOKO-Straßenkarte mit lokalen OpenStreetMap-Geometrien aus Overpass
- Absenderprofile mit Briefkopf-/Unterschriftenvorschau
- Vorlageneditor mit Platzhaltern
- Dokumentlauf mit Seriendruck-Vorschau und CSV-Export
- LABO-CSV-Import mit Dubletten- und Fehlerprotokoll
- Gedruckte Jubilare werden als `gedruckt` markiert und aus der aktiven Jubilarliste ausgeblendet; Dubletten werden auch gegen bereits gedruckte Jubiläen erkannt
- AG Grid Community für Listen, Sortierung, Filter und Pagination

Kartendaten: OpenStreetMap-Mitwirkende. Die Straßengeometrien liegen lokal vor; die Stadtplan-Hintergrundkacheln werden bei geöffneter Kartenansicht online von `tile.openstreetmap.org` geladen.
