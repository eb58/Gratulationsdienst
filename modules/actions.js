import { $, todayIso, isValidEmail, isValidIban, formatIban, updateItem, nextId, csvEscape, formatStreetAddress, downloadText, calculateAge, toast, byId } from './utils.js';
import { normalizeStreetRules, streetDistrictSummary, streetGroupSummary, normalizeStreetDistrict } from './domain.js';
import { state, saveData, apiRequest, setAuthSession, clearAuthSession, loadCollectionData } from './state.js';
import { streetAssignment, filteredCitizens, documentCitizens, duplicateKey, isPrintedCitizen, selectedTemplate, selectedSender, activeCitizens, groupForCitizen, isReceiptGroupReady, receiptCitizens, receiptCitizensForReadyGroups, ruleMatchesHouseNo } from './assignment.js';
import { printCurrentRun, completePrintRun, renderSokoForm, renderSokoQuittung } from './documents.js';
import { parseCsv, mapImportRow } from './import.js';
import { render } from './render.js';
import { renderCitizenDetail } from './views.js';

const formValues = selector => Object.fromEntries(new FormData($(selector)).entries());
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
    plz: value("plz"),
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
const currentCitizenGridRows = () => {
  const api = state.gridApis.citizens;
  if (!api?.forEachNodeAfterFilterAndSort) return filteredCitizens().map((citizen, index) => ({ id: citizen.id, rowIndex: index }));
  const rows = [];
  api.forEachNodeAfterFilterAndSort(node => { if (node.data?.id) rows.push({ id: node.data.id, rowIndex: node.rowIndex }); });
  return rows;
};
const citizenGridRow = citizen => ({
  id: citizen.id,
  name: `${citizen.lastName}, ${citizen.firstName}`,
  birthday: citizen.birthDate,
  age: calculateAge(citizen.birthDate),
  address: `${citizen.street} ${citizen.houseNo}`,
  groupId: groupForCitizen(citizen)?.id || "offen",
  status: citizen.status
});
const updateCitizenGridRow = citizen => {
  const api = state.gridApis.citizens;
  if (!citizen) return false;
  if (!api?.applyTransaction) return false;
  const node = api.getRowNode?.(citizen.id);
  const row = citizenGridRow(citizen);
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
const testFirstNames = ["Anna", "Bernd", "Clara", "Dieter", "Eva", "Frank", "Gisela", "Heinz", "Inge", "Jürgen", "Karin", "Lothar", "Monika", "Norbert", "Petra", "Julia", "Maria", "Georg", "Norbert", "Joachim", "Evelyn", "Hans-Peter"];
const testLastNames = [ "Schulz", "Berger", "Klein", "Neumann", "Richter", "Wolf", "Krüger", "Hoffmann", "Werner", "Schneider", "Lehmann", "Koch", "Fischer", "Weber", "Peverali", "Brandt", "Piotrowski"];
const numberFrom = value => Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
const testAssignments = () => state.data.streets.flatMap(street => (street.rules || [])
  .filter(rule => rule.soko)
  .map(rule => ({ street, rule })));
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
const testCsvRow = (index, nameOffset, assignment) => {
  const nameIndex = nameOffset + index;
  return {
  Anrede: index % 2 ? "Herr" : "Frau",
  Vorname: testFirstNames[nameIndex % testFirstNames.length],
  Nachname: testLastNames[Math.floor(nameIndex / testFirstNames.length) % testLastNames.length],
  Strasse: assignment.street.name,
  Hausnummer: testHouseNo(assignment.rule, index),
  PLZ: assignment.rule.plz || "13437",
  Ortsteil: assignment.rule.ortsteil || assignment.street.district || "",
  Geburtsdatum: testBirthDate(index),
  Telefon: `030 9000${String(index + 100).padStart(4, "0")}`,
  Email: ""
  };
};
const testCsvText = rows => {
  const headers = ["Anrede", "Vorname", "Nachname", "Strasse", "Hausnummer", "PLZ", "Ortsteil", "Geburtsdatum", "Telefon", "Email"];
  return [headers, ...rows.map(row => headers.map(header => row[header] || ""))]
    .map(row => row.map(csvEscape).join(";"))
    .join("\n");
};
const importMappedRows = mapped => {
  const result = mapped.reduce((acc, row) => {
    const keys = acc.keys || [];
    const printedKeys = acc.printedKeys || [];
    const missing = !row.firstName || !row.lastName || !row.birthDate || !row.street;
    const key = duplicateKey(row);
    const duplicate = !missing && keys.includes(key);
    const printedDuplicate = duplicate && printedKeys.includes(key);
    const group = streetAssignment(row)?.groupId;
    const log = {
      time: new Date().toLocaleString("de-DE"),
      name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
      address: formatStreetAddress(row),
      birthDate: row.birthDate || "",
      age: row.age || (row.birthDate ? calculateAge(row.birthDate) : ""),
      groupId: group || "",
      type: missing ? "Fehler" : duplicate ? "Dublette" : "Importiert",
      message: missing ? "Pflichtfelder fehlen." : duplicate ? (printedDuplicate ? "Bestehender Datensatz wurde bereits gedruckt." : "Bestehender Datensatz bleibt erhalten.") : (group ? `Zugeordnet zu ${group}.` : "Straße ohne SOKO-Zuordnung.")
    };
    const item = { ...row, id: nextId("G-2026", [...state.data.citizens, ...acc.rows]), source: "CSV Import", updatedAt: todayIso(), status: group ? "importiert" : "offen" };
    return {
      rows: missing || duplicate ? acc.rows : [...acc.rows, item],
      logs: [...acc.logs, log],
      duplicates: duplicate ? acc.duplicates + 1 : acc.duplicates,
      printedDuplicates: printedDuplicate ? acc.printedDuplicates + 1 : acc.printedDuplicates,
      keys: missing || duplicate ? keys : [...keys, key],
      printedKeys
    };
  }, {
    rows: [],
    logs: [],
    duplicates: 0,
    printedDuplicates: 0,
    keys: state.data.citizens.map(duplicateKey),
    printedKeys: state.data.citizens.filter(isPrintedCitizen).map(duplicateKey)
  });
  state.data.citizens = [...state.data.citizens, ...result.rows];
  state.data.importLog = [...result.logs, ...state.data.importLog];
  state.importNotice = result.printedDuplicates
    ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten ausgefiltert, davon ${result.printedDuplicates} bereits gedruckt.`
    : result.duplicates
      ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten ausgefiltert.`
      : `${result.rows.length} neue Datensätze importiert.`;
  saveData();
  render();
  toast(state.importNotice || "Keine neuen Datensätze importiert.");
};

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
      state.auth.message = "Passwort wurde geaendert.";
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
      toast("MFA zurueckgesetzt.");
    } catch (error) { toast(error.message); }
  },
  "delete-user": () => {
    const user = state.auth.users.find(item => item.id === state.selectedUserId);
    if (!user) return;
    state.dialog = { type: "delete-user", userId: user.id, title: "Benutzer loeschen", message: `Soll ${user.email} wirklich geloescht werden?`, confirmLabel: "Benutzer loeschen", confirmAction: "confirm-delete-user" };
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
      render();
      toast("Benutzer geloescht.");
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
    const currentRows = currentCitizenGridRows();
    const currentIds = currentRows.map(row => row.id);
    const currentIndex = currentIds.indexOf(values.id);
    state.data.citizens = updateItem(state.data.citizens, values.id, { ...values, updatedAt: todayIso(), status: "geprüft" });
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
    const member = { id, salutation: "Frau", firstName: "", lastName: "", groupId: state.data.sokoGroups[0].id, street: "", postalCode: "", city: "", phone: "", mobile: "", email: "", bank: "", allowance: "35,00", termFrom: todayIso(), termTo: "2028-12-31", billingAmount: "15,00", isLeader: false };
    state.data.sokoMembers = [...state.data.sokoMembers, member];
    state.selectedMemberId = id;
    saveData();
    render();
    toast("Neues SOKO-Mitglied angelegt.");
  },
  "save-member": () => {
    const values = formValues("#member-form");
    if (!validateEmailFields("#member-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    if (values.bank && !isValidIban(values.bank)) { $("#bank")?.classList.add("invalid"); toast("Bitte eine gültige IBAN eingeben."); return; }
    const patch = { ...values, bank: formatIban(values.bank), isLeader: values.isLeader === "true" };
    state.data.sokoMembers = updateItem(state.data.sokoMembers, values.id, patch);
    state.data.sokoGroups = state.data.sokoGroups.map(group => patch.isLeader && group.id === patch.groupId ? { ...group, leaderId: values.id } : group);
    saveData();
    render();
    toast("SOKO-Daten gespeichert.");
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
    state.data.templates = [...state.data.templates, template];
    state.selectedTemplateId = id;
    saveData();
    render();
    toast("Neue Vorlage angelegt.");
  },
  "save-template": () => {
    const values = formValues("#template-form");
    state.data.templates = updateItem(state.data.templates, values.id, { ...values, updatedAt: todayIso() });
    state.selectedTemplateId = values.id;
    saveData();
    render();
    toast("Vorlage gespeichert.");
  },
  "delete-template": () => {
    const template = selectedTemplate();
    if (state.data.templates.length <= 1) { toast("Die letzte Vorlage kann nicht gelöscht werden."); return; }
    state.dialog = { type: "delete-template", templateId: template.id, title: "Vorlage löschen", message: `Soll die Vorlage "${template.name}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`, confirmLabel: "Vorlage löschen", confirmAction: "confirm-delete-template" };
    render();
  },
  "close-dialog": () => { state.dialog = null; render(); },
  "confirm-complete-print": () => { state.dialog = null; completePrintRun(); },
  "confirm-delete-template": () => {
    const templateId = state.dialog?.templateId;
    if (!templateId) return;
    state.data.templates = state.data.templates.filter(item => item.id !== templateId);
    state.selectedTemplateId = state.data.templates[0].id;
    state.dialog = null;
    saveData();
    render();
    toast("Vorlage gelöscht.");
  },
  "clear-citizens": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten bereinigen."); return; }
    state.dialog = { type: "clear-citizens", title: "Jubilare löschen", message: "Sollen wirklich alle Jubilare und das Import-Protokoll gelöscht werden? Stammdaten und Benutzer bleiben erhalten.", confirmLabel: "Jubilare löschen", confirmAction: "confirm-clear-citizens" };
    render();
  },
  "confirm-clear-citizens": () => {
    state.data.citizens = [];
    state.data.importLog = [];
    state.selectedCitizenId = "";
    state.generatedDocs = [];
    state.dialog = null;
    saveData();
    render();
    toast("Alle Jubilare und das Import-Protokoll wurden gelöscht.");
  },
  "seed-citizens": () => {
    if (state.auth.user?.role !== "admin") { toast("Nur Admins können Testdaten erzeugen."); return; }
    const assignments = testAssignments();
    if (!assignments.length) { toast("Keine SOKO-Zuordnungen für Testdaten gefunden."); return; }
    const nameOffset = state.data.citizens.length + state.data.importLog.length;
    const csv = testCsvText(Array.from({ length: 30 }, (_, index) => testCsvRow(index, nameOffset, assignments[index % assignments.length])));
    state.importText = csv;
    importMappedRows(parseCsv(csv).map(mapImportRow));
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
  "export-docs": () => {
    const header = ["id", "empfaenger", "adresse", "soko", "vorlage", "absender", "datum"];
    const rows = state.generatedDocs.map(doc => [doc.id, doc.recipient, doc.address, doc.groupId, doc.templateName, doc.sender, doc.createdAt]);
    downloadText("dokumentlauf.csv", [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n"), "text/csv;charset=utf-8");
  },
  "run-import": () => {
    if (!state.importText) { toast("Bitte zuerst eine CSV-Datei laden."); return; }
    importMappedRows(parseCsv(state.importText).map(mapImportRow));
  },
  "select-generated": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  }
};
