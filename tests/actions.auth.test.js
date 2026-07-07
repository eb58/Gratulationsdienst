// Unit-Tests der Auth-/MFA-Actions aus actions.js.
// Strategie: render.js wird per Module-Mock zum No-Op (entkoppelt vom DOM-Render),
// state.js bleibt echt (echte State-Mutationen prüfbar), apiRequest läuft über gestubbtes fetch.
// authDone() stößt nach dem Login im Hintergrund loadCollectionData()/saveCollectionData() an;
// deshalb werden alle fetch-Aufrufe gesammelt und per requestTo(path) gezielt gesucht statt
// sich auf "der letzte Request" zu verlassen.
// Braucht: node --test --experimental-test-module-mocks (siehe npm-Skript "test").
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

// Formular-Stubs für formValues() = Object.fromEntries(new FormData($(sel)).entries()).
const forms = {};
const setForm = (selector, data) => { forms[selector] = { _entries: Object.entries(data) }; };

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.innerWidth = 1280;
globalThis.innerHeight = 800;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => callback();
globalThis.FormData = class { constructor(form) { this._entries = form?._entries || []; } entries() { return this._entries; } };
globalThis.document = {
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  addEventListener() {},
  removeEventListener() {},
  querySelector: selector => forms[selector] || null, // #toast -> null => toast() ist No-Op
  querySelectorAll: () => []
};

// fetch-Stub: nächste Antwort je Test setzen.
let nextResponse = null;
const respondOk = payload => { nextResponse = { ok: true, status: 200, json: async () => payload }; };
const respondError = (status, payload) => { nextResponse = { ok: false, status, json: async () => payload }; };
let requests = [];
const requestTo = path => requests.find(request => request.url.endsWith(path));
globalThis.fetch = (url, options) => {
  requests.push({ url, options, body: options?.body ? JSON.parse(options.body) : null });
  return Promise.resolve(nextResponse);
};

// render.js zum No-Op machen, bevor actions.js (und sein Graph) geladen wird.
mock.module('../modules/render.js', {
  namedExports: { render: () => {}, renderDialog: () => {}, applyPendingFocus: () => {} }
});

const { actions } = await import('../modules/actions.js');
const { state } = await import('../modules/state.js');

beforeEach(() => {
  for (const key of Object.keys(forms)) delete forms[key];
  nextResponse = null;
  requests = [];
  sessionStorage.clear();
  state.auth = {
    ready: true, setupRequired: false, mode: 'login', token: '', user: null,
    mfaTicket: '', resetToken: '', users: [], mfaSetup: null, message: ''
  };
});

describe('reine Auth-Zustandswechsel', () => {
  it('auth-show-reset / auth-show-login / auth-cancel-mfa setzen den Modus', () => {
    state.auth.message = 'alt';
    actions['auth-show-reset']();
    assert.equal(state.auth.mode, 'reset');
    assert.equal(state.auth.message, '');

    state.auth.resetToken = 'x';
    actions['auth-show-login']();
    assert.equal(state.auth.mode, 'login');
    assert.equal(state.auth.resetToken, '');

    state.auth.mfaTicket = 'T';
    actions['auth-cancel-mfa']();
    assert.equal(state.auth.mfaTicket, '');
  });
});

describe('auth-login', () => {
  it('meldet bei Erfolg an: Token und Benutzer landen im State und in der Session', async () => {
    setForm('#auth-login-form', { email: 'admin@local', password: 'geheim' });
    respondOk({ token: 'tok-123', user: { id: 'u1', role: 'admin' } });

    await actions['auth-login']();

    assert.equal(requestTo('/auth/login')?.url.endsWith('/auth/login'), true);
    assert.deepEqual(requestTo('/auth/login')?.body, { email: 'admin@local', password: 'geheim' });
    assert.equal(state.auth.token, 'tok-123');
    assert.deepEqual(state.auth.user, { id: 'u1', role: 'admin' });
    assert.equal(sessionStorage.getItem('gd_auth_token'), 'tok-123');
  });

  it('zweigt bei mfaRequired in den MFA-Schritt ab, ohne anzumelden', async () => {
    setForm('#auth-login-form', { email: 'admin@local', password: 'geheim' });
    respondOk({ mfaRequired: true, ticket: 'ticket-9' });

    await actions['auth-login']();

    assert.equal(state.auth.mfaTicket, 'ticket-9');
    assert.equal(state.auth.message, '');
    assert.equal(state.auth.token, ''); // gerade NICHT angemeldet
    assert.equal(state.auth.user, null);
  });

  it('zeigt bei Fehler die Server-Meldung und meldet nicht an', async () => {
    setForm('#auth-login-form', { email: 'admin@local', password: 'falsch' });
    respondError(401, { error: 'Zugangsdaten ungültig' });

    await actions['auth-login']();

    assert.equal(state.auth.message, 'Zugangsdaten ungültig');
    assert.equal(state.auth.token, '');
    assert.equal(state.auth.user, null);
  });
});

