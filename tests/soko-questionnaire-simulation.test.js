import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
globalThis.location = { protocol: 'file:', href: 'file:///test/index.html', search: '' };
globalThis.window = globalThis;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};

const {
  jpegImagesToPdfBytes,
  mergeSokoQuestionnaireImages,
  pickSokoQuestionnaireSimulationCitizens,
  randomSokoQuestionnaireMarks,
  SIMULATED_SOKO_PRIVACY_TEXT
} = await import('../modules/sokoQuestionnaireSimulation.js');

describe('SOKO questionnaire simulation helpers', () => {
  it('creates unambiguous random marks', () => {
    const marks = randomSokoQuestionnaireMarks(() => 0.1);
    const checkedWishes = ['wishPost', 'wishVisit', 'wishNone'].filter(key => marks[key]);
    const checkedWeddings = ['weddingGold', 'weddingDiamond', 'weddingIron', 'weddingGrace'].filter(key => marks[key]);

    assert.deepEqual(checkedWishes, ['wishPost']);
    assert.deepEqual(checkedWeddings, ['weddingGold']);
    assert.equal(marks.pressPublication, true);
  });

  it('returns all citizens in random order', () => {
    const citizens = Array.from({ length: 20 }, (_, index) => ({ id: `G-${index}` }));
    const picked = pickSokoQuestionnaireSimulationCitizens(citizens, () => 0.5);

    assert.equal(picked.length, 20);
    assert.ok(picked.every(citizen => citizen.id));
  });

  it('merges generated scans into citizens without dropping older scans', () => {
    const citizens = [{ id: 'G-1', sokoQuestionnaireImages: [{ image: 'old-1' }, { image: 'old-2' }, { image: 'old-3' }] }, { id: 'G-2' }];
    const merged = mergeSokoQuestionnaireImages(citizens, [
      { citizenId: 'G-1', image: 'new-1', marks: { wishPost: true }, createdAt: '2026-06-01' }
    ]);

    assert.equal(merged[0].sokoQuestionnaireImages.length, 4);
    assert.equal(merged[0].sokoQuestionnaireImages[0].image, 'new-1');
    assert.equal(merged[1].sokoQuestionnaireImages, undefined);
  });

  it('packs JPEG images into a readable PDF byte stream', () => {
    const bytes = jpegImagesToPdfBytes([
      { data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 10, height: 20 },
      { data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 10, height: 20 }
    ]);
    const text = new TextDecoder().decode(bytes);

    assert.match(text, /^%PDF-1\.4/);
    assert.match(text, /\/Count 2/);
    assert.match(text, /\/Subtype \/Image/);
    assert.match(text, /startxref/);
  });

  it('uses the full questionnaire privacy text in the simulation', () => {
    assert.match(SIMULATED_SOKO_PRIVACY_TEXT, /Datenschutzrechtliche Einwilligungserkl\u00e4rung/);
    assert.match(SIMULATED_SOKO_PRIVACY_TEXT, /Die Soko-Mitarbeiterin\/der Soko-Mitarbeiter hat die Jubilarin\/den Jubilar/);
    assert.match(SIMULATED_SOKO_PRIVACY_TEXT, /Die Verweigerung der Einwilligung f\u00fchrt dazu, dass keine Pressemitteilung/);
    assert.match(SIMULATED_SOKO_PRIVACY_TEXT, /Verarbeitung der personenbezogenen Daten m\u00fcndlich\/telefonisch gegeben wurde\./);
  });
});
