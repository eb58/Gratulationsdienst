import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  upsertWeddingAnniversaryForCitizen,
  upsertWeddingAnniversariesForCitizens,
  weddingAnniversaryFromCitizen,
  weddingAnniversaryId,
  weddingAnniversaryLabel
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
    assert.equal(entry.weddingAnniversary, undefined, 'Jubiläums-Label wird nicht gespeichert, sondern in der UI berechnet');
    assert.equal(entry.weddingDate, '1976-06-01');
    assert.equal(entry.spouseName, 'Heinz');
    assert.equal(entry.source, 'SOKO-PDF');
    assert.equal(entry.capturedAt, '2026-06-01');
  });

  it('skips entries without wedding date or spouse name', () => {
    assert.equal(weddingAnniversaryFromCitizen({ ...citizen, weddingDate: '', spouseName: 'Heinz' }), null);
    assert.equal(weddingAnniversaryFromCitizen({ ...citizen, weddingDate: '1976-06-01', spouseName: '' }), null);
  });

  it('berechnet das Jubiläums-Label aus dem Hochzeitsdatum, bezogen auf heute', () => {
    assert.equal(weddingAnniversaryLabel('1976-06-01', '2026-06-01'), 'Goldene Hochzeit');
    assert.equal(weddingAnniversaryLabel('1966-06-01', '2026-06-01'), 'Diamantene Hochzeit');
    assert.equal(weddingAnniversaryLabel('1961-06-01', '2026-06-01'), 'Eiserne Hochzeit');
    assert.equal(weddingAnniversaryLabel('1956-06-01', '2026-06-01'), 'Gnadenhochzeit');
    assert.equal(weddingAnniversaryLabel('1980-06-01', '2026-06-01'), '');
    assert.equal(weddingAnniversaryLabel('', '2026-06-01'), '');
    assert.equal(weddingAnniversaryLabel('1976-06-01', ''), '');
  });

  it('zeigt das Jubiläum nur, solange es im selben Jahr noch in der Zukunft liegt', () => {
    // Goldene Hochzeit im Januar ist im September desselben Jahres bereits vorbei.
    assert.equal(weddingAnniversaryLabel('1976-01-15', '2026-09-01'), '');
    // Ein Jubiläum im Dezember steht im September desselben Jahres noch bevor.
    assert.equal(weddingAnniversaryLabel('1976-12-01', '2026-09-01'), 'Goldene Hochzeit');
    // Der Jubiläumstag selbst zählt noch als bevorstehend/aktuell.
    assert.equal(weddingAnniversaryLabel('1976-09-01', '2026-09-01'), 'Goldene Hochzeit');
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
