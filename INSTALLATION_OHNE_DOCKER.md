# Installation ohne Docker

Diese Anleitung beschreibt die Installation eines fertigen Release-Pakets auf einem Webserver mit Apache, PHP und MariaDB. Node.js wird für die Installation und den Betrieb nicht benötigt. Das Release-Paket enthält bereits das gebaute Frontend und die PHP-API.

## 1. Voraussetzungen

- Apache mit `mod_rewrite`, `mod_headers` und PHP-Unterstützung
- PHP 8.2 oder neuer mit `pdo_mysql` oder `mysqli`
- MariaDB 11.x oder neuer
- ein gültiges TLS-Zertifikat
- Schreibzugriff auf das vorgesehene Webverzeichnis
- optional funktionierender PHP-Mailversand für Passwort-Resets

Beispielprüfung unter PowerShell:

```powershell
php --version
php -m | Select-String 'pdo_mysql|mysqli'
mariadb --version
```

## 2. Release-Paket bereitstellen

Das fertige Release-Paket herunterladen oder von der Entwicklung bereitstellen lassen und entpacken. Der Inhalt muss ungefähr so aussehen:

```text
gratulationsdienst/
├── index.html
├── assets/
├── data/
├── vendor/
├── .htaccess
└── php-api/
    ├── index.php
    ├── schema.mysql.sql
    ├── config.example.php
    └── .htaccess
```

Das Paket erwartet die Anwendung unter dem URL-Pfad `/gratulationsdienst/`. Für einen anderen Pfad muss die Entwicklung einen entsprechend gebauten Release bereitstellen.

## 3. MariaDB-Datenbank anlegen

Als MariaDB-Administrator anmelden und eine eigene Datenbank mit eigenem Benutzer anlegen:

```sql
CREATE DATABASE gratulationsdienst
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'gd_user'@'localhost' IDENTIFIED BY 'ein-langes-zufaelliges-passwort';
GRANT ALL PRIVILEGES ON gratulationsdienst.* TO 'gd_user'@'localhost';
FLUSH PRIVILEGES;
```

Bei einer entfernten Datenbank den Hostanteil des Benutzers möglichst eng auf den Webserver beschränken. MariaDB nicht unnötig öffentlich erreichbar machen.

Das Anwendungsschema muss nicht manuell importiert werden. Die PHP-API legt die Tabellen beim ersten erfolgreichen Aufruf anhand von `php-api/schema.mysql.sql` an. Bei Änderungen am Schema wird die noch leere Entwicklungsdatenbank neu angelegt; die API führt keine nachträglichen Schemaergänzungen aus.

## 4. Dateien auf den Webserver kopieren

Den vollständigen Inhalt des entpackten Verzeichnisses `gratulationsdienst/` nach `/var/www/html/gratulationsdienst/` oder in das entsprechende Webverzeichnis kopieren. Versteckte Dateien wie `.htaccess` müssen mit übertragen werden.

Danach die Beispielkonfiguration kopieren:

```powershell
Copy-Item /var/www/html/gratulationsdienst/php-api/config.example.php `
  /var/www/html/gratulationsdienst/php-api/config.php
```

Unter Linux beispielsweise:

```bash
cp /var/www/html/gratulationsdienst/php-api/config.example.php \
  /var/www/html/gratulationsdienst/php-api/config.php
```

## 5. PHP-API konfigurieren

`php-api/config.php` mit den echten Serverzugangsdaten bearbeiten:

```php
<?php
return [
    'dsn' => 'mysql:host=localhost;port=3306;dbname=gratulationsdienst;charset=utf8mb4',
    'user' => 'gd_user',
    'password' => 'ein-langes-zufaelliges-passwort',
    'connect_timeout' => 5,
    'options' => [],
    'app_url' => 'https://example.org/gratulationsdienst/',
    'mail_from' => 'noreply@example.org',
    'mail_from_name' => 'Gratulationsdienst Reinickendorf',
];
```

`config.php` darf nicht veröffentlicht oder herunterladbar sein. Die Datei nur für den Webserver-Benutzer und Administratoren lesbar machen. Das Datenbankpasswort muss sich vom Anwendungspasswort des Administratorkontos unterscheiden.

## 6. Apache konfigurieren

Erforderlich sind:

- `mod_rewrite`
- `mod_headers`
- `AllowOverride FileInfo AuthConfig`
- deaktivierte Verzeichnisauflistung
- HTTPS

Beispiel für die Anwendung unter `/gratulationsdienst/`:

```apache
<Directory /var/www/html/gratulationsdienst>
    AllowOverride FileInfo AuthConfig
    Options -Indexes
    Require all granted
