import { state, apiRequest } from './state.js';

const hasBackend = () => Boolean(state.auth.token);
const normalizedPage = page => ({
  id: page.id || '',
  citizenId: page.citizenId || '',
  importId: page.importId || '',
  image: page.image || '',
  marks: page.marks || {},
  source: page.source || 'pdf',
  createdAt: page.createdAt || new Date().toISOString()
});
const pagesWithImages = pages => pages.map(normalizedPage).filter(page => page.citizenId && page.image);
const sortedPages = pages => [...pages].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
const withoutQuestionnaireImages = citizen => {
  const { sokoQuestionnaireImages, ...rest } = citizen || {};
  return rest;
};

export const clearQuestionnaireImagesExcept = (citizenId, { clearCurrent = false } = {}) => {
  state.data.citizens = (state.data.citizens || []).map(citizen =>
    citizen.id === citizenId && !clearCurrent ? citizen : withoutQuestionnaireImages(citizen)
  );
};

export const prepareQuestionnairePageLoadForCitizen = citizenId => {
  clearQuestionnaireImagesExcept(citizenId, { clearCurrent: hasBackend() });
};

const attachPagesToCitizen = (citizenId, pages, { merge = true, keepOnlyCitizen = false } = {}) => {
  if (!citizenId || !pages.length) return [];
  const normalized = sortedPages(pagesWithImages(pages));
  state.data.citizens = state.data.citizens.map(citizen => {
    if (citizen.id !== citizenId) return keepOnlyCitizen ? withoutQuestionnaireImages(citizen) : citizen;
    const existing = merge && Array.isArray(citizen.sokoQuestionnaireImages) ? citizen.sokoQuestionnaireImages : [];
    const known = new Set(normalized.map(page => page.id || page.image));
    return {
      ...withoutQuestionnaireImages(citizen),
      sokoQuestionnaireImages: sortedPages([
        ...normalized,
        ...existing.filter(page => !known.has(page.id || page.image))
      ])
    };
  });
  return normalized;
};

const attachPages = pages => {
  const currentCitizenId = state.selectedCitizenId || pagesWithImages(pages)[0]?.citizenId || '';
  clearQuestionnaireImagesExcept(currentCitizenId, { clearCurrent: true });
  const grouped = pagesWithImages(pages).reduce((groups, page) => ({
    ...groups,
    [page.citizenId]: [...(groups[page.citizenId] || []), page]
  }), {});
  if (currentCitizenId && grouped[currentCitizenId]) {
    attachPagesToCitizen(currentCitizenId, grouped[currentCitizenId], { keepOnlyCitizen: true });
  }
  return pages;
};

export const loadQuestionnairePagesForCitizen = citizenId => {
  if (!citizenId || !hasBackend()) return Promise.resolve([]);
  prepareQuestionnairePageLoadForCitizen(citizenId);
  return apiRequest(`/questionnaire-pages?citizenId=${encodeURIComponent(citizenId)}`)
    .then(pages => state.selectedCitizenId && state.selectedCitizenId !== citizenId
      ? []
      : attachPagesToCitizen(citizenId, Array.isArray(pages) ? pages : [], { merge: false, keepOnlyCitizen: true }))
    .catch(error => {
      console.warn('Fragebogen-Scans konnten nicht geladen werden.', error);
      return [];
    });
};

export const deleteAllQuestionnairePages = () => {
  clearQuestionnaireImagesExcept('', { clearCurrent: true });
  if (!hasBackend()) return Promise.resolve();
  return apiRequest('/questionnaire-pages', { method: 'DELETE' }).catch(error => {
    console.warn('Fragebogen-Scans konnten nicht geloescht werden.', error);
  });
};

export const deleteQuestionnairePagesForCitizens = citizenIds => {
  const ids = [...new Set((citizenIds || []).filter(Boolean))];
  state.data.citizens = (state.data.citizens || []).map(citizen =>
    ids.includes(citizen.id) ? withoutQuestionnaireImages(citizen) : citizen
  );
  if (!ids.length || !hasBackend()) return Promise.resolve();
  return apiRequest('/questionnaire-pages', {
    method: 'DELETE',
    body: JSON.stringify({ citizenIds: ids })
  }).catch(error => {
    console.warn('Fragebogen-Scans konnten nicht geloescht werden.', error);
  });
};

const saveQuestionnairePage = page => apiRequest('/questionnaire-pages', {
  method: 'POST',
  body: JSON.stringify({ pages: [page] })
})
  .then(saved => (Array.isArray(saved) ? saved : [])[0])
  .catch(error => {
    console.warn('Fragebogen-Scans konnten nicht in der Datenbank gespeichert werden.', error);
    throw Object.assign(new Error('Fragebogen-Scans konnten nicht in der Datenbank gespeichert werden.'), { cause: error });
  });

export const saveQuestionnairePages = pages => {
  const payload = pagesWithImages(pages);
  if (!payload.length) return Promise.resolve([]);
  if (!hasBackend()) return Promise.resolve(attachPages(payload));
  return payload.reduce((chain, page) => chain.then(async records => {
    const record = await saveQuestionnairePage(page);
    return [...records, record];
  }), Promise.resolve([])).then(records => {
    attachPages(records);
    return records;
  });
};
