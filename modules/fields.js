import { escapeHtml, isValidEmail, normalizeIban, isValidIban } from './utils.js';
import { sokoCodesFromDirectory, sokoGroupId, defaultData } from './domain.js';
import { state, mergeById } from './state.js';
import { groupForCitizen } from './assignment.js';

export const field = (name, label, value, type = "text", extra = "", inputAttrs = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${inputAttrs}>
  </div>
`;
export const emailField = (name, label, value, extra = "") => {
  const valid = isValidEmail(value);
  return `
    <div class="field ${extra}">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" class="${valid ? "" : "invalid"}" type="email" value="${escapeHtml(value)}" placeholder="name@example.de" autocomplete="email">
      <small class="field-hint ${valid ? "" : "error"}">${String(value ?? "").trim() ? valid ? "E-Mail gültig" : "E-Mail-Adresse ist ungültig" : ""}</small>
    </div>
  `;
};
export const ibanField = (name, label, value, extra = "") => {
  const normalized = normalizeIban(value);
  const valid = !normalized || isValidIban(normalized);
  return `
    <div class="field ${extra}">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" class="${valid ? "" : "invalid"}" type="text" value="${escapeHtml(value)}" placeholder="DE89 3704 0044 0532 0130 00" autocomplete="off">
      <small class="field-hint ${valid ? "" : "error"}">${normalized ? valid ? "IBAN gültig" : "IBAN-Prüfziffer ist ungültig" : "Optional, mit IBAN-Prüfzifferprüfung"}</small>
    </div>
  `;
};
export const selectField = (name, label, value, options, extra = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <select id="${name}" name="${name}">
      ${options.map(option => `<option value="${escapeHtml(option[0])}" ${String(option[0]) === String(value) ? "selected" : ""}>${escapeHtml(option[1])}</option>`).join("")}
    </select>
  </div>
`;
export const textField = (name, label, value, extra = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea>
  </div>
`;
export const checkField = (name, label, value, extra = "") => `
  <div class="field ${extra}">
    <label class="toggle-label">
      <input type="hidden" name="${name}" value="false">
      <input id="${name}" type="checkbox" name="${name}" value="true" class="toggle" ${value === "true" || value === true ? "checked" : ""}>
      ${label}
    </label>
  </div>
`;
export const radioField = (name, label, value, options, extra = "") => `
  <div class="field ${extra}">
    <label>${escapeHtml(label)}</label>
    <div class="radio-group" role="group" aria-label="${escapeHtml(label)}">
      ${options.map(([optValue, optLabel]) => `
        <label class="radio-option">
          <input type="radio" name="${name}" value="${escapeHtml(optValue)}" ${String(value ?? "") === String(optValue) ? "checked" : ""}>
          ${escapeHtml(optLabel)}
        </label>
      `).join("")}
    </div>
  </div>
`;

export const streetRuleArtOptions = () => [["F", "fortlaufend"], ["G", "gerade"], ["U", "ungerade"]];
export const streetRuleRows = street => `
  <div class="street-rule-list field full">
    <label>Abschnitte und Zuständigkeit</label>
    <div class="street-rule-head">
      <span>PLZ</span><span>Ortsteil</span><span>von</span><span>bis</span><span>Art</span><span>SOKO</span><span></span>
    </div>
    ${(street.rules?.length ? street.rules : [{ id: "new" }]).map((rule, index) => `
      <div class="street-rule-row" data-rule-row>
        <input type="hidden" name="ruleId" value="${escapeHtml(rule.id || `new-${index}`)}">
        <input name="plz" value="${escapeHtml(rule.plz || "")}" inputmode="numeric" placeholder="134...">
        <input name="ortsteil" value="${escapeHtml(rule.ortsteil || street.district || "")}">
        <input name="von" value="${escapeHtml(rule.von || "")}" placeholder="alle">
        <input name="bis" value="${escapeHtml(rule.bis || "")}" placeholder="alle">
        <select name="art">${streetRuleArtOptions().map(([value, label]) => `<option value="${value}" ${String(rule.art || "F") === value ? "selected" : ""}>${label}</option>`).join("")}</select>
        <select name="soko">${sokoCodesFromDirectory().map(code => `<option value="${code}" ${String(rule.soko || "").padStart(2, "0") === code ? "selected" : ""}>${sokoGroupId(code)}</option>`).join("")}</select>
        <button type="button" class="ghost-button" data-action="delete-street-rule" data-rule-id="${escapeHtml(rule.id || `new-${index}`)}">Löschen</button>
      </div>
    `).join("")}
  </div>
`;

export const statusPill = status => {
  const color = status === "offen" ? "#d09b2c"
    : status === "importiert" ? "#315a8c"
    : status === "geprüft" ? "#2f7d4f"
    : status === "gedruckt" ? "#0f5d58"
    : "#66706d";
  return status === "offen"
    ? `<span class="pill gold">${escapeHtml(status)}</span>`
    : `<span class="pill" style="background:color-mix(in srgb, ${color} 16%, white);color:${color};border:1px solid color-mix(in srgb, ${color} 28%, white)">${escapeHtml(status)}</span>`;
};
export const assignmentPill = citizen => {
  const group = groupForCitizen(citizen);
  return group ? `<span class="pill">${escapeHtml(group.id)}</span>` : `<span class="pill red">offen</span>`;
};
export const confirmDialog = () => state.dialog ? `
  <div class="dialog-backdrop" role="presentation">
    <section class="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1">
      <div class="dialog-icon">!</div>
      <div>
        <h2 id="dialog-title">${escapeHtml(state.dialog.title)}</h2>
        <p>${escapeHtml(state.dialog.message)}</p>
        <div class="dialog-actions">
          <button type="button" class="ghost-button" data-action="close-dialog" data-autofocus>${escapeHtml(state.dialog.cancelLabel || "Abbrechen")}</button>
          <button type="button" class="${state.dialog.destructive === false ? "primary-button" : "danger-button"}" data-action="${escapeHtml(state.dialog.confirmAction)}">${escapeHtml(state.dialog.confirmLabel)}</button>
        </div>
      </div>
    </section>
  </div>
` : "";
export const gridHost = (name, height) => {
  const style = height ? ` style="height:${height}px"` : "";
  return `<div class="ag-grid-host" data-grid="${name}"${style}></div>`;
};

export const sokoSelectionGroups = () => mergeById(state.data.sokoGroups, defaultData.sokoGroups, group => defaultData.sokoGroups.some(defaultGroup => defaultGroup.id === group.id));
export const sokoSelectOptions = () => sokoSelectionGroups().map(group => [group.id, `${group.id} ${group.region}`]);
export const groupOptions = () => [["alle", "Alle SOKO-Gruppen"], ...sokoSelectionGroups().map(group => [group.id, group.id])];
export const senderOptions = () => state.data.senders.map(sender => [sender.id, sender.role]);
export const templateOptions = () => state.data.templates.map(template => [template.id, template.name]);
export const occasionOptions = () => [["Geburtstag", "Geburtstag"], ["Jubiläum", "Jubiläum"], ["Einladung", "Einladung"]];
export const formatOptions = () => [["DIN A4 Brief", "DIN A4 Brief"], ["DIN A4 quer", "DIN A4 quer"], ["A5 Karte", "A5 Karte"], ["A5 Karte quer", "A5 Karte quer"], ["Quadratkarte 210 mm", "Quadratkarte 210 mm"]];
