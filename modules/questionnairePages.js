import { state, apiRequest } from './state.js';

const loadedCitizenIds = new Set();
const hasBackend = () => location.protocol !== "file:" && Boolean(state.auth.token);
const normalizedPage = page => ({
  id: page.id || "",
  citizenId: page.citizenId || "",
  image: page.image || "",
  marks: page.marks || {},
  source: page.source || "pdf",
  createdAt: page.createdAt || new Date().toISOString()
});
const pagesWithImages = pages => pages.map(normalizedPage).filter(page => page.citizenId && page.image);
const sortedPages = pages => [...pages].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
const attachPagesToCitizen = (citizenId, pages) => {
  if (!citizenId || !pages.length) return [];
  const normalized = sortedPages(pagesWithImages(pages));
  state.data.citizens = state.data.citizens.map(citizen => {
    if (citizen.id !== citizenId) return citizen;
    const existing = Array.isArray(citizen.sokoQuestionnaireImages) ? citizen.sokoQuestionnaireImages : [];
    const known = new Set(normalized.map(page => page.id || page.image));
    return {
      ...citizen,
      sokoQuestionnaireImages: sortedPages([
        ...normalized,
        ...existing.filter(page => !known.has(page.id || page.image))
      ])
    };
  });
  return normalized;
};
const attachPages = pages => {
  const grouped = pagesWithImages(pages).reduce((groups, page) => ({
    ...groups,
    [page.citizenId]: [...(groups[page.citizenId] || []), page]
  }), {});
  Object.entries(grouped).forEach(([citizenId, items]) => attachPagesToCitizen(citizenId, items));
  return pages;
};

export const loadQuestionnairePagesForCitizen = citizenId => {
  if (!citizenId || !hasBackend()) return Promise.resolve([]);
  const citizen = state.data.citizens.find(item => item.id === citizenId);
  if (citizen?.sokoQuestionnaireImages?.length) return Promise.resolve(citizen.sokoQuestionnaireImages);
  if (loadedCitizenIds.has(citizenId)) return Promise.resolve([]);
  loadedCitizenIds.add(citizenId);
  return apiRequest(`/questionnaire-pages?citizenId=${encodeURIComponent(citizenId)}`)
    .then(pages => attachPagesToCitizen(citizenId, Array.isArray(pages) ? pages : []))
    .catch(error => {
      console.warn("Fragebogen-Scans konnten nicht geladen werden.", error);
      return [];
    });
};

export const deleteAllQuestionnairePages = () => {
  loadedCitizenIds.clear();
  if (!hasBackend()) return Promise.resolve();
  return apiRequest("/questionnaire-pages", { method: "DELETE" }).catch(error => {
    console.warn("Fragebogen-Scans konnten nicht gelöscht werden.", error);
  });
};

export const deleteQuestionnairePagesForCitizens = citizenIds => {
  const ids = [...new Set((citizenIds || []).filter(Boolean))];
  ids.forEach(id => loadedCitizenIds.delete(id));
  if (!ids.length || !hasBackend()) return Promise.resolve();
  return apiRequest("/questionnaire-pages", {
    method: "DELETE",
    body: JSON.stringify({ citizenIds: ids })
  }).catch(error => {
    console.warn("Fragebogen-Scans konnten nicht gelöscht werden.", error);
  });
};

export const saveQuestionnairePages = pages => {
  const payload = pagesWithImages(pages);
  if (!payload.length) return Promise.resolve([]);
  attachPages(payload);
  if (!hasBackend()) return Promise.resolve(payload);
  return apiRequest("/questionnaire-pages", {
    method: "POST",
    body: JSON.stringify({ pages: payload })
  })
    .then(saved => {
      const records = Array.isArray(saved) ? saved : [];
      records.forEach(page => loadedCitizenIds.add(page.citizenId));
      attachPages(records);
      return records;
    })
    .catch(error => {
      console.warn("Fragebogen-Scans konnten nicht in der Datenbank gespeichert werden.", error);
      return [];
    });
};
