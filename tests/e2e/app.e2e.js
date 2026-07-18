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
let questionnairePageSeq = 0;
const mockBackend = context => context.route('**/php-api/**', route => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace(/.*\/php-api/, '').replace(/^\/index\.php/, '');
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path === '/auth/status') return json({ setupRequired: false, authenticated: false });
  if (path === '/auth/login') return json({ token: 'e2e-token', user: adminUser });
  if (path === '/auth/logout') return json({});
  if (path === '/settings/receipt') return json({});
  // Echo die gespeicherten Seiten zurueck (wie das echte Backend) -> saveQuestionnairePages() haengt sie sonst nie an den Buerger an.
  if (path === '/questionnaire-pages' && request.method() === 'POST') {
    const { pages = [] } = request.postDataJSON() || {};
    return json(pages.map(page => ({ ...page, id: page.id || `QP-e2e-${++questionnairePageSeq}`, createdAt: page.createdAt || new Date().toISOString() })), 201);
  }
  return json([]); // citizens, sokoGroups, sokoMembers, streets, senders, templates, GET questionnaire-pages
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

const rowSummaryTotal = async page => {
  const text = await page.locator('.ag-paging-row-summary-panel').textContent();
  return Number(text.match(/(\d+)\s*$/)?.[1]);
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

  it('meldet sich mit Enter aus dem Passwortfeld an', async () => {
    const { context, page } = await openApp();
    try {
      await page.fill('#auth-login-form input[name="email"]', 'admin@local');
      await page.fill('#auth-login-form input[name="password"]', 'geheim');
      await page.press('#auth-login-form input[name="password"]', 'Enter');
      await page.waitForSelector('.user-chip');
      assert.equal(await page.locator('#page-title').textContent(), 'Dashboard');
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

  it('simuliert einen SOKO-PDF-Import und zeigt Fragebogenbilder', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.click('[data-nav="import"]');
      await page.waitForSelector('.view-import');
      await page.click('[data-action="seed-citizens"]');
      await page.waitForFunction(() => document.querySelector('#toast')?.textContent.includes('neue Datens'));
      await page.click('[data-nav="citizens"]');
      await page.waitForSelector('.ag-root', { timeout: 10000 });
      await page.click('[data-action="simulate-soko-pdf-import"]');
      await page.waitForSelector('.citizen-questionnaire-image img', { timeout: 30000 });
      await page.waitForSelector('#citizen-form input[name="firstName"]', { timeout: 10000 });
      const detailBox = await page.locator('#citizen-detail-panel').boundingBox();
      assert.ok(detailBox.width > 300);

      assert.equal(await page.evaluate(() => localStorage.getItem('gratulationsdienst')), null);
    } finally { await context.close(); }
  }, { timeout: 60000 });

  it('zeigt Admin-Stammdaten und öffnet die Vorlagen-Ansicht', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.evaluate(() => document.querySelectorAll('details.nav-section').forEach(section => { section.open = true; }));
      await page.click('[data-nav="templates"]');
      await page.waitForSelector('.view-templates');
      assert.equal(await page.locator('#page-title').textContent(), 'Stammdaten: Vorlagen');
      // Ohne ausgewählten Jubilar zeigt die Vorschau-Spalte Beispieldaten statt eines leeren Zustands.
      assert.match(await page.locator('.view-templates .card-layout').first().textContent(), /Mustermann/);
      assert.match(await page.locator('.view-templates h2', { hasText: 'Vorschau' }).textContent(), /Beispieldaten/);
    } finally { await context.close(); }
  });

  it('filtert die SOKO-Mitgliederliste per Suche ohne Fokusverlust im Eingabefeld', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.evaluate(() => document.querySelectorAll('details.nav-section').forEach(section => { section.open = true; }));
      await page.click('[data-nav="soko"]');
      await page.waitForSelector('.view-soko .ag-paging-row-summary-panel', { timeout: 10000 });

      const totalCount = await rowSummaryTotal(page);
      assert.ok(totalCount > 1, 'Es werden keine SOKO-Testmitglieder als Datenbasis geladen');

      const firstRowName = await page.locator('.ag-row[row-index="0"] [col-id="name"]').textContent();
      const query = firstRowName.split(',')[0].trim();

      const search = page.locator('.view-soko input[name="q"]');
      await search.click();
      await search.pressSequentially(query, { delay: 20 });

      await page.waitForFunction(
        total => Number(document.querySelector('.ag-paging-row-summary-panel')?.textContent.match(/(\d+)\s*$/)?.[1]) !== total,
        totalCount,
        { timeout: 5000 }
      );

      assert.equal(await search.inputValue(), query);
      assert.equal(await search.evaluate(el => el === document.activeElement), true);

      const filteredCount = await rowSummaryTotal(page);
      assert.ok(filteredCount >= 1 && filteredCount < totalCount);
    } finally { await context.close(); }
  }, { timeout: 20000 });

  it('klappt die Desktop-Navigation auf eine Icon-Leiste ein', async () => {
    const { context, page } = await openApp();
    try {
      await login(page);
      await page.click('[data-sidebar-toggle]');
      await page.waitForFunction(() => {
        const box = document.querySelector('.sidebar')?.getBoundingClientRect();
        return box && box.width <= 90;
      });
      const sidebarBox = await page.locator('.sidebar').boundingBox();
      const labelBox = await page.locator('[data-nav="dashboard"] .nav-label').boundingBox();
      assert.equal(await page.evaluate(() => document.body.classList.contains('sidebar-collapsed')), true);
      assert.ok(sidebarBox.width <= 90);
      assert.equal(labelBox.width <= 1, true);
      assert.equal(await page.locator('[data-nav="templates"]').isVisible(), true);
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
