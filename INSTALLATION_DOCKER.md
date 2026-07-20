# Installation mit Docker

Diese Anleitung beschreibt die Installation des Gratulationsdienstes mit Docker Compose. Apache/PHP, MariaDB und optional phpMyAdmin laufen in getrennten Containern. Node.js muss auf dem Installationsrechner nicht installiert sein; Node.js wird nur vorübergehend beim Bau des Web-Images benötigt.

## 1. Voraussetzungen

- Docker Desktop oder Docker Engine mit Docker Compose
- Git oder ein entpacktes Verzeichnis des Quellpakets
- freier Host-Port 80
- optional Port 8080 für das lokale phpMyAdmin-Profil
- für den Produktivbetrieb ein vorgelagerter Reverse-Proxy, der TLS terminiert

Compose prüfen:

```powershell
docker-compose version
```

Neuere Installationen verwenden möglicherweise `docker compose`. Falls `docker-compose` nicht verfügbar ist, in allen Befehlen `docker-compose` durch `docker compose` ersetzen.

## 2. Projekt bereitstellen

```powershell
git clone https://github.com/eb58/Gratulationsdienst.git
cd Gratulationsdienst
```

Alternativ kann ein Quellpaket entpackt werden. Ein eigener Aufruf von `npm install` oder `npm run build` ist für die Docker-Installation nicht erforderlich. Der Frontend-Build und die Zusammenstellung der PHP-API erfolgen beim Image-Build.

## 3. Konfiguration prüfen

Alle Einstellungen stehen fest in `docker/docker-compose.yml`. Vor dem ersten Start die Passwörter im Service `db` und `web` auf eigene Werte ändern:

```yaml
# Service web
GD_DB_PASSWORD: '<Passwort des Benutzers eb>'

# Service db
MARIADB_ROOT_PASSWORD: '<Root-Passwort>'
MARIADB_PASSWORD: '<dasselbe Passwort wie GD_DB_PASSWORD>'
```

`GD_DB_PASSWORD` und `MARIADB_PASSWORD` müssen identisch sein, sonst kommt die API nicht an die Datenbank.

Die Passwörter stehen damit im Klartext in einer versionierten Datei. Die Datei darf deshalb nicht in ein öffentliches Repository gelangen, und der Zugriff auf das Repository ist wie der Zugriff auf die Datenbank zu behandeln.

Alle übrigen Einstellungen (`GD_APP_URL`, `GD_MAIL_FROM`, `GD_MAIL_FROM_NAME`, `GD_TRUSTED_PROXIES`) stehen fest in `docker/docker-compose.yml`. Für die lokale Entwicklung überschreibt `docker/docker-compose.dev.yml` die `GD_APP_URL` bereits auf `http://127.0.0.1/gratulationsdienst/`.

## 4. Lokale Installation starten

Der Container liefert die Anwendung ausschließlich über HTTP aus. phpMyAdmin wird durch das Profil `admin` aktiviert:

```powershell
docker-compose `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin up -d --build --remove-orphans
```

Beim ersten Start lädt Docker die benötigten Basis-Images und baut das Frontend im Web-Image. Auf dem Host wird dabei kein Node.js installiert.

Status prüfen:

```powershell
docker-compose `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin ps
```

Erwartet werden die Dienste `web`, `db` und `phpmyadmin`. MariaDB besitzt absichtlich keinen veröffentlichten Host-Port. phpMyAdmin ist ausschließlich über `127.0.0.1:8080` erreichbar.

## 5. Bestehendes MariaDB-Volume übernehmen

Die Variablen `MARIADB_ROOT_PASSWORD` und `MARIADB_PASSWORD` werden von MariaDB nur bei der ersten Initialisierung eines Volumes ausgewertet. Geänderte Werte in `docker-compose.yml` ändern daher nicht automatisch die Passwörter einer bestehenden Datenbank.

Wenn die bisherigen Zugangsdaten bekannt sind, vor dem Containerwechsel die Benutzer `root` und `eb` über MariaDB oder phpMyAdmin auf die neuen Werte aus `docker-compose.yml` setzen.

Ist das bisherige Root-Passwort nicht mehr verfügbar, kann das Passwort ohne Löschen des Volumes zurückgesetzt werden:

```powershell
docker-compose -f docker/docker-compose.yml --profile admin stop web phpmyadmin db

$volume = docker volume ls --filter name=mariadb_data --format '{{.Name}}'
if (-not $volume) { throw 'MariaDB-Volume nicht gefunden.' }

docker run -d --rm --name mariadb-recovery `
  --network none `
  -v "${volume}:/var/lib/mysql" `
  mariadb:11.4.8-noble `
  --skip-grant-tables --skip-networking

Start-Sleep -Seconds 8

$rootPassword = '<MARIADB_ROOT_PASSWORD aus docker-compose.yml>'
$appPassword = '<MARIADB_PASSWORD aus docker-compose.yml>'
$sql = "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword'; ALTER USER 'eb'@'%' IDENTIFIED BY '$appPassword'; FLUSH PRIVILEGES;"
$sql | docker exec -i mariadb-recovery mariadb -uroot

docker stop mariadb-recovery
```

Danach den lokalen Stack wieder starten:

