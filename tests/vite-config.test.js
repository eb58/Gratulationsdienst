import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanAssetsForWatch } from '../vite.config.js';

describe('Vite-Asset-Bereinigung', () => {
  it('behält alte Hash-Assets im Watch-Modus für offene Browser-Tabs', () => {
    assert.equal(cleanAssetsForWatch(true), false);
    assert.equal(cleanAssetsForWatch(false), true);
  });
});
