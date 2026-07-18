import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const compose = readFileSync(new URL('../docker/docker-compose.dev.yml', import.meta.url), 'utf8');

describe('docker compose dev override', () => {
  it('mounts the live frontend output without replacing the whole app directory', () => {
    [
      '- ./src/gratulationsdienst/index.html:/var/www/html/gratulationsdienst/index.html:ro',
      '- ./src/gratulationsdienst/favicon.svg:/var/www/html/gratulationsdienst/favicon.svg:ro',
      '- ./src/gratulationsdienst/assets:/var/www/html/gratulationsdienst/assets:ro',
      '- ./src/gratulationsdienst/data:/var/www/html/gratulationsdienst/data:ro',
      '- ./src/gratulationsdienst/vendor:/var/www/html/gratulationsdienst/vendor:ro'
    ].forEach(line => assert.match(compose, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm')));

    assert.doesNotMatch(compose, /^-\s*\.\/src\/gratulationsdienst:\/var\/www\/html\/gratulationsdienst(?:$|:)/m);
  });
});
