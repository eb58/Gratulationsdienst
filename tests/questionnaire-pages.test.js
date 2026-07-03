import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.location = { protocol: 'http:', href: 'http://test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = callback => callback();
globalThis.document = {
  body: { classList: { add() {}, remove() {}, toggle() {} } },
  querySelector: () => null,
  querySelectorAll: () => []
};

const { saveQuestionnairePages } = await import('../modules/questionnairePages.js');
const { state } = await import('../modules/state.js');

beforeEach(() => {
  globalThis.location.protocol = 'http:';
  state.auth.token = 'token';
  state.auth.user = { id: 'U-1', role: 'admin' };
  state.data = {
    citizens: [{ id: 'G-1', firstName: 'Erika' }],
    sokoGroups: [],
    sokoMembers: [],
    streets: [],
    senders: [],
    templates: []
  };
});

describe('saveQuestionnairePages', () => {
  it('rejects backend save failures without attaching transient scan images', async () => {
    globalThis.fetch = () => Promise.resolve({
      ok: false,
      status: 500,
      json: async () => ({ error: 'kaputt' })
    });

    const realWarn = console.warn;
    console.warn = () => {};
    try {
      await assert.rejects(
        saveQuestionnairePages([{ citizenId: 'G-1', image: 'data:image/png;base64,a' }]),
        /Fragebogen-Scans konnten nicht in der Datenbank gespeichert werden/
      );
    } finally {
      console.warn = realWarn;
    }

    assert.equal(state.data.citizens[0].sokoQuestionnaireImages, undefined);
  });

  it('attaches saved backend scan records after a successful save', async () => {
    globalThis.fetch = (url, options = {}) => Promise.resolve({
      ok: true,
      json: async () => JSON.parse(options.body).pages.map((page, index) => ({ ...page, id: `QP-${index + 1}` }))
    });

    const saved = await saveQuestionnairePages([{ citizenId: 'G-1', image: 'data:image/png;base64,a' }]);

    assert.equal(saved[0].id, 'QP-1');
    assert.equal(state.data.citizens[0].sokoQuestionnaireImages[0].id, 'QP-1');
  });
});
