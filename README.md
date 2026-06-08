# Gratulationsdienst Digital - Prototyp

Statischer Browser-Prototyp fuer das Hauptmodul aus dem Pflichtenheft.

## Start

`index.html` direkt im Browser oeffnen. AG Grid Community liegt lokal unter `vendor/`.

## Enthalten

- Jubilare-Verwaltung mit Filter, Detailmaske und Speicherung im Browser
- 12 prototypische SOKOs mit Mitgliedern und Leitungen
- Strassenverzeichnis mit SOKO-Zuordnung nach Ortsteil- und Planquadrat-Clustern
- SOKO-Strassenkarte mit lokalen OpenStreetMap-Geometrien aus Overpass
- Absenderprofile mit Briefkopf-/Unterschriftenvorschau
- Vorlageneditor mit Platzhaltern
- Dokumentlauf mit Seriendruck-Vorschau und CSV-Export
- LABO-CSV-Import mit Dubletten- und Fehlerprotokoll
- Gedruckte Jubilare werden als `gedruckt` markiert und aus der aktiven Jubilarliste ausgeblendet; Dubletten werden auch gegen bereits gedruckte Jubiläen erkannt
- AG Grid Community fuer Listen, Sortierung, Filter und Pagination

Die Browseroberflaeche speichert aktuell weiter lokal im `localStorage`. Ueber `Beispieldaten` werden die Daten zurueckgesetzt.

## PHP-API und Datenbank

Die Backend-Schicht liegt unter `php-api/`.

- Standard-Datenbank: MySQL
- Konfiguration: `php-api/config.example.php`, bei Bedarf als `php-api/config.php` kopieren
- Schema: `php-api/schema.mysql.sql`
- REST-Endpunkt: `php-api/index.php`
- Datenmodell: relationale Fach-Tabellen je Objektart

Lokal starten, wenn PHP die MySQL-Datenbank erreichen kann:

```powershell
php -S 127.0.0.1:8080 -t .
```

Danach:

- `GET http://127.0.0.1:8080/php-api/index.php/health`
- `GET http://127.0.0.1:8080/php-api/index.php/{collection}`
- `PUT http://127.0.0.1:8080/php-api/index.php/{collection}` ersetzt eine komplette Collection-Liste
- `POST http://127.0.0.1:8080/php-api/index.php/{collection}` legt einen Datensatz an
- `GET/PUT/DELETE http://127.0.0.1:8080/php-api/index.php/{collection}/{id}`

Unterstuetzte Collections: `citizens`, `sokoGroups`, `sokoMembers`, `streets`, `senders`, `templates`, `importLog`.

Das Frontend nutzt die Collection-Endpunkte direkt. `/data` bleibt als Kompatibilitaetsroute fuer Sammel-Import/-Export verfuegbar, speichert intern aber nicht mehr in einer JSON-Sammeltabelle. Angelegt werden:

- `gd_citizens`
- `gd_soko_groups`
- `gd_soko_members`
- `gd_streets`
- `gd_senders`
- `gd_templates`
- `gd_import_log`
- `gd_api_meta`

Eine vorhandene alte Tabelle `gd_data_items` wird beim ersten Start einmalig in die neuen Tabellen migriert, solange die neuen Tabellen noch leer sind.

Kartendaten: OpenStreetMap-Mitwirkende. Die Strassengeometrien liegen lokal vor; die Stadtplan-Hintergrundkacheln werden bei geoeffneter Kartenansicht online von `tile.openstreetmap.org` geladen.
