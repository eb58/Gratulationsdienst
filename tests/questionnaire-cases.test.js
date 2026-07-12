import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  previousQuestionnaireCycle,
  questionnaireCaseId,
  questionnaireCasesForCitizen,
  questionnaireCycleForCitizen,
  syncQuestionnaireCasesForImport,
  upsertQuestionnaireCase
} from '../modules/questionnaireCases.js';

const citizen = patch => ({
  id: 'G-1',
  firstName: 'Erika',
  lastName: 'Muster',
  birthDate: '1936-09-15',
  questionnaireCycle: '2026-09',
  wish: 'offen',
  pressPublication: false,
  status: 'importiert',
  source: 'CSV Import',
  ...patch
});

describe('questionnaire cycles', () => {
  it('uses the next birthday cycle and builds stable case ids', () => {
    assert.equal(questionnaireCycleForCitizen(citizen(), '2026-07-12'), '2026-09');
    assert.equal(questionnaireCycleForCitizen(citizen({ birthDate: '1936-02-15' }), '2026-12-01'), '2027-02');
    assert.equal(previousQuestionnaireCycle('2026-09'), '2025-09');
    assert.equal(questionnaireCaseId('G-1', '2026-09'), 'QC-G-1-2026-09');
  });

  it('keeps one response snapshot per citizen and cycle', () => {
    const first = upsertQuestionnaireCase([], citizen({ wish: 'per Post', status: 'geprüft' }), { capturedAt: '2026-07-12' });
    const updated = upsertQuestionnaireCase(first, citizen({ wish: 'Besuch erwünscht', status: 'geladen' }), { capturedAt: '2026-07-13' });

    assert.equal(updated.length, 1);
    assert.equal(updated[0].wish, 'Besuch erwünscht');
    assert.equal(updated[0].capturedAt, '2026-07-13');
  });

  it('archives a legacy response and creates a separate open current cycle', () => {
    const previous = citizen({ questionnaireCycle: '', wish: 'per Post', status: 'gedruckt', pressPublication: true });
    const current = citizen({ questionnaireCycle: '2026-09', wish: 'offen', status: 'importiert' });
    const cases = syncQuestionnaireCasesForImport([], [previous], [current]);

    assert.deepEqual(cases.map(item => item.cycle), ['2025-09', '2026-09']);
    assert.equal(cases[0].wish, 'per Post');
    assert.equal(cases[0].pressPublication, true);
    assert.equal(cases[1].wish, 'offen');
    assert.deepEqual(questionnaireCasesForCitizen(cases, 'G-1').map(item => item.cycle), ['2026-09', '2025-09']);
  });
});
