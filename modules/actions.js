import { $, todayIso, MONTH_KEY, isValidEmail, isValidIban, formatIban, updateItem, nextId, csvEscape, downloadText, downloadBlob, toast, byId, normalizeEmail, normalizeAmount, normalizeDigits, isValidPostalCode, safeStorageSetItem } from './utils.js';
import { normalizeStreetRules, streetDistrictSummary, streetGroupSummary, normalizeStreetDistrict, defaultData } from './domain.js';
import { state, saveData, saveCollectionData, saveQuittungSettings, apiRequest, setAuthSession, clearAuthSession, loadCollectionData, hasPendingBackendData, syncSavedCollectionItem, removeSavedCollectionItem } from './state.js';
import { streetAssignment, filteredCitizens, documentCitizens, isPrintedCitizen, selectedTemplate, selectedSender, selectedMember, activeCitizens, groupForCitizen, isReceiptGroupReady, receiptCitizens, receiptCitizensForReadyGroups, duplicateKey } from './assignment.js';
import { hasCitizenExclusionFlag } from './citizenFlags.js';
import { printCurrentRun, completePrintRun, renderSokoForm, renderSokoQuittung } from './documents.js';
import { parseCsv, mapImportRow } from './import.js';
import { buildImportResult, importMonths, importNotice, citizenGridRow, nextMemberIdAfterDelete } from './citizens.js';
import { parseSokoQuestionnairePdf } from './sokoQuestionnairePdf.js';
import { applySokoQuestionnaireResults } from './sokoQuestionnaire.js';
import { createSokoQuestionnaireSimulation } from './sokoQuestionnaireSimulation.js';
import { saveQuestionnairePages, deleteAllQuestionnairePages, deleteQuestionnairePagesForCitizens, loadQuestionnairePagesForCitizen, prepareQuestionnairePageLoadForCitizen } from './questionnairePages.js';
import { upsertWeddingAnniversaryForCitizen, upsertWeddingAnniversariesForCitizens, weddingAnniversaryFromCitizen } from './weddingAnniversaries.js';
import { questionnaireCaseId, syncQuestionnaireCasesForImport, upsertQuestionnaireCase } from './questionnaireCases.js';
import { followUpSeedCsv, groupedTestAssignments, monthAfterNext, questionnaireCitizenPatch, rollingSimulationDate, seedCsv } from './testdata.js';
import { render, renderDialog } from './render.js';
import { renderCitizenDetail, renderMemberDetail } from './views.js';
import { cancelDirtyFormLeave, confirmDirtyFormLeave } from './dirtyForms.js';
import { buildBirthdayAgeTexts, normalizeTemplateAgeTexts } from './templates.js';
import { citizenDisplayName } from './citizenNames.js';

