import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  upsertWeddingAnniversaryForCitizen,
  upsertWeddingAnniversariesForCitizens,
  weddingAnniversaryFromCitizen,
  weddingAnniversaryId
} from '../modules/weddingAnniversaries.js';

const citizen = {
  id: 'G-1',
  salutation: 'Frau',
  firstName: 'Erika',
  lastName: 'Muster',
  birthDate: '1936-06-01',
  street: 'Teststrasse',
  houseNo: '1',
  postalCode: '13437',
  district: 'Tegel',
  weddingAnniversary: 'Goldene Hochzeit',
  weddingDate: '1976-06-01',
  spouseName: 'Heinz',
  updatedAt: '2026-06-01'
};

describe('wedding anniversaries', () => {
  it('creates a stable table entry from captured questionnaire data', () => {
    const entry = weddingAnniversaryFromCitizen(citizen, 'SOKO-PDF');

    assert.equal(weddingAnniversaryId(citizen), 'WA-G-1-1976-06-01');
    assert.equal(entry.id, 'WA-G-1-1976-06-01');
    assert.equal(entry.citizenId, 'G-1');
    assert.equal(entry.weddingAnniversary, 'Goldene Hochzeit');
    assert.equal(entry.weddingDate, '1976-06-01');
    assert.equal(entry.spouseName, 'Heinz');
    assert.equal(entry.source, 'SOKO-PDF');
    assert.equal(entry.capturedAt, '2026-06-01');
  });

  it('upserts one current wedding anniversary per citizen', () => {
    const first = upsertWeddingAnniversaryForCitizen([], citizen);
    const second = upsertWeddingAnniversaryForCitizen(first, { ...citizen, spouseName: 'Hans' });

    assert.equal(second.length, 1);
    assert.equal(second[0].spouseName, 'Hans');
  });

  it('removes the table entry when the citizen no longer has a wedding anniversary', () => {
    const entries = upsertWeddingAnniversariesForCitizens([], [citizen]);
    const updated = upsertWeddingAnniversariesForCitizens(entries, [{ ...citizen, weddingAnniversary: '', weddingDate: '', spouseName: '' }]);

    assert.deepEqual(updated, []);
  });
});
