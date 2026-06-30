# Installationsanleitung

Diese Anleitung beschreibt die Einrichtung des Gratulationsdienstes für die lokale Entwicklung und auf einem Produktivserver.

## 1. Systemvoraussetzungen

### Lokale Entwicklung

- Node.js mit npm
- PHP 8.1 oder neuer
- PHP-Erweiterung `pdo_mysql` oder `mysqli`
- MySQL 5.7 oder MySQL 8.x

### Docker-Betrieb

- Docker Desktop mit Docker Compose
- Node.js mit npm zum Erstellen des Frontends
- freie lokale Ports 80, 3306 und 8080

### Produktivbetrieb

- Apache-Webserver mit `mod_rewrite` und PHP 8.1 oder neuer
- MySQL 5.7 oder MySQL 8.x
- TLS-Zertifikat für den Betrieb über HTTPS
- optional: funktionierender E-Mail-Versand über PHP `mail()` für Passwort-Reset-Nachrichten

## 2. Projekt bereitstellen

Repository klonen und in das Anwendungsverzeichnis wechseln:

```powershell
git clone https://github.com/eb58/Gratulationsdienst.git
cd Gratulationsdienst
npm install
```

## 3. Installation mit Docker

Mit Docker laufen Apache/PHP, MySQL und phpMyAdmin in getrennten Containern. PHP und MySQL müssen dafür nicht zusätzlich auf dem Rechner installiert werden.

Die Docker-Dateien liegen im Verzeichnis `docker/`. Alle folgenden Befehle werden im Wurzelverzeichnis des Projekts ausgeführt.

### 3.1 Docker Desktop starten

Docker Desktop öffnen und warten, bis die Docker Engine vollständig gestartet ist. Anschließend im Projektverzeichnis prüfen, ob Docker Compose erreichbar ist:

```powershell
docker compose version
```

### 3.2 Frontend erstellen

Die JavaScript-Abhängigkeiten installieren und das Frontend bauen:

```powershell
npm install
npm run build
```

Der Build wird unter `docker/src/gratulationsdienst/` abgelegt. Dieses Verzeichnis bindet Docker als Webroot des Apache-Containers ein.

### 3.3 Backend für die Docker-Datenbank konfigurieren

Falls `php-api/config.php` noch nicht existiert, die Beispielkonfiguration kopieren:

```powershell
Copy-Item php-api/config.example.php php-api/config.php
```

In `php-api/config.php` folgende Docker-Verbindungsdaten eintragen:

```php
<?php
return [
    'dsn' => 'mysql:host=db;port=3306;dbname=gratulationsdienst;charset=utf8mb4',
    'user' => 'eb',
    'password' => 'test123456!!',
    'connect_timeout' => 5,
    'options' => [],
    'app_url' => 'http://localhost/gratulationsdienst/',
    'mail_from' => 'noreply@example.test',
    'mail_from_name' => 'Gratulationsdienst Reinickendorf',
];
```

Der Hostname muss innerhalb von Docker `db` lauten, nicht `localhost`. Benutzer, Passwort und Datenbankname müssen mit den Werten in `docker/docker-compose.yml` übereinstimmen. Für einen dauerhaften oder öffentlich erreichbaren Betrieb sind die Beispielpasswörter vor dem ersten Start zu ändern.

### 3.4 Container bauen und starten

Die Docker-Dateien liegen im Verzeichnis `docker/`. Alle folgenden `docker compose`-Befehle werden aus dem Projektverzeichnis ausgeführt.

Alle Dienste im Hintergrund starten:

```powershell
docker compose -f docker/docker-compose.yml up -d --build
```

Die Option `--build` baut über den `build:`-Block in `docker/docker-compose.yml` das Image für den Dienst `web` aus `docker/Dockerfile`. Das Dockerfile erweitert das Standard-Image `php:8.2-apache` um die für diese Anwendung nötigen Bausteine: die MySQL-Treiber `pdo_mysql`/`mysqli` für die Datenbankverbindung sowie `mod_rewrite` und `AllowOverride All`, damit die `.htaccess` der API greift. Die Dienste `db` und `phpmyadmin` nutzen dagegen fertige Images von Docker Hub und werden nicht lokal gebaut. Das Dockerfile wird nie direkt aufgerufen, sondern immer über `docker compose`.

Beim ersten Start werden die Images heruntergeladen, das PHP-Image gebaut und die MySQL-Datenbank initialisiert. Das kann einige Minuten dauern. Den Status zeigt:

```powershell
docker compose -f docker/docker-compose.yml ps
```

Die Dienste `web`, `db` und `phpmyadmin` sollten den Status `Up` beziehungsweise `running` haben.

### 3.5 Health-Test ausführen

Im Browser diesen Endpunkt öffnen:

```text
http://localhost/gratulationsdienst/php-api/index.php/health
```

Alternativ in PowerShell:

```powershell
Invoke-RestMethod http://localhost/gratulationsdienst/php-api/index.php/health
```

Eine erfolgreiche Antwort enthält:

```json
{"ok":true,"driver":"mysql","schema":"relational"}
```