const formEntryValue = value => typeof value === "string" ? value : value.name;
const formValues = selector => Object.fromEntries([...new FormData($(selector)).entries()].filter(([key]) => !key.startsWith("_")).map(([key, value]) => [key, formEntryValue(value)]));
const formFlag = value => value === true || value === 'true' || value === 'on';
const TEMPLATE_BACKGROUND_MAX_BYTES = 1_500_000;
const quittungSettingKeys = ["quittungBetrag", "quittungTelefon", "quittungKapitel", "quittungTitel"];
const auditDays = value => Math.min(365, Math.max(1, Number.parseInt(value, 10) || 5));
const quittungSettingsFromForm = () => Object.fromEntries(quittungSettingKeys.map(key => [key, $(`[data-bind="${key}"]`)?.value ?? state[key]]));
const readFileAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => resolve(typeof reader.result === "string" ? reader.result : ""), { once: true });
  reader.addEventListener("error", () => reject(reader.error || new Error("Datei konnte nicht gelesen werden.")), { once: true });
  reader.readAsDataURL(file);
});
const isTemplateBackgroundFile = file => String(file?.type || "").startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(file?.name || "");
const templateBackgroundFields = new Set(["backgroundImage", "backBackgroundImage"]);
const templateBackgroundField = event => {
  const field = event.target.closest?.("[data-background-field]")?.dataset.backgroundField || event.target.dataset.backgroundField;
  return templateBackgroundFields.has(field) ? field : "backgroundImage";
};
const templateBackgroundSide = field => field === "backBackgroundImage" ? "Rückseite" : "Vorderseite";
const templateAgeTextsFromForm = () => {
  const form = $("#template-form");
  if (!form) return selectedTemplate().ageTexts || {};
  const values = Object.fromEntries([...form.querySelectorAll("[data-template-age-text]")].map(field => [field.dataset.age, field.value]));
  return normalizeTemplateAgeTexts(values);
};
const templateFormValues = () => $("#template-form") ? { ...selectedTemplate(), ...formValues("#template-form"), ageTexts: templateAgeTextsFromForm() } : selectedTemplate();
const senderFormValues = () => $("#sender-form") ? { ...selectedSender(), ...formValues("#sender-form") } : selectedSender();
const collectionItemVersion = (collection, id) => state.collectionVersions[collection]?.[id] || "";
const collectionItemPayload = (collection, item) => {
  const version = item?._version || collectionItemVersion(collection, item?.id);
  return version ? { ...item, _version: version } : item;
};
const createCollectionItem = async (collection, item) => {
  const savedItem = await apiRequest(`/${collection}`, { method: "POST", body: JSON.stringify(collectionItemPayload(collection, item)) });
  syncSavedCollectionItem(collection, savedItem);
  return savedItem;
};
const saveCollectionItem = async (collection, item) => {
  const savedItem = await apiRequest(`/${collection}/${item.id}`, { method: "PUT", body: JSON.stringify(collectionItemPayload(collection, item)) });
  syncSavedCollectionItem(collection, savedItem);
  return savedItem;
};
const deleteCollectionItem = async (collection, id) => {
  const version = collectionItemVersion(collection, id);
  await apiRequest(`/${collection}/${id}`, { method: "DELETE", headers: version ? { "If-Match": version } : {} });
  removeSavedCollectionItem(collection, id);
};
const reloadCollectionEntries = async entries => {
  const results = await Promise.all((entries || []).map(async ({ collection, id }) => {
    try {
      return { collection, id, item: await apiRequest(`/${collection}/${id}`) };
    } catch (error) {
      if (error?.status === 404) return { collection, id, removed: true };
      throw error;
    }
  }));
  results.forEach(result => {
    if (result.removed) removeSavedCollectionItem(result.collection, result.id);
    else syncSavedCollectionItem(result.collection, result.item);
  });
  render();
};
const handleSingleSaveError = async (error, reloadEntries = []) => {
  if (error?.status === 401) {
    await saveData();
    return true;
  }
  if (error?.status === 409) {
    toast("Daten wurden parallel geändert. Der aktuelle Stand wird neu geladen; bitte die Änderung erneut prüfen.");
    if (reloadEntries.length) await reloadCollectionEntries(reloadEntries);
    else await loadCollectionData({ force: true });
    return true;
  }
  return false;
};
const saveTemplatePatch = async patch => {
  const values = { ...templateFormValues(), ...patch, updatedAt: todayIso() };
  const id = String(values.id);
  const template = { ...values, id };
  state.data.templates = updateItem(state.data.templates, id, template);
  state.selectedTemplateId = id;
  try {
    if (!state.auth.token) await saveData();
    else await saveCollectionItem("templates", template);
    render();
    return true;
  } catch (error) {
    if (await handleSingleSaveError(error, [{ collection: "templates", id }])) return false;
    toast(error.message);
    return false;
  }
};
const saveSenderPatch = async patch => {
  const values = { ...senderFormValues(), ...patch };
  const id = String(values.id);
  const sender = { ...values, id };
  state.data.senders = updateItem(state.data.senders, id, sender);
  state.selectedSenderId = id;
  try {
    if (!state.auth.token) await saveData();
    else await saveCollectionItem("senders", sender);
    render();
    return true;
  } catch (error) {
    if (await handleSingleSaveError(error, [{ collection: "senders", id }])) return false;
    toast(error.message);
    return false;
  }
};
const authDone = async session => {
  setAuthSession(session);
  render();
  // Lief die Session ab (401 beim Speichern), liegen lokal noch ungespeicherte Änderungen vor.
  // Die werden nach dem Login zuerst nachgespeichert, sonst würde loadCollectionData sie verwerfen.
  // Baselines existieren nur, wenn in diesem Tab bereits Server-Daten geladen wurden; bei einem
  // Konflikt lädt handleSaveError ohnehin den Server-Stand.
  const pushPending = Object.keys(state.collectionBaselines || {}).length > 0 || hasPendingBackendData() ? saveCollectionData(state.data) : Promise.resolve();
  await pushPending;
  await loadCollectionData();
};
const authFail = error => {
  state.auth.message = error.message || "Aktion fehlgeschlagen.";
  render();
  toast(state.auth.message);
};
const revokeObjectUrl = url => {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
};
const openPrintWindow = (body, title = "Druck") => {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#888}@page{size:A4 portrait;margin:0}@media print{body{background:none}}</style></head><body>${body}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const w = globalThis.open(url, "_blank", "width=900,height=700");
  if (!w) {
    revokeObjectUrl(url);
    toast("Druckfenster konnte nicht geöffnet werden. Bitte Popup-Blocker prüfen.");
    return false;
  }
  const printWindow = () => {
    if (w.closed) return;
    try {
      w.focus();
      w.print();
    } catch {
      toast("Druck konnte nicht gestartet werden.");
    }
  };
  w.addEventListener("load", () => {
    revokeObjectUrl(url);
    setTimeout(printWindow, 400);
  }, { once: true });
  w.addEventListener("error", () => {
    revokeObjectUrl(url);
    toast("Druckfenster konnte nicht geladen werden.");
  }, { once: true });
  return true;
};
const streetRuleFormValues = selector => [...$(selector).querySelectorAll("[data-rule-row]")].map((row, index) => {
  const value = name => row.querySelector(`[name="${name}"]`)?.value.trim() || "";
  return {
    id: value("ruleId") || `custom-${index + 1}`,
    plz: normalizeDigits(value("plz")),
    ortsteil: normalizeStreetDistrict(value("ortsteil")),
    von: value("von"),
    bis: value("bis"),
    art: value("art") || "F",
    soko: value("soko") ? value("soko").padStart(2, "0") : ""
  };
}).filter(rule => rule.plz || rule.ortsteil || rule.soko);
const streetPatchFromForm = selector => {
  const values = formValues(selector);
  const current = byId(state.data.streets, values.id);
  const streetIndex = Number(String(values.id).match(/\d+/)?.[0] || 1) - 1;
  const rules = normalizeStreetRules(streetRuleFormValues(selector), streetIndex);
  return { current, patch: { ...current, id: values.id, name: values.name, district: streetDistrictSummary(rules), groupId: streetGroupSummary(rules), rules } };
};
const validateEmailFields = selector => {
  const fields = [...$(selector).querySelectorAll("input[type='email']")];
  const invalid = fields.filter(input => !isValidEmail(input.value));
  fields.forEach(input => input.classList.toggle("invalid", invalid.includes(input)));
  return !invalid.length;
};
const validatePostalCodeFields = selector => {
  const fields = [...$(selector).querySelectorAll("[data-postal-code-field]")];
  const invalid = fields.filter(input => !isValidPostalCode(input.value));
  fields.forEach(input => input.classList.toggle("invalid", invalid.includes(input)));
  return !invalid.length;
};
const requiredMemberFields = [["salutation", "Anrede"], ["firstName", "Vorname"], ["lastName", "Nachname"], ["groupId", "SOKO"], ["termFrom", "Berufung von"], ["termTo", "Berufung bis"]];
const missingRequiredFields = (values, fields) => fields.filter(([key]) => !String(values[key] ?? "").trim());
const markRequiredFields = (selector, fields) => fields.forEach(([key]) => $(`${selector} [name="${key}"]`)?.classList.add("invalid"));
const requiredFieldsNotice = fields => `Bitte Pflichtfelder ausfüllen: ${fields.map(([, label]) => label).join(", ")}.`;
const currentCitizenGridRows = () => {
  const api = state.gridApis.citizens;
  if (!api?.forEachNodeAfterFilterAndSort) return filteredCitizens().map((citizen, index) => ({ id: citizen.id, rowIndex: index }));
  const rows = [];
  api.forEachNodeAfterFilterAndSort(node => { if (node.data?.id) rows.push({ id: node.data.id, rowIndex: node.rowIndex }); });
  return rows;
};
const updateCitizenGridRow = citizen => {
  const api = state.gridApis.citizens;
  if (!citizen) return false;
  if (!api?.applyTransaction) return false;
  const node = api.getRowNode?.(citizen.id);
  const row = citizenGridRow(citizen, groupForCitizen(citizen));
  const visible = filteredCitizens().some(item => item.id === citizen.id);
  if (visible && node) api.applyTransaction({ update: [row] });
  if (visible && !node) api.applyTransaction({ add: [row] });
  if (!visible && node) api.applyTransaction({ remove: [node.data] });
  api.refreshClientSideRowModel?.("filter");
  api.redrawRows?.();
  return true;
};
const showCitizenGridRow = row => {
  const api = state.gridApis.citizens;
  if (!api || !row || !Number.isFinite(row.rowIndex)) return;
  const pageSize = api.paginationGetPageSize?.();
  if (pageSize) api.paginationGoToPage?.(Math.floor(row.rowIndex / pageSize));
  requestAnimationFrame(() => api.ensureIndexVisible?.(row.rowIndex, "middle"));
};
const keepOrSelectFirstVisibleCitizen = () => {
  const rows = currentCitizenGridRows();
  if (rows.some(row => row.id === state.selectedCitizenId)) return rows.find(row => row.id === state.selectedCitizenId);
  const first = rows[0];
  if (first?.id) state.selectedCitizenId = first.id;
  return first;
};
const refreshSokoPdfImportUi = result => {
  const selectedRow = keepOrSelectFirstVisibleCitizen();
  const ids = [...new Set(result.pages.filter(page => page.applied && page.citizen?.id).map(page => page.citizen.id))];
  const gridUpdated = ids.length
    ? ids.map(id => updateCitizenGridRow(byId(state.data.citizens, id))).every(Boolean)
    : Boolean(state.gridApis.citizens);
  if (!gridUpdated) { render(); return; }
  renderCitizenDetail();
  showCitizenGridRow(selectedRow);
};
const renderSelectedCitizenDetailWithQuestionnaires = () => {
  const citizenId = state.selectedCitizenId;
  prepareQuestionnairePageLoadForCitizen(citizenId);
  renderCitizenDetail();
  return loadQuestionnairePagesForCitizen(citizenId).then(pages => {
    if (pages.length && state.selectedCitizenId === citizenId) renderCitizenDetail();
  });
};
const syncWeddingAnniversaries = (citizens, source = "Fragebogen") => {
  state.data.weddingAnniversaries = upsertWeddingAnniversariesForCitizens(state.data.weddingAnniversaries || [], citizens, source);
};
const cleanedWeddingAnniversary = (item, citizen) => ({
  ...item,
  citizenId: citizen.id,
  salutation: citizen.salutation || item.salutation || "",
  firstName: citizen.firstName || item.firstName || "",
  lastName: citizen.lastName || item.lastName || "",
  birthDate: citizen.birthDate || item.birthDate || "",
  street: citizen.street || item.street || "",
  houseNo: citizen.houseNo || item.houseNo || "",
  postalCode: citizen.postalCode || item.postalCode || "",
  district: citizen.district || item.district || "",
  updatedAt: todayIso()
});
const cleanWeddingAnniversariesAfterImport = result => {
  const importedByKey = new Map([...result.updates, ...result.newRows].map(citizen => [duplicateKey(citizen), citizen]));
  state.data.weddingAnniversaries = (state.data.weddingAnniversaries || []).map(item => {
    const citizen = importedByKey.get(duplicateKey(item));
    return citizen ? cleanedWeddingAnniversary(item, citizen) : item;
  });
};
const resetCitizenReviewFilters = month => {
  state.filters = { ...state.filters, q: "", month, groupId: "alle", age: "alle", status: "alle" };
  safeStorageSetItem(localStorage, MONTH_KEY, month, "Monatsfilter");
};
const selectImportedCitizen = result => {
  const importedIds = new Set([...result.updates, ...result.newRows].map(citizen => citizen.id));
  const visible = filteredCitizens();
  state.selectedCitizenId = (visible.find(citizen => importedIds.has(citizen.id)) || visible[0])?.id || "";
};
const saveImportStep = async () => {
  const hadAuthToken = Boolean(state.auth.token);
  const saved = await saveData();
  return !hadAuthToken || Boolean(saved);
};
const importMappedRows = async (mapped, { resetFilters = true, allowMultipleMonths = false } = {}) => {
  const months = importMonths(mapped);
  if (!allowMultipleMonths && months.size > 1) {
    importToast("Import abgebrochen: Eine CSV-Importdatei darf nur einen Geburtsmonat enthalten.");
    return { newRows: [], updates: [], skipped: 0, deleted: [], retained: state.data.citizens, affectedMonths: [...months], missing: [], aborted: true };
  }
  const previousCitizens = state.data.citizens;
  const result = buildImportResult(mapped, previousCitizens, row => streetAssignment(row));
  const updatesById = new Map(result.updates.map(c => [c.id, c]));
  state.data.citizens = [...result.retained.map(c => updatesById.get(c.id) ?? c), ...result.newRows];
  state.data.questionnaireCases = syncQuestionnaireCasesForImport(state.data.questionnaireCases, previousCitizens, [...result.updates, ...result.newRows]);
  cleanWeddingAnniversariesAfterImport(result);
  state.importMissingCitizens = result.missing;
  if (resetFilters) resetCitizenReviewFilters(months.size === 1 ? [...months][0] : "alle");
  selectImportedCitizen(result);
  render();
  const mixedMonthsWarning = resetFilters && months.size > 1 ? "Achtung: Die CSV enthält mehrere Geburtsmonate. " : "";
  if (await saveImportStep()) importToast(mixedMonthsWarning + importNotice(result));
  return result;
};
const importToast = message => toast(message, { anchor: ".soko-pdf-action-row, .import-action-row" });
const buildLaboSeedCsv = groups => {
  const birthdayMonth = monthAfterNext();
  return followUpSeedCsv(state.data.streets, state.data.citizens, null, birthdayMonth) || seedCsv(state.data.streets, Math.max(50, groups.length), () => birthdayMonth);
};
const seedCurrentLaboBatch = groups => {
  const csv = buildLaboSeedCsv(groups);
  state.importText = csv;
  const rows = parseCsv(csv).map(mapImportRow);
  return importMappedRows(rows, { resetFilters: false }).then(result => ({ rowCount: rows.length, result }));
};
const markMissingTestCitizensArchived = missing => {
  const missingIds = new Set((missing || []).map(citizen => citizen.id));
  if (!missingIds.size) return;
  state.data.citizens = state.data.citizens.map(citizen => missingIds.has(citizen.id) && citizen.archived
    ? { ...citizen, status: 'archiviert' }
    : citizen);
  state.importMissingCitizens = state.importMissingCitizens.map(citizen => missingIds.has(citizen.id)
    ? { ...citizen, status: 'archiviert', archived: true }
    : citizen);
};
const importedCitizensFromResult = result => {
  const ids = new Set([...result.updates, ...result.newRows].map(citizen => citizen.id));
  return state.data.citizens.filter(citizen => ids.has(citizen.id));
};
const selectedReceiptMonth = () => state.filters.month;
const sokoPdfNotice = pages => {
  const checked = pages.filter(page => page.ok).length;
  const manual = pages.filter(page => page.applied && !page.ok).length;
  const unmatched = pages.filter(page => !page.applied && /nicht gefunden/i.test(page.error || "")).length;
  const failed = pages.filter(page => !page.applied && !/nicht gefunden/i.test(page.error || "")).length;
  return [
    checked ? `${checked} Fragebögen geladen.` : "",
    manual ? `${manual} mit Handschrift zur Nacharbeit.` : "",
    unmatched ? `${unmatched} erkannt, aber kein passender Jubilar gefunden.` : "",
    failed ? `${failed} nicht lesbar.` : ""
  ].filter(Boolean).join(" ") || "Keine Fragebögen erkannt.";
};

