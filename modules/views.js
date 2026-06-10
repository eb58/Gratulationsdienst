import { escapeHtml, normalize, formatDate, byId } from './utils.js';
import { months, sokoColors, streetGroupDisplay } from './domain.js';
import { state } from './state.js';
import { selectedCitizen, selectedTemplate, selectedSender, selectedMember, selectedStreet, filteredCitizens, activeCitizens } from './assignment.js';
import { field, emailField, ibanField, selectField, textField, checkField, radioField, streetRuleRows, statusPill, assignmentPill, confirmDialog, gridHost, groupOptions, sokoSelectOptions, senderOptions, templateOptions, occasionOptions, formatOptions } from './fields.js';
import { streetMapSvg, addressPointData, assignedAddressPoints } from './map.js';
import { documentPreview } from './documents.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen

export const viewTitles = {
  citizens: "Jubilare prüfen",
  soko: "Stammdaten: SOKO",
  regions: "Stammdaten: SOKO Straßen & Zuständigkeit",
  map: "SOKO-Straßenkarte",
  senders: "Stammdaten: Absender",
  templates: "Stammdaten: Vorlagen",
  documents: "Dokumentlauf",
  import: "LABO-Import"
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

export const views = {
  citizens: () => {
    const citizens = filteredCitizens();
    const citizen = citizens.find(item => item.id === state.selectedCitizenId) || citizens[0];
    return `
      <div class="toolbar">
        <label class="toolbar-label">Geburtsmonat</label>
        <select name="month" data-filter style="width:130px">${months.map(month => `<option value="${month[0]}" ${state.filters.month === month[0] ? "selected" : ""}>${month[1]}</option>`).join("")}</select>
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <select name="age" data-filter>
          ${[["alle", "Alle Alter"], ["85", "85 Jahre"], ["90plus", "90+"], ["100", "100+"]].map(option => `<option value="${option[0]}" ${state.filters.age === option[0] ? "selected" : ""}>${option[1]}</option>`).join("")}
        </select>
      </div>
      <div class="${citizen ? "citizen-split" : ""}" ${citizen ? `style="--citizen-left:${state.citizenSplit}%"` : ""}>
        <section class="panel">
          <h2>Jubilare</h2>
          ${gridHost("citizens", 500)}
        </section>
        ${citizen ? `<div class="vertical-splitter" data-splitter="citizen" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.citizenSplit}" tabindex="0"></div>
        <section class="panel">
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
            ${selectField("wish", "Glückwünsche", citizen.wish, [["Besuch erwünscht", "Besuch erwünscht"], ["per Post", "per Post"], ["keine", "keine"], ["offen", "offen"]], "full")}
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
              <button type="button" class="primary-button" data-action="save-citizen">Speichern</button>
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
              ${field("street", "Adresse", member.street, "text", "full")}
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
          <button type="button" class="ghost-button" data-action="export-docs">PDF/XLSX/XML Export</button>
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
          ${docs.length ? gridHost("documents", 500) : `<div class="empty-state">Kein Dokumentlauf erzeugt</div>`}
        </section>
        <section class="panel">
          <h2>Seriendruck-Vorschau</h2>
          ${documentPreview(previewTemplate, previewCitizen, previewSender)}
        </section>
      </div>
      <div class="print-pages print-only">
        ${docs.length ? `<!-- Druckseiten werden beim Drucken generiert -->` : ""}
      </div>
    `;
  },

  import: () => `
    <div class="stack">
      <section class="panel">
        <h2>CSV-Import</h2>
        <div class="form-grid">
          <div class="field full">
            <div class="file-action-row">
              <label class="file-picker" for="import-file">
                <span>Aus CSV laden</span>
                <em>${state.importText ? "Datei geladen oder Daten eingefügt" : "Noch keine Datei geladen"}</em>
              </label>
              <button type="button" class="ghost-button" data-action="sample-import">Beispiel laden</button>
            </div>
            <input id="import-file" class="file-input" type="file" accept=".csv,text/csv">
          </div>
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
  `
};
