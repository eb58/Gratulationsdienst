import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const compose = readFileSync(new URL('../docker/docker-compose.dev.yml', import.meta.url), 'utf8');
const apacheDev = readFileSync(new URL('../docker/apache-http-dev.conf', import.meta.url), 'utf8');
const apacheHttpsDev = readFileSync(new URL('../docker/apache-https-dev.conf', import.meta.url), 'utf8');

describe('docker compose dev override', () => {
  it('serves the dev stack over plain http and keeps the live frontend mount', () => {
    [
      "GD_APP_URL: 'http://127.0.0.1/gratulationsdienst/'",
      '- ./apache-http-dev.conf:/etc/apache2/sites-available/000-default.conf:ro',
      '- ./apache-https-dev.conf:/etc/apache2/sites-available/default-ssl.conf:ro',
      '- ./src/gratulationsdienst/index.html:/var/www/html/gratulationsdienst/index.html:ro',
      '- ./src/gratulationsdienst/favicon.svg:/var/www/html/gratulationsdienst/favicon.svg:ro',
      '- ./src/gratulationsdienst/assets:/var/www/html/gratulationsdienst/assets:ro',
      '- ./src/gratulationsdienst/data:/var/www/html/gratulationsdienst/data:ro',
      '- ./src/gratulationsdienst/vendor:/var/www/html/gratulationsdienst/vendor:ro'
    ].forEach(line => assert.match(compose, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm')));

    assert.doesNotMatch(compose, /^-\s*\.\/src\/gratulationsdienst:\/var\/www\/html\/gratulationsdienst(?:$|:)/m);
    assert.doesNotMatch(apacheDev, /RewriteRule\s+\^\s+https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\}/);
    assert.match(apacheHttpsDev, /Header always set Cache-Control "no-store"/);
  });
});