```powershell
docker-compose `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin up -d --force-recreate --remove-orphans
```

Niemals `-v` oder `docker volume rm` verwenden, wenn die bestehende Datenbank erhalten bleiben soll.

## 6. Installation prüfen

Health-Endpunkt:

```powershell
curl.exe http://127.0.0.1/gratulationsdienst/php-api/index.php/health
```

Erwartet wird unter anderem:

```json
{"ok":true,"driver":"mysql","schema":"relational"}
```

Anwendung:

```text
http://127.0.0.1/gratulationsdienst/
```

Bei einer leeren Datenbank erscheint die Ersteinrichtung für das erste Administratorkonto. Das Anwendungspasswort ist unabhängig von den MariaDB-Passwörtern.

## 7. phpMyAdmin

phpMyAdmin ist nur mit dem Profil `admin` aktiv:

```text
http://127.0.0.1:8080/
```

Anmeldung:

- Benutzer: `eb`
- Passwort: Wert von `MARIADB_PASSWORD` aus `docker/docker-compose.yml`

phpMyAdmin wird an kein öffentliches Interface gebunden. Auf einem entfernten Server sollte der Zugriff ausschließlich über einen SSH-Tunnel erfolgen.

## 8. Container verwalten

Stoppen, ohne Daten zu löschen:

```powershell
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin stop
```

Wieder starten:

```powershell
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin start
```

Container und Netzwerk entfernen, Datenbank behalten:

```powershell
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin down
```

Logs anzeigen:

```powershell
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin logs -f
```

Nach Änderungen das Web-Image neu bauen:

```powershell
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin up -d --build --remove-orphans
```

`down -v` löscht zusätzlich `mariadb_data` und damit die vollständige Datenbank. Dieser Befehl ist nur für eine bewusst gewünschte Neuinstallation geeignet.

## 9. Datensicherung

Vor Updates oder Änderungen an Passwörtern die Datenbank sichern:

```powershell
$dbContainer = docker-compose -f docker/docker-compose.yml ps -q db
$backup = "gratulationsdienst-$(Get-Date -Format yyyyMMdd-HHmmss).sql"
docker exec $dbContainer sh -c 'mariadb-dump -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' | Set-Content -Encoding utf8 $backup
```

Sicherungen außerhalb des Docker-Hosts aufbewahren und eine Wiederherstellung regelmäßig testen.

## 10. Produktivbetrieb

Der Container terminiert kein TLS. Für den Produktivbetrieb einen Reverse-Proxy (z. B. nginx, Traefik oder Caddy) vorschalten, der das Zertifikat hält, HTTP auf HTTPS umleitet und auf Port 80 des Web-Containers weiterleitet.

Im Service `web` in `docker/docker-compose.yml` die echte HTTPS-Adresse und Absenderdaten eintragen:

```yaml
GD_APP_URL: 'https://example.org/gratulationsdienst/'
GD_MAIL_FROM: 'noreply@example.org'
GD_MAIL_FROM_NAME: 'Gratulationsdienst Reinickendorf'
```

Läuft die PHP-API hinter einem Reverse-Proxy, sehen alle Anwender für die API dieselbe
Proxy-IP; die Login-Rate-Limits würden dann alle gemeinsam treffen. In dem Fall die
Proxy-IP(s) kommagetrennt in `GD_TRUSTED_PROXIES` eintragen — nur dann wertet die API
`X-Forwarded-For` für die Client-IP aus:

```yaml
GD_TRUSTED_PROXIES: '172.18.0.2'
```

Produktionsstart ohne phpMyAdmin:

```powershell
docker-compose -f docker/docker-compose.yml up -d --build --remove-orphans
```

Sicherheitsregeln:

- MariaDB nicht über einen Host-Port veröffentlichen.
- phpMyAdmin nicht öffentlich bereitstellen.
- `docker/docker-compose.yml` enthält die Passwörter im Klartext: Dateirechte restriktiv setzen und die Datei nicht in ein öffentliches Repository pushen.
- Port 80 des Web-Containers nicht öffentlich veröffentlichen, sondern nur dem Reverse-Proxy zugänglich machen.
- HSTS und die HTTP-zu-HTTPS-Umleitung im Reverse-Proxy konfigurieren.
- regelmäßige externe Datenbanksicherungen einrichten.
- E-Mail-Versand für Passwort-Resets testen.
- Frontend und API unter derselben HTTPS-Domain betreiben.

## 11. Aktualisierung

Vorher Datenbank und `docker/docker-compose.yml` sichern:

```powershell
git pull
docker-compose -f docker/docker-compose.yml --profile admin pull
docker-compose -f docker/docker-compose.yml up -d --build --remove-orphans
```

Docker baut den aktuellen Frontend-Stand selbst. Da alle Werte fest in `docker/docker-compose.yml` stehen, überschreibt ein `git pull` die Konfiguration der Installation. Die Datei danach prüfen und die eigenen Passwörter und Adressen gegebenenfalls wieder eintragen.

## 12. Fehlerbehebung

### API liefert 500

- `docker-compose -f docker/docker-compose.yml logs web` prüfen.
- `docker-compose -f docker/docker-compose.yml logs db` prüfen.
- sicherstellen, dass `GD_DB_PASSWORD` und `MARIADB_PASSWORD` in `docker/docker-compose.yml` denselben Wert haben.
- `GD_DB_DSN`, `GD_DB_USER` und `GD_DB_PASSWORD` in der aufgelösten Compose-Konfiguration prüfen.

### API liefert 404

- das Web-Image mit `--build` neu erstellen.
- direkt `/gratulationsdienst/php-api/index.php/health` aufrufen.
- mit `docker-compose ... exec web ls -la /var/www/html/gratulationsdienst/php-api` prüfen, ob die API im Image enthalten ist.

### phpMyAdmin startet nicht

- Profil `admin` beim Compose-Aufruf ergänzen.
- prüfen, ob Port 8080 belegt ist.
- Logs mit `docker-compose -f docker/docker-compose.yml --profile admin logs phpmyadmin` prüfen.

### Port 80 ist belegt

Andere Webserver wie IIS oder XAMPP stoppen oder in `docker/docker-compose.yml` einen anderen Host-Port auf Container-Port 80 mappen.
