import { escapeHtml, normalize, formatDate, byId, birthdayMonth, calculateAge } from './utils.js';
import { months, sokoColors, streetGroupDisplay } from './domain.js';
import { state } from './state.js';
import { selectedCitizen, selectedTemplate, selectedSender, selectedMember, selectedStreet, filteredCitizens, activeCitizens, groupForCitizen, isCheckedCitizen, receiptCitizens, receiptReviewCitizensForGroup, isReceiptGroupReady } from './assignment.js';
import { field, emailField, ibanField, selectField, textField, checkField, radioField, streetRuleRows, assignmentPill, gridHost, groupOptions, sokoSelectOptions, senderOptions, templateOptions, occasionOptions, formatOptions } from './fields.js';
import { streetMapSvg, addressPointData, assignedAddressPoints } from './map.js';
import { documentPreview } from './documents.js';
import { qrCodeSvg } from './qr.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen

export const viewTitles = {
  dashboard: "Dashboard",
  citizens: "Jubilare prüfen",
  soko: "Stammdaten: SOKO Mitglieder",
  regions: "Stammdaten: SOKO Straßen & Zuständigkeit",
  map: "SOKO Straßenplan",
  senders: "Stammdaten: Absender",
  templates: "Stammdaten: Vorlagen",
  documents: "Dokumentlauf",
  quittung: "Quittungsdruck",
  quittungStamm: "Stammdaten: Quittung",
  import: "LABO-Import",
  profile: "Mein Zugang",
  users: "Benutzerverwaltung"
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
};

export const citizenDetailContent = citizen => `
  <h2>Jubilar</h2>
  <form id="citizen-form" class="form-grid">
    <input type="hidden" name="id" value="${escapeHtml(citizen.id)}">
    ${selectField("salutation", "Anrede", citizen.salutation, [["Frau", "Frau"], ["Herr", "Herr"], ["Divers", "Divers"]])}
    ${field("firstName", "Vorname", citizen.firstName)}
    ${field("lastName", "Nachname", citizen.lastName)}
    ${field("birthDate", "Geburtsdatum", citizen.birthDate, "date")}
    ${field("street", "Straße", citizen.street)}
    ${field("houseNo", "Hausnummer", citizen.houseNo)}
    ${field("postalCode", "PLZ", citizen.postalCode)}
    ${field("district", "Ortsteil", citizen.district)}
    ${field("phone", "Telefon", citizen.phone)}
    ${emailField("email", "E-Mail", citizen.email)}
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
    <div class="field full button-row">
      <button type="button" class="primary-button${citizen.wish && citizen.wish !== "offen" ? "" : " btn-disabled"}" data-action="save-citizen">Speichern</button>
    </div>
  </form>
`;

export const renderCitizenDetail = () => {
  const element = document.querySelector("#citizen-detail-panel");
  const citizens = filteredCitizens();
  const citizen = citizens.find(item => item.id === state.selectedCitizenId) || citizens[0];
  if (!element || !citizen) { render(); return; }
  element.innerHTML = citizenDetailContent(citizen);
};

