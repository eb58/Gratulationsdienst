// Testet die Persistenz- und Versions-Logik der PHP-API gegen eine In-Memory-SQLite
// (API_TEST_MODE laedt index.php ohne Dispatch; pdo_sqlite wird per -d Flag nachgeladen,
// weil die lokale php.ini die Extension nicht aktiviert).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { describe, it } from 'node:test';
import path from 'node:path';

const powershell = 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const php = 'C:\\Users\\erich\\AppData\\Local\\Programs\\PHP\\current\\php.exe';
const phpExtDir = path.join(path.dirname(php), 'ext');
const apiIndex = path.resolve('php-api/index.php').replace(/\\/g, '/');
const canRunPhp = (() => {
  try {
    fs.accessSync(php, fs.constants.X_OK);
    fs.accessSync(path.join(phpExtDir, 'php_pdo_sqlite.dll'));
    return true;
  } catch {
    return false;
  }
})();
const suite = canRunPhp ? describe : describe.skip;

const runPhp = code => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-php-'));
  const tempFile = path.join(tempDir, 'script.php');
  fs.writeFileSync(tempFile, `<?php\ndeclare(strict_types=1);\n${code}\n`, 'utf8');

  try {
    const flags = `-d display_errors=1 -d extension_dir='${phpExtDir.replace(/\\/g, '/')}' -d extension=pdo_sqlite`;
    const result = spawnSync(powershell, ['-NoProfile', '-Command', `& '${php}' ${flags} -f '${tempFile.replace(/\\/g, '/')}'`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error ?? ''));
    return JSON.parse(result.stdout.trim());
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

// Legt die fuer die Tests noetigen Tabellen an (Spalten wie schema.mysql.sql, Typen SQLite-vereinfacht)
// und stellt $conflict bereit, das ApiError-409er als Datenstruktur einfaengt.
const prelude = `
  define('API_TEST_MODE', true);
  require '${apiIndex}';
  $pdo = new PDO('sqlite::memory:');
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $pdo->exec("CREATE TABLE gd_citizens (
    id TEXT PRIMARY KEY, salutation TEXT DEFAULT '', first_name TEXT DEFAULT '', last_name TEXT DEFAULT '',
    street TEXT DEFAULT '', house_no TEXT DEFAULT '', postal_code TEXT DEFAULT '', district TEXT DEFAULT '',
    birth_date TEXT, phone TEXT DEFAULT '', email TEXT DEFAULT '', wish TEXT DEFAULT '', notes TEXT DEFAULT '',
    source TEXT DEFAULT '', updated_at_date TEXT, status TEXT DEFAULT '', printed_at_date TEXT,
    printed_age INTEGER, printed_year INTEGER, press_publication INTEGER DEFAULT 0,
    wedding_anniversary TEXT DEFAULT '', wedding_date TEXT, spouse_name TEXT DEFAULT '',
    archived INTEGER DEFAULT 0, questionnaire_cycle TEXT DEFAULT '',
    created_at TEXT, row_version INTEGER NOT NULL DEFAULT 1
  )");
  $pdo->exec("CREATE TABLE gd_senders (
    id TEXT PRIMARY KEY, role TEXT DEFAULT '', name TEXT DEFAULT '', department TEXT DEFAULT '',
    address TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', logo TEXT DEFAULT '',
    signature TEXT DEFAULT '', color TEXT DEFAULT '', row_version INTEGER NOT NULL DEFAULT 1
  )");
  $db = ['driver' => 'sqlite', 'pdo' => $pdo];
  $conflict = static function (callable $fn): array {
    try { $fn(); return ['ok' => true]; }
    catch (ApiError $e) { return ['status' => $e->status] + $e->details; }
  };
`;

suite('php-api persistence', () => {
  it('upsert erhaelt created_at, mappt Typen und zaehlt row_version hoch', () => {
    const { insert, update } = runPhp(`${prelude}
      upsertItem($db, 'citizens', 'C-1', ['id' => 'C-1', 'firstName' => 'Anna', 'lastName' => 'Alt',
        'birthDate' => '1935-03-15', 'printedAge' => 90, 'pressPublication' => true, 'createdAt' => '2020-01-01 12:00:00']);
      $insert = readItem($db, 'citizens', 'C-1');
      upsertItem($db, 'citizens', 'C-1', ['id' => 'C-1', 'firstName' => 'Anna', 'lastName' => 'Neu']);
      echo json_encode(['insert' => $insert, 'update' => readItem($db, 'citizens', 'C-1')]);
    `);

    assert.equal(insert.createdAt, '2020-01-01 12:00:00');
    assert.equal(insert.birthDate, '1935-03-15');
    assert.equal(insert.printedAge, 90);
    assert.equal(insert.pressPublication, true);
    assert.equal(insert._version, '1');
    // Update ohne createdAt im Payload darf das Anlagedatum nicht ueberschreiben.
    assert.equal(update.createdAt, '2020-01-01 12:00:00');
    assert.equal(update.lastName, 'Neu');
    assert.equal(update.pressPublication, false);
    assert.equal(update._version, '2');
  });

  it('Versions-Checks erlauben nur Schreiben/Loeschen mit korrekter Version', () => {
    const result = runPhp(`${prelude}
      upsertItem($db, 'citizens', 'C-1', ['id' => 'C-1', 'firstName' => 'Anna', 'lastName' => 'Alt']);
      echo json_encode([
        'writeOhneVersion' => $conflict(fn () => assertItemVersionAllowsWrite($db, 'citizens', 'C-1', ['id' => 'C-1'])),
        'writeFalscheVersion' => $conflict(fn () => assertItemVersionAllowsWrite($db, 'citizens', 'C-1', ['id' => 'C-1', '_version' => '99'])),
        'writeKorrekteVersion' => $conflict(fn () => assertItemVersionAllowsWrite($db, 'citizens', 'C-1', ['id' => 'C-1', '_version' => '1'])),
        'neuMitVersion' => $conflict(fn () => assertItemVersionAllowsWrite($db, 'citizens', 'C-2', ['id' => 'C-2', '_version' => '1'])),
        'deleteFalscheVersion' => $conflict(fn () => assertItemVersionAllowsDelete($db, 'citizens', 'C-1', '99')),
        'deleteKorrekteVersion' => $conflict(fn () => assertItemVersionAllowsDelete($db, 'citizens', 'C-1', '1')),
      ]);
    `);

    assert.deepEqual(result.writeOhneVersion, { status: 409, collection: 'citizens', id: 'C-1', currentVersion: '1' });
    assert.deepEqual(result.writeFalscheVersion, { status: 409, collection: 'citizens', id: 'C-1', currentVersion: '1' });
    assert.deepEqual(result.writeKorrekteVersion, { ok: true });
    assert.deepEqual(result.neuMitVersion, { status: 409, collection: 'citizens', id: 'C-2', currentVersion: '' });
    assert.deepEqual(result.deleteFalscheVersion, { status: 409, collection: 'citizens', id: 'C-1', currentVersion: '1' });
    assert.deepEqual(result.deleteKorrekteVersion, { ok: true });
  });

  it('replaceCollection loescht, aendert und legt an — nur mit passenden knownVersions', () => {
    const result = runPhp(`${prelude}
      replaceCollection($db, 'senders', [['id' => 'S-1', 'name' => 'Bezirksamt'], ['id' => 'S-2', 'name' => 'BVV']]);
      $ohneVersionen = $conflict(fn () => replaceCollection($db, 'senders', [['id' => 'S-1', 'name' => 'X']]));
      replaceCollection($db, 'senders', [
        ['id' => 'S-1', 'name' => 'Bezirksamt Reinickendorf', '_version' => '1'],
        ['id' => 'S-3', 'name' => 'Seniorenvertretung'],
      ], ['S-1' => '1', 'S-2' => '1']);
      $veraltet = $conflict(fn () => replaceCollection($db, 'senders', [['id' => 'S-1', 'name' => 'X', '_version' => '1']], ['S-1' => '1', 'S-3' => '1']));
      echo json_encode(['ohneVersionen' => $ohneVersionen, 'after' => readCollection($db, 'senders'), 'veraltet' => $veraltet]);
    `);

    // Payload ohne Versionsangaben darf eine nicht-leere Collection nicht ersetzen.
    assert.equal(result.ohneVersionen.status, 409);
    assert.deepEqual(result.after.map(({ id, name, _version }) => ({ id, name, _version })), [
      { id: 'S-1', name: 'Bezirksamt Reinickendorf', _version: '2' },
      { id: 'S-3', name: 'Seniorenvertretung', _version: '1' },
    ]);
    assert.deepEqual(result.veraltet, { status: 409, collection: 'senders', id: 'S-1', currentVersion: '2' });
  });

  it('verifyTotp akzeptiert nur den korrekten Code und nie ein leeres Secret', () => {
    const result = runPhp(`${prelude}
      $secret = base32Secret();
      $code = totpCode($secret, intdiv(time(), 30));
      echo json_encode([
        'leeresSecret' => verifyTotp('', $code),
        'korrekterCode' => verifyTotp($secret, $code),
        'falscherCode' => verifyTotp($secret, $code === '000000' ? '000001' : '000000'),
      ]);
    `);

    assert.equal(result.leeresSecret, false);
    assert.equal(result.korrekterCode, true);
    assert.equal(result.falscherCode, false);
  });
});
