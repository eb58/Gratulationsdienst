# Technische Dokumentation

## 1. Zweck

`Gratulationsdienst Reinickendorf` ist ein browserbasiertes Fachverfahren für die Bearbeitung von Jubilaren, SOKO-Zuordnungen, Dokumentlauf, Quittungsdruck, CSV-Import und Benutzerverwaltung.

Die Anwendung läuft als Single-Page-Frontend mit PHP-Backend und MySQL-Datenbank.

## 2. Tech-Stack

- Frontend: Vanilla JavaScript, HTML, CSS
- Build-Tool: Vite
- Tabellenraster: AG Grid Community, lokal unter `public/vendor/`
- PDF-/Druckfunktionen: Browser-Print, HTML-Preview, lokale Assets
- QR-Codes: `qrcode`
- Backend: PHP 8.1+
- Datenbank: MySQL 5.7+ bzw. 8.x

## 3. Einstiegspunkte

- `index.html`: HTML-Shell für das Frontend
- `app.js`: Initialisierung, globale Event-Handler, Startlogik
- `modules/render.js`: zusammengesetztes Rendering der aktuellen Ansicht
- `modules/state.js`: App-State, Storage, Backend-Synchronisierung, Auth-Status
- `php-api/index.php`: REST-API, Auth, User-Verwaltung, Collections
- `php-api/schema.mysql.sql`: Datenbankschema

## 4. Frontend-Architektur

Die Anwendung ist komponentenarm und rendergetrieben:

1. `app.js` registriert zentrale Events auf `document`.
2. Aktionen werden über `data-action`, Navigation über `data-nav` ausgelöst.
3. `render()` baut den kompletten sichtbaren Bereich anhand von `state.view` neu auf.
4. Teilansichten werden in `modules/views.js` als HTML-Strings erzeugt.
5. Listen werden über `modules/grid.js` mit AG Grid gemountet.

### Wichtige Module

- `modules/actions.js`
  - behandelt Formularspeicherung, Import, Export, Druck, Auth, MFA, Benutzerpflege
  - ist die zentrale Stelle für Schreiboperationen
- `modules/views.js`
  - definiert die sichtbaren Hauptansichten
  - enthält Formular- und Detailmarkup
- `modules/domain.js`
  - fachliche Grunddaten, Normalisierung, Zuordnungslogik
- `modules/assignment.js`
  - Zuordnung von Jubilaren zu SOKO und Straßen
- `modules/documents.js`
  - Vorlagen-Rendering, Drucklayouts, Seriendruck
- `modules/import.js`
  - CSV-Parsing und Feldmapping
- `modules/map.js`
  - Straßenkarte und OSM-Geometrien
- `modules/qr.js`
  - QR-Code-Ausgabe für MFA
- `modules/utils.js`
  - Hilfsfunktionen für Storage, Formatierung, Validierung, Download

## 5. State- und Persistenzmodell

Der globale Zustand liegt in `modules/state.js` und wird in `state` zentral gehalten.

### Speicherung

- `localStorage`
  - UI-Zustand wie Filter, Splitter-Positionen und zuletzt gewählte Monate
- `sessionStorage`
  - Auth-Token

Beim Start prüft die App den Auth-Status über `/auth/status` und lädt bei aktiver Session die Collections aus dem Backend.

## 6. Fachliche Bereiche

### 6.1 Jubilare

Die Jubilarverwaltung deckt Suche, Filterung, Detailbearbeitung und Statuspflege ab.

Relevante Felder:

- Name, Anschrift, Geburtsdatum, Kontakt
- Wunschart
- Status
- optionale Zusatzfelder wie Presseveröffentlichung oder Ehejubiläum

Gespeicherte Jubilare werden beim Abschluss als `geprüft` markiert und über die Listensteuerung weitergeschaltet.

### 6.2 SOKO-Stammdaten

Es gibt SOKO-Gruppen und SOKO-Mitglieder.

- Gruppen enthalten Region, Leitung und Zuordnung
- Mitglieder enthalten Personaldaten, Kontakt- und Abrechnungsdaten

### 6.3 Straßenverzeichnis und Karte