Beim ersten Health-Aufruf legt die API das benötigte Datenbankschema automatisch an.

### 3.6 Anwendung und Ersteinrichtung öffnen

Die Anwendung ist erreichbar unter:

```text
http://localhost/gratulationsdienst/
```

Bei einer leeren Datenbank erscheint die Ersteinrichtung. Dort das erste Administratorkonto anlegen. Das Passwort muss mindestens zehn Zeichen lang sein.

phpMyAdmin ist erreichbar unter:

```text
http://localhost:8080/
```

Für die Anmeldung die MySQL-Daten aus `docker/docker-compose.yml` verwenden, standardmäßig Benutzer `eb` und Passwort `test123456!!`.

### 3.7 Container verwalten

Container stoppen, ohne die Datenbank zu löschen:

```powershell
docker compose -f docker/docker-compose.yml stop
```

Gestoppte Container wieder starten:

```powershell
docker compose -f docker/docker-compose.yml start
```

Container entfernen, aber die gespeicherte Datenbank behalten:

```powershell
docker compose -f docker/docker-compose.yml down
```

Protokolle anzeigen:

```powershell
docker compose -f docker/docker-compose.yml logs -f
```

Nach einer Änderung am Frontend erneut `npm run build` ausführen. Änderungen unter `php-api/` werden durch die Docker-Verzeichnisfreigabe direkt übernommen. Nach Änderungen an `docker/Dockerfile` oder `docker/docker-compose.yml` neu bauen und starten:

```powershell
docker compose -f docker/docker-compose.yml up -d --build
```

Die Datenbank liegt im Docker-Volume `db_data`. Der Befehl `docker compose -f docker/docker-compose.yml down -v` löscht dieses Volume und damit sämtliche Anwendungsdaten; er sollte nur für eine bewusst gewünschte vollständige Neuinstallation verwendet werden.

### 3.8 Häufige Docker-Probleme

- **Port 80 ist belegt:** Einen anderen Webserver wie XAMPP/IIS stoppen oder in `docker/docker-compose.yml` beispielsweise `8081:80` eintragen. Die Anwendung ist dann unter `http://localhost:8081/gratulationsdienst/` erreichbar.
- **Health-Test liefert 404:** Prüfen, ob `../php-api` im Dienst `web` nach `/var/www/html/gratulationsdienst/php-api` eingebunden ist.
- **Health-Test liefert 500:** Mit `docker compose -f docker/docker-compose.yml logs web` das Apache/PHP-Protokoll und mit `docker compose -f docker/docker-compose.yml logs db` den Datenbankstart prüfen.
- **Datenbankverbindung schlägt fehl:** In `php-api/config.php` muss der Datenbankhost `db` sein. Zugangsdaten müssen mit `docker/docker-compose.yml` übereinstimmen.
- **Altes Frontend wird angezeigt:** `npm run build` erneut ausführen und die Browserseite ohne Cache neu laden.

## 4. Datenbank ohne Docker einrichten

Als MySQL-Administrator eine Datenbank und einen eigenen Benutzer anlegen:

```sql
CREATE DATABASE gratulationsdienst
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'gd_user'@'localhost' IDENTIFIED BY 'sicheres-passwort';
GRANT ALL PRIVILEGES ON gratulationsdienst.* TO 'gd_user'@'localhost';
FLUSH PRIVILEGES;
```

Bei einer Datenbank auf einem anderen Server muss statt `localhost` der passende Host für Benutzer und Verbindung verwendet werden.

## 5. Backend ohne Docker konfigurieren

Die Beispielkonfiguration kopieren:

```powershell
Copy-Item php-api/config.example.php php-api/config.php
```

Anschließend `php-api/config.php` anpassen:

```php
<?php
return [
    'dsn' => 'mysql:host=localhost;port=3306;dbname=gratulationsdienst;charset=utf8mb4',
    'user' => 'gd_user',
    'password' => 'sicheres-passwort',
    'connect_timeout' => 5,
    'options' => [],
    'app_url' => 'http://localhost:5173/gratulationsdienst/',
    'mail_from' => 'noreply@example.test',
    'mail_from_name' => 'Gratulationsdienst Reinickendorf',
];
```

`config.php` enthält Zugangsdaten und darf nicht veröffentlicht oder in Git eingecheckt werden. Die Datei ist bereits über `php-api/.gitignore` ausgeschlossen.

Das Datenbankschema muss nicht manuell importiert werden. Die API führt `php-api/schema.mysql.sql` beim ersten Aufruf selbst aus und ergänzt bei späteren Versionen fehlende Spalten und Indizes.

## 6. Lokal ohne Docker starten

Zwei Terminals im Projektverzeichnis öffnen.

Im ersten Terminal das PHP-Backend starten:

```powershell
php -S 127.0.0.1:8080 -t .
```

Im zweiten Terminal das Frontend starten:

```powershell
npm run dev
```

Die von Vite ausgegebene Adresse öffnen, üblicherweise:

```text
http://localhost:5173/gratulationsdienst/
```

Vite leitet Anfragen an `/php-api` automatisch an das lokale PHP-Backend weiter.

