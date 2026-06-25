import { $, todayIso, isValidEmail, isValidIban, formatIban, updateItem, nextId, csvEscape, downloadText, toast, byId, normalizeEmail, normalizeAmount, normalizeDigits, isValidPostalCode } from './utils.js';
import { normalizeStreetRules, streetDistrictSummary, streetGroupSummary, normalizeStreetDistrict, defaultData } from './domain.js';
import { state, saveData, saveQuittungSettings, apiRequest, setAuthSession, clearAuthSession, loadCollectionData } from './state.js';
import { streetAssignment, filteredCitizens, documentCitizens, isPrintedCitizen, selectedTemplate, selectedSender, selectedMember, activeCitizens, groupForCitizen, isReceiptGroupReady, receiptCitizens, receiptCitizensForReadyGroups, ruleMatchesHouseNo } from './assignment.js';
import { printCurrentRun, completePrintRun, renderSokoForm, renderSokoQuittung } from './documents.js';
import { parseCsv, mapImportRow } from './import.js';
import { buildImportResult, importNotice, citizenGridRow, nextMemberIdAfterDelete } from './citizens.js';
import { render, renderDialog } from './render.js';
import { renderCitizenDetail } from './views.js';
import { cancelDirtyFormLeave, confirmDirtyFormLeave } from './dirtyForms.js';

const formValues = selector => Object.fromEntries(new FormData($(selector)).entries());
const TEMPLATE_BACKGROUND_MAX_BYTES = 1_500_000;
const quittungSettingKeys = ["quittungBetrag", "quittungTelefon", "quittungKapitel", "quittungTitel"];
const quittungSettingsFromForm = () => Object.fromEntries(quittungSettingKeys.map(key => [key, $(`[data-bind="${key}"]`)?.value ?? state[key]]));
const readFileAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
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
const templateFormValues = () => $("#template-form") ? { ...selectedTemplate(), ...formValues("#template-form") } : selectedTemplate();
const saveTemplatePatch = patch => {
  const values = { ...templateFormValues(), ...patch, updatedAt: todayIso() };
  state.data.templates = updateItem(state.data.templates, values.id, values);
  state.selectedTemplateId = values.id;
  saveData();
  render();
};
const authDone = session => {
  setAuthSession(session);
  render();
  loadCollectionData();
};
const authFail = error => {
  state.auth.message = error.message || "Aktion fehlgeschlagen.";
  render();
  toast(state.auth.message);
};
const openPrintWindow = (body, title = "Druck") => {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#888}@page{size:A4 portrait;margin:0}@media print{body{background:none}}</style></head><body>${body}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const w = globalThis.open(url, "_blank", "width=900,height=700");
  w.addEventListener("load", () => { URL.revokeObjectURL(url); setTimeout(() => { w.focus(); w.print(); }, 400); }, { once: true });
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
const testFirstNames = [
  ["Frau", "Anna"], ["Herr", "Bernd"], ["Frau", "Clara"], ["Herr", "Dieter"], ["Frau", "Eva"],
  ["Herr", "Frank"], ["Frau", "Gisela"], ["Herr", "Heinz"], ["Frau", "Inge"], ["Herr", "Jürgen"],
  ["Frau", "Karin"], ["Herr", "Lothar"], ["Frau", "Monika"], ["Herr", "Norbert"], ["Frau", "Petra"],
  ["Frau", "Julia"], ["Frau", "Maria"], ["Herr", "Georg"], ["Herr", "Joachim"], ["Frau", "Evelyn"],
  ["Herr", "Hans-Peter"], ["Frau", "Sabine"], ["Herr", "Wolfgang"], ["Frau", "Renate"], ["Herr", "Klaus"],
  ["Frau", "Ursula"], ["Herr", "Manfred"], ["Frau", "Brigitte"], ["Herr", "Peter"], ["Frau", "Helga"],
  ["Herr", "Rainer"], ["Frau", "Christine"], ["Herr", "Günter"], ["Frau", "Barbara"], ["Herr", "Horst"],
  ["Frau", "Waltraud"], ["Herr", "Werner"], ["Frau", "Margot"], ["Herr", "Uwe"], ["Frau", "Erika"]
];
const testLastNames = ["Schulz", "Berger", "Klein", "Neumann", "Richter", "Wolf", "Krüger", "Hoffmann", "Werner", "Schneider", "Lehmann", "Koch", "Fischer", "Weber", "Peverali", "Brandt", "Piotrowski", "Meyer", "Wagner", "Becker", "Schmidt", "Bauer", "Schäfer", "Krause", "Hartmann", "Lange", "Schröder", "Zimmermann", "König", "Walter", "Peters", "Möller", "Jung", "Hahn", "Vogel", "Keller", "Günther", "Frank", "Roth", "Lorenz"];
const shuffledTestValues = values => values.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.value);
const numberFrom = value => Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
const testAssignments = () => state.data.streets.flatMap(street => (street.rules || [])
  .filter(rule => rule.soko)
  .map(rule => ({ street, rule })));
