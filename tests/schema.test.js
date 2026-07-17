import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const schema = readFileSync(new URL('../php-api/schema.mysql.sql', import.meta.url), 'utf8');
const api = readFileSync(new URL('../php-api/index.php', import.meta.url), 'utf8');
const tableDefinition = table => schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\) ENGINE`))?.[1] || '';

describe('database schema', () => {
  it('stores the doctoral degree only for citizens', () => {
    assert.match(tableDefinition('gd_citizens'), /doctoral_degree VARCHAR\(80\)/);
    assert.doesNotMatch(tableDefinition('gd_soko_members'), /doctoral_degree/);
  });

  it('uses the SQL file as the complete schema without in-app migrations', () => {
    assert.match(tableDefinition('gd_citizens'), /age INT/);
    assert.doesNotMatch(tableDefinition('gd_citizens'), /phone VARCHAR|email VARCHAR/);
    assert.doesNotMatch(api, /SCHEMA_VERSION|ensureColumn|ensureIndex|dropColumnIfExists|storedSchemaVersion|setSchemaVersion/);
    // ensureSchema fuehrt weiterhin nur das komplette SQL-Skript aus; der Hash-Marker
    // in gd_settings verhindert lediglich den erneuten Lauf pro Request (keine Migrationen).
    assert.match(api, /function ensureSchema\(array \$db\): void\s*\{[\s\S]{0,400}?executeSqlScript\(\$db, \$sql\);/);
    assert.match(api, /appliedSchemaScriptHash\(\$db\) === \$marker/);
  });
});