## 7. Installation ohne Docker prüfen

Zuerst den Health-Endpunkt aufrufen:

```text
http://127.0.0.1:8080/php-api/index.php/health
```

Eine erfolgreiche Antwort enthält unter anderem:

```json
{"ok":true,"driver":"mysql","schema":"relational"}
```

Beim ersten Öffnen der Anwendung erscheint die Ersteinrichtung. Dort wird das erste Administratorkonto angelegt. Das Passwort muss mindestens zehn Zeichen lang sein. Die Ersteinrichtung ist nur möglich, solange noch kein Benutzer vorhanden ist.

## 8. Installation auf einem Produktivserver

### 8.1 Backend kopieren

Den Ordner `php-api/` unterhalb des Webroots bereitstellen, zum Beispiel:

```text
/var/www/html/gratulationsdienst/php-api/
```

Die produktive `config.php` wie in Abschnitt 5 anlegen. Dabei insbesondere folgende Werte ändern:

```php
'app_url' => 'https://example.org/gratulationsdienst/',
'mail_from' => 'noreply@example.org',
```

Für das API-Verzeichnis muss Apache `.htaccess` auswerten dürfen:

```apache
<Directory /var/www/html/gratulationsdienst/php-api>
    AllowOverride All
    Require all granted
</Directory>
```

Auf Debian/Ubuntu lässt sich `mod_rewrite` so aktivieren:

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### 8.2 Frontend konfigurieren und bauen

Wenn Frontend und API unter derselben Domain und demselben Anwendungspfad liegen, kann der Standardwert `/php-api` verwendet werden. Bei einem abweichenden API-Pfad eine Datei `.env.production` anlegen:

```text
VITE_API_BASE=/gratulationsdienst/php-api
```

Anschließend den Build erstellen:

```powershell
npm install
npm run build
```

Das aktuelle `vite.config.js` schreibt den Build nach `docker/src/gratulationsdienst/`. Für ein klassisches Deployment kann `build.outDir` stattdessen auf ein separates Verzeichnis wie `dist` gesetzt werden. Danach den Inhalt dieses Verzeichnisses nach `/var/www/html/gratulationsdienst/` kopieren; der Ordner `php-api/` bleibt dabei erhalten.

Das mitgelieferte Skript `deploy.ps1` ist auf den derzeit hinterlegten Server und dessen lokale Verzeichnisstruktur zugeschnitten. Es ist kein allgemeines Installationsskript und muss vor einer Verwendung geprüft und angepasst werden.

### 8.3 Produktionsbetrieb absichern

- Anwendung ausschließlich über HTTPS bereitstellen.
- Datenbankzugang nur für den notwendigen Host freigeben.
- `php-api/config.php` außerhalb öffentlicher Downloads halten und restriktive Dateirechte setzen.
- In `php-api/index.php` den derzeit offenen CORS-Header `Access-Control-Allow-Origin: *` auf die tatsächliche Herkunft der Anwendung einschränken.
- Regelmäßige Sicherungen der MySQL-Datenbank einrichten.
- E-Mail-Versand testen, falls Benutzer den Passwort-Reset verwenden sollen.

## 9. Aktualisierung

Vor einer Aktualisierung die Datenbank und die produktive Konfiguration sichern. Danach:

```powershell
git pull
npm install
npm run build
```

Frontend und geänderte Dateien aus `php-api/` bereitstellen. Beim nächsten API-Aufruf führt das Backend notwendige Schema-Ergänzungen automatisch aus. Die produktive `php-api/config.php` darf dabei nicht überschrieben werden.

## 10. Fehlerbehebung

### Datenbankverbindung schlägt fehl

- DSN, Benutzername und Passwort in `php-api/config.php` prüfen.
- Erreichbarkeit von Host und Port 3306 prüfen.
- Sicherstellen, dass `pdo_mysql` oder `mysqli` aktiviert ist.
- Prüfen, ob der Datenbankbenutzer Rechte auf die Datenbank besitzt.

### API liefert 404-Fehler

- `mod_rewrite` und `AllowOverride All` prüfen.
- Zum Eingrenzen zunächst den direkten Pfad `/php-api/index.php/health` testen.
- Den Wert `VITE_API_BASE` mit dem tatsächlichen Installationspfad vergleichen.

### Anwendung lädt, aber die Anmeldung funktioniert nicht

- Im Browser prüfen, ob Anfragen an `/auth/status` die API erreichen.
- Kontrollieren, ob die Tabellen `gd_users` und `gd_auth_tokens` angelegt wurden.
- Bei einer Neuinstallation prüfen, ob statt der Anmeldung zunächst die Ersteinrichtung angezeigt wird.

### Passwort-Reset versendet keine E-Mail

- `app_url`, `mail_from` und `mail_from_name` prüfen.
- Sicherstellen, dass PHP `mail()` auf dem Server korrekt eingerichtet ist.

Weitere Informationen zu Architektur, Datenmodell und Schnittstellen stehen in der [technischen Dokumentation](TECHNISCHE_DOKUMENTATION.md).
