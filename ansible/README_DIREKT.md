# Direkte Installation auf Debian mit Ansible

Dieses Playbook installiert den Gratulationsdienst ohne Docker direkt auf Debian. Apache, PHP und MariaDB laufen als Systemdienste. Node.js wird nur auf dem Entwicklungsrechner zum Erstellen des Release-Pakets benötigt, nicht auf dem Debian-Server.

Unterstützt wird Debian ab Version 12. Der Steuerrechner benötigt Ansible beziehungsweise `ansible-core` ab Version 2.16.

## 1. Release-Paket bauen

Auf dem Entwicklungsrechner im Projektverzeichnis:

```powershell
npm ci
npm run build:release
```

Das Playbook verwendet danach standardmäßig:

```text
docker/src/gratulationsdienst/
```

Dieses Verzeichnis enthält Frontend und PHP-API, aber keine produktive `config.php` und keine Zugangsdaten.

## 2. Ansible-Abhängigkeiten installieren

```bash
cd ansible
ansible-galaxy collection install -r requirements.yml
```

Für die direkte Installation wird zusätzlich die aktuelle `ansible.mysql`-Collection verwendet.

## 3. Inventar anlegen

```bash
cp inventory.direct.example.yml inventory.direct.yml
```

In `inventory.direct.yml` mindestens anpassen:

- `ansible_host`
- `ansible_user`
- `gratulationsdienst_direct_hostname`
- `gratulationsdienst_direct_app_url`
- `gratulationsdienst_direct_release_version`
- Mail-Absender

Verbindung testen:

```bash
ansible -i inventory.direct.yml gratulationsdienst_direct -m ansible.builtin.ping
```

## 4. TLS auswählen

Standardmäßig erzeugt das Playbook ein selbstsigniertes Zertifikat. Für ein vorhandenes Zertifikat:

```yaml
gratulationsdienst_direct_tls_mode: provided
gratulationsdienst_direct_tls_fullchain_src: '{{ playbook_dir }}/files/fullchain.pem'
gratulationsdienst_direct_tls_privkey_src: '{{ playbook_dir }}/files/privkey.pem'
gratulationsdienst_direct_tls_validate_certs: true
```

Let’s Encrypt wird von diesem Playbook nicht eingerichtet.

## 5. Installation ausführen

```bash
ansible-playbook -i inventory.direct.yml direct-site.yml
```

Das Playbook installiert:

- Apache mit `mod_rewrite`, `mod_ssl` und `mod_headers`
- PHP mit `pdo_mysql`
- MariaDB mit lokaler Bind-Adresse `127.0.0.1`
- einen eigenen Datenbankbenutzer und eine eigene Datenbank
- das fertige Release unter `/var/www/html/gratulationsdienst`
- eine geschützte PHP-Konfiguration
- einen HTTPS-VirtualHost mit HTTP-zu-HTTPS-Weiterleitung

Das Datenbankpasswort wird einmalig unter `/etc/gratulationsdienst/db_password` erzeugt und mit restriktiven Dateirechten gespeichert. Das Playbook setzt kein Root-Datenbankpasswort zurück und löscht keine Datenbank.

## 6. Updates

Ein neues Release bauen, `gratulationsdienst_direct_release_version` erhöhen und das Playbook erneut ausführen:

```bash
ansible-playbook -i inventory.direct.yml direct-site.yml
```

Vorher eine Datenbanksicherung erstellen. Die produktive `config.php` wird durch das Playbook aus den Variablen erzeugt und nicht aus dem Release überschrieben.

## 7. Netzwerk

Für externen Zugriff müssen TCP 22 für SSH/Ansible sowie TCP 80 und 443 in der VM- beziehungsweise Cloud-Firewall freigegeben sein. Der DNS-A- oder AAAA-Eintrag des Hostnamens muss auf die öffentliche IP-Adresse der VM zeigen.
