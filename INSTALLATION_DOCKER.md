# Installation mit Docker

Diese Anleitung beschreibt die Installation des Gratulationsdienstes mit Docker Compose. Apache/PHP, MariaDB und optional phpMyAdmin laufen in getrennten Containern. Node.js muss auf dem Installationsrechner nicht installiert sein; Docker verwendet Node.js nur vorübergehend beim Bau des Web-Images.

## 1. Voraussetzungen

- Docker Desktop oder Docker Engine mit Docker Compose
- Git oder ein entpacktes Verzeichnis des Quellpakets
- freie Host-Ports 80 und 443
- optional Port 8080 für das lokale phpMyAdmin-Profil
- für den Produktivbetrieb ein gültiges TLS-Zertifikat

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

## 3. Umgebung und Secrets anlegen

Die lokale Docker-Umgebung einmalig anlegen:

```powershell
if (!(Test-Path docker/.env)) {
    Copy-Item docker/.env.example docker/.env
}

New-Item -ItemType Directory -Force docker/secrets | Out-Null

if (!(Test-Path docker/secrets/db_root_password.txt)) {
    [guid]::NewGuid().ToString('N') | Set-Content -NoNewline docker/secrets/db_root_password.txt
}

if (!(Test-Path docker/secrets/db_password.txt)) {
    [guid]::NewGuid().ToString('N') | Set-Content -NoNewline docker/secrets/db_password.txt
}
```

Für die lokale Installation enthält `docker/.env` beispielsweise:

```text
GD_APP_URL=https://localhost/gratulationsdienst/
GD_MAIL_FROM=noreply@example.test
GD_MAIL_FROM_NAME=Gratulationsdienst Reinickendorf
```

Die Dateien `docker/.env` und `docker/secrets/*.txt` werden von Git ignoriert. Passwörter nicht in `docker-compose.yml`, PHP-Dateien oder Dokumentation kopieren.

## 4. Lokale Installation starten

Der lokale Override darf bei fehlenden Zertifikaten ein selbstsigniertes Zertifikat erzeugen. phpMyAdmin wird durch das Profil `admin` aktiviert:

```powershell
docker-compose --env-file docker/.env `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin up -d --build --remove-orphans
```

Beim ersten Start lädt Docker die benötigten Basis-Images und baut das Frontend im Web-Image. Auf dem Host wird dabei kein Node.js installiert.

Status prüfen:

```powershell
docker-compose --env-file docker/.env `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin ps
```

Erwartet werden die Dienste `web`, `db` und `phpmyadmin`. MariaDB besitzt absichtlich keinen veröffentlichten Host-Port. phpMyAdmin ist ausschließlich über `127.0.0.1:8080` erreichbar.

## 5. Bestehendes MariaDB-Volume übernehmen

Die Variablen `MARIADB_ROOT_PASSWORD_FILE` und `MARIADB_PASSWORD_FILE` werden von MariaDB nur bei der ersten Initialisierung eines Volumes ausgewertet. Neue Secret-Dateien ändern daher nicht automatisch die Passwörter einer bestehenden Datenbank.

Wenn die bisherigen Zugangsdaten bekannt sind, vor dem Containerwechsel die Benutzer `root` und `eb` über MariaDB oder phpMyAdmin auf die Inhalte der neuen Secret-Dateien setzen.

Ist das bisherige Root-Passwort nicht mehr verfügbar, kann das Passwort ohne Löschen des Volumes zurückgesetzt werden:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml --profile admin stop web phpmyadmin db

$volume = docker volume ls --filter name=mariadb_data --format '{{.Name}}'
if (-not $volume) { throw 'MariaDB-Volume nicht gefunden.' }

docker run -d --rm --name mariadb-recovery `
  --network none `
  -v "${volume}:/var/lib/mysql" `
  mariadb:11.4.8-noble `
  --skip-grant-tables --skip-networking

Start-Sleep -Seconds 8

$rootPassword = (Get-Content -Raw docker/secrets/db_root_password.txt).Trim()
$appPassword = (Get-Content -Raw docker/secrets/db_password.txt).Trim()
$sql = "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPassword'; ALTER USER 'eb'@'%' IDENTIFIED BY '$appPassword'; FLUSH PRIVILEGES;"
$sql | docker exec -i mariadb-recovery mariadb -uroot

docker stop mariadb-recovery
```

Danach den lokalen Stack wieder starten:

```powershell
docker-compose --env-file docker/.env `
  -f docker/docker-compose.yml `
  -f docker/docker-compose.dev.yml `
  --profile admin up -d --force-recreate --remove-orphans
```

Niemals `-v` oder `docker volume rm` verwenden, wenn die bestehende Datenbank erhalten bleiben soll.

## 6. Installation prüfen

Health-Endpunkt:

```powershell
curl.exe -k https://localhost/gratulationsdienst/php-api/index.php/health
```

Erwartet wird unter anderem:

```json
{"ok":true,"driver":"mysql","schema":"relational"}
```

Anwendung:

```text
https://localhost/gratulationsdienst/
```

Bei einer leeren Datenbank erscheint die Ersteinrichtung für das erste Administratorkonto. Das Anwendungspasswort ist unabhängig von den MariaDB-Secrets. Beim selbstsignierten lokalen Zertifikat ist eine Browserwarnung zu erwarten.

