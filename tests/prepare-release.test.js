import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareRelease, releaseApiFiles } from '../scripts/prepare-release.js';

test('prepareRelease erstellt nur die auslieferbaren API-Dateien neu', () => {
  const root = mkdtempSync(join(tmpdir(), 'gratulationsdienst-release-'));
  const sourceDir = join(root, 'source');
  const targetDir = join(root, 'target');

  try {
    mkdirSync(sourceDir);
    mkdirSync(targetDir);
    releaseApiFiles.forEach(file => writeFileSync(join(sourceDir, file), `Inhalt ${file}`));
    writeFileSync(join(sourceDir, 'config.php'), 'geheimes Passwort');
    writeFileSync(join(targetDir, 'veraltet.txt'), 'alt');

    assert.equal(prepareRelease({ sourceDir, targetDir }), releaseApiFiles.length);
    releaseApiFiles.forEach(file => assert.equal(readFileSync(join(targetDir, file), 'utf8'), `Inhalt ${file}`));
    assert.equal(existsSync(join(targetDir, 'config.php')), false);
    assert.equal(existsSync(join(targetDir, 'veraltet.txt')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