const hasNoQuestionnaire = citizen => {
  const caseId = questionnaireCaseId(citizen.id, citizen.questionnaireCycle);
  return !citizen.sokoQuestionnaireImages?.some(page => page.importId && page.importId === caseId);
};
const isImportedCitizen = citizen => citizen.status === "importiert";
const awaitsQuestionnaire = citizen => isImportedCitizen(citizen) && !hasCitizenExclusionFlag(citizen) && hasNoQuestionnaire(citizen);
const questionnaireCitizenPool = citizens => {
  if (citizens.length) return citizens;
  return filteredCitizens().filter(citizen => citizen?.id);
};
const sokoPdfSimulationCitizens = () => {
  const rows = currentCitizenGridRows();
  const citizens = rows.map(row => byId(state.data.citizens, row.id)).filter(Boolean);
  return questionnaireCitizenPool(citizens).filter(awaitsQuestionnaire);
};
const importedCitizensAwaitingQuestionnaire = () => state.data.citizens.filter(awaitsQuestionnaire);
const sokoQuestionnaireImagePages = (resultPages, sourcePages) => resultPages
  .map((page, index) => {
    const source = sourcePages[index] || {};
    const citizenId = page.citizen?.id || page.citizenId || source.citizenId || "";
    const image = source.image || page.image || "";
    return page.applied && citizenId && image ? {
      id: source.id || "",
      citizenId,
      importId: source.importId || page.qrData?.questionnaireCaseId || questionnaireCaseId(citizenId, page.citizen?.questionnaireCycle),
      image,
      marks: page.marks || source.marks || {},
      source: source.source || "pdf",
      createdAt: source.createdAt || new Date().toISOString()
    } : null;
  })
  .filter(Boolean);