const selectedMonthLabel = () => months.find(([value]) => value === state.filters.month)?.[1] || "Alle Monate";
const selectedMonthSuffix = () => state.filters.month === "alle" ? "in allen Monaten" : `im ${selectedMonthLabel()}`;
const isQuestionnaireReturned = citizen => normalize(citizen.status).startsWith("gepr") || citizen.status === "gedruckt";
const dashboardCitizens = () => activeCitizens().filter(citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month);
const dashboardRows = () => state.data.sokoGroups.map(group => {
  const citizens = dashboardCitizens().filter(citizen => groupForCitizen(citizen)?.id === group.id);
  const returns = citizens.filter(isQuestionnaireReturned).length;
  const members = state.data.sokoMembers.filter(member => member.groupId === group.id).length;
  const rate = citizens.length ? Math.round((returns / citizens.length) * 100) : 0;
  return { group, members, citizens: citizens.length, returns, open: citizens.length - returns, rate };
});
const ageDistribution = citizens => {
  const groups = [
    { key: "85", label: "85", color: "#d09b2c", count: 0 },
    { key: "90-99", label: "90-99", color: "#0f5d58", count: 0 },
    { key: "100+", label: "100+", color: "#b64036", count: 0 }
  ];
  citizens.forEach(citizen => {
    const age = calculateAge(citizen.birthDate);
    const group = age >= 100 ? groups[2] : age >= 90 ? groups[1] : groups[0];
    group.count += 1;
  });
  return groups;
};
const ageDistributionChart = citizens => {
  const groups = ageDistribution(citizens);
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const segments = groups.reduce((acc, group) => {
    const value = total ? (group.count / total) * 100 : 0;
    return {
      offset: acc.offset + value,
      html: `${acc.html}<circle class="age-chart-segment" cx="32" cy="32" r="15.9" pathLength="100" stroke="${group.color}" stroke-dasharray="${value} ${100 - value}" stroke-dashoffset="${-acc.offset}"></circle>`
    };
  }, { offset: 0, html: "" }).html;
  return `
    <div class="age-card-body">
      <svg class="age-chart" viewBox="0 0 64 64" role="img" aria-label="Altersverteilung">
        <circle class="age-chart-track" cx="32" cy="32" r="15.9"></circle>
        ${segments}
        <text x="32" y="35">${total}</text>
      </svg>
      <div class="age-legend">
        ${groups.map(group => `<span><i style="background:${group.color}"></i>${escapeHtml(group.label)} <strong>${group.count}</strong></span>`).join("")}
      </div>
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
    return `
      <div class="toolbar">
        <select name="month" data-filter>${months.map(month => `<option value="${month[0]}" ${state.filters.month === month[0] ? "selected" : ""}>${month[1]}</option>`).join("")}</select>
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <select name="age" data-filter>
          ${[["alle", "Alle Alter"], ["85", "85 Jahre"], ["90plus", "90+"], ["100", "100+"]].map(option => `<option value="${option[0]}" ${state.filters.age === option[0] ? "selected" : ""}>${option[1]}</option>`).join("")}
        </select>
      </div>
      <div class="${citizen ? "citizen-split" : ""}" ${citizen ? `style="--citizen-left:${state.citizenSplit}%"` : ""}>
        <section class="panel citizen-panel">
          <h2>Jubilare</h2>
          <div class="citizen-panel-scroll citizen-grid-scroll">${gridHost("citizens")}</div>
        </section>
        ${citizen ? `<div class="vertical-splitter" data-splitter="citizen" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.citizenSplit}" tabindex="0"></div>
        <section class="panel citizen-panel" id="citizen-detail-panel">
          <h2>Jubilar</h2>
          <form id="citizen-form" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(citizen.id)}">
            ${selectField("salutation", "Anrede", citizen.salutation, [["Frau", "Frau"], ["Herr", "Herr"], ["Divers", "Divers"]])}
            ${field("firstName", "Vorname", citizen.firstName)}
            ${field("lastName", "Nachname", citizen.lastName)}
            ${field("birthDate", "Geburtsdatum", citizen.birthDate, "date")}
            ${field("street", "Straße", citizen.street)}
            ${field("houseNo", "Hausnummer", citizen.houseNo)}
            ${field("postalCode", "PLZ", citizen.postalCode)}
            ${field("district", "Ortsteil", citizen.district)}
            ${field("phone", "Telefon", citizen.phone)}
            ${emailField("email", "E-Mail", citizen.email)}
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
            <div class="field full button-row">
              <button type="button" class="primary-button${citizen.wish && citizen.wish !== "offen" ? "" : " btn-disabled"}" data-action="save-citizen">Speichern</button>
            </div>
          </form>
        </section>` : ""}
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
      </div>
      <div class="grid two">
        <section class="panel">
          <h2>Mitglieder und Leitungen</h2>
          ${gridHost("members", 500)}
        </section>
        <section class="panel">
          <h2>Erfassungsmaske</h2>
          ${member ? `
            <form id="member-form" class="form-grid">
              <input type="hidden" name="id" value="${escapeHtml(member.id)}">
              ${selectField("salutation", "Anrede", member.salutation, [["Frau", "Frau"], ["Herr", "Herr"], ["Divers", "Divers"]])}
              ${field("firstName", "Vorname", member.firstName)}
              ${field("lastName", "Nachname", member.lastName)}
              ${selectField("groupId", "SOKO", member.groupId, sokoSelectOptions())}
              ${field("street", "Straße", member.street, "text", "full")}
              ${field("postalCode", "PLZ", member.postalCode)}
              ${field("city", "Ort", member.city)}
              ${field("phone", "Telefon", member.phone)}
              ${field("mobile", "Handy", member.mobile)}
              ${emailField("email", "E-Mail", member.email)}
              ${ibanField("bank", "Bankverbindung / IBAN", member.bank, "full")}
              ${field("allowance", "Aufwandspauschale", member.allowance)}
              ${field("billingAmount", "Abrechnungsbetrag", member.billingAmount)}
              ${field("termFrom", "Berufung von", member.termFrom, "date")}
              ${field("termTo", "Berufung bis", member.termTo, "date")}
              ${selectField("isLeader", "Rolle", String(member.isLeader), [["false", "Mitglied"], ["true", "Leitung"]], "full")}
              <div class="field full">
                <button type="button" class="primary-button" data-action="save-member">Speichern</button>
              </div>
            </form>
          ` : `<div class="empty-state">Kein Mitglied ausgewählt</div>`}
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
    const addressCount = addressPointData().addresses?.length || 0;
    const assignedCount = assignedAddressPoints().length;
    return `
      <div class="panel">
        <div class="section-head">
          <div>
            <h2>Straßenkarte Reinickendorf</h2>
            <p>${assignedCount.toLocaleString("de-DE")} von ${addressCount.toLocaleString("de-DE")} OSM-Adressen einer SOKO zugeordnet</p>
          </div>
        </div>
        <div class="map-shell">${streetMapSvg()}</div>
        <div class="map-legend">
          ${state.data.sokoGroups.map(group => `<div class="legend-item"><span style="background:${escapeHtml(sokoColors[group.id])}"></span><strong>${escapeHtml(group.id)}</strong><em>${escapeHtml(group.region)}</em></div>`).join("")}
        </div>
      </div>
    `;
  },

  senders: () => {
    const sender = selectedSender();
    return `
      <div class="grid two">
        <section class="panel">
          <h2>Profile</h2>
          <div class="list">
            ${state.data.senders.map(item => `
              <button type="button" class="list-item" data-action="select-sender" data-id="${escapeHtml(item.id)}">
                <div><strong>${escapeHtml(item.role)}</strong><span class="muted">${escapeHtml(item.department)}</span></div>
                <span class="pill" style="background:${escapeHtml(item.color)}22;color:${escapeHtml(item.color)}">${escapeHtml(item.logo)}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Profilverwaltung</h2>
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
        </section>
      </div>
    `;
  },

  templates: () => {
    const template = selectedTemplate();
    const citizen = selectedCitizen();
    const sender = byId(state.data.senders, template.senderId) || selectedSender();
    return `
      <div class="grid two">
        <section class="panel">
          <div class="section-head">
            <h2>Vorlagen</h2>
            <button type="button" class="ghost-button" data-action="new-template">Neue Vorlage</button>
          </div>
          <div class="list">
            ${state.data.templates.map(item => `
              <button type="button" class="list-item ${item.id === template.id ? "selected" : ""}" data-action="select-template" data-id="${escapeHtml(item.id)}">
                <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.occasion)} · ${escapeHtml(item.format)}</span></div>
                <span class="pill">${escapeHtml(item.id)}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Editor</h2>
          <form id="template-form" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(template.id)}">
            ${field("name", "Vorlagenname", template.name)}
            ${selectField("occasion", "Anlass", template.occasion, occasionOptions())}
            ${selectField("format", "Format", template.format, formatOptions())}
            ${selectField("senderId", "Standard-Absender", template.senderId, senderOptions())}
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
              <button type="button" class="ghost-button danger-button" data-action="delete-template">Vorlage löschen</button>
            </div>
          </form>
          <div style="margin-top:16px">
            <h2>Vorschau</h2>
            ${documentPreview(template, citizen, sender)}
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
    const checkedCount = filteredCitizens().filter(c => c.status === "geprüft").length;
    const previewCitizen = previewDoc ? byId(state.data.citizens, previewDoc.citizenId) : filteredCitizens().find(c => c.status === "geprüft") || selectedCitizen();
    const previewTemplate = previewDoc ? byId(state.data.templates, previewDoc.templateId) || template : template;
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
      <div class="grid two print-target" style="margin-top:16px">
        <section class="panel">
          <h2>Druckliste</h2>
          ${docs.length ? gridHost("documents", 500) : `<div class="empty-state">Keine Dokumente</div>`}
        </section>
        <section class="panel">
          <h2>Seriendruck-Vorschau</h2>
          ${docs.length ? documentPreview(previewTemplate, previewCitizen, previewSender) : `<div class="empty-state">Kein Dokument ausgewählt</div>`}
        </section>
      </div>
      <div class="print-pages print-only">
        ${docs.length ? `<!-- Druckseiten werden beim Drucken generiert -->` : ""}
      </div>
    `;
  },

  quittung: () => {
    const citizens = receiptCitizens();
    const byGroup = citizens.reduce((acc, c) => {
      const group = groupForCitizen(c);
      const key = group.id;
      if (!acc[key]) acc[key] = { group, citizens: [] };
      acc[key].citizens.push(c);
      return acc;
    }, {});
    const groups = Object.values(byGroup).sort((a, b) => a.group.id.localeCompare(b.group.id));
    const groupStatus = group => {
      const uncheckedCount = receiptReviewCitizensForGroup(group.id).filter(citizen => !isCheckedCitizen(citizen)).length;
      return { uncheckedCount, canPrint: isReceiptGroupReady(group.id) };
    };
    const unfinishedGroups = groups
      .map(({ group }) => ({ group, ...groupStatus(group) }))
      .filter(item => !item.canPrint);
    const canPrintAny = groups.some(({ group }) => isReceiptGroupReady(group.id));
    const betrag = state.quittungBetrag;
    const betragNum = Number.parseFloat(betrag.replace(",", ".")) || 0;
    const rows = groups.map(({ group, citizens: gc }) => {
      const summe = (gc.length * betragNum).toFixed(2).replace(".", ",");
      const { uncheckedCount, canPrint } = groupStatus(group);
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
      <select data-bind="quittungMonat">
        ${months.filter(([v]) => v !== "alle").map(([v, l]) => `<option value="${v}"${state.quittungMonat === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("")}
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
      <div class="form-grid">
        <div class="field">
          <label>Betrag pro Jubilar (€)</label>
          <input type="text" data-bind="quittungBetrag" value="${escapeHtml(state.quittungBetrag)}" style="max-width:120px">
        </div>
        <div class="field">
          <label>Telefon</label>
          <input type="text" data-bind="quittungTelefon" value="${escapeHtml(state.quittungTelefon)}" style="max-width:160px">
        </div>
        <div class="field">
          <label>Kapitel</label>
          <input type="text" data-bind="quittungKapitel" value="${escapeHtml(state.quittungKapitel)}" style="max-width:100px">
        </div>
        <div class="field">
          <label>Titel</label>
          <input type="text" data-bind="quittungTitel" value="${escapeHtml(state.quittungTitel)}" style="max-width:100px">
        </div>
      </div>
    </section>
  `,

  import: () => `
    <div class="stack">
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
                <strong>${state.data.citizens.length.toLocaleString("de-DE")} Jubilare · ${state.data.importLog.length.toLocaleString("de-DE")} Log</strong>
              </div>
              <button type="button" class="ghost-button test-action-button" data-action="seed-citizens">30 CSV simulieren</button>
              <button type="button" class="danger-button test-action-button" data-action="clear-citizens">Löschen</button>
            </div>
          ` : ""}
          <input id="import-file" class="file-input" type="file" accept=".csv,text/csv">
        </div>
      </section>
      <section class="panel">
        <h2>Import-Protokoll</h2>
        ${state.data.importLog.length ? gridHost("importLog", 500) : `<div class="empty-state">Noch kein Import-Protokoll</div>`}
        <div class="button-row" style="margin-top:12px">
          <button type="button" class="primary-button" data-action="soko-print">SOKO-Druck</button>
        </div>
      </section>
    </div>
  `,

  profile: () => {
    const user = state.auth.user;
    const setup = state.auth.mfaSetup;
    return `
      <div class="grid two">
        <section class="panel">
          <h2>Zugang</h2>
          <div class="data-list">
            <div><span>Name</span><strong>${escapeHtml(user.displayName || "-")}</strong></div>
            <div><span>E-Mail</span><strong>${escapeHtml(user.email)}</strong></div>
            <div><span>Rolle</span><strong>${user.role === "admin" ? "Admin" : "User"}</strong></div>
            <div><span>MFA</span><strong>${user.mfaEnabled ? "aktiv" : "nicht aktiv"}</strong></div>
          </div>
        </section>
        <section class="panel">
          <h2>Multi-Faktor-Authentisierung</h2>
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
      <div class="grid two">
        <section class="panel">
          <h2>Benutzer</h2>
          <div class="list">
            ${users.map(user => `
              <button type="button" class="list-item ${selected?.id === user.id ? "selected" : ""}" data-action="select-user" data-id="${escapeHtml(user.id)}">
                <div><strong>${escapeHtml(user.displayName || user.email)}</strong><span class="muted">${escapeHtml(user.email)}</span></div>
                <span class="pill ${user.active ? user.role === "admin" ? "green" : "" : "red"}">${escapeHtml(user.active ? user.role : "inaktiv")}</span>
              </button>
            `).join("") || `<div class="empty-state">Noch keine Benutzer geladen</div>`}
          </div>
        </section>
        <section class="panel">
          <h2>${state.selectedUserId === "new" ? "Benutzer anlegen" : "Benutzer bearbeiten"}</h2>
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
        </section>
      </div>
    `;
  }
};