Straßen werden über Regeln auf Ortsteile, PLZ, Hausnummernbereiche und SOKO-Zuständigkeiten gemappt.

Die Kartenansicht basiert auf lokal vorliegenden OSM-Geometrien und Adresspunkten aus `public/data/`.

### 6.4 Absender und Vorlagen

Absenderprofile enthalten Briefkopf-, Signatur- und Kontaktdaten.

Vorlagen speichern:

- Anlass
- Format
- Standard-Absender
- Betreff
- Textkörper mit Platzhaltern wie `{{anrede}}`, `{{vorname}}`, `{{nachname}}`, `{{alter}}`, `{{geburtstag}}`, `{{soko}}`, `{{absender}}`

### 6.5 Dokumentlauf

Der Dokumentlauf generiert pro gefiltertem und geprüftem Jubilar einen Datensatz für Seriendruck und Vorschau.

Ausgaben:

- Druckansicht
- CSV-Export
- visuelle Vorschau im Browser

### 6.6 Quittungsdruck

Der Quittungsdruck gruppiert Jubilare nach SOKO und ist erst freigeschaltet, wenn alle relevanten Datensätze dieser Gruppe für den Monat geprüft sind.

### 6.7 CSV-Import

Der Import verarbeitet die LABO-CSV-Daten zu den Senioren in Reinickendorf. In der Leistungsbeschreibung ist diese Schnittstelle als aktuelle Datenquelle benannt; perspektivisch soll die Datenübernahme später über eine API erfolgen. Der Import mappt die Spalten auf das interne Datenmodell und protokolliert:

- erfolgreich importierte Datensätze
- Dubletten
- Fehler

Dubletten werden auch gegen bereits gedruckte Datensätze erkannt.

### 6.8 Benutzerverwaltung und Auth

Das Backend verwaltet:

- Anmeldung
- Passwort-Reset
- MFA mit TOTP
- Benutzerrollen

Rollen:

- `admin`
- `user`

Nur Admins dürfen Stammdaten bearbeiten oder Testdaten löschen/erzeugen.

### 6.9 Bestehende Datenquellen

Die Leistungsbeschreibung nennt drei relevante Datenquellen:

- LABO-Daten der Gratulanten bzw. Senioren, aktuell per CSV-Import
- SOKO-Stammdaten, derzeit manuell gepflegt
- Absenderprofile für Briefe und Karten

Für die LABO-Daten ist in der Leistungsbeschreibung bereits eine spätere API-Integration vorgesehen. Die aktuelle Anwendung bildet die CSV-basierte Verarbeitung ab.

## 7. Backend-Architektur

`php-api/index.php` ist eine eigenständige JSON-API.

### Routen

- `GET /health`
- `GET /{collection}`
- `PUT /{collection}`
- `POST /{collection}`
- `GET /{collection}/{id}`
- `PUT /{collection}/{id}`
- `DELETE /{collection}/{id}`
- `GET /data`
- `PUT /data`

Zusatzrouten für Auth und Benutzerverwaltung werden ebenfalls im selben Entry-Point bedient.

### Collections

- `citizens`
- `sokoGroups`
- `sokoMembers`
- `streets`
- `senders`
- `templates`
- `importLog`

### Tabellen

Das Schema legt unter anderem folgende Tabellen an:

- `gd_citizens`
- `gd_soko_groups`
- `gd_soko_members`
- `gd_streets`
- `gd_senders`
- `gd_templates`
- `gd_import_log`
- `gd_users`
- `gd_auth_tokens`
- `gd_auth_rate_limits`
- `gd_api_meta`

Beim ersten Start kann eine Migration von der alten Sammelstruktur auf die neuen Relationen erfolgen.

## 8. Datenfluss

### Lesen

1. Frontend startet mit dem zuletzt gespeicherten UI-Zustand.
2. `loadAuthStatus()` prüft die Session.
3. Bei aktiver Session werden Collections aus der API geladen.
4. Der lokale UI-Zustand bleibt davon getrennt.

### Schreiben

1. UI-Event trifft in `modules/actions.js` ein.
2. Daten werden im lokalen State aktualisiert.
3. `saveData()` schreibt UI-Zustand in `localStorage`.
4. Fachliche Änderungen werden in die schreibbaren Backend-Collections gespiegelt.