const parsedSokoQuestionnairePages = (parsedPages, generatedPages) => {
  if (!generatedPages.length) return parsedPages;
  return parsedPages.map((page, index) => ({ ...page, citizenId: generatedPages[index]?.citizenId || page.citizenId }));
};
const buildSokoPdfSimulation = async (citizens, emptyMessage) => {
  if (!citizens.length) { importToast(emptyMessage); return null; }
  importToast("SOKO-PDF wird erzeugt...");
  const simulation = await createSokoQuestionnaireSimulation(citizens);
  if (!simulation.pages.length) { importToast("Keine Fragebögen erzeugt."); return null; }
  return simulation;
};
const applySokoPdfImport = async (file, generatedPages = []) => {
  const parsed = await parseSokoQuestionnairePdf(file);
  const pages = parsedSokoQuestionnairePages(parsed.pages, generatedPages);
  const result = applySokoQuestionnaireResults(state.data.citizens, pages);
  const previousCitizens = state.data.citizens;
  const previousQuestionnaireCases = state.data.questionnaireCases;
  const previousWeddingAnniversaries = state.data.weddingAnniversaries;
  state.data.citizens = result.citizens;
  result.pages.filter(page => page.applied && page.citizen).forEach(page => {
    state.data.questionnaireCases = upsertQuestionnaireCase(state.data.questionnaireCases, page.citizen, { source: 'SOKO-PDF', capturedAt: todayIso() });
  });
  syncWeddingAnniversaries(result.pages.filter(page => page.applied).map(page => page.citizen).filter(Boolean), "SOKO-PDF");
  const imagePages = sokoQuestionnaireImagePages(result.pages, generatedPages.length ? generatedPages : parsed.pages);
  try {
    await saveQuestionnairePages(imagePages);
  } catch (error) {
    state.data.citizens = previousCitizens;
    state.data.questionnaireCases = previousQuestionnaireCases;
    state.data.weddingAnniversaries = previousWeddingAnniversaries;
    throw error;
  }
  return result;
};