## 7. phpMyAdmin

phpMyAdmin ist nur mit dem Profil `admin` aktiv:

```text
http://127.0.0.1:8080/
```

Anmeldung:

- Benutzer: `eb`
- Passwort: Inhalt von `docker/secrets/db_password.txt`

phpMyAdmin wird an kein öffentliches Interface gebunden. Auf einem entfernten Server sollte der Zugriff ausschließlich über einen SSH-Tunnel erfolgen.

## 8. Container verwalten

Stoppen, ohne Daten zu löschen:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin stop
```

Wieder starten:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin start
```

Container und Netzwerk entfernen, Datenbank behalten:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin down
```

Logs anzeigen:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin logs -f
```

Nach Änderungen das Web-Image neu bauen:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --profile admin up -d --build --remove-orphans
```

`down -v` löscht zusätzlich `mariadb_data` und damit die vollständige Datenbank. Dieser Befehl ist nur für eine bewusst gewünschte Neuinstallation geeignet.

## 9. Datensicherung

Vor Updates oder Änderungen an Passwörtern die Datenbank sichern:

```powershell
$dbContainer = docker-compose --env-file docker/.env -f docker/docker-compose.yml ps -q db
$backup = "gratulationsdienst-$(Get-Date -Format yyyyMMdd-HHmmss).sql"
docker exec $dbContainer sh -c 'mariadb-dump -u"$MARIADB_USER" -p"$(cat /run/secrets/db_password)" "$MARIADB_DATABASE"' | Set-Content -Encoding utf8 $backup
```

Sicherungen außerhalb des Docker-Hosts aufbewahren und eine Wiederherstellung regelmäßig testen.

## 10. Produktivbetrieb

In `docker/.env` die echte HTTPS-Adresse und Absenderdaten setzen:

```text
GD_APP_URL=https://example.org/gratulationsdienst/
GD_MAIL_FROM=noreply@example.org
GD_MAIL_FROM_NAME=Gratulationsdienst Reinickendorf
```

Unter `docker/certs/` müssen vor dem Start vorhanden sein:

```text
fullchain.pem
privkey.pem
```

Der Produktions-Stack erzeugt keine selbstsignierten Zertifikate und startet ohne Zertifikatspaar nicht. Port 80 wird auf HTTPS umgeleitet.

Produktionsstart ohne phpMyAdmin:

```powershell
docker-compose --env-file docker/.env -f docker/docker-compose.yml up -d --build --remove-orphans
```

Sicherheitsregeln:

- MariaDB nicht über einen Host-Port veröffentlichen.
- phpMyAdmin nicht öffentlich bereitstellen.
- Secret- und Zertifikatsdateien mit restriktiven Dateirechten schützen.
- regelmäßige externe Datenbanksicherungen einrichten.
- E-Mail-Versand für Passwort-Resets testen.
- Frontend und API unter derselben HTTPS-Domain betreiben.

## 11. Aktualisierung

Vorher Datenbank, `docker/.env`, Secrets und Zertifikate sichern:

```powershell
git pull
docker-compose --env-file docker/.env -f docker/docker-compose.yml --profile admin pull
docker-compose --env-file docker/.env -f docker/docker-compose.yml up -d --build --remove-orphans
```

Docker baut den aktuellen Frontend-Stand selbst. Die Dateien `docker/.env`, `docker/secrets/*` und `docker/certs/*` dürfen nicht durch Repository-Dateien überschrieben werden.

## 12. Fehlerbehebung

### API liefert 500

- `docker-compose --env-file docker/.env -f docker/docker-compose.yml logs web` prüfen.
- `docker-compose --env-file docker/.env -f docker/docker-compose.yml logs db` prüfen.
- sicherstellen, dass das Passwort des MariaDB-Benutzers `eb` dem Inhalt von `docker/secrets/db_password.txt` entspricht.
- `GD_DB_DSN`, `GD_DB_USER` und `GD_DB_PASSWORD_FILE` in der aufgelösten Compose-Konfiguration prüfen.

### API liefert 404

- das Web-Image mit `--build` neu erstellen.
- direkt `/gratulationsdienst/php-api/index.php/health` aufrufen.
- mit `docker-compose ... exec web ls -la /var/www/html/gratulationsdienst/php-api` prüfen, ob die API im Image enthalten ist.

### phpMyAdmin startet nicht

- Profil `admin` beim Compose-Aufruf ergänzen.
- prüfen, ob Port 8080 belegt ist.
- Logs mit `docker-compose --env-file docker/.env -f docker/docker-compose.yml --profile admin logs phpmyadmin` prüfen.

### Port 80 oder 443 ist belegt

Andere Webserver wie IIS oder XAMPP stoppen. Alternative Host-Ports benötigen zusätzlich einen passenden HTTP-zu-HTTPS-Redirect in `docker/apache-http.conf`.

### Browser meldet „Nicht sicher“

Lokal ist das selbstsignierte Zertifikat erwartbar. Produktiv müssen ein gültiges `fullchain.pem` und `privkey.pem` eingesetzt werden.
