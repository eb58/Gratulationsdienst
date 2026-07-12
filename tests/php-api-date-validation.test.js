import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { describe, it } from 'node:test';
import path from 'node:path';

const configuredPhp = process.env.PHP_BINARY || 'php';
const phpProbe = spawnSync(configuredPhp, ['-v'], { encoding: 'utf8' });
const php = phpProbe.status === 0 ? configuredPhp : 'C:\\Users\\erich\\AppData\\Local\\Programs\\PHP\\current\\php.exe';
const apiIndex = path.resolve('php-api/index.php').replace(/\\/g, '/');
const canRunPhp = (() => {
  try {
    if (php === configuredPhp) return phpProbe.status === 0;
    fs.accessSync(php, fs.constants.X_OK);
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
    const result = spawnSync(php, ['-d', 'display_errors=1', '-f', tempFile], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout || String(result.error ?? ''));
    return JSON.parse(result.stdout.trim());
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

suite('php-api date validation', () => {
  it('rejects invalid date formats with a field-specific ApiError', () => {
    const result = runPhp(`
      define('API_TEST_MODE', true);
      require '${apiIndex}';
      try {
        valueForDb('15.03.1950', 'date', 'birthDate');
        echo json_encode(['ok' => true]);
      } catch (ApiError $error) {
        echo json_encode(['ok' => false, 'status' => $error->status, 'message' => $error->getMessage()]);
      }
    `);

    assert.equal(result.ok, false);
    assert.equal(result.status, 422);
    assert.match(result.message, /birthDate/);
  });

  it('accepts valid ISO dates and empty values', () => {
    const result = runPhp(`
      define('API_TEST_MODE', true);
      require '${apiIndex}';
      echo json_encode([
        'valid' => valueForDb('1950-03-15', 'date', 'birthDate'),
        'empty' => valueForDb('', 'date', 'birthDate')
      ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    `);

    assert.deepEqual(result, { valid: '1950-03-15', empty: null });
  });

  it('covers the other date-backed collections too', () => {
    const result = runPhp(`
      define('API_TEST_MODE', true);
      require '${apiIndex}';
      try {
        assertValidDateFields(['termFrom' => '2026/03/15'], collectionConfig('sokoMembers'));
        echo json_encode(['ok' => true]);
      } catch (ApiError $error) {
        echo json_encode(['ok' => false, 'status' => $error->status, 'message' => $error->getMessage()]);
      }
    `);

    assert.equal(result.ok, false);
    assert.equal(result.status, 422);
    assert.match(result.message, /termFrom/);
  });
});