const groupedTestAssignments = () => [...testAssignments().reduce((groups, assignment) => {
  const group = groups.get(assignment.rule.soko) || [];
  group.push(assignment);
  groups.set(assignment.rule.soko, group);
  return groups;
}, new Map()).entries()]
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([soko, assignments]) => ({ soko, assignments }));
const balancedTestAssignments = (groups, count) => Array.from({ length: count }, (_, index) => {
  const group = groups[index % groups.length];
  return group.assignments[Math.floor(index / groups.length) % group.assignments.length];
});
const testHouseNo = (rule, offset) => String([rule.von, rule.bis, ...Array.from({ length: 220 }, (_, index) => index + 1)]
  .map(numberFrom)
  .find(number => Number.isFinite(number) && ruleMatchesHouseNo(rule, number)) || offset + 1);
const testBirthDate = index => {
  const year = Number(todayIso().slice(0, 4));
  const age = [85, 90, 95, 100, 101][index % 5];
  const month = state.quittungMonat || String(new Date().getMonth() + 1).padStart(2, "0");
  const day = String((index % 28) + 1).padStart(2, "0");
  return `${year - age}-${month}-${day}`;
};
const testCsvRow = (index, name, assignment) => ({
  Anrede: name.salutation,
  Vorname: name.firstName,
  Nachname: name.lastName,
  Strasse: assignment.street.name,
  Hausnummer: testHouseNo(assignment.rule, index),
  PLZ: assignment.rule.plz || "13437",
  Ortsteil: assignment.rule.ortsteil || assignment.street.district || "",
  Geburtsdatum: testBirthDate(index),
  Telefon: `030 9000${String(index + 100).padStart(4, "0")}`,
  Email: ""
});
const testCsvText = rows => {
  const headers = ["Anrede", "Vorname", "Nachname", "Strasse", "Hausnummer", "PLZ", "Ortsteil", "Geburtsdatum", "Telefon", "Email"];
  return [headers, ...rows.map(row => headers.map(header => row[header] || ""))]
    .map(row => row.map(csvEscape).join(";"))
    .join("\n");
};
const importMappedRows = mapped => {
  const result = buildImportResult(mapped, state.data.citizens, row => streetAssignment(row)?.groupId);
  state.data.citizens = [...state.data.citizens, ...result.rows];
  state.data.importLog = [...result.logs, ...state.data.importLog];
  saveData();
  render();
  importToast(importNotice(result) || "Keine neuen Datensätze importiert.");
};
const importToast = message => toast(message, { anchor: ".import-action-row" });

