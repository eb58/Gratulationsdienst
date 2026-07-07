# Entwurf: Abrechnungsmodul (Vorschusswesen & Belegabgleich)

Bezug: Lastenheft Abschnitt 6.2 (Vorschuss-Kalkulation, Ist-Abgleich, Differenzrechnung)
und 6.3 (SOKO Budget Gratulationen: Reporting auf Ebene Mitglied / Einzel-SOKO / Gesamt,
Historisierung).

## Fachlicher Prozess

```
Soll-Kalkulation ──▶ Vorschuss auszahlen ──▶ Belege erfassen ──▶ Differenz ──▶ Periode abschließen
(Besuchswünsche ×     (advances-Eintrag       (expenseReceipts,     (berechnet,     (Einträge gesperrt,
 Abrechnungsbetrag)    je Mitglied/Periode)     je Gratulation)       nie gespeichert) revisionssicher)
```

Abrechnungsperiode = Kalendermonat (`YYYY-MM`), konsistent zur bestehenden
Monatslogik (`selectedReceiptMonth`, Quittungsdruck). Das Soll pro SOKO/Monat
existiert im Kern schon: `receiptCitizens()` × Betrag — genau die Summe der
SOKO-Quittung.

## Datenmodell

Zwei neue Collections nach dem bestehenden Muster (`_version`-Optimistic-Locking,
Bulk-PUT, `mergeById` entfällt — keine Default-Daten).

### `advances` (Vorschüsse)

| Feld | Typ | Bemerkung |
|---|---|---|
| id | string | `V-<lfd>` analog bestehender Id-Vergabe |
| memberId | string | SOKO-Mitglied (Empfänger der Auszahlung) |
| groupId | string | SOKO-Gruppe zum Auszahlungszeitpunkt (denormalisiert, s. Historisierung) |
| memberName | string | Snapshot "Nachname, Vorname" zum Auszahlungszeitpunkt |
| iban | string | Snapshot der Bankverbindung zum Auszahlungszeitpunkt |
| period | string | `YYYY-MM` |
| plannedAmount | string | Soll aus der Kalkulation (informativ, "8,50"-Format wie überall) |
| amount | string | tatsächlich ausgezahlter Vorschuss |
| paidAt | string | ISO-Datum der Auszahlung |
| note | string | frei |
| canceledAt / cancelReason | string | Storno statt Löschen (append-only) |

### `expenseReceipts` (Belege)

| Feld | Typ | Bemerkung |
|---|---|---|
| id | string | `B-<lfd>` |
| memberId / groupId / memberName | string | wie oben, Snapshot |
| citizenId | string | optionaler Bezug zum Gratulationsvorgang |
| citizenName | string | Snapshot (Bürger kann später gelöscht/umziehen) |
| period | string | `YYYY-MM` |
| date | string | Belegdatum (ISO) |
| amount | string | Belegbetrag |
| purpose | string | Zweck (Pflichtfeld laut Lastenheft: Datum, Betrag, Zweck) |
| canceledAt / cancelReason | string | Storno statt Löschen |

Optionaler Ausbau: Beleg-Foto als BLOB über eigene Endpunkte analog
`questionnaire-pages` (gleicher Upload-/Lazy-Load-Mechanismus). Nicht Teil des
ersten Inkrements — das Lastenheft verlangt nur die Belegdaten.

### `closedPeriods` (Periodenabschluss)

Kleine dritte Collection (oder Settings-Eintrag): `{ id: "YYYY-MM", closedAt, closedBy }`.
Eine geschlossene Periode sperrt Anlage/Storno von advances/expenseReceipts dieser
Periode (Frontend-Guard + Backend-Check) → Revisionssicherheit.

## Berechnungen (nur abgeleitet, nie gespeichert)

In einem neuen Modul `modules/billing.js`, analog zu `assignment.js`:

- `plannedAmountForGroup(groupId, period)` — Besuchs-Jubilare der Gruppe im Monat ×
  Abrechnungsbetrag; nutzt vorhandenes `receiptCitizens()`. Betrag: `billingAmount`
  des Mitglieds, Fallback `state.quittungBetrag`.
