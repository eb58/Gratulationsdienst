import { escapeHtml, normalize, formatDate, byId, birthdayMonth, calculateAge } from './utils.js';
import { months, sokoColors, streetGroupDisplay } from './domain.js';
import { state } from './state.js';
import { selectedCitizen, selectedTemplate, selectedSender, selectedMember, selectedStreet, filteredCitizens, activeCitizens, groupForCitizen, isCheckedCitizen, isPrintedCitizen, wantsVisit } from './assignment.js';
import { field, emailField, postalCodeField, ibanField, selectField, textField, checkField, radioField, streetRuleRows, assignmentPill, gridHost, groupOptions, sokoSelectOptions, senderOptions, templateOptions, occasionOptions, formatOptions } from './fields.js';
import { streetMapSvg, mapSegmentCounts, mapAddressPointGroups, mapDataLoaded, ensureMapData } from './map.js';
import { documentBackPreview, documentPreview } from './documents.js';
import { qrCodeSvg } from './qr.js';
import { SOKO_QUESTIONNAIRE_IMPORTED_STATUS } from './sokoQuestionnaire.js';
import { weddingAnniversaryLabel } from './weddingAnniversaries.js';
import { render, applyPendingFocus, mountDocumentPreviews } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen
import { rememberDirtyFormBaselines } from './dirtyForms.js';
import { templateAgeTextOpen, templateAgeTextsForView, templateTextAges } from './templates.js';
import { citizenDisplayName } from './citizenNames.js';

export const viewTitles = {
  dashboard: "Dashboard",
  citizens: "Jubilare prüfen",
  soko: "Stammdaten: SOKO Mitglieder",
  regions: "Stammdaten: SOKO Straßen & Zuständigkeit",
  map: "SOKO Straßenplan Reinickendorf",
  senders: "Stammdaten: Absender",
  templates: "Stammdaten: Vorlagen",
  documents: "Dokumentlauf",
  weddingAnniversaries: "Hochzeitsjubiläen",
  quittung: "Quittungsdruck",
  quittungStamm: "Stammdaten: Quittung",
  import: "LABO-Import",
  profile: "Mein Zugang",
  users: "Benutzerverwaltung",
  audit: "Änderungen"
};

