// Testet die Persistenz- und Versions-Logik der PHP-API gegen eine In-Memory-SQLite
// (API_TEST_MODE laedt index.php ohne Dispatch; pdo_sqlite wird per -d Flag nachgeladen,
// weil die lokale php.ini die Extension nicht aktiviert).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { describe, it } from 'node:test';
import path from 'node:path';

const configuredPhp = process.env.PHP_BINARY || 'php';
const phpProbe = spawnSync(configuredPhp, ['-v'], { encoding: 'utf8' });
const php = phpProbe.status === 0 ? configuredPhp : 'C:\\Users\\erich\\AppData\\Local\\Programs\\PHP\\current\\php.exe';
const moduleProbe = phpProbe.status === 0 ? spawnSync(php, ['-m'], { encoding: 'utf8' }) : null;
const detectedExtDir = phpProbe.status === 0
  ? spawnSync(php, ['-r', 'echo ini_get("extension_dir");'], { encoding: 'utf8' }).stdout.trim()
  : '';
const phpExtDir = detectedExtDir || path.join(path.dirname(php), 'ext');
const apiIndex = path.resolve('php-api/index.php').replace(/\\/g, '/');
const canRunPhp = (() => {
  try {
    if (phpProbe.status === 0) {
      return moduleProbe?.stdout.toLowerCase().includes('pdo_sqlite') || fs.existsSync(path.join(phpExtDir, 'php_pdo_sqlite.dll'));
    }
    fs.accessSync(php, fs.constants.X_OK);
    return fs.existsSync(path.join(phpExtDir, 'php_pdo_sqlite.dll'));
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
    const args = ['-d', 'display_errors=1'];
    if (!moduleProbe?.stdout.toLowerCase().includes('pdo_sqlite')) args.push('-d', `extension_dir=${phpExtDir}`, '-d', 'extension=pdo_sqlite');
    args.push('-f', tempFile);
    const result = spawnSync(php, args, { encoding: 'utf8' });
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
    birth_date TEXT, phone TEXT DEFAULT '', email TEXT DEFAULT '', wish TEXT DEFAULT '', deceased INTEGER DEFAULT 0, moved INTEGER DEFAULT 0, notes TEXT DEFAULT '',
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
  $pdo->exec("CREATE TABLE gd_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT DEFAULT '', actor_email TEXT DEFAULT '', action TEXT,
    collection_name TEXT, record_id TEXT DEFAULT '', before_json TEXT, after_json TEXT,
    occurred_at TEXT DEFAULT CURRENT_TIMESTAMP, previous_hash TEXT DEFAULT '', entry_hash TEXT UNIQUE
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

  it('protokolliert nur Änderungen an auditierten Collections', () => {
    const result = runPhp(`${prelude}
      $actor = ['id' => 'U-1', 'email' => 'user@example.test', 'role' => 'user'];
      upsertItem($db, 'citizens', 'C-1', ['id' => 'C-1', 'firstName' => 'Anna'], $actor);
      upsertItem($db, 'citizens', 'C-1', ['id' => 'C-1', 'firstName' => 'Anne'], $actor);
      deleteItem($db, 'citizens', 'C-1', $actor);
      upsertItem($db, 'senders', 'S-1', ['id' => 'S-1', 'name' => 'Nicht auditiert'], $actor);
      $audit = $pdo->query('SELECT action, collection_name, record_id, actor_email, previous_hash, entry_hash, before_json, after_json FROM gd_audit_log ORDER BY id')->fetchAll();
      echo json_encode(['citizen' => readItem($db, 'citizens', 'C-1'), 'audit' => $audit]);
    `);

    assert.equal(result.citizen, null);
    assert.deepEqual(result.audit.map(row => row.action), ['CREATE', 'UPDATE', 'DELETE']);
    assert.deepEqual([...new Set(result.audit.map(row => row.collection_name))], ['citizens']);
    assert.ok(result.audit.every(row => row.actor_email === 'user@example.test'));
    assert.equal(result.audit[0].previous_hash, '');
    assert.ok(result.audit.every(row => row.entry_hash.length === 64));
    assert.ok(result.audit[2].before_json.includes('Anne'));
    assert.equal(result.audit[2].after_json, null);
  });

  it('beschränkt Audit auf Jubilare, SOKOs und Straßenzuordnungen', () => {
    const result = runPhp(`${prelude}
      $actor = ['id' => 'U-1', 'email' => 'user@example.test', 'role' => 'user'];
      echo json_encode([
        'citizens' => shouldAuditCollection('citizens', $actor),
        'sokoGroups' => shouldAuditCollection('sokoGroups', $actor),
        'sokoMembers' => shouldAuditCollection('sokoMembers', $actor),
        'streets' => shouldAuditCollection('streets', $actor),
        'senders' => shouldAuditCollection('senders', $actor),
        'templates' => shouldAuditCollection('templates', $actor),
        'anonymous' => shouldAuditCollection('citizens', null),
      ]);
    `);

    assert.deepEqual(result, {
      citizens: true,
      sokoGroups: true,
      sokoMembers: true,
      streets: true,
      senders: false,
      templates: false,
      anonymous: false,
    });
  });

  it('liefert Audit-Einträge über den Admin-Endpunkt', () => {
    const result = runPhp(`${prelude}
      $admin = ['id' => 'A-1', 'email' => 'admin@example.test', 'role' => 'admin'];
      auditLog($db, $admin, 'UPDATE', 'citizens', 'C-1', ['wish' => 'offen'], ['wish' => 'Besuch erwünscht']);
      $_GET['limit'] = '10';
      handleAudit($db, 'GET', $admin);
    `);

    assert.equal(result.length, 1);
    assert.equal(result[0].actorEmail, 'admin@example.test');
    assert.equal(result[0].action, 'UPDATE');
    assert.equal(result[0].collection, 'citizens');
    assert.equal(result[0].recordId, 'C-1');
    assert.deepEqual(result[0].beforeJson, { wish: 'offen' });
    assert.deepEqual(result[0].afterJson, { wish: 'Besuch erwünscht' });
  });

  it('filtert Audit-Eintraege ueber den Admin-Endpunkt nach Zeitraum', () => {
    const result = runPhp(`${prelude}
      $admin = ['id' => 'A-1', 'email' => 'admin@example.test', 'role' => 'admin'];
      auditLog($db, $admin, 'UPDATE', 'citizens', 'C-old', ['wish' => 'offen'], ['wish' => 'Besuch']);
      $old = (new DateTimeImmutable())->modify('-6 days')->format('Y-m-d H:i:s');
      executeStatement($db, 'UPDATE gd_audit_log SET occurred_at = ? WHERE record_id = ?', [$old, 'C-old']);
      auditLog($db, $admin, 'UPDATE', 'citizens', 'C-new', ['wish' => 'offen'], ['wish' => 'Post']);
      $_GET['limit'] = '10';
      $_GET['days'] = '5';
      handleAudit($db, 'GET', $admin);
    `);

    assert.deepEqual(result.map(row => row.recordId), ['C-new']);
  });

  it('leert Audit-Eintraege ueber den Admin-Endpunkt', () => {
    const result = runPhp(`${prelude}
      $admin = ['id' => 'A-1', 'email' => 'admin@example.test', 'role' => 'admin'];
      auditLog($db, $admin, 'UPDATE', 'citizens', 'C-1', ['wish' => 'offen'], ['wish' => 'Besuch erwünscht']);
      handleAudit($db, 'DELETE', $admin);
    `);

    assert.equal(result.ok, true);
    assert.equal(result.deleted, 1);
  });

});
