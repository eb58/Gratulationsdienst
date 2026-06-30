// End-to-End-Smoke-Test gegen die echte App im Browser.
// Vite-Dev-Server ist nötig, weil app.js Bare-Imports (qrcode) nutzt, die nur Vite auflöst.
// Das PHP-Backend wird per Route-Mock simuliert -> deckt Auth-Flow (actions.js) + UI-Render (views/grid) ab.
// Lauf: npm run test:e2e  (separat von der schnellen Unit-Suite, daher nicht *.test.js)
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const viteBin = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));

const PORT = 5599;
const APP_URL = `http://localhost:${PORT}/gratulationsdienst/`;
const adminUser = { id: 'u1', email: 'admin@local', displayName: 'Admin Demo', role: 'admin', mfaEnabled: false, active: true };

const waitForServer = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* noch nicht bereit */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Vite-Server ${url} nicht erreichbar`);
};

// Simuliert das PHP-Backend: nicht angemeldeter Status, erfolgreicher Login, leere Collections.
const mockBackend = context => context.route('**/php-api/**', route => {
  const path = new URL(route.request().url()).pathname.replace(/.*\/php-api/, '');
  const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/auth/status') return json({ setupRequired: false, authenticated: false });
  if (path === '/auth/login') return json({ token: 'e2e-token', user: adminUser });
  if (path === '/auth/logout') return json({});
  if (path === '/settings/receipt') return json({});
  return json([]); // citizens, sokoGroups, sokoMembers, streets, senders, templates, importLog
});

let server, browser;

const openApp = async () => {
  const context = await browser.newContext();
  await mockBackend(context);
  const page = await context.newPage();
  await page.goto(APP_URL);
  await page.waitForSelector('#auth-login-form');
  return { context, page };
};

const login = async page => {
  await page.fill('#auth-login-form input[name="email"]', 'admin@local');
  await page.fill('#auth-login-form input[name="password"]', 'geheim');
  await page.click('[data-action="auth-login"]');
  await page.waitForSelector('.user-chip');
};

before(async () => {
  server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
  await waitForServer(APP_URL);
  browser = await chromium.launch();
}, { timeout: 60000 });

after(async () => {
  await browser?.close();
  server?.kill();
});

describe('Gratulationsdienst E2E', () => {
  it('zeigt im gesperrten Zustand das Login-Formular', async () => {
    const { context, page } = await openApp();
    try {
      assert.equal(await page.locator('#page-title').textContent(), 'Anmeldung');
      assert.equal(await page.locator('#auth-login-form').isVisible(), true);
      assert.equal(await page.evaluate(() => document.body.classList.contains('auth-locked')), true);
    } finally { await context.close(); }
  });

  it('meldet an und zeigt das Dashboard mit Benutzer-Chip', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      assert.equal(await page.locator('#page-title').textContent(), 'Dashboard');
      assert.match(await page.locator('.user-chip strong').textContent(), /Admin Demo/);
      assert.equal(await page.evaluate(() => document.body.classList.contains('auth-locked')), false);
    } finally { await context.close(); }
  });

  it('navigiert nach Login zu den Jubilaren und mountet das Grid', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.click('[data-nav="citizens"]');
      await page.waitForSelector('.view-citizens');
      assert.equal(await page.locator('#page-title').textContent(), 'Jubilare prüfen');
      await page.waitForSelector('.ag-root', { timeout: 10000 });
    } finally { await context.close(); }
  });

  it('zeigt Admin-Stammdaten und öffnet die Vorlagen-Ansicht', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.evaluate(() => document.querySelectorAll('details.nav-section').forEach(section => { section.open = true; }));
      await page.click('[data-nav="templates"]');
      await page.waitForSelector('.view-templates');
      assert.equal(await page.locator('#page-title').textContent(), 'Stammdaten: Vorlagen');
    } finally { await context.close(); }
  });

  it('meldet wieder ab und kehrt zum Login zurück', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.click('[data-action="auth-logout"]');
      await page.waitForSelector('#auth-login-form');
      assert.equal(await page.evaluate(() => document.body.classList.contains('auth-locked')), true);
    } finally { await context.close(); }
  });
});