const templateBackgroundInput = (field, label, hasImage) => {
  const inputId = `template-${field}`;
  return `
    <div class="field template-background-field">
      <label for="${escapeHtml(inputId)}">${escapeHtml(label)}</label>
      <div class="file-action-row">
        <label class="file-picker" for="${escapeHtml(inputId)}">
          <span>Bild auswählen</span>
          <em>${hasImage ? "Hintergrundbild hinterlegt" : "PNG, JPG, WebP oder SVG bis 1,5 MB"}</em>
        </label>
        ${hasImage ? `<button type="button" class="icon-button user-delete-btn" data-action="remove-template-background" data-background-field="${escapeHtml(field)}" title="Hintergrundbild entfernen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>` : ""}
      </div>
      <input id="${escapeHtml(inputId)}" class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-action="upload-template-background" data-background-field="${escapeHtml(field)}">
    </div>
  `;
};

const senderSignatureImageInput = sender => {
  const hasImage = !!sender.signatureImage;
  return `
    <div class="field full template-background-field">
      <label>Unterschriftenbild</label>
      <div class="file-action-row">
        <label class="file-picker" for="sender-signature-image">
          <span>Bild hochladen</span>
          <em>${hasImage ? "Unterschriftenbild hinterlegt" : "PNG, JPG, WebP oder SVG bis 1,5 MB"}</em>
        </label>
        ${hasImage ? `<button type="button" class="icon-button user-delete-btn" data-action="remove-sender-signature-image" title="Unterschriftenbild entfernen" aria-label="Unterschriftenbild entfernen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>` : ""}
        ${hasImage ? `<img class="sender-signature-preview" src="${escapeHtml(sender.signatureImage)}" alt="Aktuelles Unterschriftenbild" style="max-height:42px;max-width:180px;object-fit:contain">` : `<span class="muted">Noch kein Bild hinterlegt</span>`}
      </div>
      <input id="sender-signature-image" class="file-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-action="upload-sender-signature-image">
    </div>
  `;
};

// Beispiel-Jubilarin für die Vorlagen-Vorschau, wenn (noch) kein Jubilar ausgewählt ist.
export const sampleCitizen = { id: "beispiel", salutation: "Frau", firstName: "Erika", lastName: "Mustermann", street: "Musterstraße", houseNo: "12", postalCode: "13437", district: "Tegel", birthDate: "1936-06-15", wish: "Besuch erwünscht" };

const documentPreviewStack = (template, citizen, sender) => {
  const backPreview = documentBackPreview(template, citizen, { sender });
  return `
    <div class="document-preview-stack">
      <div class="document-preview-side">
        <h3>Vorderseite</h3>
        ${documentPreview(template, citizen, sender)}
      </div>
      ${backPreview ? `
        <div class="document-preview-side">
          <h3>Rückseite</h3>
          ${backPreview}
        </div>
      ` : ""}
    </div>
  `;
};

const templateAgeTextFields = template => {
  const ageTexts = templateAgeTextsForView(template);
  return `
    <div class="field full template-age-texts">
      <label>Texte je Alter</label>
      <div class="template-age-text-list">
        ${templateTextAges(template).map(age => `
          <details class="template-age-text"${templateAgeTextOpen(age) ? ' open' : ''}>
            <summary>${age}. Geburtstag</summary>
            <textarea name="_ageText_${age}" data-template-age-text data-age="${age}" placeholder="Leer = Standardtext">${escapeHtml(ageTexts[age] || '')}</textarea>
          </details>
        `).join("")}
      </div>
    </div>
  `;
};

export const authView = () => {
  const logo = `<div class="auth-brand"><img class="auth-logo" src="assets/reinickendorf.jpg" alt="Bezirksamt Reinickendorf von Berlin"><span class="auth-brand-name">Gratulationsdienst Reinickendorf</span></div>`;
  const panel = content => `<section class="auth-panel">${logo}<div class="auth-content">${content}</div></section>`;
  if (!state.auth.ready) return panel(`<h2>Anmeldung wird geprüft</h2><div class="empty-state">Bitte warten...</div>`);
  const notice = state.auth.message ? `<div class="alert">${escapeHtml(state.auth.message)}</div>` : "";
  if (state.auth.setupRequired) return panel(`
      <h2>Ersten Admin-Zugang anlegen</h2>
      ${notice}
      <form id="auth-setup-form" class="form-grid">
        ${field("displayName", "Name", "Administration")}
        ${field("email", "E-Mail", "", "email")}
        ${field("password", "Passwort", "", "password", "full", 'autocomplete="new-password"')}
        <div class="field full"><button type="button" class="primary-button" data-action="auth-setup">Admin anlegen</button></div>
      </form>
  `);
  if (state.auth.mfaTicket) return panel(`
      <h2>Zweiter Faktor</h2>
      ${notice}
      <form id="auth-mfa-form" class="form-grid">
        ${field("code", "Authenticator-Code", "", "text", "full", 'inputmode="numeric" autocomplete="one-time-code"')}
        <div class="field full button-row">
          <button type="button" class="primary-button" data-action="auth-mfa-login">Anmelden</button>
          <button type="button" class="ghost-button" data-action="auth-cancel-mfa">Zurück</button>
        </div>
      </form>
  `);
  if (state.auth.mode === "reset") return panel(`
      <h2>Passwort zurücksetzen</h2>
      ${notice}
      <form id="auth-reset-request-form" class="form-grid">
        ${field("email", "E-Mail", state.auth.pendingEmail ?? "", "email", "full")}
        <div class="field full"><button type="button" class="ghost-button" data-action="auth-reset-request">Reset-Link per E-Mail anfordern</button></div>
      </form>
      <form id="auth-reset-apply-form" class="form-grid">
        ${field("token", "Rücksetz-Token", state.auth.resetToken || "", "text", "full")}
        ${field("password", "Neues Passwort", "", "password", "full", 'autocomplete="new-password"')}
        <div class="field full button-row">
          <button type="button" class="primary-button" data-action="auth-reset-apply">Passwort setzen</button>
          <button type="button" class="ghost-button" data-action="auth-show-login">Zur Anmeldung</button>
        </div>
      </form>
  `);
  return panel(`
      <h2>Anmelden</h2>
      ${notice}
      <form id="auth-login-form" class="form-grid">
        ${field("email", "E-Mail", "", "email", "full", 'autocomplete="username"')}
        ${field("password", "Passwort", "", "password", "full", 'autocomplete="current-password"')}
        <div class="field full button-row">
          <button type="button" class="primary-button" data-action="auth-login">Anmelden</button>
          <button type="button" class="ghost-button" data-action="auth-show-reset">Passwort vergessen</button>
        </div>
      </form>
  `);
};

export const regionAssignmentContent = () => {
  const street = selectedStreet();
  return `
    <h2>Zuordnung</h2>
    <div class="region-panel-scroll">
      ${street ? `
        <form id="street-form" class="form-grid">
          <input type="hidden" name="id" value="${escapeHtml(street.id)}">
          ${field("name", "Straße", street.name)}
          ${field("district", "Ortsteil gesamt", street.district, "text", "", "readonly")}
          ${field("groupId", "SOKO gesamt", streetGroupDisplay(street), "text", "", "readonly")}
          ${streetRuleRows(street)}
          <div class="field full">
            <button type="button" class="ghost-button" data-action="add-street-rule">Abschnitt hinzufügen</button>
          </div>
          <div class="field full">
            <button type="button" class="primary-button" data-action="save-street">Zuordnung speichern</button>
          </div>
        </form>
        <div class="list" style="margin-top:16px">
          ${activeCitizens().filter(citizen => normalize(citizen.street) === normalize(street.name)).map(citizen => `
            <div class="list-item">
              <div><strong>${escapeHtml(citizenDisplayName(citizen))}</strong><span class="muted">${formatDate(citizen.birthDate)}</span></div>
              ${assignmentPill(citizen)}
            </div>
          `).join("") || `<div class="empty-state">Keine Jubilare in dieser Straße</div>`}
        </div>
      ` : `<div class="empty-state">Keine Straße ausgewählt</div>`}
    </div>
  `;
};

export const renderRegionAssignment = () => {
  const element = document.querySelector("#region-assignment-panel");
  if (!element) { render(); return; }
  element.innerHTML = regionAssignmentContent();
  rememberDirtyFormBaselines(element);
  applyPendingFocus();
};

export const citizenDetailContent = citizen => `
  <h2>Jubilar</h2>
  <form id="citizen-form" class="form-grid">
    <input type="hidden" name="id" value="${escapeHtml(citizen.id)}">
    <div class="field full button-row citizen-action-row">
      <button type="button" class="primary-button${(citizen.wish && citizen.wish !== "offen") || citizen.deceased || citizen.moved ? "" : " btn-disabled"}" data-action="save-citizen">Speichern</button>
      ${isPrintedCitizen(citizen) ? `<button type="button" class="ghost-button" data-action="reset-selected-for-reprint">Für Nachdruck auf geprüft setzen</button>` : ""}
    </div>
    ${radioField("wish", "Glückwünsche", citizen.wish, [["per Post", "per Post"], ["Besuch erwünscht", "Besuch erwünscht"], ["keine", "keine"]], "full")}
    ${checkField("pressPublication", "Veröffentlichung in der lokalen Presse", citizen.pressPublication, "full")}
    ${radioField("weddingAnniversary", "Es steht bevor die", citizen.weddingAnniversary ?? "", [
  ["", "—"],
  ["Goldene Hochzeit", "Goldene Hochzeit"],
  ["Diamantene Hochzeit", "Diamantene Hochzeit"],
  ["Eiserne Hochzeit", "Eiserne Hochzeit"],
  ["Gnadenhochzeit", "Gnadenhochzeit"]
], "full")}
    ${field("weddingDate", "am", citizen.weddingDate ?? "", "date", "hochzeit-date-field")}
    ${field("spouseName", "Name des Ehegatten", citizen.spouseName ?? "", "text", "hochzeit-spouse-field")}
    ${textField("notes", "Notiz", citizen.notes, "full notes-field")}
    <section class="citizen-personal-section full">
      <h3>Persönliche Daten</h3>
      <div class="form-grid">
        ${selectField("salutation", "Anrede", citizen.salutation, [["Frau", "Frau"], ["Herr", "Herr"]])}
        ${field('doctoralDegree', 'Dr.-Grad', citizen.doctoralDegree)}
        ${field("firstName", "Vorname", citizen.firstName)}
        ${field("lastName", "Nachname", citizen.lastName)}
        ${field("birthDate", "Geburtsdatum", citizen.birthDate, "date")}
        ${field("street", "Straße", citizen.street)}
        ${field("houseNo", "Hausnummer", citizen.houseNo)}
        ${postalCodeField("postalCode", "PLZ", citizen.postalCode)}
        ${field("district", "Ortsteil", citizen.district)}
        ${checkField('deceased', 'Verstorben', citizen.deceased)}
        ${checkField('moved', 'Verzogen', citizen.moved)}
      </div>
    </section>
  </form>
`;

const sokoQuestionnaireImages = citizen => Array.isArray(citizen?.sokoQuestionnaireImages)
  ? citizen.sokoQuestionnaireImages.filter(item => item?.image)
  : [];
const citizenQuestionnaireImagesContent = citizen => `
  <h2>Fragebogen</h2>
  <div class="citizen-questionnaire-scroll">
    ${sokoQuestionnaireImages(citizen).length ? sokoQuestionnaireImages(citizen).map((item, index) => `
      <figure class="citizen-questionnaire-image">
        <img src="${escapeHtml(item.image)}" alt="SOKO-Fragebogen ${index + 1}">
      </figure>
    `).join("") : `<div class="empty-state citizen-questionnaire-empty">Kein Fragebogen geladen</div>`}
  </div>
`;
const renderCitizenQuestionnaireImages = citizen => {
  const panel = document.querySelector("#citizen-questionnaire-panel");
  const split = document.querySelector(".citizen-split");
  const detailSplit = document.querySelector(".citizen-detail-split");
  let splitter = document.querySelector(".citizen-detail-splitter");
  const showQuestionnairePanel = Boolean(citizen);
  split?.classList.toggle("has-questionnaire-images", showQuestionnairePanel);
  detailSplit?.classList.toggle("has-questionnaire-images", showQuestionnairePanel);
  if (showQuestionnairePanel && detailSplit && panel && !splitter) {
    splitter = document.createElement("div");
    splitter.className = "vertical-splitter citizen-detail-splitter";
    splitter.dataset.splitter = "citizenDetail";
    splitter.setAttribute("role", "separator");
    splitter.setAttribute("aria-orientation", "vertical");
    splitter.setAttribute("aria-label", "Fragebogen und Jubilar aufteilen");
    splitter.setAttribute("aria-valuemin", "25");
    splitter.setAttribute("aria-valuemax", "55");
    splitter.setAttribute("aria-valuenow", String(state.citizenDetailSplit));
    splitter.tabIndex = 0;
    panel.after(splitter);
  }
  if (splitter) splitter.hidden = !showQuestionnairePanel;
  if (!panel) return;
  panel.hidden = !showQuestionnairePanel;
  panel.innerHTML = showQuestionnairePanel ? citizenQuestionnaireImagesContent(citizen) : "";
};

export const renderCitizenDetail = () => {
  const element = document.querySelector("#citizen-detail-panel");
  const citizens = filteredCitizens();
  const citizen = citizens.find(item => item.id === state.selectedCitizenId) || citizens[0];
  if (!element || !citizen) { render(); return; }
  renderCitizenQuestionnaireImages(citizen);
  element.innerHTML = citizenDetailContent(citizen);
  rememberDirtyFormBaselines(element);
  applyPendingFocus();
};

export const memberDetailContent = member => member ? `
  <form id="member-form" class="member-form">
    <input type="hidden" name="id" value="${escapeHtml(member.id)}">
    <div class="member-tabs">
      <input id="member-tab-basic" class="member-tab-control" type="radio" name="_memberTab" checked>
      <input id="member-tab-contact" class="member-tab-control" type="radio" name="_memberTab">
      <input id="member-tab-billing" class="member-tab-control" type="radio" name="_memberTab">
      <input id="member-tab-notes" class="member-tab-control" type="radio" name="_memberTab">
      <div class="member-tab-list" role="tablist" aria-label="SOKO-Mitglied erfassen">
        <label class="member-tab" for="member-tab-basic" role="tab">Basis</label>
        <label class="member-tab" for="member-tab-contact" role="tab">Kontakt</label>
        <label class="member-tab" for="member-tab-billing" role="tab">Abrechnung</label>
        <label class="member-tab" for="member-tab-notes" role="tab">Notizen</label>
      </div>
      <section class="member-tab-panel member-tab-basic-panel form-grid" role="tabpanel">
        ${selectField("salutation", "Anrede", member.salutation, [["Frau", "Frau"], ["Herr", "Herr"]], "", "required")}
        ${field("firstName", "Vorname", member.firstName, "text", "", "required")}
        ${field("lastName", "Nachname", member.lastName, "text", "", "required")}
        ${field("birthDate", "Geburtsdatum", member.birthDate, "date")}
        ${selectField("groupId", "SOKO", member.groupId, sokoSelectOptions(), "full", "required")}
        <div class="member-term-row">
          ${field("termFrom", "Berufung von", member.termFrom, "date", "", "required")}
          ${field("termTo", "Berufung bis", member.termTo, "date", "", "required")}
        </div>
        ${selectField("isLeader", "Rolle", String(member.isLeader), [["false", "Mitglied"], ["true", "Leitung"]], "full")}
      </section>
      <section class="member-tab-panel member-tab-contact-panel form-grid" role="tabpanel">
        ${field("street", "Straße", member.street, "text", "full")}
        ${postalCodeField("postalCode", "PLZ", member.postalCode)}
        ${field("city", "Ort", member.city)}
        ${field("phone", "Telefon", member.phone)}
        ${field("mobile", "Mobilfunk", member.mobile)}
        ${emailField("email", "E-Mail", member.email)}
      </section>
      <section class="member-tab-panel member-tab-billing-panel form-grid" role="tabpanel">
        <div class="member-bank-row">
          ${ibanField("bank", "Bankverbindung / IBAN", member.bank)}
          ${field("accountHolder", "Kontoinhaber", member.accountHolder)}
        </div>
        ${field("allowance", "Aufwandspauschale", member.allowance, "text", "", 'inputmode="decimal" data-amount-field')}
        ${field("billingAmount", "Abrechnungsbetrag", member.billingAmount, "text", "", 'inputmode="decimal" data-amount-field')}
        ${field("zpNr", "Zahlungspartner-Nummer", member.zpNr)}
        ${field("kassenzeichen", "Kassenzeichen", member.kassenzeichen)}
      </section>
      <section class="member-tab-panel member-tab-notes-panel form-grid" role="tabpanel">
        ${field("misc", "Sonstiges", member.misc, "text", "full")}
        ${textField("note", "Bemerkung", member.note, "full")}
      </section>
    </div>
    <div class="field full button-row member-form-actions">
      <button type="button" class="primary-button" data-action="save-member">Speichern</button>
      <button type="button" class="ghost-button danger-button" data-action="delete-member">Löschen</button>
    </div>
  </form>
` : `<div class="empty-state">Kein Mitglied ausgewählt</div>`;

export const renderMemberDetail = () => {
  const element = document.querySelector("#member-detail-panel");
  if (!element) { render(); return; }
  element.innerHTML = memberDetailContent(selectedMember());
  rememberDirtyFormBaselines(element);
  applyPendingFocus();
};

const selectedMonthLabel = () => months.find(([value]) => value === state.filters.month)?.[1] || "Alle Monate";
const selectedMonthSuffix = () => state.filters.month === "alle" ? "in allen Monaten" : `im ${selectedMonthLabel()}`;
const isQuestionnaireReturned = citizen => isCheckedCitizen(citizen);
const dashboardCitizens = () => activeCitizens().filter(citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month);
const dashboardRows = () => {
  const citizensByGroup = dashboardCitizens().reduce((map, citizen) => {
    const groupId = groupForCitizen(citizen)?.id;
    if (!groupId) return map;
    if (!map.has(groupId)) map.set(groupId, []);
    map.get(groupId).push(citizen);
    return map;
  }, new Map());
  return state.data.sokoGroups.map(group => {
    const citizens = citizensByGroup.get(group.id) || [];
    const returns = citizens.filter(isQuestionnaireReturned).length;
    const members = state.data.sokoMembers.filter(member => member.groupId === group.id).length;
    const rate = citizens.length ? Math.round((returns / citizens.length) * 100) : 0;
    return { group, members, citizens: citizens.length, returns, open: citizens.length - returns, rate };
  });
};
const groupedQuittungEntries = entries => entries.reduce((map, { citizen, group }) => {
  if (!map.has(group.id)) map.set(group.id, { group, citizens: [] });
  map.get(group.id).citizens.push(citizen);
  return map;
}, new Map());
const reviewQuittungEntriesByGroup = entries => entries.reduce((map, { citizen, group }) => {
  if (!map.has(group.id)) map.set(group.id, []);
  map.get(group.id).push(citizen);
  return map;
}, new Map());
const ageDistribution = citizens => {
  const counts = citizens.reduce((acc, citizen) => {
    const age = calculateAge(citizen.birthDate);
    if (Number.isFinite(age) && (age === 85 || age >= 90)) acc.set(age, (acc.get(age) || 0) + 1);
    return acc;
  }, new Map());
  const maxAge = Math.max(0, ...counts.keys());
  const ages = [
    ...(counts.has(85) ? [85] : []),
    ...Array.from({ length: Math.max(0, maxAge - 89) }, (_, index) => index + 90)
  ];
  return ages.map(age => ({ age, count: counts.get(age) || 0 }));
};
const ageLabel = age => age === 85 || age % 5 === 0 ? age : "";
const ageDistributionChart = citizens => {
  const groups = ageDistribution(citizens);
  const max = Math.max(1, ...groups.map(group => group.count));
  const chartItems = groups.flatMap(group => group.age === 85 ? [group, { spacer: true }] : [group]);
  const labels = chartItems
    .map((group, index) => ({ label: group.spacer ? "" : ageLabel(group.age), column: index + 1 }))
    .filter(item => item.label);
  return `
    <div class="age-card-body">
      ${groups.length ? `<div class="age-histogram" style="--age-count:${chartItems.length}" role="img" aria-label="Altersverteilung nach Jahren">
        <div class="age-bars">
          ${chartItems.map(group => group.spacer ? `<div class="age-bin age-spacer" aria-hidden="true"></div>` : `
          <div class="age-bin" title="${group.age} Jahre: ${group.count}">
            <div class="age-bar" style="height:${Math.max(8, Math.round((group.count / max) * 100))}%"></div>
          </div>
        `).join("")}
        </div>
        <div class="age-axis">
          ${labels.map(item => `<span style="grid-column:${item.column}">${item.label}</span>`).join("")}
        </div>
      </div>` : `<div class="empty-state compact">Keine Jubilare</div>`}
    </div>
  `;
};
const genderDistribution = citizens => citizens.reduce((counts, citizen) => {
  const salutation = normalize(citizen.salutation);
  counts[genderKey(salutation)] += 1;
  return counts;
}, { female: 0, male: 0, unknown: 0 });
const genderKey = salutation => {
  if (salutation === "frau") return "female";
  if (salutation === "herr") return "male";
  return "unknown";
};
const genderDistributionChart = citizens => {
  const counts = genderDistribution(citizens);
  const total = counts.female + counts.male + counts.unknown;
  const items = [
    { key: "female", label: "Frauen", value: counts.female, tone: "female" },
    { key: "male", label: "Männer", value: counts.male, tone: "male" },
    ...(counts.unknown ? [{ key: "unknown", label: "Unklar", value: counts.unknown, tone: "unknown" }] : [])
  ];
  return `
    <div class="gender-bars" aria-label="Statistik nach Geschlecht">
      ${items.map(item => `
        <div class="gender-row ${item.tone}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${item.value.toLocaleString("de-DE")}</strong>
          <i><b style="width:${total ? Math.round((item.value / total) * 100) : 0}%"></b></i>
        </div>
      `).join("")}
    </div>
  `;
};
const dashboardSortValue = (row, key) => {
  if (key === "group") return row.group.id;
  return Number(row[key] ?? 0);
};
const sortedDashboardRows = rows => {
  const { key = "group", dir = "asc" } = state.dashboardSort || {};
  const direction = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const aValue = dashboardSortValue(a, key);
    const bValue = dashboardSortValue(b, key);
    const result = typeof aValue === "string" ? aValue.localeCompare(bValue) : aValue - bValue;
    return result ? result * direction : a.group.id.localeCompare(b.group.id);
  });
};
const dashboardSortButton = (key, label) => {
  const active = state.dashboardSort?.key === key;
  const dir = state.dashboardSort?.dir === "asc" ? "asc" : "desc";
  const icon = active ? { asc: "▲", desc: "▼" }[dir] : "↕";
  return `<button type="button" class="table-sort ${active ? "active" : ""}" data-action="sort-dashboard" data-sort-key="${key}">${escapeHtml(label)}<span>${icon}</span></button>`;
};
const rateTone = rate => {
  if (rate >= 80) return "green";
  if (rate >= 50) return "gold";
  return "red";
};
const userPillTone = user => {
  if (!user.active) return "red";
  return user.role === "admin" ? "green" : "";
};
const canDeleteUser = user => Boolean(user.id.localeCompare(state.auth.user?.id || ""));
const personDisplayName = person => `${person.firstName} ${person.lastName}`;
const sokoMemberRows = members => members.length
  ? members.map(m => `<div>${escapeHtml(personDisplayName(m))}${m.isLeader ? " <em>(Ltg.)</em>" : ""}</div>`).join("")
  : `<div class="muted">Keine Mitglieder</div>`;
const sokoCitizenRows = citizens => citizens.length
  ? citizens.map(c => `<div>${escapeHtml(citizenDisplayName(c))} <span class="muted">(${calculateAge(c.birthDate)})</span></div>`).join("")
  : `<div class="muted">Keine Jubilare</div>`;
const sokoPeopleInfoHtml = (members, citizens, monthLabel) => {
  if (!state.showMapPeople) return "";
  return `
    <div class="map-info-box">
      <strong>Mitglieder</strong>
      ${sokoMemberRows(members)}
    </div>
    <div class="map-info-box">
      <strong>Jubilare ${escapeHtml(monthLabel)}</strong>
      ${sokoCitizenRows(citizens)}
    </div>
  `;
};
let mapInfoCache = null;
const buildMapInfoCache = () => {
  const addrCounts = Object.fromEntries(Object.entries(mapAddressPointGroups()).map(([groupId, addresses]) => [groupId, addresses.length]));
  const segCounts = mapSegmentCounts();
  if (!state.showMapPeople) return { addrCounts, segCounts, membersByGroup: {}, citizensByGroup: {}, monthLabel: "" };
  const membersByGroup = state.data.sokoMembers.reduce((groups, member) => {
    if (!member.groupId) return groups;
    (groups[member.groupId] ||= []).push(member);
    return groups;
  }, {});
  Object.values(membersByGroup).forEach(members => members.sort((a, b) => b.isLeader - a.isLeader));
  const citizensByGroup = activeCitizens().reduce((groups, citizen) => {
    if (state.filters.month !== "alle" && citizen.birthDate?.slice(5, 7) !== state.filters.month) return groups;
    const groupId = groupForCitizen(citizen)?.id;
    if (!groupId) return groups;
    (groups[groupId] ||= []).push(citizen);
    return groups;
  }, {});
  const monthLabel = months.find(([v]) => v === state.filters.month)?.[1] || state.filters.month;
  return { addrCounts, segCounts, membersByGroup, citizensByGroup, monthLabel };
};
export const refreshMapInfoCache = () => mapInfoCache = buildMapInfoCache();
const mapInfoCacheForHover = () => mapInfoCache || refreshMapInfoCache();
const mapInfoHint = `<p class="map-soko-hint muted">Über eine SOKO auf der Karte fahren</p>`;
const mapInfoPanelHtml = (groupId, streetName, { members, citizens, monthLabel, addrCount, segCount }) => {
  const group = state.data.sokoGroups.find(g => g.id === groupId);
  const color = sokoColors[groupId] || sokoColors.offen;
  return `
    <div class="map-info-header">
      <span class="map-info-swatch" style="background:${escapeHtml(color)}"></span>
      <div>
        <h3>${escapeHtml(groupId)}</h3>
        ${group?.region ? `<div class="muted" style="font-size:13px">${escapeHtml(group.region.split(" - ")[0])}</div>` : ""}
      </div>
    </div>
    ${streetName ? `<div class="map-info-street">${escapeHtml(streetName)}</div>` : ""}
    <div class="map-info-stats">
      <span>${addrCount.toLocaleString("de-DE")} Adressen</span>
      <span>${segCount.toLocaleString("de-DE")} Straßenabschnitte</span>
    </div>
    ${sokoPeopleInfoHtml(members, citizens, monthLabel)}
  `;
};
export const mapHoverInfoHtml = (groupId, streetName = "") => {
  if (!groupId || groupId === "offen") return mapInfoHint;
  const cache = mapInfoCacheForHover();
  return mapInfoPanelHtml(groupId, streetName, {
    members: cache.membersByGroup[groupId] || [],
    citizens: cache.citizensByGroup[groupId] || [],
    monthLabel: cache.monthLabel,
    addrCount: cache.addrCounts[groupId] || 0,
    segCount: cache.segCounts[groupId] || 0
  });
};
const citizenDetailSplitHtml = (citizen, showQuestionnairePanel, citizenSplit) => {
  if (!citizen) return "";
  const citizenSplitterMin = showQuestionnairePanel ? 24 : 20;
  const citizenSplitterMax = showQuestionnairePanel ? 34 : 80;
  const citizenDetailClass = showQuestionnairePanel ? "citizen-detail-split has-questionnaire-images" : "citizen-detail-split";
  return `<div class="vertical-splitter" data-splitter="citizen" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="${citizenSplitterMin}" aria-valuemax="${citizenSplitterMax}" aria-valuenow="${citizenSplit}" tabindex="0"></div>
        <div class="${citizenDetailClass}" data-split="citizenDetail" style="--citizenDetail-left:${state.citizenDetailSplit}%">
          <section class="panel citizen-panel citizen-questionnaire-panel" id="citizen-questionnaire-panel">
            ${citizenQuestionnaireImagesContent(citizen)}
          </section>
          <div class="vertical-splitter citizen-detail-splitter" data-splitter="citizenDetail" role="separator" aria-orientation="vertical" aria-label="Fragebogen und Jubilar aufteilen" aria-valuemin="25" aria-valuemax="55" aria-valuenow="${state.citizenDetailSplit}" tabindex="0"></div>
          <section class="panel citizen-panel" id="citizen-detail-panel">
            ${citizenDetailContent(citizen)}
          </section>
        </div>`;
};
const unfinishedReceiptGroupLabel = item => `${escapeHtml(item.group.id)} (${item.uncheckedCount} offen)`;
const unfinishedReceiptGroupsAlert = unfinishedGroups => {
  if (!unfinishedGroups.length) return "";
  const labels = unfinishedGroups.map(unfinishedReceiptGroupLabel).join(", ");
  return `<div class="alert" style="margin-top:12px">Quittungsdruck ist pro SOKO möglich, sobald dort alle Jubilare für diesen Monat geprüft sind. Noch nicht fertig: ${labels}</div>`;
};
const receiptStatusPill = (canPrint, uncheckedCount) => {
  if (canPrint) return `<span class="pill green">fertig</span>`;
  return `<span class="pill gold">${uncheckedCount} offen</span>`;
};
export const sokoMapInfoHtml = (groupId, streetName = "") => {
  if (!groupId || groupId === "offen") return mapInfoHint;
  return mapInfoPanelHtml(groupId, streetName, {
    members: state.data.sokoMembers.filter(m => m.groupId === groupId).sort((a, b) => b.isLeader - a.isLeader),
    citizens: activeCitizens().filter(c => groupForCitizen(c)?.id === groupId && (state.filters.month === "alle" || c.birthDate?.slice(5, 7) === state.filters.month)),
    monthLabel: months.find(([v]) => v === state.filters.month)?.[1] || state.filters.month,
    addrCount: (mapAddressPointGroups()[groupId] || []).length,
    segCount: mapSegmentCounts()[groupId] || 0
  });
};

const auditActionLabels = {
  CREATE: "Angelegt",
  UPDATE: "Geändert",
  DELETE: "Gelöscht"
};
const auditCollectionLabels = {
  citizens: "Jubilar",
  sokoGroups: "SOKO",
  sokoMembers: "SOKO-Mitglied",
  streets: "Straßenzuordnung"
};
const auditFieldLabels = {
  firstName: "Vorname",
  lastName: "Nachname",
  salutation: "Anrede",
  street: "Straße",
  houseNo: "Hausnummer",
  postalCode: "PLZ",
  district: "Ortsteil",
  birthDate: "Geburtsdatum",
  phone: "Telefon",
  email: "E-Mail",
  wish: "Wunsch",
  deceased: 'Verstorben',
  moved: 'Verzogen',
  notes: "Notiz",
  status: "Status",
  groupId: "SOKO",
  name: "Name",
  region: "Region",
  leaderId: "Leitung",
  rules: "Regeln",
  area: "Bereich",
  isLeader: "Leitung",
  termFrom: "Berufung von",
  termTo: "Berufung bis",
  bank: "Bankverbindung",
  allowance: "Aufwandsentschädigung",
  billingAmount: "Abrechnung"
};
const auditIgnoredFields = new Set(["_version", "createdAt"]);
const auditValue = value => {
  if (value === null || value === undefined || value === "") return "leer";
  if (typeof value === "boolean") return value ? "ja" : "nein";
  if (Array.isArray(value)) return `${value.length.toLocaleString("de-DE")} Einträge`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const auditChangeRows = entry => {
  const before = entry.beforeJson && typeof entry.beforeJson === "object" ? entry.beforeJson : {};
  const after = entry.afterJson && typeof entry.afterJson === "object" ? entry.afterJson : {};
  if (entry.action === "CREATE") return `<div class="audit-change-row"><strong>Datensatz</strong><span>neu angelegt</span></div>`;
  if (entry.action === "DELETE") return `<div class="audit-change-row"><strong>Datensatz</strong><span>gelöscht</span></div>`;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(key => !auditIgnoredFields.has(key))
    .filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
  return keys.map(key => `
    <div class="audit-change-row">
      <strong>${escapeHtml(auditFieldLabels[key] || key)}</strong>
      <span>${escapeHtml(auditValue(before[key]))} → ${escapeHtml(auditValue(after[key]))}</span>
    </div>
  `).join("");
};
const hasVisibleAuditChanges = entry => Boolean(auditChangeRows(entry));
const auditJson = value => value && typeof value === "object" ? escapeHtml(JSON.stringify(value, null, 2)) : "";
const auditDetails = entry => {
  const before = auditJson(entry.beforeJson);
  const after = auditJson(entry.afterJson);
  return `
    <div class="audit-details">
      ${before ? `<div><h3>Vorher</h3><pre>${before}</pre></div>` : ""}
      ${after ? `<div><h3>Nachher</h3><pre>${after}</pre></div>` : ""}
      ${!before && !after ? `<p class="muted">Keine Snapshot-Daten gespeichert.</p>` : ""}
    </div>
  `;
};

export const documentPreviewContent = () => {
  const template = selectedTemplate();
  const sender = selectedSender();
  const docs = state.generatedDocs;
  const previewDoc = docs.find(doc => doc.citizenId === state.selectedCitizenId) || docs[0];
  const previewCitizen = previewDoc ? byId(state.data.citizens, previewDoc.citizenId) : filteredCitizens().find(c => isCheckedCitizen(c) && c.status !== "gedruckt") || selectedCitizen();
  const previewTemplate = previewDoc ? byId(state.data.templates, previewDoc.templateId) || template : template;
  const printablePreviewTemplate = state.printBackground ? previewTemplate : { ...previewTemplate, backgroundImage: "", backBackgroundImage: "" };
  const previewSender = previewDoc ? byId(state.data.senders, previewDoc.senderId) || sender : sender;
  return docs.length ? documentPreviewStack(printablePreviewTemplate, previewCitizen, previewSender) : `<div class="empty-state">Kein Dokument ausgewählt</div>`;
};

export const renderDocumentPreview = () => {
  const element = document.querySelector("#document-preview-panel");
  if (!element) { render(); return; }
  element.innerHTML = documentPreviewContent();
  mountDocumentPreviews();
  applyPendingFocus();
};

export const views = {
  audit: () => {
    const entries = (state.audit || []).filter(hasVisibleAuditChanges);
    return `
      <div class="toolbar">
        <label class="inline-field">Zeitraum
          <input type="number" min="1" max="365" step="1" value="${escapeHtml(state.auditDays || 5)}" data-action="set-audit-days">
          Tage
        </label>
        <button type="button" class="ghost-button" data-action="load-audit">Aktualisieren</button>
      </div>
      <section class="panel">
        <h2>Änderungen</h2>
        <p class="muted">Protokolliert werden Änderungen an Jubilaren, SOKOs, SOKO-Mitgliedern und Straßenzuordnungen.</p>
        <div class="list">
          ${entries.map(entry => `
            <div class="list-item-row audit-entry">
              <div class="list-item-main">
                <strong>${escapeHtml(auditActionLabels[entry.action] || entry.action)} · ${escapeHtml(auditCollectionLabels[entry.collection] || entry.collection)} / ${escapeHtml(entry.recordId)}</strong>
                <span class="muted">${escapeHtml(entry.occurredAt)} · ${escapeHtml(entry.actorEmail || "unbekannt")} · Hash ${escapeHtml(String(entry.entryHash || "").slice(0, 12))}</span>
              </div>
              <div class="audit-change-list">${auditChangeRows(entry)}</div>
              <details class="audit-raw">
                <summary>Technische Details</summary>
                ${auditDetails(entry)}
              </details>
            </div>
          `).join("") || `<div class="empty-state">Noch keine Änderungen protokolliert.</div>`}
        </div>
      </section>
    `;
  },
  dashboard: () => {
    const rows = dashboardRows();
    const citizens = dashboardCitizens();
    const totals = rows.reduce((acc, row) => ({
      members: acc.members + row.members,
      citizens: acc.citizens + row.citizens,
      returns: acc.returns + row.returns,
      open: acc.open + row.open
    }), { members: 0, citizens: 0, returns: 0, open: 0 });
    const maxMembers = Math.max(1, ...rows.map(row => row.members));
    const maxCitizens = Math.max(1, ...rows.map(row => row.citizens));
    const topRows = rows
      .filter(row => row.members || row.citizens)
      .sort((a, b) => b.citizens - a.citizens || a.group.id.localeCompare(b.group.id));
    const tableRows = sortedDashboardRows(topRows);
    return `
      <div class="dashboard">
        <div class="toolbar dashboard-toolbar">
          <span class="toolbar-label">Ausgewählter Monat</span>
          <select name="month" data-filter>${months.map(month => `<option value="${month[0]}" ${state.filters.month === month[0] ? "selected" : ""}>${month[1]}</option>`).join("")}</select>
        </div>
        <div class="dashboard-metrics">
          <article class="metric-card accent-gold">
            <span>Bearbeitet ${escapeHtml(selectedMonthSuffix())}</span>
            <strong>${totals.returns.toLocaleString("de-DE")} von ${totals.citizens.toLocaleString("de-DE")}</strong>
            <em>bearbeitet</em>
          </article>
          <article class="metric-card accent-green">
            <span>Bearbeitungsquote ${escapeHtml(selectedMonthSuffix())}</span>
            <strong>${totals.citizens ? Math.round((totals.returns / totals.citizens) * 100) : 0}%</strong>
            <em>bearbeitet</em>
          </article>
          <article class="metric-card age-card">
            <span>Altersverteilung</span>
            ${ageDistributionChart(citizens)}
          </article>
          <article class="metric-card gender-card">
            <span>Geschlecht</span>
            ${genderDistributionChart(citizens)}
          </article>
          <article class="metric-card accent-teal">
            <span>SOKO-Gruppen</span>
            <strong>${rows.length.toLocaleString("de-DE")}</strong>
            <em>aktive Zuständigkeiten</em>
          </article>
          <article class="metric-card accent-blue">
            <span>Mitglieder</span>
            <strong>${totals.members.toLocaleString("de-DE")}</strong>
            <em>über alle SOKO</em>
          </article>
        </div>
        <section class="panel dashboard-panel">
          <div class="section-head">
            <div>
              <h2>SOKO Statistiken</h2>
              <p>${escapeHtml(selectedMonthLabel())}: Jubilare und bearbeitete Fragebögen je SOKO</p>
            </div>
            <span class="pill ${totals.open ? "gold" : "green"}">${totals.open.toLocaleString("de-DE")} offen</span>
          </div>
          ${topRows.length ? `
            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>${dashboardSortButton("group", "SOKO")}</th>
                    <th>${dashboardSortButton("members", "Mitglieder")}</th>
                    <th>${dashboardSortButton("citizens", "Jubilare")}</th>
                    <th>${dashboardSortButton("returns", "Bearbeitet")}</th>
                    <th>${dashboardSortButton("rate", "Quote")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows.map(row => `
                    <tr>
                      <td>
                        <div class="soko-cell">
                          <span class="soko-swatch" style="background:${escapeHtml(sokoColors[row.group.id] || sokoColors.offen)}"></span>
                          <div class="soko-line"><strong>${escapeHtml(row.group.id)}</strong><span>${escapeHtml(row.group.region || row.group.name)}</span></div>
                        </div>
                      </td>
                      <td>
                        <div class="bar-cell">
                          <strong>${row.members.toLocaleString("de-DE")}</strong>
                          <span class="stat-bar members"><i style="width:${Math.round((row.members / maxMembers) * 100)}%"></i></span>
                        </div>
                      </td>
                      <td>
                        <div class="bar-cell">
                          <strong>${row.citizens.toLocaleString("de-DE")}</strong>
                          <span class="stat-bar"><i style="width:${Math.round((row.citizens / maxCitizens) * 100)}%"></i></span>
                        </div>
                      </td>
                      <td>${row.returns.toLocaleString("de-DE")} <span class="muted">/ ${row.open.toLocaleString("de-DE")} offen</span></td>
                      <td><span class="pill ${rateTone(row.rate)}">${row.rate}%</span></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty-state">Keine SOKO-Statistiken für diesen Monat</div>`}
        </section>
      </div>
    `;
  },

  citizens: () => {
    const citizens = filteredCitizens();
    const citizen = citizens.find(item => item.id === state.selectedCitizenId) || citizens[0];
    const showQuestionnairePanel = Boolean(citizen);
    const citizenSplit = showQuestionnairePanel ? Math.min(state.citizenSplit, 34) : state.citizenSplit;
    const citizenSplitClass = showQuestionnairePanel ? "citizen-split has-questionnaire-images" : "citizen-split";
    const citizenContainerClass = citizen ? citizenSplitClass : "";
    const citizenContainerStyle = citizen ? `style="--citizen-left:${citizenSplit}%"` : "";
    return `
      <div class="toolbar">
        <select name="month" data-filter>${months.map(month => `<option value="${month[0]}" ${state.filters.month === month[0] ? "selected" : ""}>${month[1]}</option>`).join("")}</select>
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <select name="age" data-filter>
          ${[["alle", "Alle Alter"], ["85", "85 Jahre"], ["90plus", "90+"], ["100", "100+"]].map(option => `<option value="${option[0]}" ${state.filters.age === option[0] ? "selected" : ""}>${option[1]}</option>`).join("")}
        </select>
        <select name="status" data-filter>
          ${[["alle", "Alle Status"], ["offen", "offen"], ["importiert", "importiert"], ["geprüft", "geprüft"], [SOKO_QUESTIONNAIRE_IMPORTED_STATUS, SOKO_QUESTIONNAIRE_IMPORTED_STATUS], ["gedruckt", "gedruckt"]].map(option => `<option value="${option[0]}" ${state.filters.status === option[0] ? "selected" : ""}>${option[1]}</option>`).join("")}
        </select>
        <div class="file-action-row soko-pdf-action-row">
          <div class="file-picker import-file-picker soko-questionnaire-picker">
            <button type="button" class="primary-button test-action-button" data-action="simulate-soko-pdf-import">Simuliere Fragebögen laden</button>
            <button type="button" class="ghost-button test-action-button" data-action="download-soko-pdf-simulation">Fragebögen-PDF herunterladen</button>
            <label class="soko-questionnaire-load" for="soko-pdf-file"><span>Fragebögen laden</span><em>Gescannte Fragebögen</em></label>
          </div>
          <input id="soko-pdf-file" class="file-input" type="file" accept=".pdf,application/pdf">
        </div>
      </div>
      <div class="${citizenContainerClass}" ${citizenContainerStyle}>
        <section class="panel citizen-panel">
          <h2>Jubilare</h2>
          <div class="citizen-panel-scroll citizen-grid-scroll">${gridHost("citizens")}</div>
        </section>
        ${citizenDetailSplitHtml(citizen, showQuestionnairePanel, citizenSplit)}
      </div>
    `;
  },

  soko: () => {
    return `
      <div class="toolbar">
        <input name="q" data-filter placeholder="Suche" value="${escapeHtml(state.filters.q)}">
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <button type="button" class="ghost-button" data-action="new-member">Neues Mitglied</button>
        <button type="button" class="ghost-button" data-action="export-soko">CSV Export</button>
        <button type="button" class="ghost-button danger-button" data-action="reset-soko-members">Testdaten zurücksetzen</button>
      </div>
      <div class="soko-split" style="--soko-left:${state.sokoSplit}%">
        <section class="panel template-panel">
          <h2>Mitglieder und Leitungen</h2>
          <div class="soko-grid-scroll">${gridHost("members", 500)}</div>
        </section>
        <div class="vertical-splitter" data-splitter="soko" role="separator" aria-orientation="vertical" aria-label="Mitgliederliste und Erfassung aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.sokoSplit}" tabindex="0"></div>
        <section class="panel template-panel">
          <h2>Erfassungsmaske</h2>
          <div id="member-detail-panel" class="template-panel-scroll">${memberDetailContent(selectedMember())}</div>
        </section>
      </div>
    `;
  },

  regions: () => {
    const street = selectedStreet();
    const unassigned = state.data.streets.filter(item => !item.rules?.some(rule => rule.soko));
    const regionClass = street ? "region-split" : "grid two";
    const regionStyle = street ? `style="--region-left:${state.regionSplit}%"` : "";
    const regionSplitter = street ? `<div class="vertical-splitter" data-splitter="region" role="separator" aria-orientation="vertical" aria-label="Straßenverzeichnis und Zuordnung aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.regionSplit}" tabindex="0"></div>` : "";
    return `
      <div class="${regionClass}" ${regionStyle}>
        <section class="panel region-panel">
          <h2>Straßenverzeichnis</h2>
          ${unassigned.length ? `<div class="alert">${unassigned.length} Straße ohne SOKO-Zuordnung</div>` : ""}
          <div class="region-panel-scroll region-grid-scroll">${gridHost("streets", 500)}</div>
        </section>
        ${regionSplitter}
        <section class="panel region-panel" id="region-assignment-panel">
          ${regionAssignmentContent()}
        </section>
      </div>
    `;
  },

  map: () => {
    if (!mapDataLoaded()) {
      ensureMapData().then(() => { if (state.view === "map") render(); });
      return `<div class="panel map-main-panel"><div class="empty-state">Kartendaten werden geladen…</div></div>`;
    }
    refreshMapInfoCache();
    const segCounts = mapSegmentCounts();
    const addrCounts = Object.fromEntries(Object.entries(mapAddressPointGroups()).map(([g, a]) => [g, a.length]));
    return `
      <div class="panel map-main-panel">
        <div class="map-shell-wrapper">
          <div class="map-shell-column">
            <div class="map-shell">${streetMapSvg()}</div>
            <p class="map-attribution">Kartendaten © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende</p>
          </div>
          <aside class="map-side-panel">
            <div class="map-month-row">
              <label for="map-month-select">Monat</label>
              <select id="map-month-select" name="month" data-filter>
                ${months.map(([v, l]) => `<option value="${v}"${state.filters.month === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("")}
              </select>
            </div>
            <label class="toggle-label map-people-toggle">
              <input type="checkbox" class="toggle" data-action="toggle-map-people" ${state.showMapPeople ? "checked" : ""}>
              Personendaten
            </label>
            <div id="map-soko-info">${sokoMapInfoHtml("")}</div>
          </aside>
        </div>
        <div class="map-legend">
          ${state.data.sokoGroups.map(group => {
      const district = group.region.split(" - ")[0];
      return `<div class="legend-item">
              <span style="background:${escapeHtml(sokoColors[group.id])}"></span>
              <div class="legend-item-body">
                <strong>${escapeHtml(group.id)}</strong>
                <em>${escapeHtml(district)}</em>
                <small>${(addrCounts[group.id] || 0).toLocaleString("de-DE")} Adr. &middot; ${(segCounts[group.id] || 0).toLocaleString("de-DE")} Abschn.</small>
              </div>
            </div>`;
    }).join("")}
        </div>
      </div>
    `;
  },

  senders: () => {
    const sender = selectedSender();
    return `
      <div class="sender-split" style="--sender-left:${state.senderSplit}%">
        <section class="panel template-panel">
          <h2>Profile</h2>
          <div class="template-panel-scroll">
            <div class="list">
              ${state.data.senders.map(item => `
                <button type="button" class="list-item" data-action="select-sender" data-id="${escapeHtml(item.id)}">
                  <div><strong>${escapeHtml(item.role)}</strong><span class="muted">${escapeHtml(item.department)}</span></div>
                  <span class="pill" style="background:${escapeHtml(item.color)}22;color:${escapeHtml(item.color)}">${escapeHtml(item.logo)}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </section>
        <div class="vertical-splitter" data-splitter="sender" role="separator" aria-orientation="vertical" aria-label="Absenderliste und Formular aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.senderSplit}" tabindex="0"></div>
        <section class="panel template-panel">
          <h2>Profilverwaltung</h2>
          <div class="template-panel-scroll">
            <form id="sender-form" class="form-grid">
              <input type="hidden" name="id" value="${escapeHtml(sender.id)}">
              ${field("role", "Rolle", sender.role)}
              ${field("name", "Name", sender.name)}
              ${field("department", "Organisation", sender.department, "text", "full")}
              ${field("address", "Adresse", sender.address, "text", "full")}
              ${field("phone", "Telefon", sender.phone)}
              ${emailField("email", "E-Mail", sender.email)}
              ${field("logo", "Logo/Briefkopf", sender.logo)}
              ${field("signature", "Unterschrift", sender.signature)}
              ${senderSignatureImageInput(sender)}
              ${field("color", "Akzentfarbe", sender.color, "color", "full")}
              <div class="field full">
                <button type="button" class="primary-button" data-action="save-sender">Speichern</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    `;
  },

  templates: () => {
    const template = selectedTemplate();
    const citizen = selectedCitizen() || sampleCitizen;
    const sender = byId(state.data.senders, template.senderId) || selectedSender();
    const hasFrontBackgroundImage = !!template.backgroundImage;
    const hasBackBackgroundImage = !!template.backBackgroundImage;
    return `
      <div class="template-split templatePreview-split" style="--template-left:${state.templateSplit}%;--templatePreview-left:${state.templatePreviewSplit}%">
        <section class="panel template-panel">
          <div class="section-head">
            <h2>Vorlagen</h2>
            <button type="button" class="ghost-button" data-action="new-template">Neue Vorlage</button>
          </div>
          <div class="template-panel-scroll">
            <div class="list">
              ${state.data.templates.map(item => `
                <div class="list-item-row ${item.id === template.id ? "selected" : ""}">
                  <button type="button" class="list-item-main" data-action="select-template" data-id="${escapeHtml(item.id)}">
                    <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.occasion)} · ${escapeHtml(item.format)}</span></div>
                    <span class="pill">${escapeHtml(item.id)}</span>
                  </button>
                  <button type="button" class="icon-button user-delete-btn" data-action="delete-template" data-id="${escapeHtml(item.id)}" aria-label="Vorlage löschen" title="Vorlage löschen">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              `).join("")}
            </div>
          </div>
        </section>
        <div class="vertical-splitter" data-splitter="template" role="separator" aria-orientation="vertical" aria-label="Vorlagenliste und Editor aufteilen" aria-valuemin="12" aria-valuemax="60" aria-valuenow="${state.templateSplit}" tabindex="0"></div>
        <section class="panel template-panel">
          <div class="section-head">
            <h2>Editor</h2>
            <button type="button" class="primary-button" data-action="save-template">Vorlage speichern</button>
          </div>
          <div class="template-panel-scroll">
            <form id="template-form" class="form-grid">
              <input type="hidden" name="id" value="${escapeHtml(template.id)}">
              ${field("name", "Vorlagenname", template.name)}
              ${selectField("occasion", "Anlass", template.occasion, occasionOptions())}
              ${selectField("format", "Format", template.format, formatOptions())}
              ${selectField("senderId", "Standard-Absender", template.senderId, senderOptions())}
              ${templateBackgroundInput("backgroundImage", "Hintergrundbild Vorderseite", hasFrontBackgroundImage)}
              ${templateBackgroundInput("backBackgroundImage", "Hintergrundbild Rückseite", hasBackBackgroundImage)}
              ${field("subject", "Betreff/Titel", template.subject, "text", "full")}
              <div class="field full">
                <label>Platzhalter</label>
                <div class="placeholder-row">
                  ${["{{anrede}}", "{{vorname}}", "{{nachname}}", "{{alter}}", "{{geburtstag}}", "{{soko}}", "{{absender}}"].map(token => `<button type="button" data-action="insert-token" data-token="${escapeHtml(token)}">${escapeHtml(token)}</button>`).join("")}
                </div>
              </div>
              ${textField("body", "Text", template.body, "full")}
              ${templateAgeTextFields(template)}
            </form>
          </div>
        </section>
        <div class="vertical-splitter" data-splitter="templatePreview" role="separator" aria-orientation="vertical" aria-label="Editor und Vorschau aufteilen" aria-valuemin="40" aria-valuemax="90" aria-valuenow="${state.templatePreviewSplit}" tabindex="0"></div>
        <section class="panel template-panel">
          <div class="template-panel-scroll">
            <h2>Vorschau${citizen === sampleCitizen ? ` <span class="muted" style="font-weight:400;font-size:13px">· Beispieldaten</span>` : ""}</h2>
            ${documentPreviewStack(template, citizen, sender)}
          </div>
        </section>
      </div>
    `;
  },

  documents: () => {
    const template = selectedTemplate();
    const sender = selectedSender();
    const docs = state.generatedDocs;
    const checkedCount = filteredCitizens().filter(c => isCheckedCitizen(c) && c.status !== "gedruckt").length;
    return `
      <div class="panel">
        <h2>Dokumentlauf konfigurieren</h2>
        <div class="split-controls">
          ${selectField("doc-template", "Vorlage", template.id, templateOptions())}
          ${selectField("doc-sender", "Absender", sender.id, senderOptions())}
          ${selectField("doc-month", "Geburtsmonat", state.filters.month, months)}
          ${selectField("doc-group", "SOKO", state.filters.groupId, groupOptions())}
        </div>
        <div class="button-row" style="margin-top:14px">
          <button type="button" class="ghost-button" data-action="print-docs">Drucken</button>
          <label class="toggle-label" style="margin-left:8px">
            <input type="checkbox" data-action="toggle-print-background" ${state.printBackground ? "checked" : ""}>
            Hintergrundbild drucken
          </label>
        </div>
        <p class="muted" style="margin:12px 0 0">Es werden nur geprüfte Jubilare berücksichtigt. Aktuelle Auswahl: ${checkedCount}</p>
      </div>
      <div class="print-split" style="margin-top:16px; --print-left:${state.printSplit}%">
        <section class="panel">
          <h2>Druckliste</h2>
          ${docs.length ? gridHost("documents", 500) : `<div class="empty-state">Keine Dokumente</div>`}
        </section>
        <div class="vertical-splitter" data-splitter="print" role="separator" aria-orientation="vertical" aria-label="Druckliste und Vorschau aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.printSplit}" tabindex="0"></div>
        <section class="panel">
          <h2>Seriendruck-Vorschau</h2>
          <div id="document-preview-panel">${documentPreviewContent()}</div>
        </section>
      </div>
      <div class="print-pages print-only">
        ${docs.length ? `<!-- Druckseiten werden beim Drucken generiert -->` : ""}
      </div>
    `;
  },

  weddingAnniversaries: () => {
    const anniversaries = (state.data.weddingAnniversaries || [])
      .filter(item => state.filters.weddingMonth === "alle" || item.weddingDate?.slice(5, 7) === state.filters.weddingMonth)
      .filter(item => state.showAllWeddingAnniversaries || weddingAnniversaryLabel(item.weddingDate));
    return `
      <section class="panel wedding-anniversaries-panel">
        <h2>Hochzeitsjubiläen</h2>
        <div class="toolbar">
          <label>Für Monat</label>
          <select name="weddingMonth" data-filter>
            ${months.map(([value, label]) => `<option value="${value}"${state.filters.weddingMonth === value ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
          <label class="toggle-label">
            <input type="checkbox" class="toggle" data-action="toggle-all-wedding-anniversaries" ${state.showAllWeddingAnniversaries ? "checked" : ""}>
            Alle Hochzeitstermine
          </label>
        </div>
        <div class="wedding-anniversaries-content">
          ${anniversaries.length ? gridHost("weddingAnniversaries") : `<div class="empty-state">Keine Hochzeitsjubiläen erfasst</div>`}
        </div>
      </section>
    `;
  },

  quittung: () => {
    const reviewEntries = activeCitizens()
      .filter(citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month)
      .filter(wantsVisit)
      .map(citizen => ({ citizen, group: groupForCitizen(citizen) }))
      .filter(entry => entry.group);
    const groupMap = groupedQuittungEntries(reviewEntries);
    const reviewByGroup = reviewQuittungEntriesByGroup(reviewEntries);
    const groups = [...groupMap.values()].sort((a, b) => a.group.id.localeCompare(b.group.id));
    const groupStatus = group => {
      const reviewCitizens = reviewByGroup.get(group.id) || [];
      const uncheckedCount = reviewCitizens.filter(citizen => !isCheckedCitizen(citizen)).length;
      return { uncheckedCount, canPrint: reviewCitizens.length > 0 && uncheckedCount === 0 };
    };
    const statuses = new Map(groups.map(({ group }) => [group.id, groupStatus(group)]));
    const unfinishedGroups = groups
      .map(({ group }) => ({ group, ...statuses.get(group.id) }))
      .filter(item => !item.canPrint);
    const canPrintAny = groups.some(({ group }) => statuses.get(group.id)?.canPrint);
    const betrag = state.quittungBetrag;
    const betragNum = Number.parseFloat(betrag.replace(",", ".")) || 0;
    const rows = groups.map(({ group, citizens: gc }) => {
      const summe = (gc.length * betragNum).toFixed(2).replace(".", ",");
      const { uncheckedCount, canPrint } = statuses.get(group.id);
      return `<tr>
        <td>${escapeHtml(group.id)}</td>
        <td>${gc.length}</td>
        <td style="text-align:right">${summe} €</td>
        <td>${receiptStatusPill(canPrint, uncheckedCount)}</td>
        <td><button type="button" class="primary-button" style="min-height:30px;padding:0 12px" data-action="print-quittung" data-group-id="${escapeHtml(group.id)}" ${canPrint ? "" : "disabled"}>Drucken</button></td>
      </tr>`;
    }).join("");
    return `
    <div class="toolbar">
      <label>Für Monat</label>
      <select name="month" data-filter>
        ${months.map(([v, l]) => `<option value="${v}"${state.filters.month === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("")}
      </select>
      ${groups.length ? `<button type="button" class="primary-button" data-action="print-quittung-all" ${canPrintAny ? "" : "disabled"}>Alle fertigen drucken</button>` : ""}
    </div>
    ${unfinishedReceiptGroupsAlert(unfinishedGroups)}
    <section class="panel" style="margin-top:12px">
      <h2>SOKOs</h2>
      ${groups.length ? `
      <table class="data-table" style="width:100%">
        <thead><tr><th>SOKO</th><th>Jubilare</th><th style="text-align:right">Gesamt</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<div class="empty-state">Keine Jubilare mit Besuchswunsch und SOKO-Zuordnung vorhanden</div>`}
    </section>`;
  },

  quittungStamm: () => `
    <section class="panel">
      <h2>Einstellungen</h2>
      <form id="quittung-form" class="form-grid">
        <div class="field">
          <label>Betrag pro Jubilar (€)</label>
          <input type="text" name="quittungBetrag" data-bind="quittungBetrag" value="${escapeHtml(state.quittungBetrag)}" inputmode="decimal" data-amount-field style="max-width:120px">
        </div>
        <div class="field">
          <label>Telefon</label>
          <input type="text" name="quittungTelefon" data-bind="quittungTelefon" value="${escapeHtml(state.quittungTelefon)}" style="max-width:160px">
        </div>
        <div class="field">
          <label>Kapitel</label>
          <input type="text" name="quittungKapitel" data-bind="quittungKapitel" value="${escapeHtml(state.quittungKapitel)}" style="max-width:100px">
        </div>
        <div class="field">
          <label>Titel</label>
          <input type="text" name="quittungTitel" data-bind="quittungTitel" value="${escapeHtml(state.quittungTitel)}" style="max-width:100px">
        </div>
        <div class="field full">
          <button type="button" class="primary-button" data-action="save-quittung-settings">Speichern</button>
        </div>
      </form>
    </section>
  `,

  import: () => {
    const importedCitizens = state.data.citizens.filter(citizen => citizen.source === "CSV Import" && (state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month));
    return `
    <div class="stack import-view-stack">
      <section class="panel">
        <h2>CSV-Import</h2>
        <div class="toolbar">
          <label>Für Monat</label>
          <select name="month" data-filter>
            ${months.map(([value, label]) => `<option value="${value}"${state.filters.month === value ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </div>
        <div class="file-action-row import-action-row">
          <label class="file-picker import-file-picker" for="import-file">
            <span>Aus CSV laden</span>
            <em>${state.importText ? "Datei geladen oder Daten eingefügt" : "Noch keine Datei geladen"}</em>
          </label>
          ${state.auth.user?.role === "admin" ? `
            <div class="test-actions" aria-label="Testdaten-Werkzeuge">
              <div class="test-actions-meta">
                <span>Nur Testzwecke</span>
                <strong>${state.data.citizens.length.toLocaleString("de-DE")} Jubilare</strong>
              </div>
              <button type="button" class="ghost-button test-action-button" data-action="download-labo-seed">LABO-Daten herunterladen</button>
              <button type="button" class="ghost-button test-action-button" data-action="seed-citizens">LABO-Import simulieren</button>
              <button type="button" class="danger-button test-action-button" data-action="reset-test-database">Reset Test-Datenbank</button>
            </div>
          ` : ""}
          <input id="import-file" class="file-input" type="file" accept=".csv,text/csv">
        </div>
      </section>
      <section class="panel import-log-panel">
        <h2>Importierte Jubilare</h2>
        <div class="import-log-content">
          ${importedCitizens.length ? gridHost("imported") : `<div class="empty-state">Noch keine Jubilare importiert</div>`}
        </div>
        <div class="button-row" style="margin-top:12px">
          <button type="button" class="primary-button" data-action="soko-print">Drucke SOKO-Fragebögen</button>
        </div>
      </section>
    </div>
  `;
  },

  profile: () => {
    const user = state.auth.user;
    const setup = state.auth.mfaSetup;
    return `
      <div class="profile-split" style="--profile-left:${state.profileSplit}%">
        <section class="panel profile-panel">
          <h2>Zugang</h2>
          <div class="profile-panel-scroll">
            <div class="data-list">
              <div><span>Name</span><strong>${escapeHtml(user.displayName || "-")}</strong></div>
              <div><span>E-Mail</span><strong>${escapeHtml(user.email)}</strong></div>
              <div><span>Rolle</span><strong>${user.role === "admin" ? "Admin" : "User"}</strong></div>
              <div><span>MFA</span><strong>${user.mfaEnabled ? "aktiv" : "nicht aktiv"}</strong></div>
            </div>
          </div>
        </section>
        <div class="vertical-splitter" data-splitter="profile" role="separator" aria-orientation="vertical" aria-label="Zugang und Multi-Faktor-Authentisierung aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.profileSplit}" tabindex="0"></div>
        <section class="panel profile-panel">
          <h2>Multi-Faktor-Authentisierung</h2>
          <div class="profile-panel-scroll">
            ${user.mfaEnabled ? `
              <form id="mfa-disable-form" class="form-grid">
                ${field("password", "Passwort", "", "password", "full")}
                ${field("code", "Authenticator-Code", "", "text", "full", 'inputmode="numeric" autocomplete="one-time-code"')}
                <div class="field full"><button type="button" class="danger-button" data-action="mfa-disable">MFA deaktivieren</button></div>
              </form>
            ` : `
              <p class="muted">MFA nutzt zeitbasierte Einmalcodes aus einer Authenticator-App.</p>
              <button type="button" class="primary-button" data-action="mfa-setup">MFA einrichten</button>
              ${setup ? `
                <div class="mfa-qr-panel">
                  ${qrCodeSvg(setup.otpauthUrl)}
                  <div>
                    <strong>QR-Code scannen</strong>
                    <span class="muted">Authenticator-App öffnen, Konto hinzufügen und diesen Code scannen.</span>
                  </div>
                </div>
                <div class="reset-token mfa-secret">
                  <span>Geheimer Schlüssel</span>
                  <code>${escapeHtml(setup.secret)}</code>
                  <small>${escapeHtml(setup.otpauthUrl)}</small>
                </div>
                <form id="mfa-enable-form" class="form-grid">
                  ${field("code", "Code aus der Authenticator-App", "", "text", "full", 'inputmode="numeric" autocomplete="one-time-code"')}
                  <div class="field full"><button type="button" class="primary-button" data-action="mfa-enable">MFA aktivieren</button></div>
                </form>
              ` : ""}
            `}
          </div>
        </section>
      </div>
    `;
  },

  users: () => {
    const users = state.auth.users || [];
    const selected = state.selectedUserId === "new"
      ? { id: "", email: "", displayName: "", role: "user", active: true, mfaEnabled: false }
      : users.find(user => user.id === state.selectedUserId) || users[0];
    return `
      <div class="toolbar">
        <button type="button" class="ghost-button" data-action="load-users">Aktualisieren</button>
        <button type="button" class="primary-button" data-action="new-user">Neuer Benutzer</button>
      </div>
      ${state.auth.adminResetToken ? `<div class="alert">Rücksetz-Code: <code>${escapeHtml(state.auth.adminResetToken)}</code></div>` : ""}
      <div class="users-split" style="--users-left:${state.usersSplit}%">
        <section class="panel users-panel">
          <h2>Benutzer</h2>
          <div class="users-panel-scroll">
            <div class="list">
              ${users.map(user => `
                <div class="list-item-row ${selected?.id === user.id ? "selected" : ""}">
                  <button type="button" class="list-item-main" data-action="select-user" data-id="${escapeHtml(user.id)}">
                    <div><strong>${escapeHtml(user.displayName || user.email)}</strong><span class="muted">${escapeHtml(user.email)}</span></div>
                    <span class="pill ${userPillTone(user)}">${escapeHtml(user.active ? user.role : "inaktiv")}</span>
                  </button>
                  <div class="user-delete-slot">
                    ${canDeleteUser(user) ? `
                      <button type="button" class="icon-button user-delete-btn" data-action="delete-user" data-id="${escapeHtml(user.id)}" title="Benutzer löschen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    ` : ""}
                  </div>
                </div>
              `).join("") || `<div class="empty-state">Noch keine Benutzer geladen</div>`}
            </div>
          </div>
        </section>
        <div class="vertical-splitter" data-splitter="users" role="separator" aria-orientation="vertical" aria-label="Benutzerliste und Formular aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.usersSplit}" tabindex="0"></div>
        <section class="panel users-panel">
          <h2>${state.selectedUserId === "new" ? "Benutzer anlegen" : "Benutzer bearbeiten"}</h2>
          <div class="users-panel-scroll">
            ${selected ? `
              <form id="user-form" class="form-grid">
                <input type="hidden" name="id" value="${escapeHtml(selected.id)}">
                ${field("displayName", "Name", selected.displayName || "")}
                ${field("email", "E-Mail", selected.email || "", "email")}
                ${selectField("role", "Rolle", selected.role || "user", [["user", "User"], ["admin", "Admin"]])}
                ${selectField("active", "Status", String(selected.active !== false), [["true", "Aktiv"], ["false", "Inaktiv"]])}
                ${state.selectedUserId === "new" ? field("password", "Startpasswort", "", "password", "full", 'autocomplete="new-password"') : ""}
                <div class="field full button-row">
                  <button type="button" class="primary-button" data-action="save-user">Speichern</button>
                  ${selected.id ? `<button type="button" class="ghost-button" data-action="user-reset-password">Passwort-Reset</button>` : ""}
                  ${selected.id && selected.mfaEnabled ? `<button type="button" class="ghost-button" data-action="user-reset-mfa">MFA zurücksetzen</button>` : ""}
                  ${selected.id && canDeleteUser(selected) ? `<button type="button" class="danger-button" data-action="delete-user">Löschen</button>` : ""}
                </div>
              </form>
            ` : `<div class="empty-state">Bitte Benutzer anlegen oder laden</div>`}
          </div>
        </section>
      </div>
    `;
  }
};