export const actions = {
  "auth-show-reset": () => { state.auth.mode = "reset"; state.auth.message = ""; render(); },
  "auth-show-login": () => { state.auth.mode = "login"; state.auth.message = ""; state.auth.resetToken = ""; render(); },
  "auth-cancel-mfa": () => { state.auth.mfaTicket = ""; state.auth.message = ""; render(); },
  "auth-setup": async () => {
    try {
      authDone(await apiRequest("/auth/setup", { method: "POST", body: JSON.stringify(formValues("#auth-setup-form")) }));
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
      authDone(result);
    } catch (error) { authFail(error); }
  },
  "auth-mfa-login": async () => {
    try {
      const values = formValues("#auth-mfa-form");
      authDone(await apiRequest("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ ticket: state.auth.mfaTicket, code: values.code }) }));
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
    render();
  },
  "save-citizen": () => {
    const values = formValues("#citizen-form");
    if (!values.wish || values.wish === "offen") { toast("Bitte eine Glückwunsch-Option auswählen."); return; }
    if (!validateEmailFields("#citizen-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (!validatePostalCodeFields("#citizen-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    const currentRows = currentCitizenGridRows();
    const currentIds = currentRows.map(row => row.id);
    const currentIndex = currentIds.indexOf(values.id);
    const status = isPrintedCitizen(byId(state.data.citizens, values.id)) ? "gedruckt" : "geprüft";
    state.data.citizens = updateItem(state.data.citizens, values.id, { ...values, postalCode: normalizeDigits(values.postalCode), updatedAt: todayIso(), status });
    const nextCitizenId = currentIds[currentIndex + 1] || "";
    const reachedEnd = !nextCitizenId || currentIndex < 0;
    state.selectedCitizenId = nextCitizenId || values.id;
    saveData();
    const gridUpdated = updateCitizenGridRow(byId(state.data.citizens, values.id));
    if (gridUpdated) {
      renderCitizenDetail();
      const nextRow = currentRows.find(row => row.id === state.selectedCitizenId);
      showCitizenGridRow(nextRow);
    } else render();
    toast(reachedEnd ? "Jubilar gespeichert. Ende der Liste erreicht." : "Jubilar gespeichert.");
  },
  "select-member": event => {
    state.selectedMemberId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "new-member": () => {
    const id = nextId("S", state.data.sokoMembers);
    const member = { id, salutation: "Frau", firstName: "", lastName: "", birthDate: "", groupId: state.data.sokoGroups[0].id, street: "", postalCode: "", city: "", phone: "", mobile: "", email: "", bank: "", accountHolder: "", allowance: "35,00", termFrom: todayIso(), termTo: "2028-12-31", billingAmount: "15,00", zpNr: "", kassenzeichen: "", misc: "", note: "", isLeader: false };
    state.data.sokoMembers = [...state.data.sokoMembers, member];
    state.selectedMemberId = id;
    saveData();
    render();
    toast("Neues SOKO-Mitglied angelegt.");
  },
  "save-member": () => {
    const values = formValues("#member-form");
    if (!validateEmailFields("#member-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (!validatePostalCodeFields("#member-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    if (values.bank && !isValidIban(values.bank)) { $("#bank")?.classList.add("invalid"); toast("Bitte eine gültige IBAN eingeben."); return; }
    const patch = { ...values, postalCode: normalizeDigits(values.postalCode), email: normalizeEmail(values.email), bank: formatIban(values.bank), allowance: normalizeAmount(values.allowance), billingAmount: normalizeAmount(values.billingAmount), isLeader: values.isLeader === "true" };
    state.data.sokoMembers = updateItem(state.data.sokoMembers, values.id, patch);
    state.data.sokoGroups = state.data.sokoGroups.map(group => patch.isLeader && group.id === patch.groupId ? { ...group, leaderId: values.id } : group);
    saveData();
    render();
    toast("SOKO-Daten gespeichert.");
  },
  "delete-member": () => {
    const member = selectedMember();
    if (!member) return;
    const name = `${member.firstName} ${member.lastName}`.trim() || member.id;
    state.dialog = { type: "delete-member", memberId: member.id, title: "SOKO-Mitglied löschen", message: `Soll ${name} wirklich gelöscht werden?`, confirmLabel: "Mitglied löschen", confirmAction: "confirm-delete-member" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-delete-member": () => {
    const memberId = state.dialog?.memberId;
    if (!memberId) return;
    state.selectedMemberId = nextMemberIdAfterDelete(state.data.sokoMembers, memberId, state.filters);
    state.data.sokoMembers = state.data.sokoMembers.filter(member => member.id !== memberId);
    state.data.sokoGroups = state.data.sokoGroups.map(group => group.leaderId === memberId ? { ...group, leaderId: "" } : group);
    state.dialog = null;
    state.focusTarget = "#view";
    saveData();
    render();
    toast("SOKO-Mitglied gelöscht.");
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
  "save-street": () => {
    const { patch } = streetPatchFromForm("#street-form");
    if (!validatePostalCodeFields("#street-form")) { toast("Bitte eine gültige PLZ mit 5 Ziffern eingeben."); return; }
    if (!patch.rules.length) { toast("Bitte mindestens einen Zuständigkeitsabschnitt erfassen."); return; }
    state.data.streets = updateItem(state.data.streets, patch.id, patch);
    saveData();
    render();
    toast("Zuständigkeit gespeichert.");
  },
  "add-street-rule": () => {
    const { patch } = streetPatchFromForm("#street-form");
    const template = patch.rules.at(-1) || {};
    const nextRule = { ...template, id: `custom-${Date.now()}`, von: "", bis: "" };
    state.data.streets = updateItem(state.data.streets, patch.id, { ...patch, rules: [...patch.rules, nextRule] });
    saveData();
    render();
  },
  "delete-street-rule": event => {
    const { patch } = streetPatchFromForm("#street-form");
    const ruleId = event.target.closest("[data-rule-id]")?.dataset.ruleId;
    const rules = patch.rules.filter(rule => rule.id !== ruleId);
    if (!rules.length) { toast("Mindestens ein Abschnitt muss erhalten bleiben."); return; }
    const nextPatch = { ...patch, district: streetDistrictSummary(rules), groupId: streetGroupSummary(rules), rules };
    state.data.streets = updateItem(state.data.streets, patch.id, nextPatch);
    saveData();
    render();
  },
  "select-sender": event => {
    state.selectedSenderId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-sender": () => {
    const values = formValues("#sender-form");
    if (!validateEmailFields("#sender-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    state.data.senders = updateItem(state.data.senders, values.id, values);
    state.selectedSenderId = values.id;
    saveData();
    render();
    toast("Absenderprofil gespeichert.");
  },
  "insert-token": event => {
    const textarea = $("#body");
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
  "new-template": () => {
    const id = nextId("T", state.data.templates);
    const template = { id, name: "Neue Vorlage", occasion: "Geburtstag", format: "DIN A4 Brief", senderId: selectedSender().id, subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "{{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratulieren wir Ihnen sehr herzlich.\n\nMit freundlichen Grüßen\n{{absender}}", updatedAt: todayIso() };
    state.data.templates = [...state.data.templates, { ...template, backgroundImage: "", backBackgroundImage: "" }];
    state.selectedTemplateId = id;
    saveData();
    render();
    toast("Neue Vorlage angelegt.");
  },
  "save-template": () => {
    saveTemplatePatch({});
    toast("Vorlage gespeichert.");
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
    readFileAsDataUrl(file)
      .then(backgroundImage => {
        saveTemplatePatch({ [field]: backgroundImage });
        toast(`Hintergrundbild ${side} gespeichert.`);
      })
      .catch(() => toast("Hintergrundbild konnte nicht gelesen werden."));
  },
  "remove-template-background": event => {
    const field = templateBackgroundField(event);
    const side = templateBackgroundSide(field);
    state.dialog = { type: "remove-template-background", backgroundField: field, title: `Hintergrundbild entfernen`, message: `Soll das Hintergrundbild der ${side} wirklich entfernt werden?`, confirmLabel: "Entfernen", confirmAction: "confirm-remove-template-background" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-remove-template-background": () => {
    const field = state.dialog?.backgroundField;
    if (!field) return;
    const side = templateBackgroundSide(field);
    state.dialog = null;
    state.focusTarget = "#view";
    saveTemplatePatch({ [field]: "" });
    toast(`Hintergrundbild ${side} entfernt.`);
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
  "confirm-delete-template": () => {
    const templateId = state.dialog?.templateId;
    if (!templateId) return;
    state.data.templates = state.data.templates.filter(item => item.id !== templateId);
    state.selectedTemplateId = state.data.templates[0].id;
    state.dialog = null;
    state.focusTarget = "#view";
    saveData();
    render();
    toast("Vorlage gelöscht.");
  },
  "clear-citizens": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten bereinigen."); return; }
    state.dialog = { type: "clear-citizens", title: "Jubilare löschen", message: "Sollen wirklich alle Jubilare und das Import-Protokoll gelöscht werden? Stammdaten und Benutzer bleiben erhalten.", confirmLabel: "Jubilare löschen", confirmAction: "confirm-clear-citizens" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-clear-citizens": () => {
    state.data.citizens = [];
    state.data.importLog = [];
    state.selectedCitizenId = "";
    state.generatedDocs = [];
    state.dialog = null;
    state.focusTarget = "#view";
    saveData();
    render();
    toast("Alle Jubilare und das Import-Protokoll wurden gelöscht.");
  },
  "seed-citizens": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten erzeugen."); return; }
    const groups = groupedTestAssignments();
    if (!groups.length) { toast("Keine SOKO-Zuordnungen für Testdaten gefunden."); return; }
    const rowCount = Math.max(30, groups.length);
    const assignments = balancedTestAssignments(groups, rowCount);
    const firstNames = shuffledTestValues(testFirstNames);
    const lastNames = shuffledTestValues(testLastNames);
    const csv = testCsvText(assignments.map((assignment, index) => {
      const [salutation, firstName] = firstNames[index % firstNames.length];
      return testCsvRow(index, { salutation, firstName, lastName: lastNames[index % lastNames.length] }, assignment);
    }));
    state.importText = csv;
    importMappedRows(parseCsv(csv).map(mapImportRow));
  },
  "reset-soko-members": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten zurücksetzen."); return; }
    state.dialog = { type: "reset-soko-members", title: "SOKO-Testdaten zurücksetzen", message: "Sollen alle SOKO-Mitglieder auf die Standard-Testdaten zurückgesetzt werden? Manuell erfasste Mitglieder gehen dabei verloren.", confirmLabel: "Zurücksetzen", confirmAction: "confirm-reset-soko-members" };
    state.focusTarget = ".dialog-box [data-autofocus]";
    render();
  },
  "confirm-reset-soko-members": () => {
    state.data.sokoMembers = structuredClone(defaultData.sokoMembers);
    state.selectedMemberId = state.data.sokoMembers[0]?.id || "";
    state.dialog = null;
    state.focusTarget = "#view";
    saveData();
    render();
    toast("SOKO-Mitglieder auf Testdaten zurückgesetzt.");
  },
  "generate-docs": () => {
    const template = byId(state.data.templates, $("#doc-template").value);
    const sender = byId(state.data.senders, $("#doc-sender").value);
    state.selectedTemplateId = template.id;
    state.selectedSenderId = sender.id;
    state.filters.month = $("#doc-month").value;
    localStorage.setItem("gd_month_filter", state.filters.month);
    state.filters.groupId = $("#doc-group").value;
    const citizens = documentCitizens();
    state.generatedDocs = citizens.map(citizen => ({
      id: `DOC-${citizen.id}`,
      citizenId: citizen.id,
      templateId: template.id,
      senderId: sender.id,
      recipient: `${citizen.firstName} ${citizen.lastName}`,
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
  "print-docs": printCurrentRun,
  "toggle-print-background": e => { state.printBackground = e.target.checked; },
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
    openPrintWindow(renderSokoQuittung(citizens, groupId, state.quittungBetrag, state.quittungTelefon, state.quittungMonat, state.quittungKapitel, state.quittungTitel), "Quittung");
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
      .map(([gid, gc]) => renderSokoQuittung(gc, gid, state.quittungBetrag, state.quittungTelefon, state.quittungMonat, state.quittungKapitel, state.quittungTitel))
      .join("");
    openPrintWindow(pages, "Quittungen");
  },
  "soko-print": () => {
    const citizens = activeCitizens();
    if (!citizens.length) { toast("Keine Jubilare vorhanden."); return; }
    const base = globalThis.location.href.replace(/[^/]*$/, "");
    const imageSrc = `${base}assets/fragebogen-soko.png`;
    const forms = citizens.map((c, i) => renderSokoForm(c, i, imageSrc)).join("");
    openPrintWindow(forms, "SOKO-Fragebogen");
  },
"run-import": () => {
    if (!state.importText) { importToast("Bitte zuerst eine CSV-Datei laden."); return; }
    importMappedRows(parseCsv(state.importText).map(mapImportRow));
  },
  "select-generated": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  }
};
