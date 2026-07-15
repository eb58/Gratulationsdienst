# Entwicklungsanleitung

Diese Anleitung ist ausschließlich für die Entwicklung und das Erstellen von Releases gedacht. Für eine normale Installation ist Node.js nicht erforderlich.

## Voraussetzungen

- Node.js 22 mit npm
- PHP 8.2 oder neuer mit `pdo_mysql` oder `mysqli`
- MariaDB 11.x oder neuer
- Git

## Abhängigkeiten installieren

```powershell
git clone https://github.com/eb58/Gratulationsdienst.git
cd Gratulationsdienst
npm ci
```

## Entwicklungsdatenbank und API konfigurieren

Eine MariaDB-Datenbank und einen Benutzer anlegen. Danach die lokale Konfiguration erstellen:

```powershell
Copy-Item php-api/config.example.php php-api/config.php
```

In `php-api/config.php` mindestens `dsn`, `user`, `password` und `app_url` anpassen. Für den Vite-Entwicklungsserver lautet die Anwendungsadresse normalerweise:

```php
'app_url' => 'http://localhost:5173/gratulationsdienst/',
```

Die Datei `.env.development` enthält:

```text
VITE_API_BASE=/php-api/index.php
```

## Lokal entwickeln

Im ersten Terminal den PHP-Builtin-Server starten:

```powershell
php -S 127.0.0.1:8080 -t .
```

Im zweiten Terminal Vite starten:

```powershell
npm run dev
```

Die Anwendung ist anschließend unter `http://localhost:5173/gratulationsdienst/` erreichbar. Vite leitet API-Aufrufe an den PHP-Server weiter.

## Tests

Alle JavaScript-Tests ausführen:

```powershell
npm test
```

Weitere vorhandene Prüfungen:

```powershell
npm run test:coverage
npm run test:e2e
npm run check:directory
```

## Release für eine Installation ohne Docker bauen

```powershell
npm ci
npm run build:release
```

Das vollständige, auslieferbare Verzeichnis liegt danach unter:

```text
docker/src/gratulationsdienst/
```

Es enthält das gebaute Frontend und die benötigten PHP-API-Dateien, aber keine produktive `config.php` und keine Zugangsdaten. Dieses Verzeichnis kann als ZIP-Archiv bereitgestellt werden.

Beispiel unter PowerShell:

```powershell
Compress-Archive -Path docker/src/gratulationsdienst `
  -DestinationPath gratulationsdienst-release.zip -Force
```

## Docker-Build

Für die Docker-Installation ist kein vorheriger Host-Build nötig. Das Multi-Stage-Dockerfile führt `npm ci` und `npm run build:release` in einer internen Node-Buildstufe aus. Das fertige Laufzeit-Image enthält nur Apache, PHP, das Frontend und die PHP-API; Node.js ist nicht Bestandteil des laufenden Containers.