export const actions = {
  "auth-show-reset": () => { state.auth.mode = "reset"; state.auth.message = ""; state.auth.pendingEmail = $("#auth-login-form [name=email]")?.value ?? ""; render(); },
  "auth-show-login": () => { state.auth.mode = "login"; state.auth.message = ""; state.auth.resetToken = ""; render(); },
  "auth-cancel-mfa": () => { state.auth.mfaTicket = ""; state.auth.message = ""; render(); },
  "auth-setup": async () => {
    try {
      await authDone(await apiRequest("/auth/setup", { method: "POST", body: JSON.stringify(formValues("#auth-setup-form")) }));
    } catch (error) { authFail(error); }
  },
  "auth-login": async () => {
    try {
      const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(formValues("#auth-login-form")) });
      if (result.mfaRequired) {
        state.auth.mfaTicket = result.ticket;
        state.auth.message = "";
        render();
        return;
      }
      await authDone(result);
    } catch (error) { authFail(error); }
  },
  "auth-mfa-login": async () => {
    try {
      const values = formValues("#auth-mfa-form");
      await authDone(await apiRequest("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ ticket: state.auth.mfaTicket, code: values.code }) }));
    } catch (error) { authFail(error); }
  },
  "auth-reset-request": async () => {
    try {
      const result = await apiRequest("/auth/password/request", { method: "POST", body: JSON.stringify(formValues("#auth-reset-request-form")) });
      state.auth.resetToken = "";
      state.auth.message = result.message;
      render();
    } catch (error) { authFail(error); }
  },
  "auth-reset-apply": async () => {
    try {
      await apiRequest("/auth/password/reset", { method: "POST", body: JSON.stringify(formValues("#auth-reset-apply-form")) });
      state.auth.mode = "login";
      state.auth.resetToken = "";
      state.auth.message = "Passwort wurde geändert.";
      render();
    } catch (error) { authFail(error); }
  },
  "auth-logout": async () => {
    try { await apiRequest("/auth/logout", { method: "POST", body: "{}" }); } catch { /* Session ist lokal trotzdem beendet */ }
    clearAuthSession();
    render();
  },
  "mfa-setup": async () => {
    try {
      state.auth.mfaSetup = await apiRequest("/auth/mfa/setup", { method: "POST", body: "{}" });
      render();
    } catch (error) { toast(error.message); }
  },
  "mfa-enable": async () => {
    try {
      const result = await apiRequest("/auth/mfa/enable", { method: "POST", body: JSON.stringify(formValues("#mfa-enable-form")) });
      state.auth.user = result.user;
      state.auth.mfaSetup = null;
      render();
      toast("MFA aktiviert.");
    } catch (error) { toast(error.message); }
  },
  "mfa-disable": async () => {
    try {
      const result = await apiRequest("/auth/mfa/disable", { method: "POST", body: JSON.stringify(formValues("#mfa-disable-form")) });
      state.auth.user = result.user;
      render();
      toast("MFA deaktiviert.");
    } catch (error) { toast(error.message); }
  },
  "load-users": async () => {
    try {
      state.auth.users = await apiRequest("/users");
      state.selectedUserId = state.selectedUserId || state.auth.users[0]?.id || "";
      render();
    } catch (error) { toast(error.message); }
  },
  "load-audit": async () => {
    try {
      state.auditDays = auditDays(state.auditDays);
      state.audit = await apiRequest(`/audit?limit=100&days=${state.auditDays}`);
      render();
    } catch (error) { toast(error.message); }
  },
  "set-audit-days": async event => {
    state.auditDays = auditDays(event.target.value);
    event.target.value = String(state.auditDays);
    await actions["load-audit"]();
  },
  "clear-audit": async () => {
    try {
      state.audit = [];
      if (state.auth.token) await apiRequest("/audit", { method: "DELETE" });
      render();
    } catch (error) { toast(error.message); }
  },
  "new-user": () => { state.selectedUserId = "new"; state.auth.adminResetToken = ""; render(); },
  "select-user": event => { state.selectedUserId = event.target.closest("[data-id]").dataset.id; state.auth.adminResetToken = ""; render(); },
  "save-user": async () => {
    try {
      const values = formValues("#user-form");
      const payload = { ...values, active: values.active === "true" };
      const user = values.id
        ? await apiRequest(`/users/${values.id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiRequest("/users", { method: "POST", body: JSON.stringify(payload) });
      state.selectedUserId = user.id;
      state.auth.users = await apiRequest("/users");
      render();
      toast("Benutzer gespeichert.");
    } catch (error) { toast(error.message); }
  },
  "user-reset-password": async () => {
    try {
      const result = await apiRequest(`/users/${state.selectedUserId}/reset-password`, { method: "POST", body: "{}" });
      state.auth.adminResetToken = result.resetToken;
      render();
    } catch (error) { toast(error.message); }
  },
  "user-reset-mfa": async () => {
    try {
      const user = await apiRequest(`/users/${state.selectedUserId}/mfa-reset`, { method: "POST", body: "{}" });
      state.auth.users = state.auth.users.map(item => item.id === user.id ? user : item);
      render();
      toast("MFA zurückgesetzt.");
    } catch (error) { toast(error.message); }
  },
  "delete-user": (event) => {
    const id = event?.target?.closest("[data-id]")?.dataset.id || state.selectedUserId;
    const user = state.auth.users.find(item => item.id === id);
    if (!user) return;
    state.dialog = { type: "delete-user", userId: user.id, title: "Benutzer löschen", message: `Soll ${user.email} wirklich gelöscht werden?`, confirmLabel: "Benutzer löschen", confirmAction: "confirm-delete-user" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-delete-user": async () => {
    try {
      const userId = state.dialog?.userId;
      state.dialog = null;
      if (!userId) return;
      await apiRequest(`/users/${userId}`, { method: "DELETE" });
      state.auth.users = state.auth.users.filter(user => user.id !== userId);
      state.selectedUserId = state.auth.users[0]?.id || "";
      state.focusTarget = "#view";
      render();
      toast("Benutzer gelöscht.");
    } catch (error) { toast(error.message); }
  },
  "sort-dashboard": event => {
    const key = event.target.closest("[data-sort-key]")?.dataset.sortKey;
    if (!key) return;
    const sameKey = state.dashboardSort?.key === key;
    state.dashboardSort = { key, dir: sameKey && state.dashboardSort.dir === "desc" ? "asc" : "desc" };
    render();
  },
  "select-citizen": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    renderSelectedCitizenDetailWithQuestionnaires();
  },
  "save-citizen": async () => {
    const values = formValues("#citizen-form");
    const currentCitizen = byId(state.data.citizens, values.id);
    const deceased = formFlag(values.deceased);
    const moved = formFlag(values.moved);
    const wish = values.wish || currentCitizen?.wish || 'offen';
    if (wish === "offen" && !deceased && !moved) { toast("Bitte eine Glückwunsch-Option auswählen oder Verstorben/Verzogen markieren."); return; }
    if (!validatePostalCodeFields("#citizen-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    const currentRows = currentCitizenGridRows();
    const currentIds = currentRows.map(row => row.id);
    const currentIndex = currentIds.indexOf(values.id);
    const previousWeddingAnniversary = (state.data.weddingAnniversaries || []).find(item => item.citizenId === values.id) || null;
    const citizenVersion = currentCitizen?._version || state.collectionVersions.citizens?.[values.id] || "";
    const weddingAnniversaryVersion = previousWeddingAnniversary?._version || state.collectionVersions.weddingAnniversaries?.[previousWeddingAnniversary?.id || ""] || "";
    const status = isPrintedCitizen(currentCitizen) ? "gedruckt" : "geprüft";
    const updatedCitizen = { ...currentCitizen, ...values, wish, deceased, moved, pressPublication: formFlag(values.pressPublication), postalCode: normalizeDigits(values.postalCode), updatedAt: todayIso(), status, ...(citizenVersion ? { _version: citizenVersion } : {}) };
    state.data.citizens = updateItem(state.data.citizens, values.id, updatedCitizen);
    state.data.questionnaireCases = upsertQuestionnaireCase(state.data.questionnaireCases, updatedCitizen, { source: 'Manuelle Prüfung', capturedAt: todayIso() });
    const currentQuestionnaireCase = state.data.questionnaireCases.find(item => item.id === questionnaireCaseId(updatedCitizen.id, updatedCitizen.questionnaireCycle));
    state.data.weddingAnniversaries = upsertWeddingAnniversaryForCitizen(state.data.weddingAnniversaries || [], updatedCitizen);
    const nextCitizenId = currentIds[currentIndex + 1] || "";
    const reachedEnd = !nextCitizenId || currentIndex < 0;
    state.selectedCitizenId = nextCitizenId || values.id;
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        const savedCitizen = await apiRequest(`/citizens/${values.id}`, { method: "PUT", body: JSON.stringify(updatedCitizen) });
        syncSavedCollectionItem("citizens", savedCitizen);
        if (currentQuestionnaireCase) await saveCollectionItem('questionnaireCases', currentQuestionnaireCase);
        const weddingAnniversary = weddingAnniversaryFromCitizen(updatedCitizen);
        if (weddingAnniversary) {
          const weddingAnniversaryPayload = { ...weddingAnniversary, ...(weddingAnniversaryVersion ? { _version: weddingAnniversaryVersion } : {}) };
          const savedWeddingAnniversary = await apiRequest(`/weddingAnniversaries/${weddingAnniversary.id}`, { method: "PUT", body: JSON.stringify(weddingAnniversaryPayload) });
          syncSavedCollectionItem("weddingAnniversaries", savedWeddingAnniversary);
        } else if (previousWeddingAnniversary) {
          await deleteCollectionItem("weddingAnniversaries", previousWeddingAnniversary.id);
        }
      }
      const gridUpdated = updateCitizenGridRow(byId(state.data.citizens, values.id));
      const questionnaireLoad = renderSelectedCitizenDetailWithQuestionnaires();
      if (gridUpdated) {
        const nextRow = currentRows.find(row => row.id === state.selectedCitizenId);
        showCitizenGridRow(nextRow);
      }
      await questionnaireLoad;
      toast(reachedEnd ? "Jubilar gespeichert. Ende der Liste erreicht." : "Jubilar gespeichert.");
    } catch (error) {
      const reloadEntries = [{ collection: "citizens", id: values.id }];
      if (currentQuestionnaireCase) reloadEntries.push({ collection: 'questionnaireCases', id: currentQuestionnaireCase.id });
      const weddingAnniversary = weddingAnniversaryFromCitizen(updatedCitizen);
      if (weddingAnniversary) reloadEntries.push({ collection: "weddingAnniversaries", id: weddingAnniversary.id });
      else if (previousWeddingAnniversary) reloadEntries.push({ collection: "weddingAnniversaries", id: previousWeddingAnniversary.id });
      if (await handleSingleSaveError(error, reloadEntries)) return;
      toast(error.message);
    }
  },
  "select-member": event => {
    state.selectedMemberId = event.target.closest("[data-id]").dataset.id;
    renderMemberDetail();
    state.gridApis.members?.redrawRows?.();
  },
  "new-member": async () => {
    const id = nextId("S", state.data.sokoMembers);
    const member = { id, salutation: "Frau", firstName: "", lastName: "", birthDate: "", groupId: state.data.sokoGroups[0].id, street: "", postalCode: "", city: "", phone: "", mobile: "", email: "", bank: "", accountHolder: "", allowance: "35,00", termFrom: todayIso(), termTo: "2028-12-31", billingAmount: "15,00", zpNr: "", kassenzeichen: "", misc: "", note: "", isLeader: false };
    state.data.sokoMembers = [...state.data.sokoMembers, member];
    state.selectedMemberId = id;
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        await createCollectionItem("sokoMembers", member);
      }
      render();
      toast("Neues SOKO-Mitglied angelegt.");
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "sokoMembers", id }])) return;
      toast(error.message);
    }
  },
  "save-member": async () => {
    const values = formValues("#member-form");
    const missing = missingRequiredFields(values, requiredMemberFields);
    if (missing.length) { markRequiredFields("#member-form", missing); toast(requiredFieldsNotice(missing)); return; }
    if (!validateEmailFields("#member-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (!validatePostalCodeFields("#member-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    if (values.bank && !isValidIban(values.bank)) { $("#bank")?.classList.add("invalid"); toast("Bitte eine gültige IBAN eingeben."); return; }
    const patch = { ...values, postalCode: normalizeDigits(values.postalCode), email: normalizeEmail(values.email), bank: formatIban(values.bank), allowance: normalizeAmount(values.allowance), billingAmount: normalizeAmount(values.billingAmount), isLeader: values.isLeader === "true" };
    const currentGroup = patch.isLeader ? byId(state.data.sokoGroups, patch.groupId) : null;
    const updatedGroup = currentGroup ? { ...currentGroup, leaderId: values.id } : null;
    state.data.sokoMembers = updateItem(state.data.sokoMembers, values.id, patch);
    if (updatedGroup) state.data.sokoGroups = updateItem(state.data.sokoGroups, updatedGroup.id, updatedGroup);
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        await saveCollectionItem("sokoMembers", patch);
        if (updatedGroup) await saveCollectionItem("sokoGroups", updatedGroup);
      }
      render();
      toast("SOKO-Daten gespeichert.");
    } catch (error) {
      const reloadEntries = [{ collection: "sokoMembers", id: values.id }];
      if (updatedGroup) reloadEntries.push({ collection: "sokoGroups", id: updatedGroup.id });
      if (await handleSingleSaveError(error, reloadEntries)) return;
      toast(error.message);
    }
  },
  "delete-member": () => {
    const member = selectedMember();
    if (!member) return;
    const name = `${member.firstName} ${member.lastName}`.trim() || member.id;
    state.dialog = { type: "delete-member", memberId: member.id, title: "SOKO-Mitglied löschen", message: `Soll ${name} wirklich gelöscht werden?`, confirmLabel: "Mitglied löschen", confirmAction: "confirm-delete-member" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-delete-member": async () => {
    const memberId = state.dialog?.memberId;
    if (!memberId) return;
    const affectedGroups = state.data.sokoGroups.filter(group => group.leaderId === memberId);
    state.selectedMemberId = nextMemberIdAfterDelete(state.data.sokoMembers, memberId, state.filters);
    state.data.sokoMembers = state.data.sokoMembers.filter(member => member.id !== memberId);
    state.data.sokoGroups = state.data.sokoGroups.map(group => group.leaderId === memberId ? { ...group, leaderId: "" } : group);
    state.dialog = null;
    state.focusTarget = "#view";
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        await deleteCollectionItem("sokoMembers", memberId);
        for (const group of affectedGroups) await saveCollectionItem("sokoGroups", { ...group, leaderId: "" });
      }
      render();
      toast("SOKO-Mitglied gelöscht.");
    } catch (error) {
      const reloadEntries = [{ collection: "sokoMembers", id: memberId }, ...affectedGroups.map(group => ({ collection: "sokoGroups", id: group.id }))];
      if (await handleSingleSaveError(error, reloadEntries)) return;
      toast(error.message);
    }
  },
  "export-soko": () => {
    const header = ["id", "anrede", "vorname", "nachname", "soko", "email", "telefon", "leitung"];
    const rows = state.data.sokoMembers.map(member => [member.id, member.salutation, member.firstName, member.lastName, member.groupId, member.email, member.phone || member.mobile, member.isLeader ? "ja" : "nein"]);
    downloadText("soko-mitglieder.csv", [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n"), "text/csv;charset=utf-8");
  },
  "select-street": event => {
    state.selectedStreetId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-street": async () => {
    const { patch } = streetPatchFromForm("#street-form");
    if (!validatePostalCodeFields("#street-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    if (!patch.rules.length) { toast("Bitte mindestens einen Zuständigkeitsabschnitt erfassen."); return; }
    state.data.streets = updateItem(state.data.streets, patch.id, patch);
    try {
      if (!state.auth.token) await saveData();
      else await saveCollectionItem("streets", patch);
      render();
      toast("Zuständigkeit gespeichert.");
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "streets", id: patch.id }])) return;
      toast(error.message);
    }
  },
  "add-street-rule": async () => {
    const { patch } = streetPatchFromForm("#street-form");
    const template = patch.rules.at(-1) || {};
    const nextRule = { ...template, id: `custom-${Date.now()}`, von: "", bis: "" };
    state.data.streets = updateItem(state.data.streets, patch.id, { ...patch, rules: [...patch.rules, nextRule] });
    try {
      if (!state.auth.token) await saveData();
      else await saveCollectionItem("streets", byId(state.data.streets, patch.id));
      render();
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "streets", id: patch.id }])) return;
      toast(error.message);
    }
  },
  "delete-street-rule": async event => {
    const { patch } = streetPatchFromForm("#street-form");
    const ruleId = event.target.closest("[data-rule-id]")?.dataset.ruleId;
    const rules = patch.rules.filter(rule => rule.id !== ruleId);
    if (!rules.length) { toast("Mindestens ein Abschnitt muss erhalten bleiben."); return; }
    const nextPatch = { ...patch, district: streetDistrictSummary(rules), groupId: streetGroupSummary(rules), rules };
    state.data.streets = updateItem(state.data.streets, patch.id, nextPatch);
    try {
      if (!state.auth.token) await saveData();
      else await saveCollectionItem("streets", nextPatch);
      render();
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "streets", id: nextPatch.id }])) return;
      toast(error.message);
    }
  },
  "select-sender": event => {
    state.selectedSenderId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-sender": async () => {
    if (!validateEmailFields("#sender-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (await saveSenderPatch({})) toast("Absenderprofil gespeichert.");
  },
  "insert-token": event => {
    const form = event.target.closest?.("#template-form");
    const active = globalThis.document?.activeElement;
    const textarea = active?.tagName === "TEXTAREA" && form?.contains(active) ? active : $("#body");
    if (!textarea) return;
    const token = event.target.dataset.token;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = `${textarea.value.slice(0, start)}${token}${textarea.value.slice(end)}`;
    textarea.focus();
    textarea.setSelectionRange(start + token.length, start + token.length);
  },
  "select-template": event => {
    state.selectedTemplateId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "new-template": async () => {
    const id = nextId("T", state.data.templates);
    const template = { id, name: "Neue Vorlage", occasion: "Geburtstag", format: "DIN A4 Brief", senderId: selectedSender().id, subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "{{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratulieren wir Ihnen sehr herzlich.\n\nMit freundlichen Grüßen\n{{absender}}", ageTexts: buildBirthdayAgeTexts("wir"), updatedAt: todayIso() };
    state.data.templates = [...state.data.templates, { ...template, backgroundImage: "", backBackgroundImage: "" }];
    state.selectedTemplateId = id;
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        await createCollectionItem("templates", template);
      }
      render();
      toast("Neue Vorlage angelegt.");
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "templates", id }])) return;
      toast(error.message);
    }
  },
  "save-template": async () => {
    if (await saveTemplatePatch({})) toast("Vorlage gespeichert.");
  },
  "upload-template-background": event => {
    const file = event.target.files?.[0];
    const field = templateBackgroundField(event);
    const side = templateBackgroundSide(field);
    if (!file) return;
    if (!isTemplateBackgroundFile(file)) {
      event.target.value = "";
      toast("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > TEMPLATE_BACKGROUND_MAX_BYTES) {
      event.target.value = "";
      toast("Bitte ein Bild bis 1,5 MB auswählen.");
      return;
    }
    return readFileAsDataUrl(file)
      .then(backgroundImage => {
        saveTemplatePatch({ [field]: backgroundImage }).then(saved => {
          if (saved) toast(`Hintergrundbild ${side} gespeichert.`);
        });
      })
      .catch(() => toast("Hintergrundbild konnte nicht gelesen werden."));
  },
  "upload-sender-signature-image": event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isTemplateBackgroundFile(file)) {
      event.target.value = "";
      toast("Bitte eine Bilddatei auswählen.");
      return;
    }
    if (file.size > TEMPLATE_BACKGROUND_MAX_BYTES) {
      event.target.value = "";
      toast("Bitte ein Bild bis 1,5 MB auswählen.");
      return;
    }
    return readFileAsDataUrl(file)
      .then(signatureImage => {
        saveSenderPatch({ signatureImage }).then(saved => {
          if (saved) toast("Unterschriftenbild gespeichert.");
        });
      })
      .catch(() => toast("Unterschriftenbild konnte nicht gelesen werden."));
  },
  "remove-sender-signature-image": () => {
    const sender = selectedSender();
    if (!sender?.signatureImage) return;
    state.dialog = { type: "remove-sender-signature-image", title: "Unterschriftenbild entfernen", message: "Soll das Unterschriftenbild wirklich entfernt werden?", cancelLabel: "Abbrechen", confirmLabel: "Entfernen", confirmAction: "confirm-remove-sender-signature-image" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-remove-sender-signature-image": async () => {
    const sender = selectedSender();
    if (!sender) return;
    state.dialog = null;
    state.focusTarget = "#view";
    if (await saveSenderPatch({ signatureImage: "" })) toast("Unterschriftenbild entfernt.");
  },
  "remove-template-background": event => {
    const field = templateBackgroundField(event);
    const side = templateBackgroundSide(field);
    state.dialog = { type: "remove-template-background", backgroundField: field, title: `Hintergrundbild entfernen`, message: `Soll das Hintergrundbild der ${side} wirklich entfernt werden?`, confirmLabel: "Entfernen", confirmAction: "confirm-remove-template-background" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-remove-template-background": async () => {
    const field = state.dialog?.backgroundField;
    if (!field) return;
    const side = templateBackgroundSide(field);
    state.dialog = null;
    state.focusTarget = "#view";
    if (await saveTemplatePatch({ [field]: "" })) toast(`Hintergrundbild ${side} entfernt.`);
  },
  "delete-template": event => {
    const id = event?.target?.closest("[data-id]")?.dataset.id;
    const template = (id && byId(state.data.templates, id)) || selectedTemplate();
    if (state.data.templates.length <= 1) { toast("Die letzte Vorlage kann nicht gelöscht werden."); return; }
    state.dialog = { type: "delete-template", templateId: template.id, title: "Vorlage löschen", message: `Soll die Vorlage "${template.name}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`, confirmLabel: "Vorlage löschen", confirmAction: "confirm-delete-template" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "close-dialog": () => {
    const dirtyDialog = state.dialog?.type === "dirty-form";
    cancelDirtyFormLeave();
    state.dialog = null;
    state.focusTarget = "#view";
    if (dirtyDialog) { renderDialog(); return; }
    render();
  },
  "confirm-discard-dirty": () => {
    const proceed = confirmDirtyFormLeave();
    renderDialog();
    if (proceed) { proceed(); return; }
    render();
  },
  "confirm-complete-print": () => { state.dialog = null; state.focusTarget = "#view"; completePrintRun(); },
  "confirm-delete-template": async () => {
    const templateId = state.dialog?.templateId;
    if (!templateId) return;
    state.data.templates = state.data.templates.filter(item => item.id !== templateId);
    state.selectedTemplateId = state.data.templates[0].id;
    state.dialog = null;
    state.focusTarget = "#view";
    try {
      if (!state.auth.token) {
        await saveData();
      } else {
        await deleteCollectionItem("templates", templateId);
      }
      render();
      toast("Vorlage gelöscht.");
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "templates", id: templateId }])) return;
      toast(error.message);
    }
  },
  "reset-test-database": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten zurücksetzen."); return; }
    const groups = groupedTestAssignments(state.data.streets);
    if (!groups.length) { toast("Keine SOKO-Zuordnungen für Testdaten gefunden."); return; }
    state.dialog = { type: "reset-test-database", title: "Test-Datenbank zurücksetzen", message: "Sollen alle Jubilare, Fragebögen, das Import-Protokoll und die Änderungen gelöscht und durch 500 neue Jahres-Testdaten mit Fragebogen-Rückmeldungen ersetzt werden? Stammdaten und Benutzer bleiben erhalten.", confirmLabel: "Zurücksetzen", confirmAction: "confirm-reset-test-database" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-reset-test-database": async () => {
    state.data.citizens = [];
    state.data.questionnaireCases = [];
    state.data.weddingAnniversaries = [];
    state.selectedCitizenId = "";
    state.generatedDocs = [];
    state.importMissingCitizens = [];
    state.dialog = null;
    state.focusTarget = "#view";
    await deleteAllQuestionnairePages();
    const rowCount = 500;
    const csv = seedCsv(state.data.streets, rowCount, index => rollingSimulationDate(index, rowCount), Math.random, { includeDoctoralDegrees: true });
    state.importText = csv;
    const result = await importMappedRows(parseCsv(csv).map(mapImportRow), { resetFilters: false, allowMultipleMonths: true });
    const patches = new Map(importedCitizensFromResult(result).map((citizen, index) => [citizen.id, questionnaireCitizenPatch(citizen, index, rowCount)]));
    state.data.citizens = state.data.citizens.map(citizen => patches.get(citizen.id) || citizen);
    state.data.questionnaireCases = [...patches.values()].reduce((cases, citizen) => upsertQuestionnaireCase(cases, citizen, { source: 'Simulation', capturedAt: citizen.updatedAt }), []);
    syncWeddingAnniversaries([...patches.values()], "Simulation");
    const batch = await seedCurrentLaboBatch(groupedTestAssignments(state.data.streets));
    markMissingTestCitizensArchived(batch.result.missing);
    await saveData();
    await actions["clear-audit"]();
    render();
    importToast(`Test-Datenbank zurückgesetzt: ${patches.size.toLocaleString("de-DE")} Jahres-Testdaten mit Fragebogen-Rückmeldungen und ${batch.rowCount.toLocaleString("de-DE")} offene LABO-Fälle für ${monthAfterNext()} simuliert.`);
  },
  "seed-citizens": async () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten erzeugen."); return; }
    const groups = groupedTestAssignments(state.data.streets);
    if (!groups.length) { toast("Keine SOKO-Zuordnungen für Testdaten gefunden."); return; }
    await seedCurrentLaboBatch(groups);
  },
  "download-labo-seed": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten erzeugen."); return; }
    const groups = groupedTestAssignments(state.data.streets);
    if (!groups.length) { toast("Keine SOKO-Zuordnungen für Testdaten gefunden."); return; }
    downloadText(`labo-import-${monthAfterNext()}.csv`, buildLaboSeedCsv(groups), "text/csv;charset=utf-8");
    importToast("LABO-Daten wurden heruntergeladen.");
  },
  "reset-soko-members": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten zurücksetzen."); return; }
    state.dialog = { type: "reset-soko-members", title: "SOKO-Testdaten zurücksetzen", message: "Sollen alle SOKO-Mitglieder auf die Standard-Testdaten zurückgesetzt werden? Manuell erfasste Mitglieder gehen dabei verloren.", confirmLabel: "Zurücksetzen", confirmAction: "confirm-reset-soko-members" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-reset-soko-members": async () => {
    state.data.sokoMembers = structuredClone(defaultData.sokoMembers);
    state.selectedMemberId = state.data.sokoMembers[0]?.id || "";
    state.dialog = null;
    state.focusTarget = "#view";
    await saveData();
    render();
    toast("SOKO-Mitglieder auf Testdaten zurückgesetzt.");
  },
  "generate-docs": () => {
    const template = byId(state.data.templates, $("#doc-template").value);
    const sender = byId(state.data.senders, $("#doc-sender").value);
    state.selectedTemplateId = template.id;
    state.selectedSenderId = sender.id;
    state.filters.month = $("#doc-month").value;
    safeStorageSetItem(localStorage, MONTH_KEY, state.filters.month, "Monatsfilter");
    state.filters.groupId = $("#doc-group").value;
    const citizens = documentCitizens();
    state.generatedDocs = citizens.map(citizen => ({
      id: `DOC-${citizen.id}`,
      citizenId: citizen.id,
      templateId: template.id,
      senderId: sender.id,
      recipient: citizenDisplayName(citizen),
      address: `${citizen.street} ${citizen.houseNo}, ${citizen.postalCode} Berlin`,
      groupId: streetAssignment(citizen)?.groupId || "",
      wish: citizen.wish || "",
      templateName: template.name,
      sender: sender.role,
      createdAt: todayIso()
    }));
    render();
    toast(state.generatedDocs.length ? `${state.generatedDocs.length} Dokumente erzeugt.` : "Keine geprüften Jubilare in der aktuellen Auswahl.");
  },
  "reset-selected-for-reprint": async () => {
    const citizen = byId(state.data.citizens, state.selectedCitizenId);
    if (!citizen || !isPrintedCitizen(citizen)) { toast("Bitte einen bereits gedruckten Jubilar auswählen."); return; }
    state.data.citizens = updateItem(state.data.citizens, citizen.id, { ...citizen, status: "geprüft", updatedAt: todayIso() });
    state.generatedDocs = [];
    try {
      if (!state.auth.token) await saveData();
      else await saveCollectionItem("citizens", byId(state.data.citizens, citizen.id));
      render();
      toast("Jubilar für den Nachdruck auf geprüft gesetzt.");
    } catch (error) {
      if (await handleSingleSaveError(error, [{ collection: "citizens", id: citizen.id }])) return;
      toast(error.message);
    }
  },
  "print-docs": printCurrentRun,
  "toggle-print-background": e => { state.printBackground = e.target.checked; },
  "toggle-map-people": e => {
    state.showMapPeople = Boolean(e.target.checked);
    render();
  },
  "toggle-all-wedding-anniversaries": e => {
    state.showAllWeddingAnniversaries = Boolean(e.target.checked);
    render();
  },
  "save-quittung-settings": () => {
    const settings = { ...quittungSettingsFromForm(), quittungBetrag: normalizeAmount(state.quittungBetrag) };
    saveQuittungSettings(settings)
      .then(() => {
        render();
        toast("Quittungs-Einstellungen gespeichert.");
      })
      .catch(error => toast(error.message || "Quittungs-Einstellungen konnten nicht gespeichert werden."));
  },
  "print-quittung": e => {
    const groupId = e.target.closest("[data-group-id]")?.dataset.groupId;
    if (!isReceiptGroupReady(groupId)) { toast("Quittungsdruck erst möglich, wenn alle Jubilare dieser SOKO geprüft sind."); return; }
    const citizens = receiptCitizens().filter(c => groupForCitizen(c)?.id === groupId);
    if (!citizens.length) { toast("Keine Jubilare mit Besuchswunsch für diese SOKO."); return; }
    openPrintWindow(renderSokoQuittung(citizens, groupId, state.quittungBetrag, state.quittungTelefon, selectedReceiptMonth(), state.quittungKapitel, state.quittungTitel), "Quittung");
  },
  "print-quittung-all": () => {
    const citizens = receiptCitizensForReadyGroups();
    if (!citizens.length) { toast("Keine fertige SOKO mit Besuchswunsch und SOKO-Zuordnung vorhanden."); return; }
    const byGroup = citizens.reduce((acc, c) => {
      const gid = groupForCitizen(c).id;
      if (!acc[gid]) acc[gid] = [];
      acc[gid].push(c);
      return acc;
    }, {});
    const pages = Object.entries(byGroup)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([gid, gc]) => renderSokoQuittung(gc, gid, state.quittungBetrag, state.quittungTelefon, selectedReceiptMonth(), state.quittungKapitel, state.quittungTitel))
      .join("");
    openPrintWindow(pages, "Quittungen");
  },
  "soko-print": () => {
    const citizens = activeCitizens();
    if (!citizens.length) { toast("Keine Jubilare vorhanden."); return; }
    const forms = citizens.map(renderSokoForm).join("");
    openPrintWindow(forms, "SOKO-Fragebogen");
  },
  "run-import": async () => {
    if (!state.importText) { importToast("Bitte zuerst eine CSV-Datei laden."); return; }
    await importMappedRows(parseCsv(state.importText).map(mapImportRow));
  },
  "delete-missing-citizens": () => {
    if (!state.importMissingCitizens?.length) return;
    state.dialog = { type: "delete-missing-citizens", title: "Fehlende Jubilare löschen", message: `Sollen ${state.importMissingCitizens.length} im neuen Import nicht mehr enthaltene Jubilare endgültig gelöscht werden?`, confirmLabel: "Endgültig löschen", confirmAction: "confirm-delete-missing-citizens" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-delete-missing-citizens": async () => {
    const missingIds = new Set(state.importMissingCitizens.map(citizen => citizen.id));
    state.data.citizens = state.data.citizens.filter(citizen => !missingIds.has(citizen.id));
    state.data.weddingAnniversaries = (state.data.weddingAnniversaries || []).filter(item => !missingIds.has(item.citizenId));
    if (missingIds.has(state.selectedCitizenId)) state.selectedCitizenId = filteredCitizens()[0]?.id || "";
    state.importMissingCitizens = [];
    state.dialog = null;
    state.focusTarget = "#view";
    await saveData();
    render();
    await deleteQuestionnairePagesForCitizens([...missingIds]);
    importToast(`${missingIds.size} Jubilare gelöscht.`);
  },
  "run-soko-pdf-import": async ({ file } = {}) => {
    if (!file) { importToast("Bitte zuerst ein SOKO-PDF laden."); return; }
    try {
      importToast("SOKO-PDF wird ausgewertet...");
      const result = await applySokoPdfImport(file);
      await saveData();
      refreshSokoPdfImportUi(result);
      importToast(sokoPdfNotice(result.pages));
    } catch (error) {
      importToast(error.message || "SOKO-PDF konnte nicht ausgewertet werden.");
    }
  },
  "simulate-soko-pdf-import": async () => {
    try {
      const simulation = await buildSokoPdfSimulation(sokoPdfSimulationCitizens(), "Keine Jubilare in der aktuellen Auswahl.");
      if (!simulation) return;
      importToast("SOKO-PDF wird ausgewertet...");
      const result = await applySokoPdfImport(simulation.file, simulation.pages);
      await saveData();
      refreshSokoPdfImportUi(result);
      importToast(`Simulation: ${sokoPdfNotice(result.pages)}`);
    } catch (error) {
      importToast(error.message || "SOKO-PDF-Simulation konnte nicht ausgeführt werden.");
    }
  },
  "download-soko-pdf-simulation": async () => {
    try {
      const simulation = await buildSokoPdfSimulation(importedCitizensAwaitingQuestionnaire(), "Keine importierten Jubilare ohne Fragebogen vorhanden.");
      if (!simulation) return;
      downloadBlob(simulation.file, simulation.name);
      importToast(`PDF mit ${simulation.pages.length} Fragebögen heruntergeladen.`);
    } catch (error) {
      importToast(error.message || "SOKO-PDF-Simulation konnte nicht erzeugt werden.");
    }
  },
  "select-generated": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  }
};