</Directory>
```

Nach einer Änderung Apache neu laden. Die mitgelieferten `.htaccess`-Dateien schützen unter anderem Konfigurations- und Schema-Dateien und leiten Anwendungsrouten korrekt weiter.

## 7. HTTPS einrichten

Das TLS-Zertifikat im Webserver einrichten und alle HTTP-Aufrufe auf HTTPS umleiten. Die Anwendung anschließend ausschließlich über ihre endgültige Adresse betreiben:

```text
https://example.org/gratulationsdienst/
```

Frontend und API sollten unter derselben HTTPS-Domain liegen. Die API gibt standardmäßig keine allgemeinen CORS-Freigaben aus.

## 8. Installation prüfen

Zuerst den Health-Endpunkt öffnen:

```text
https://example.org/gratulationsdienst/php-api/index.php/health
```

Erwartet wird unter anderem:

```json
{"ok":true,"driver":"mysql","schema":"relational"}
```

Danach die Anwendung öffnen. Bei einer leeren Datenbank erscheint die Ersteinrichtung für das erste Administratorkonto. Das dort vergebene Passwort ist das Anwendungspasswort und nicht das MariaDB-Passwort.

Zusätzlich prüfen:

- HTTP wird auf HTTPS umgeleitet.
- `php-api/config.php` und `php-api/schema.mysql.sql` können nicht heruntergeladen werden.
- Verzeichnisse können nicht aufgelistet werden.
- Anmeldung und Abmeldung funktionieren.
- Passwort-Reset-E-Mails werden zugestellt.
- regelmäßige MariaDB-Sicherungen laufen.

## 9. Aktualisierung

Vor einem Update die Datenbank und die produktive `php-api/config.php` sichern.

Dann ein neues fertiges Release-Paket entpacken und die Anwendungsdateien ersetzen. Die vorhandene produktive `php-api/config.php` nicht überschreiben. Schemaänderungen werden in dieser Vorproduktionsphase durch Neu-Anlegen der leeren Datenbank übernommen.

## 10. Datensicherung

Regelmäßig mindestens folgende Daten sichern:

- vollständige MariaDB-Datenbank
- produktive `php-api/config.php`
- TLS-Zertifikate und Webserver-Konfiguration

Beispiel für MariaDB:

```powershell
mariadb-dump -h localhost -u gd_user -p gratulationsdienst > gratulationsdienst-backup.sql
```

Sicherungen außerhalb des Webroots und möglichst auf einem zweiten System aufbewahren. Wiederherstellungen regelmäßig testen.

## 11. Fehlerbehebung

### API liefert 500

- DSN, Benutzername und Passwort in `php-api/config.php` prüfen.
- MariaDB-Erreichbarkeit und Benutzerrechte prüfen.
- kontrollieren, ob `pdo_mysql` oder `mysqli` geladen ist.
- PHP- und Apache-Fehlerprotokolle prüfen.

### API liefert 404

- den direkten Pfad `/gratulationsdienst/php-api/index.php/health` testen.
- `mod_rewrite` und `AllowOverride FileInfo AuthConfig` prüfen.
- sicherstellen, dass beide `.htaccess`-Dateien übertragen wurden.

### Anmeldung nicht möglich

- `/gratulationsdienst/php-api/index.php/auth/status` im Browser-Netzwerkprotokoll prüfen.
- bei `500` zuerst die Datenbankverbindung beheben.
- bei `401` E-Mail-Adresse und Anwendungspasswort prüfen.
- bei einer leeren Datenbank kontrollieren, ob die Ersteinrichtung angezeigt wird.

### Passwort-Reset versendet keine E-Mail

- `app_url`, `mail_from` und `mail_from_name` prüfen.
- den Mailversand der PHP-Installation konfigurieren und testen.
