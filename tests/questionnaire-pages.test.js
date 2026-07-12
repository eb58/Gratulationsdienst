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

const { loadQuestionnairePagesForCitizen, saveQuestionnairePages } = await import('../modules/questionnairePages.js');
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
  state.selectedCitizenId = 'G-1';
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

  it('keeps saved scan images only for the selected citizen', async () => {
    state.selectedCitizenId = 'G-2';
    state.data.citizens = [{ id: 'G-1' }, { id: 'G-2' }];
    globalThis.fetch = (url, options = {}) => Promise.resolve({
      ok: true,
      json: async () => JSON.parse(options.body).pages.map((page, index) => ({ ...page, id: `QP-${page.citizenId}-${index + 1}` }))
    });

    await saveQuestionnairePages([
      { citizenId: 'G-1', image: 'data:image/png;base64,a' },
      { citizenId: 'G-2', image: 'data:image/png;base64,b' }
    ]);

    assert.equal(state.data.citizens[0].sokoQuestionnaireImages, undefined);
    assert.equal(state.data.citizens[1].sokoQuestionnaireImages[0].citizenId, 'G-2');
  });
});

describe('loadQuestionnairePagesForCitizen', () => {
  it('loads the selected citizen freshly and discards other scan images', async () => {
    state.selectedCitizenId = 'G-2';
    state.data.citizens = [
      { id: 'G-1', sokoQuestionnaireImages: [{ id: 'old-1', image: 'data:image/png;base64,a' }] },
      { id: 'G-2', sokoQuestionnaireImages: [{ id: 'old-2', image: 'data:image/png;base64,b' }] }
    ];
    const calls = [];
    globalThis.fetch = url => {
      calls.push(String(url));
      return Promise.resolve({
        ok: true,
        json: async () => [{ id: 'fresh-2', citizenId: 'G-2', image: 'data:image/png;base64,c', createdAt: '2026-06-01T00:00:00.000Z' }]
      });
    };

    const pages = await loadQuestionnairePagesForCitizen('G-2');

    assert.equal(calls.length, 1);
    assert.equal(pages[0].id, 'fresh-2');
    assert.equal(state.data.citizens[0].sokoQuestionnaireImages, undefined);
    assert.equal(state.data.citizens[1].sokoQuestionnaireImages[0].id, 'fresh-2');
  });
});
