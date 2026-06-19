# Gratulationsdienst Digital

Gratulationsdienst Reinickendorf

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
- Gedruckte Jubilare werden als `gedruckt` markiert und aus der aktiven Jubilarliste ausgeblendet; Dubletten werden auch gegen bereits gedruckte Jubiläen erkannt
- AG Grid Community für Listen, Sortierung, Filter und Pagination

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
- `GET/PUT http://127.0.0.1:8080/php-api/index.php/settings/receipt` liest bzw. speichert die Quittungs-Stammdaten

Unterstützte Collections: `citizens`, `sokoGroups`, `sokoMembers`, `streets`, `senders`, `templates`, `importLog`.

Das Frontend nutzt die Collection-Endpunkte direkt. `/data` bleibt als Kompatibilitätsroute für Sammel-Import/-Export verfügbar, speichert intern aber nicht mehr in einer JSON-Sammeltabelle. Angelegt werden:

- `gd_citizens`
- `gd_soko_groups`
- `gd_soko_members`
- `gd_streets`
- `gd_senders`
- `gd_templates`
- `gd_import_log`
- `gd_settings`
- `gd_api_meta`

Eine vorhandene alte Tabelle `gd_data_items` wird beim ersten Start einmalig in die neuen Tabellen migriert, solange die neuen Tabellen noch leer sind.

## Deployment auf einem Produktivserver

Voraussetzungen: Apache mit `mod_rewrite` und `mod_php` (PHP 8.1+), MySQL 5.7+ oder 8.x.

### 1. Datenbank anlegen

```sql
CREATE DATABASE gratulationsdienst CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gd_user'@'localhost' IDENTIFIED BY 'sicheres-passwort';
GRANT ALL PRIVILEGES ON gratulationsdienst.* TO 'gd_user'@'localhost';
```

### 2. PHP-API deployen

`php-api/` in ein Verzeichnis unterhalb des Webroots kopieren, z.B. `/var/www/html/php-api/`.

`php-api/config.php` anlegen (aus `config.example.php`):

```php
<?php
return [
    'dsn'      => 'mysql:host=localhost;port=3306;dbname=gratulationsdienst;charset=utf8mb4',
    'user'     => 'gd_user',
    'password' => 'sicheres-passwort',
    'options'  => [],
    'app_url'  => 'https://example.org/gratulationsdienst/',
    'mail_from' => 'noreply@example.org',
    'mail_from_name' => 'Gratulationsdienst Reinickendorf',
];
```

`app_url` wird für Passwort-Reset-Links verwendet. Die PHP-Umgebung muss für Self-Service-Passwort-Reset E-Mails über `mail()` versenden können.

Apache benötigt `AllowOverride All` für das `php-api/`-Verzeichnis (wegen `.htaccess` mit `mod_rewrite`).

`mod_rewrite` prüfen und ggf. aktivieren:

```bash
# Debian/Ubuntu:
apache2ctl -M | grep rewrite
a2enmod rewrite && systemctl restart apache2

# CentOS/RHEL:
httpd -M | grep rewrite
# mod_rewrite ist dort meist standardmäßig aktiv
```

Erscheint `rewrite_module (shared)` - aktiv. Sonst aktivieren wie oben.

Beim ersten Aufruf von `/php-api/health` legt die API das Datenbankschema automatisch an.

### 3. Frontend bauen und deployen

In `.env.production` die API-URL prüfen - standardmäßig `/php-api` (relativer Pfad, funktioniert wenn App und API auf demselben Server laufen):

```
VITE_API_BASE=/php-api
```

Build erstellen:

```powershell
npm run build
```

Den Inhalt des Build-Ausgabeverzeichnisses (standardmäßig `dist/`) in den Webroot kopieren, z.B. nach `/var/www/html/gratulationsdienst/`.

Die App ist dann erreichbar unter `https://example.com/gratulationsdienst/`.

### 4. Apache-Konfiguration (Beispiel)

```apache
<Directory /var/www/html/php-api>
    AllowOverride All
    Require all granted
</Directory>

<Directory /var/www/html/gratulationsdienst>
    Require all granted
</Directory>
```

### Hinweis zu CORS

Die API erlaubt aktuell alle Origins (`Access-Control-Allow-Origin: *`). Festgelegt wird das direkt in `php-api/index.php` in den HTTP-Headern ganz am Anfang der Datei. Auf einem Produktivserver sollte das dort auf die tatsächliche Domain eingeschränkt werden:

```php
header('Access-Control-Allow-Origin: https://example.com');
```

---

Kartendaten: OpenStreetMap-Mitwirkende. Die Straßengeometrien liegen lokal vor; die Stadtplan-Hintergrundkacheln werden bei geöffneter Kartenansicht online von `tile.openstreetmap.org` geladen.
