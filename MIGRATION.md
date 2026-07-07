# Migration von Altdaten

Anleitung, um Alt-CSV-Exporte in die API-Collections zu übernehmen.

Es gibt zwei Migrationsskripte nach demselben Muster (Semikolon-CSV mit Quotes
einlesen, in ein camelCase-Array passend zur jeweiligen API-Collection wandeln,
als JSON-Datei schreiben — **kein** direkter DB-Zugriff):

| Skript | Quelle | Ausgabe | Collection |
| --- | --- | --- | --- |
| `scripts/migrate-citizens.js` | Bürger-/Jubilar-Export | `data/citizens.json` | `citizens` |
| `scripts/migrate-soko-members.js` | SOKO-Mitglieder-Export | `data/soko-members.json` | `sokoMembers` |

Der Rest dieses Dokuments beschreibt den Bürger-Import; SOKO-Mitglieder laufen
analog (nur andere Collection und ggf. Admin-Rechte, siehe unten).

## 1. JSON erzeugen

```bash
node scripts/migrate-citizens.js deine-altdaten.csv data/citizens.json
```

Das Skript meldet am Ende u. a. die Zahl der Verstorbenen/Verzogenen und listet
die bewusst **nicht** übernommenen Spalten (z. B. `kartentext` — der
Glückwunschtext wird im neuen System pro Druck-Lauf über die Vorlage bestimmt).

Mapping-Eckpunkte:

- `Geschlecht`→`salutation`, `Name`/`neu_*`→`firstName`/`lastName`,
  `Str/Nr`→`street`+`houseNo`, `plz`→`postalCode`, `bezirk`→`district`
  (Kürzel wie `Wdm` werden ausgeschrieben), `Geb_Datum`→`birthDate`.
- `glück soko/post/nein`→`wish`; `kartegedruckt`→`status` +
  `printedAge`/`printedYear`; `zeitung`→`pressPublication`.
- **Verstorbene/Verzogene** werden importiert, aber mit `wish="keine"`; das
  Detail steht in `notes`.
- IDs werden als `G-2026-001`, `G-2026-002`, … vergeben.

## 2. API-Basis kennen

Die API liegt unter `…/php-api` (Frontend: `API_BASE = VITE_API_BASE ?? "/php-api"`).

```bash
API=http://localhost/php-api      # bzw. echte Domain + /php-api
curl -s $API/health               # muss {"ok":true,...} liefern
```

## 3. Anmelden und Token holen

Der Login liefert ein Feld `token`, das als `Authorization: Bearer <token>`
mitgeschickt wird:

```bash
TOKEN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"DEINE_MAIL","password":"DEIN_PASSWORT"}' \
  | jq -r .token)
```

Ist für den Account MFA aktiv, kommt stattdessen `mfaRequired` zurück — dann
folgt noch ein `POST $API/auth/mfa/verify` mit `ticket` und `code`.

## 4. Hochladen — zwei Varianten

### A) Komplett ersetzen (`PUT /citizens`)

Am einfachsten, aber ⚠️ **destruktiv**: löscht zuerst *alle* vorhandenen Bürger
und schreibt dann die Datei. Nur bei leerer/zu überschreibender Tabelle nehmen.

```bash
curl -s -X PUT $API/citizens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @data/citizens.json | jq 'length'
```

### B) Datensatzweise einfügen/aktualisieren (`POST /citizens`)

**Nicht destruktiv**: Upsert je `id`, bestehende Bürger bleiben erhalten.

```bash
jq -c '.[]' data/citizens.json | while read -r item; do
  curl -s -X POST $API/citizens \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$item" > /dev/null
done
```

## Worauf achten

- **`citizens` braucht keine Admin-Rolle** — ein normaler User-Login reicht.
  Die Stammdaten-Collections (`sokoGroups`, `sokoMembers`, `streets`,
  `senders`, `templates`) erfordern dagegen Admin-Rechte.
- **Variante A löscht den Bestand** — vorher ggf. sichern:
  `curl -s -H "Authorization: Bearer $TOKEN" $API/citizens > backup.json`.
- **Erstmalige Migration in leere Tabelle** → Variante A (am schnellsten).
  Altbestand soll zu vorhandenen Daten *dazukommen* → Variante B.
- Bei Variante B mit bereits existierenden, gleichnamigen IDs werden diese
  überschrieben; bei A ist das egal, weil die Tabelle vorher geleert wird.
