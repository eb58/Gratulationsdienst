# AGENTS.md

## Arbeitsregeln

- In JavaScript moeglichst `const` und Arrow Functions verwenden.
- `let` nur nutzen, wenn eine erneute Zuweisung noetig ist.
- Schreibweise kompakt halten, ohne Lesbarkeit zu opfern.
- Aenderungen eng am bestehenden Stil und an der vorhandenen Struktur halten.
- Textdateien in UTF-8 halten; keine ungepruefte Umcodierung und kein mojibake in neuem Text.
- Keep it simple, stupid -> KISS-Prinzip
- use globalThis not window

## Projektwissen

- Die App ist ein lokales JS/PHP-Projekt mit Frontend in `modules/`, Tests in `tests/` und Backend in `php-api/`.
- `docs/projektkontext.md` ist die erste Arbeitsgrundlage fuer Codex.
- `docs/lastenheft-kurz.md` ist die komprimierte fachliche Lesefassung.
- `Lastenheft.pdf` im Repo-Root ist die fachliche Referenz und bei Anforderungen zuerst zu beachten.
- Import- und Dokumentenlauf-Aenderungen immer zusammen mit den zugehoerigen Tests anfassen.
- Bei Schemaaenderungen (neue `ensureColumn`/`ensureIndex`-Zeile in `initSchema`) die Konstante `SCHEMA_VERSION` in `php-api/index.php` erhoehen, sonst laeuft die Migration nach dem Deployment nicht.
- Wenn ein Verhalten dauerhaft fuer Codex relevant ist, gehoert es hier hinein, nicht nur in den Prompt.

## Pruefen

- Vor dem Abschluss die betroffenen Tests ausfuehren.
- Fuer breitere Aenderungen mindestens `npm.cmd test` laufen lassen.
- Wenn UI- oder Dokument-Layout betroffen ist, zusaetzlich die dazugehoerigen Spezialtests pruefen.