- `memberSaldo(memberId, period?)` — Σ advances − Σ expenseReceipts (ohne stornierte).
  Positiv = Überhang (Rückzahlung ans Amt), negativ = Unterdeckung (Nachzahlung
  ans Mitglied). Beträge intern in Cent rechnen (`Number`-Cent-Helfer in `utils.js`),
  nie mit Float-Euro.
- `groupSaldo(groupId, period?)`, `totalSaldo(period?)` — Aggregation darüber.

## Backend

- `COLLECTIONS` um `advances`, `expenseReceipts`, `closedPeriods` erweitern;
  `collectionConfig()`-Einträge mit Tabellen `gd_advances`, `gd_expense_receipts`,
  `gd_closed_periods` (Spalten 1:1 wie oben, `period` indexiert).
- Schreibrechte wie `citizens` (StandardUser erfasst Belege — die Verwaltungskraft,
  nicht das SOKO-Mitglied, arbeitet im System); `closedPeriods` nur Admin.
- Backend-Validierung: Schreibzugriff auf Einträge einer geschlossenen Periode → 409.

## Frontend

Neuer View `abrechnung` (Navigation neben "Quittungsdruck", Zugriff wie
Quittung), Aufbau als Drilldown mit AG Grid:

1. **Gesamt** — eine Zeile pro SOKO: Soll (kalkuliert), Vorschüsse, Belege, Saldo,
   Status offener Belegnachweise. Fußzeile: konsolidierter Gesamtstatus.
2. **Einzel-SOKO** (Klick auf Zeile) — Mitgliederliste mit Vorschuss-Salden,
   Soll-Ist-Vergleich, offene Nachweise.
3. **Einzelmitglied** (Klick) — persönlicher Abrechnungsnachweis: Vorschüsse gegen
   Einzelbelege mit Saldo; Buttons "Vorschuss erfassen" / "Beleg erfassen"
   (Formulare im bestehenden `form-grid`-Stil, `data-amount-field` für Beträge).

Monatsauswahl wie im Quittungs-View; Periodenabschluss-Button (Admin) auf Ebene Gesamt.

**Exporte:**
- CSV je Ebene (ein Klick, `Blob`-Download — kein Backend nötig).
- PDF "Individueller Abrechnungsnachweis" je Mitglied analog `renderSokoQuittung`
  (gleiches Druckfenster-Muster über `openPrintWindow`).
- XLSX erst bei Bedarf (Lastenheft erlaubt PDF **oder** XLSX **oder** CSV).

## Historisierung / Revisionssicherheit

- Kein Löschen, nur Storno mit Grund — erledigt die Nachvollziehbarkeit.
- Snapshots (memberName, groupId, iban, citizenName) am Eintrag statt Join zur
  Gegenwart — personelle Änderungen in SOKO-Strukturen verfälschen vergangene
  Perioden nicht (Lastenheft 6.3 "Historisierung").
- Periodenabschluss friert den Datenstand ein.

## Umsetzung in Inkrementen

1. **Datenbasis:** Collections + Backend-Tabellen + `billing.js` mit Salden-Logik (+ Tests).
2. **Erfassung:** View `abrechnung` mit Drilldown, Vorschuss-/Beleg-Formulare, Storno.
3. **Abschluss & Export:** Periodenabschluss, CSV-Exporte, PDF-Abrechnungsnachweis.
4. **Optional:** Beleg-Fotos (BLOB-Upload wie Fragebogen-Scans), XLSX.

## Offene Entscheidungen

- Vorschuss an **Leitung oder Mitglied**? Das Lastenheft lässt beides zu ("an die
  SOKO-Leitung oder das SOKO-Mitglied"). Modell oben kann beides (memberId zeigt
  auf beliebiges Mitglied); die Soll-Kalkulation pro Gruppe legt Auszahlung an die
  Leitung nahe. → Mit dem Amt klären.
- Periodenraster fix Monat, oder auch Quartal/Jahr? Entwurf: Monat.
- Muss die Aufwandspauschale (`allowance`) mit in den Saldo, oder bleibt sie
  separates Kosten-Reporting (Lastenheft 6.3 führt sie getrennt)? Entwurf: getrennt.
