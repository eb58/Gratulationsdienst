import { escapeHtml, normalize, formatDate, byId, birthdayMonth, calculateAge, anniversaryDateFromCreatedAt } from './utils.js';
import { months, sokoColors, streetGroupDisplay } from './domain.js';
import { state } from './state.js';
import { selectedCitizen, selectedTemplate, selectedSender, selectedMember, selectedStreet, filteredCitizens, activeCitizens, groupForCitizen, isCheckedCitizen, isPrintedCitizen, wantsVisit } from './assignment.js';
import { field, emailField, postalCodeField, ibanField, selectField, textField, checkField, radioField, streetRuleRows, assignmentPill, gridHost, groupOptions, sokoSelectOptions, senderOptions, templateOptions, occasionOptions, formatOptions } from './fields.js';
import { streetMapSvg, mapSegmentCounts, mapAddressPointGroups } from './map.js';
import { documentBackPreview, documentPreview } from './documents.js';
import { qrCodeSvg } from './qr.js';
import { SOKO_QUESTIONNAIRE_IMPORTED_STATUS } from './sokoQuestionnaire.js';
import { render, applyPendingFocus } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen
import { rememberDirtyFormBaselines } from './dirtyForms.js';

export const viewTitles = {
  dashboard: "Dashboard",
  citizens: "Jubilare prüfen",
  soko: "Stammdaten: SOKO Mitglieder",
  regions: "Stammdaten: SOKO Straßen & Zuständigkeit",
  map: "SOKO Straßenplan Reinickendorf",
  senders: "Stammdaten: Absender",
  templates: "Stammdaten: Vorlagen",
  documents: "Dokumentlauf",
  quittung: "Quittungsdruck",
  quittungStamm: "Stammdaten: Quittung",
  import: "LABO-Import",
  profile: "Mein Zugang",
  privacy: "Datenschutz",
  users: "Benutzerverwaltung"
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

const documentPreviewStack = (template, citizen, sender) => {
  const backPreview = documentBackPreview(template, citizen);
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

export const authView = () => {
  if (!state.auth.ready) return `<section class="auth-panel"><h2>Anmeldung wird geprüft</h2><div class="empty-state">Bitte warten...</div></section>`;
  const notice = state.auth.message ? `<div class="alert">${escapeHtml(state.auth.message)}</div>` : "";
  if (state.auth.setupRequired) return `
    <section class="auth-panel">
      <h2>Ersten Admin-Zugang anlegen</h2>
      ${notice}
      <form id="auth-setup-form" class="form-grid">
        ${field("displayName", "Name", "Administration")}
        ${field("email", "E-Mail", "", "email")}
        ${field("password", "Passwort", "", "password", "full", 'autocomplete="new-password"')}
        <div class="field full"><button type="button" class="primary-button" data-action="auth-setup">Admin anlegen</button></div>
      </form>
    </section>
  `;
  if (state.auth.mfaTicket) return `
    <section class="auth-panel">
      <h2>Zweiter Faktor</h2>
      ${notice}
      <form id="auth-mfa-form" class="form-grid">
        ${field("code", "Authenticator-Code", "", "text", "full", 'inputmode="numeric" autocomplete="one-time-code"')}
        <div class="field full button-row">
          <button type="button" class="primary-button" data-action="auth-mfa-login">Anmelden</button>
          <button type="button" class="ghost-button" data-action="auth-cancel-mfa">Zurück</button>
        </div>
      </form>
    </section>
  `;
  if (state.auth.mode === "reset") return `
    <section class="auth-panel">
      <h2>Passwort zurücksetzen</h2>
      ${notice}
      <form id="auth-reset-request-form" class="form-grid">
        ${field("email", "E-Mail", "", "email", "full")}
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
    </section>
  `;
  return `
    <section class="auth-panel">
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
    </section>
  `;
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
              <div><strong>${escapeHtml(citizen.firstName)} ${escapeHtml(citizen.lastName)}</strong><span class="muted">${formatDate(citizen.birthDate)}</span></div>
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
      <button type="button" class="primary-button${citizen.wish && citizen.wish !== "offen" ? "" : " btn-disabled"}" data-action="save-citizen">Speichern</button>
      ${isPrintedCitizen(citizen) ? `<button type="button" class="ghost-button" data-action="reset-selected-for-reprint">Für Nachdruck auf geprüft setzen</button>` : ""}
    </div>
    ${radioField("wish", "Glückwünsche", citizen.wish, [["Besuch erwünscht", "Besuch erwünscht"], ["per Post", "per Post"], ["keine", "keine"]], "full")}
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
        ${field("firstName", "Vorname", citizen.firstName)}
        ${field("lastName", "Nachname", citizen.lastName)}
        ${field("birthDate", "Geburtsdatum", citizen.birthDate, "date")}
        ${field("street", "Straße", citizen.street)}
        ${field("houseNo", "Hausnummer", citizen.houseNo)}
        ${postalCodeField("postalCode", "PLZ", citizen.postalCode)}
        ${field("district", "Ortsteil", citizen.district)}
        ${field("phone", "Telefon", citizen.phone)}
        ${emailField("email", "E-Mail", citizen.email)}
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
        <figcaption>${escapeHtml(formatDate(item.createdAt))}</figcaption>
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

const selectedMonthLabel = () => months.find(([value]) => value === state.filters.month)?.[1] || "Alle Monate";
const selectedMonthSuffix = () => state.filters.month === "alle" ? "in allen Monaten" : `im ${selectedMonthLabel()}`;
const isQuestionnaireReturned = citizen => isCheckedCitizen(citizen);
const dashboardCitizens = () => activeCitizens().filter(citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month);
const dashboardRows = () => state.data.sokoGroups.map(group => {
  const citizens = dashboardCitizens().filter(citizen => groupForCitizen(citizen)?.id === group.id);
  const returns = citizens.filter(isQuestionnaireReturned).length;
  const members = state.data.sokoMembers.filter(member => member.groupId === group.id).length;
  const rate = citizens.length ? Math.round((returns / citizens.length) * 100) : 0;
  return { group, members, citizens: citizens.length, returns, open: citizens.length - returns, rate };
});
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
const cleanupPreviewContent = () => {
  const preview = state.cleanupPreview;
  if (!preview) return "";
  const ids = new Set(preview.citizenIds || []);
  const citizens = state.data.citizens
    .filter(citizen => ids.has(citizen.id))
    .sort((a, b) => anniversaryDateFromCreatedAt(a.birthDate, a.createdAt) - anniversaryDateFromCreatedAt(b.birthDate, b.createdAt) || String(a.lastName || "").localeCompare(String(b.lastName || "")));
  return `
    <section id="cleanup-preview" class="panel cleanup-preview-panel" tabindex="-1">
      <h2>Zu löschende Jubilare</h2>
      <div class="data-list">
        <div><span>Frist</span><strong>${escapeHtml(preview.months)} Monate</strong></div>
        <div><span>Anzahl</span><strong>${citizens.length.toLocaleString("de-DE")}</strong></div>
      </div>
      ${citizens.length ? `
        ${gridHost("cleanupPreview", 420)}
        <div class="button-row" style="margin-top:12px">
          <button type="button" class="danger-button" data-action="delete-old-citizens">Angezeigte Jubilare löschen</button>
        </div>
      ` : `<div class="empty-state" style="margin-top:12px">Keine Jubilare für diese Frist gefunden</div>`}
    </section>
  `;
};
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
  const key = salutation === "frau" ? "female" : salutation === "herr" ? "male" : "unknown";
  counts[key] += 1;
  return counts;
}, { female: 0, male: 0, unknown: 0 });
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
const dashboardSortValue = (row, key) => key === "group" ? row.group.id : Number(row[key] ?? 0);
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
  return `<button type="button" class="table-sort ${active ? "active" : ""}" data-action="sort-dashboard" data-sort-key="${key}">${escapeHtml(label)}<span>${active ? dir === "asc" ? "▲" : "▼" : "↕"}</span></button>`;
};
export const sokoMapInfoHtml = (groupId, streetName = "") => {
  if (!groupId || groupId === "offen") return `<p class="map-soko-hint muted">Über eine SOKO auf der Karte fahren</p>`;
  const group = state.data.sokoGroups.find(g => g.id === groupId);
  const members = state.data.sokoMembers.filter(m => m.groupId === groupId).sort((a, b) => b.isLeader - a.isLeader);
  const citizens = activeCitizens().filter(c => groupForCitizen(c)?.id === groupId && (state.filters.month === "alle" || c.birthDate?.slice(5, 7) === state.filters.month));
  const monthLabel = months.find(([v]) => v === state.filters.month)?.[1] || state.filters.month;
  const addrCount = (mapAddressPointGroups()[groupId] || []).length;
  const segCount = mapSegmentCounts()[groupId] || 0;
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
    <div class="map-info-box">
      <strong>Mitglieder</strong>
      ${members.length ? members.map(m => `<div>${escapeHtml(`${m.firstName} ${m.lastName}`)}${m.isLeader ? " <em>(Ltg.)</em>" : ""}</div>`).join("") : `<div class="muted">Keine Mitglieder</div>`}
    </div>
    <div class="map-info-box">
      <strong>Jubilare ${escapeHtml(monthLabel)}</strong>
      ${citizens.length ? citizens.map(c => `<div>${escapeHtml(`${c.firstName} ${c.lastName}`)} <span class="muted">(${calculateAge(c.birthDate)})</span></div>`).join("") : `<div class="muted">Keine Jubilare</div>`}
    </div>
  `;
};

export const views = {
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
                      <td><span class="pill ${row.rate >= 80 ? "green" : row.rate >= 50 ? "gold" : "red"}">${row.rate}%</span></td>
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
            <label class="soko-questionnaire-load" for="soko-pdf-file"><span>Fragebögen laden</span><em>Gescannte Fragebögen</em></label>
          </div>
          <input id="soko-pdf-file" class="file-input" type="file" accept=".pdf,application/pdf">
        </div>
      </div>
      <div class="${citizen ? `citizen-split${showQuestionnairePanel ? " has-questionnaire-images" : ""}` : ""}" ${citizen ? `style="--citizen-left:${citizenSplit}%"` : ""}>
        <section class="panel citizen-panel">
          <h2>Jubilare</h2>
          <div class="citizen-panel-scroll citizen-grid-scroll">${gridHost("citizens")}</div>
        </section>
        ${citizen ? `<div class="vertical-splitter" data-splitter="citizen" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="${showQuestionnairePanel ? 24 : 20}" aria-valuemax="${showQuestionnairePanel ? 34 : 80}" aria-valuenow="${citizenSplit}" tabindex="0"></div>
        <div class="citizen-detail-split${showQuestionnairePanel ? " has-questionnaire-images" : ""}" data-split="citizenDetail" style="--citizenDetail-left:${state.citizenDetailSplit}%">
          <section class="panel citizen-panel citizen-questionnaire-panel" id="citizen-questionnaire-panel">
            ${citizenQuestionnaireImagesContent(citizen)}
          </section>
          <div class="vertical-splitter citizen-detail-splitter" data-splitter="citizenDetail" role="separator" aria-orientation="vertical" aria-label="Fragebogen und Jubilar aufteilen" aria-valuemin="25" aria-valuemax="55" aria-valuenow="${state.citizenDetailSplit}" tabindex="0"></div>
          <section class="panel citizen-panel" id="citizen-detail-panel">
            ${citizenDetailContent(citizen)}
          </section>
        </div>` : ""}
      </div>
    `;
  },

  soko: () => {
    const member = selectedMember();
    return `
      <div class="toolbar">
        <input name="q" data-filter placeholder="Suche" value="${escapeHtml(state.filters.q)}">
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <button type="button" class="ghost-button" data-action="new-member">Neues Mitglied</button>
        <button type="button" class="ghost-button" data-action="export-soko">XLSX/CSV Export</button>
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
          <div class="template-panel-scroll">
            ${member ? `
              <form id="member-form" class="form-grid">
                <input type="hidden" name="id" value="${escapeHtml(member.id)}">
                ${selectField("salutation", "Anrede", member.salutation, [["Frau", "Frau"], ["Herr", "Herr"]])}
                ${field("firstName", "Vorname", member.firstName)}
                ${field("lastName", "Nachname", member.lastName)}
                ${field("birthDate", "Geburtsdatum", member.birthDate, "date")}
                ${selectField("groupId", "SOKO", member.groupId, sokoSelectOptions())}
                ${field("street", "Straße", member.street, "text", "full")}
                ${postalCodeField("postalCode", "PLZ", member.postalCode)}
                ${field("city", "Ort", member.city)}
                ${field("phone", "Telefon", member.phone)}
                ${field("mobile", "Handy", member.mobile)}
                ${emailField("email", "E-Mail", member.email)}
                ${ibanField("bank", "Bankverbindung / IBAN", member.bank, "full")}
                ${field("accountHolder", "Kontoinhaber", member.accountHolder, "text", "full")}
                ${field("allowance", "Aufwandspauschale", member.allowance, "text", "", 'inputmode="decimal" data-amount-field')}
                ${field("billingAmount", "Abrechnungsbetrag", member.billingAmount, "text", "", 'inputmode="decimal" data-amount-field')}
                ${field("termFrom", "Berufung von", member.termFrom, "date")}
                ${field("termTo", "Berufung bis", member.termTo, "date")}
                ${field("zpNr", "Zahlungspartner-Nummer", member.zpNr)}
                ${field("kassenzeichen", "Kassenzeichen", member.kassenzeichen)}
                ${field("misc", "Sonstiges", member.misc, "text", "full")}
                ${textField("note", "Bemerkung", member.note, "full")}
                ${selectField("isLeader", "Rolle", String(member.isLeader), [["false", "Mitglied"], ["true", "Leitung"]], "full")}
                <div class="field full button-row">
                  <button type="button" class="primary-button" data-action="save-member">Speichern</button>
                  <button type="button" class="ghost-button danger-button" data-action="delete-member">Löschen</button>
                </div>
              </form>
            ` : `<div class="empty-state">Kein Mitglied ausgewählt</div>`}
          </div>
        </section>
      </div>
    `;
  },

  regions: () => {
    const street = selectedStreet();
    const unassigned = state.data.streets.filter(item => !item.rules?.some(rule => rule.soko));
    return `
      <div class="${street ? "region-split" : "grid two"}" ${street ? `style="--region-left:${state.regionSplit}%"` : ""}>
        <section class="panel region-panel">
          <h2>Straßenverzeichnis</h2>
          ${unassigned.length ? `<div class="alert">${unassigned.length} Straße ohne SOKO-Zuordnung</div>` : ""}
          <div class="region-panel-scroll region-grid-scroll">${gridHost("streets", 500)}</div>
        </section>
        ${street ? `<div class="vertical-splitter" data-splitter="region" role="separator" aria-orientation="vertical" aria-label="Straßenverzeichnis und Zuordnung aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.regionSplit}" tabindex="0"></div>` : ""}
        <section class="panel region-panel" id="region-assignment-panel">
          ${regionAssignmentContent()}
        </section>
      </div>
    `;
  },

  map: () => {
    const segCounts = mapSegmentCounts();
    const addrCounts = Object.fromEntries(Object.entries(mapAddressPointGroups()).map(([g, a]) => [g, a.length]));
    return `
      <div class="panel map-main-panel">
        <div class="map-shell-wrapper">
          <div class="map-shell">${streetMapSvg()}</div>
          <aside class="map-side-panel">
            <div class="map-month-row">
              <label for="map-month-select">Monat</label>
              <select id="map-month-select" name="month" data-filter>
                ${months.map(([v, l]) => `<option value="${v}"${state.filters.month === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("")}
              </select>
            </div>
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
    const citizen = selectedCitizen();
    const sender = byId(state.data.senders, template.senderId) || selectedSender();
    const hasFrontBackgroundImage = !!template.backgroundImage;
    const hasBackBackgroundImage = !!template.backBackgroundImage;
    return `
      <div class="template-split" style="--template-left:${state.templateSplit}%">
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
        <div class="vertical-splitter" data-splitter="template" role="separator" aria-orientation="vertical" aria-label="Vorlagenliste und Editor aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.templateSplit}" tabindex="0"></div>
        <section class="panel template-panel">
          <div class="template-panel-scroll">
            <h2>Editor</h2>
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
              <div class="field full">
                <button type="button" class="primary-button" data-action="save-template">Vorlage speichern</button>
              </div>
            </form>
            <div style="margin-top:16px">
              <h2>Vorschau</h2>
              ${documentPreviewStack(template, citizen, sender)}
            </div>
          </div>
        </section>
      </div>
    `;
  },

  documents: () => {
    const template = selectedTemplate();
    const sender = selectedSender();
    const docs = state.generatedDocs;
    const previewDoc = docs.find(doc => doc.citizenId === state.selectedCitizenId) || docs[0];
    const checkedCount = filteredCitizens().filter(c => isCheckedCitizen(c) && c.status !== "gedruckt").length;
    const previewCitizen = previewDoc ? byId(state.data.citizens, previewDoc.citizenId) : filteredCitizens().find(c => isCheckedCitizen(c) && c.status !== "gedruckt") || selectedCitizen();
    const previewTemplate = previewDoc ? byId(state.data.templates, previewDoc.templateId) || template : template;
    const printablePreviewTemplate = state.printBackground ? previewTemplate : { ...previewTemplate, backgroundImage: "", backBackgroundImage: "" };
    const previewSender = previewDoc ? byId(state.data.senders, previewDoc.senderId) || sender : sender;
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
          ${docs.length ? documentPreviewStack(printablePreviewTemplate, previewCitizen, previewSender) : `<div class="empty-state">Kein Dokument ausgewählt</div>`}
        </section>
      </div>
      <div class="print-pages print-only">
        ${docs.length ? `<!-- Druckseiten werden beim Drucken generiert -->` : ""}
      </div>
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
        <td>${canPrint ? `<span class="pill green">fertig</span>` : `<span class="pill gold">${uncheckedCount} offen</span>`}</td>
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
    ${unfinishedGroups.length ? `<div class="alert" style="margin-top:12px">Quittungsdruck ist pro SOKO möglich, sobald dort alle Jubilare für diesen Monat geprüft sind. Noch nicht fertig: ${unfinishedGroups.map(item => `${escapeHtml(item.group.id)} (${item.uncheckedCount} offen)`).join(", ")}</div>` : ""}
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

  import: () => `
    <div class="stack import-view-stack">
      <section class="panel">
        <h2>CSV-Import</h2>
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
              <button type="button" class="ghost-button test-action-button" data-action="seed-citizens">${Math.max(50, state.data.sokoGroups.length)} CSV simulieren</button>
              <button type="button" class="danger-button test-action-button" data-action="clear-citizens">Löschen</button>
            </div>
          ` : ""}
          <input id="import-file" class="file-input" type="file" accept=".csv,text/csv">
        </div>
      </section>
      <section class="panel import-log-panel">
        <h2>Importierte Jubilare</h2>
        <div class="import-log-content">
          ${state.data.citizens.some(citizen => citizen.source === "CSV Import") ? gridHost("imported") : `<div class="empty-state">Noch keine Jubilare importiert</div>`}
        </div>
        <div class="button-row" style="margin-top:12px">
          <button type="button" class="primary-button" data-action="soko-print">Drucke SOKO-Fragebögen</button>
        </div>
      </section>
    </div>
  `,

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

  privacy: () => `
    <section class="panel">
      <h2>Datenbereinigung</h2>
      <div class="data-list">
        <div><span>Aktuelle Jubilare</span><strong>${state.data.citizens.length.toLocaleString("de-DE")}</strong></div>
        <div><span>Mindestfrist</span><strong>6 Monate</strong></div>
      </div>
      <div class="alert" style="margin-top:12px">Aus Datenschutzgründen können Jubilare gelöscht werden, deren Jubiläum mehr als die eingestellte Anzahl Monate zurückliegt.</div>
      <div class="cleanup-admin-actions">
        <label class="cleanup-months-field">
          <span>Jubiläum älter als</span>
          <input id="cleanup-months" type="number" min="6" step="1" data-bind="cleanupMonths" value="${escapeHtml(state.cleanupMonths)}">
          <span>Monate</span>
        </label>
        <button type="button" class="primary-button" data-action="preview-old-citizens">Betroffene anzeigen</button>
      </div>
    </section>
    ${cleanupPreviewContent()}
  `,

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
                    <span class="pill ${user.active ? user.role === "admin" ? "green" : "" : "red"}">${escapeHtml(user.active ? user.role : "inaktiv")}</span>
                  </button>
                  <div class="user-delete-slot">
                    ${user.id !== state.auth.user?.id ? `
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
                  ${selected.id && selected.id !== state.auth.user.id ? `<button type="button" class="danger-button" data-action="delete-user">Löschen</button>` : ""}
                </div>
              </form>
            ` : `<div class="empty-state">Bitte Benutzer anlegen oder laden</div>`}
          </div>
        </section>
      </div>
    `;
  }
};
