import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySokoQuestionnaireResult,
  applySokoQuestionnaireResults,
  checkedSokoFieldsFromScores,
  citizenIdFromSokoQuestionnaireCode,
  findSokoQuestionnaireCitizen,
  sokoQuestionnaireCode,
  sokoQuestionnaireDataFromCode,
  sokoQuestionnairePatchFromMarks
} from '../modules/sokoQuestionnaire.js';

const citizen = {
  id: 'G-2026-001',
  firstName: 'Erika',
  lastName: 'Mustermann',
  birthDate: '1936-06-01',
  wish: 'offen',
  status: 'importiert'
};

describe('SOKO questionnaire codes', () => {
  it('creates and reads stable citizen codes', () => {
    const code = sokoQuestionnaireCode(citizen);
    assert.match(code, /^GD-SOKO:G-2026-001;/);
    assert.equal(citizenIdFromSokoQuestionnaireCode(code), 'G-2026-001');
    assert.deepEqual(sokoQuestionnaireDataFromCode(code), {
      id: 'G-2026-001',
      firstName: 'Erika',
      lastName: 'Mustermann',
      birthDate: '1936-06-01',
      street: '',
      houseNo: '',
      postalCode: ''
    });
    assert.equal(citizenIdFromSokoQuestionnaireCode('GD-SOKO:G-2026-001'), 'G-2026-001');
    assert.equal(citizenIdFromSokoQuestionnaireCode('Code G-2026-002'), 'G-2026-002');
  });

  it('matches citizens by QR data when the QR id is no longer present', () => {
    const { citizen: matched, matchSource } = findSokoQuestionnaireCitizen([{ ...citizen, id: 'G-2026-999' }], {
      citizenId: 'G-2026-001',
      qrData: sokoQuestionnaireDataFromCode(sokoQuestionnaireCode(citizen))
    });

    assert.equal(matched.id, 'G-2026-999');
    assert.equal(matchSource, 'qr-data');
  });
});

describe('SOKO questionnaire marks', () => {
  it('maps dark-pixel scores to checked fields', () => {
    assert.deepEqual(checkedSokoFieldsFromScores({ wishVisit: 0.09, wishPost: 0.01 }), {
      wishPost: false,
      wishVisit: true,
      wishNone: false,
      pressPublication: false,
      weddingGold: false,
      weddingDiamond: false,
      weddingIron: false,
      weddingGrace: false
    });
  });

  it('builds a citizen patch from unambiguous marks', () => {
    const result = sokoQuestionnairePatchFromMarks({ wishVisit: true, pressPublication: true, weddingGold: true });

    assert.deepEqual(result, {
      patch: { wish: 'Besuch erwünscht', pressPublication: true, weddingAnniversary: 'Goldene Hochzeit' },
      errors: []
    });
  });

  it('rejects missing or ambiguous wish marks', () => {
    assert.match(sokoQuestionnairePatchFromMarks({}).errors.join(' '), /Glückwunsch-Auswahl/);
    assert.match(sokoQuestionnairePatchFromMarks({ wishPost: true, wishVisit: true }).errors.join(' '), /Glückwunsch-Auswahl/);
  });
});

describe('SOKO questionnaire application', () => {
  it('sets verified status when marks are complete and no handwriting is present', () => {
    const result = applySokoQuestionnaireResult(citizen, { marks: { wishPost: true }, textFields: {} });

    assert.equal(result.ok, true);
    assert.equal(result.citizen.wish, 'per Post');
    assert.equal(result.citizen.status, 'geprüft');
  });

  it('keeps imported status when handwriting is detected in supplemental fields', () => {
    const result = applySokoQuestionnaireResult(citizen, {
      marks: { wishVisit: true, weddingGold: true },
      textFields: { weddingDate: { hasText: true, score: 0.02 } }
    });

    assert.equal(result.ok, false);
    assert.equal(result.applied, true);
    assert.equal(result.needsManualReview, true);
    assert.equal(result.citizen.wish, 'Besuch erwünscht');
    assert.equal(result.citizen.weddingAnniversary, 'Goldene Hochzeit');
    assert.equal(result.citizen.status, 'importiert');
  });

  it('updates only pages with applicable results', () => {
    const result = applySokoQuestionnaireResults([citizen], [
      { citizenId: citizen.id, marks: { wishNone: true }, textFields: {} },
      { citizenId: 'G-404', marks: { wishPost: true }, textFields: {} }
    ]);

    assert.equal(result.citizens[0].wish, 'keine');
    assert.equal(result.pages[0].ok, true);
    assert.equal(result.pages[1].ok, false);
  });
});