describe('auth-mfa-login', () => {
  it('verifiziert mit Ticket aus dem State und dem Formular-Code', async () => {
    state.auth.mfaTicket = 'ticket-9';
    setForm('#auth-mfa-form', { code: '123456' });
    respondOk({ token: 'tok-mfa', user: { id: 'u1', role: 'admin' } });

    await actions['auth-mfa-login']();

    assert.equal(requestTo('/auth/mfa/verify')?.url.endsWith('/auth/mfa/verify'), true);
    assert.deepEqual(requestTo('/auth/mfa/verify')?.body, { ticket: 'ticket-9', code: '123456' });
    assert.equal(state.auth.token, 'tok-mfa');
    assert.equal(state.auth.mfaTicket, ''); // von setAuthSession zurückgesetzt
  });
});

describe('auth-setup', () => {
  it('legt den ersten Benutzer an und meldet direkt an', async () => {
    setForm('#auth-setup-form', { email: 'first@local', password: 'pw', displayName: 'First' });
    respondOk({ token: 'tok-setup', user: { id: 'u1', role: 'admin' } });

    await actions['auth-setup']();

    assert.equal(requestTo('/auth/setup')?.url.endsWith('/auth/setup'), true);
    assert.equal(state.auth.token, 'tok-setup');
    assert.equal(state.auth.setupRequired, false);
  });
});

describe('Passwort-Reset', () => {
  it('auth-reset-request übernimmt die Server-Meldung und leert den Reset-Token', async () => {
    setForm('#auth-reset-request-form', { email: 'admin@local' });
    respondOk({ message: 'E-Mail versendet, falls vorhanden.' });
    state.auth.resetToken = 'alt';

    await actions['auth-reset-request']();

    assert.equal(state.auth.message, 'E-Mail versendet, falls vorhanden.');
    assert.equal(state.auth.resetToken, '');
  });

  it('auth-reset-apply schaltet nach Erfolg zurück auf Login', async () => {
    setForm('#auth-reset-apply-form', { token: 't', password: 'neu' });
    respondOk({});
    state.auth.mode = 'reset';
    state.auth.resetToken = 't';

    await actions['auth-reset-apply']();

    assert.equal(state.auth.mode, 'login');
    assert.equal(state.auth.resetToken, '');
    assert.equal(state.auth.message, 'Passwort wurde geändert.');
  });
});

describe('auth-logout', () => {
  it('beendet die Session lokal auch bei erfolgreichem Server-Logout', async () => {
    state.auth.token = 'tok';
    state.auth.user = { id: 'u1' };
    sessionStorage.setItem('gd_auth_token', 'tok');
    respondOk({});

    await actions['auth-logout']();

    assert.equal(state.auth.token, '');
    assert.equal(state.auth.user, null);
    assert.equal(sessionStorage.getItem('gd_auth_token'), null);
  });

  it('beendet die Session auch, wenn der Server-Logout fehlschlägt', async () => {
    state.auth.token = 'tok';
    state.auth.user = { id: 'u1' };
    const realFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('offline'));

    await actions['auth-logout']();

    assert.equal(state.auth.token, '');
    assert.equal(state.auth.user, null);
    globalThis.fetch = realFetch; // für Folgetests wiederherstellen
  });
});

describe('MFA-Verwaltung', () => {
  it('mfa-setup legt die Setup-Daten im State ab', async () => {
    respondOk({ secret: 'S', otpauthUrl: 'otpauth://x' });

    await actions['mfa-setup']();

    assert.equal(requestTo('/auth/mfa/setup')?.url.endsWith('/auth/mfa/setup'), true);
    assert.deepEqual(state.auth.mfaSetup, { secret: 'S', otpauthUrl: 'otpauth://x' });
  });

  it('mfa-enable übernimmt den aktualisierten Benutzer und räumt das Setup ab', async () => {
    setForm('#mfa-enable-form', { code: '123456' });
    state.auth.mfaSetup = { secret: 'S' };
    respondOk({ user: { id: 'u1', mfaEnabled: true } });

    await actions['mfa-enable']();

    assert.deepEqual(state.auth.user, { id: 'u1', mfaEnabled: true });
    assert.equal(state.auth.mfaSetup, null);
  });

  it('mfa-disable übernimmt den aktualisierten Benutzer', async () => {
    setForm('#mfa-disable-form', { password: 'pw' });
    respondOk({ user: { id: 'u1', mfaEnabled: false } });

    await actions['mfa-disable']();

    assert.deepEqual(state.auth.user, { id: 'u1', mfaEnabled: false });
  });
});
