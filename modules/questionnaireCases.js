import { normalize, todayIso } from './utils.js';

const personKey = citizen => [citizen?.firstName, citizen?.lastName, citizen?.birthDate].map(normalize).join('|');
const responseFields = ['wish', 'pressPublication', 'weddingAnniversary', 'weddingDate', 'spouseName', 'notes'];

export const questionnaireCycleForCitizen = (citizen, reference = todayIso()) => {
  const month = String(citizen?.birthDate || '').slice(5, 7);
  const referenceYear = Number(String(reference).slice(0, 4));
  const referenceMonth = Number(String(reference).slice(5, 7));
  if (!month || !Number.isFinite(referenceYear)) return '';
  const year = referenceYear + (Number(month) < referenceMonth ? 1 : 0);
  return `${year}-${month}`;
};

export const previousQuestionnaireCycle = cycle => {
  const [year, month] = String(cycle || '').split('-');
  return year && month ? `${Number(year) - 1}-${month}` : '';
};

export const questionnaireCaseId = (citizenId, cycle) => citizenId && cycle ? `QC-${citizenId}-${cycle}` : '';

export const questionnaireCaseForCitizen = (citizen, options = {}) => {
  const cycle = options.cycle || citizen?.questionnaireCycle || questionnaireCycleForCitizen(citizen);
  const capturedAt = options.capturedAt ?? (citizen?.wish && normalize(citizen.wish) !== 'offen' ? citizen.updatedAt || todayIso() : '');
  return {
    id: questionnaireCaseId(citizen?.id, cycle),
    citizenId: citizen?.id || '',
    cycle,
    ...Object.fromEntries(responseFields.map(field => [field, citizen?.[field] ?? (field === 'pressPublication' ? false : '')])),
    source: options.source || citizen?.source || '',
    capturedAt,
    updatedAt: todayIso()
  };
};

export const upsertQuestionnaireCase = (cases, citizen, options = {}) => {
  const entry = questionnaireCaseForCitizen(citizen, options);
  if (!entry.id) return cases || [];
  const exists = (cases || []).some(item => item.id === entry.id);
  return exists
    ? cases.map(item => item.id === entry.id ? { ...item, ...entry, createdAt: item.createdAt } : item)
    : [...(cases || []), { ...entry, createdAt: todayIso() }];
};

export const syncQuestionnaireCasesForImport = (cases, previousCitizens, importedCitizens) => importedCitizens.reduce((result, citizen) => {
  const previous = previousCitizens.find(item => personKey(item) === personKey(citizen));
  const previousCycle = previous?.questionnaireCycle || previousQuestionnaireCycle(citizen.questionnaireCycle);
  const withPrevious = previous?.wish && normalize(previous.wish) !== 'offen'
    ? upsertQuestionnaireCase(result, previous, { cycle: previousCycle, source: previous.source || 'Bestand' })
    : result;
  return upsertQuestionnaireCase(withPrevious, citizen, { cycle: citizen.questionnaireCycle, source: citizen.source || 'CSV Import' });
}, cases || []);

export const questionnaireCasesForCitizen = (cases, citizenId) => (cases || [])
  .filter(item => item.citizenId === citizenId)
  .sort((a, b) => String(b.cycle).localeCompare(String(a.cycle)));