## 9. Build, Installation und Deployment

Vite baut das Frontend und leitet während der lokalen Entwicklung `/php-api` an das PHP-Backend weiter. Die API initialisiert und aktualisiert ihr relationales Schema beim Start anhand von `php-api/schema.mysql.sql`.

Systemvoraussetzungen, Datenbankeinrichtung, lokale Inbetriebnahme, Produktiv-Deployment und Fehlerbehebung sind in der eigenständigen [Installationsanleitung](INSTALLATIONSANLEITUNG.md) beschrieben.

## 10. Barrierefreiheit nach BITV 2.0

Die folgende Liste ist eine technische Vorprüfung, kein formales BITV-Audit. Sie zeigt den aktuellen Stand der App gegen die wichtigsten BITV-Anforderungen.

### 10.1 Wahrnehmbar

- [x] Alle Formularfelder haben sichtbare Labels.
- [x] Wichtige Statusmeldungen erscheinen als Live-Region (`role="status"`).
- [x] Dekorative Bilder sind als dekorativ markiert oder haben passende Alternativtexte.
- [ ] Ein formeller Kontrastnachweis für alle Zustände liegt nicht vor.
- [ ] Es gibt noch keine dokumentierte Prüfung für Zoom bis 200 Prozent und mobile Reflow-Szenarien.

### 10.2 Bedienbar

- [x] Hauptfunktionen sind per Tastatur erreichbar.
- [x] Dialoge sind semantisch als Dialoge markiert.
- [x] Splitter und ähnliche Bedienelemente haben Tastaturzugang.
- [x] Ein sichtbarer Skip-Link zum Hauptinhalt ist vorhanden.
- [ ] Ein einheitlicher Rückfokus nach Dialogen und nach dynamischen Renderwechseln ist noch nicht systematisch abgesichert.
- [ ] Für alle interaktiven Elemente gibt es noch keine durchgängigen `:focus-visible`-Styles.

### 10.3 Verständlich

- [x] Formulare, Buttons und Navigation sind sprachlich eindeutig benannt.
- [x] Fehlermeldungen und Toasts sind inhaltlich kurz und konkret.
- [x] Die Seitenstruktur ist in Hauptbereiche aufgeteilt.
- [ ] Es gibt noch keine dokumentierte Prüfung auf einfache Sprache oder konsistente Hilfetexte.
- [ ] Für Fachbegriffe wie SOKO, LABO oder Quittung fehlen teilweise erklärende Hilfen direkt in der UI.

### 10.4 Robust

- [x] Die App verwendet semantisches HTML für Navigation, Formulare und Dialoge.
- [x] SVGs für Karte und QR-Code tragen ARIA-Beschriftungen.
- [x] Statusmeldungen sind so gebaut, dass Screenreader sie erfassen können.
- [ ] Ein systematischer Screenreader-Test mit NVDA, JAWS oder VoiceOver liegt nicht dokumentiert vor.
- [ ] Für AG Grid gibt es noch keine geprüfte Accessibility-Konfiguration auf Komponentenniveau.

### 10.5 Priorisierte Nacharbeit

1. Skip-Link und Fokusführung ergänzen.
2. Dialog-Fokus und Rückkehrfokus sauber implementieren.
3. Kontrast, Tab-Reihenfolge und Screenreader-Ausgabe mit echten Testläufen prüfen.
4. Externe Komponenten wie AG Grid separat auf Tastatur- und Screenreader-Verhalten prüfen.
5. Fachbegriffe bei Bedarf mit kurzen Hilfetexten oder Tooltips absichern.

## 11. Wichtige Annahmen und Grenzen

- Die Anwendung ist bewusst auf Browser-Rendering ausgelegt, nicht auf eine serverseitig gerenderte Architektur.
- Die API erlaubt im aktuellen Stand CORS für alle Origins. Festgelegt wird das in `php-api/index.php` über den Header `Access-Control-Allow-Origin`; produktiv sollte dort die tatsächliche Domain eingetragen werden.
- Kartenkacheln kommen von OpenStreetMap, die Geometrien und Address-Points aus den mitgelieferten Daten.
