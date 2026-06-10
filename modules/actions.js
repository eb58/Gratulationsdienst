import { $, todayIso, isValidEmail, isValidIban, formatIban, updateItem, nextId, csvEscape, formatStreetAddress, downloadText, calculateAge, toast, byId } from './utils.js';
import { normalizeStreetRules, streetDistrictSummary, streetGroupSummary, normalizeStreetDistrict, sampleData } from './domain.js';
import { state, saveData } from './state.js';
import { streetAssignment, filteredCitizens, documentCitizens, duplicateKey, isPrintedCitizen, selectedTemplate, selectedSender, activeCitizens } from './assignment.js';
import { printCurrentRun, completePrintRun, renderSokoForm } from './documents.js';
import { parseCsv, mapImportRow } from './import.js';
import { render } from './render.js';

const formValues = selector => Object.fromEntries(new FormData($(selector)).entries());
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

export const actions = {
  "reset-data": () => {
    state.data = structuredClone(sampleData);
    state.generatedDocs = [];
    saveData();
    render();
    toast("Beispieldaten wurden neu geladen.");
  },
  "select-citizen": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-citizen": () => {
    const values = formValues("#citizen-form");
    if (!validateEmailFields("#citizen-form")) { toast("Bitte eine gültige E-Mail-Adresse eingeben."); return; }
    const currentList = filteredCitizens();
    const currentIndex = currentList.findIndex(citizen => citizen.id === values.id);
    state.data.citizens = updateItem(state.data.citizens, values.id, { ...values, updatedAt: todayIso(), status: "geprüft" });
    const nextCitizen = currentList[currentIndex + 1] || currentList[0];
    state.selectedCitizenId = nextCitizen?.id || values.id;
    saveData();
    render();
    toast("Jubilar gespeichert.");
  },
  "select-member": event => {
    state.selectedMemberId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "new-member": () => {
    const id = nextId("S", state.data.sokoMembers);
    const member = { id, salutation: "Frau", firstName: "", lastName: "", groupId: state.data.sokoGroups[0].id, street: "", phone: "", mobile: "", email: "", bank: "", allowance: "35,00", termFrom: todayIso(), termTo: "2028-12-31", billingAmount: "15,00", isLeader: false };
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
  "soko-print": () => {
    const citizens = activeCitizens();
    if (!citizens.length) { toast("Keine Jubilare vorhanden."); return; }
    const base = globalThis.location.href.replace(/[^/]*$/, "");
    const imageSrc = `${base}assets/fragebogen-soko.png`;
    const forms = citizens.map((c, i) => renderSokoForm(c, i, imageSrc)).join("");
    const html = `<!doctype html><html lang="de"><head>
      <meta charset="utf-8">
      <title>SOKO-Fragebogen</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #888; }
        @page { size: A4 portrait; margin: 0; }
        @media print { body { background: none; } }
      </style>
    </head><body>${forms}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = globalThis.open(url, "_blank", "width=900,height=700");
    w.addEventListener("load", () => { URL.revokeObjectURL(url); setTimeout(() => { w.focus(); w.print(); }, 400); }, { once: true });
  },
  "export-docs": () => {
    const header = ["id", "empfaenger", "adresse", "soko", "vorlage", "absender", "datum"];
    const rows = state.generatedDocs.map(doc => [doc.id, doc.recipient, doc.address, doc.groupId, doc.templateName, doc.sender, doc.createdAt]);
    downloadText("dokumentlauf.csv", [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n"), "text/csv;charset=utf-8");
  },
  "sample-import": () => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const p2 = n => String(n).padStart(2, "0");
    const deAscii = s => s.replaceAll("ä","ae").replaceAll("ö","oe").replaceAll("ü","ue").replaceAll("ß","ss");
    const femaleNames = ["Lena","Clara","Ilse","Erika","Hannelore","Marlies","Sabine","Gertrud","Elfriede","Hildegard","Irmgard","Lieselotte","Margarete","Ursula","Brigitte","Renate","Ingrid","Christa","Waltraud","Hedwig","Anni","Ruth","Hilde","Erna","Frieda"];
    const maleNames = ["Martin","Rolf","Bernd","Kurt","Günter","Hans","Werner","Heinz","Horst","Gerhard","Helmut","Walter","Friedrich","Karl","Wilhelm","Herbert","Manfred","Dieter","Klaus","Joachim","Otto","Ernst","Georg","Rudolf","Willi"];
    const lastNames = ["Bachmann","Feldmann","Wegner","Henning","Keller","Sommer","Brandes","Seifert","Lorenz","Pohl","Mertens","Reuter","Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Krause","Hoffmann","Schäfer","Bauer","Koch","Richter","Klein","Wolf","Schröder","Neumann","Zimmermann","Braun","Hartmann","Lange","Schwarz","Krüger","Peters","Schulz"];
    const realAddresses = (window.REINICKENDORF_ADDRESS_POINTS?.addresses || []).filter(a => a.street && a.houseNumber && a.postalCode && a.soko);
    const rangeEntries = Object.entries(window.SOKO_STRASSENVERZEICHNIS || {})
      .flatMap(([street, entries]) => entries.map(entry => ({ street, ...entry })))
      .filter(entry => entry.von && entry.bis && entry.bis !== "999" && Number.isFinite(parseInt(entry.von, 10)) && Number.isFinite(parseInt(entry.bis, 10)));
    const streetEntries = rangeEntries.length ? rangeEntries : [{ street: "Alt-Lübars", plz: "13469", ortsteil: "Lübars", von: "1", bis: "99", art: "F" }];
    const houseNoForEntry = entry => {
      const from = parseInt(entry.von, 10);
      const to = Math.min(parseInt(entry.bis, 10), 220);
      const numbers = Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)
        .filter(number => entry.art === "G" ? number % 2 === 0 : entry.art === "U" ? number % 2 !== 0 : true);
      return String(pick(numbers.length ? numbers : [from]));
    };
    const fallbackAddress = (attempt = 0) => {
      const entry = pick(streetEntries);
      const houseNo = houseNoForEntry(entry);
      try {
        window.findeSoko?.(entry.street, houseNo, entry.plz);
        return { street: entry.street, houseNo, plz: entry.plz, district: entry.ortsteil };
      } catch {
        return attempt < 100 ? fallbackAddress(attempt + 1) : { street: "Frohnauer Str.", houseNo: "21", plz: "13467", district: "Hermsdorf" };
      }
    };
    const validAddress = () => {
      const address = realAddresses.length ? pick(realAddresses) : null;
      return address ? { street: address.street, houseNo: address.houseNumber, plz: address.postalCode, district: address.district } : fallbackAddress();
    };
    const milestoneYears = [1921,1922,1923,1926,1931,1936,1941];
    const count = ri(8, 14);
    const lines = ["Anrede;Vorname;Nachname;Straße;Hausnummer;PLZ;Ortsteil;Geburtsdatum;Telefon;E-Mail"];
    Array.from({ length: count }).forEach(() => {
      const female = Math.random() < 0.5;
      const firstName = pick(female ? femaleNames : maleNames);
      const lastName = pick(lastNames);
      const address = validAddress();
      const year = pick(milestoneYears);
      const month = "07";
      const day = p2(ri(1, 28));
      const phone = Math.random() < 0.6 ? `030 ${ri(300,499)}${ri(1000,9999)}` : "";
      const email = Math.random() < 0.4 ? `${deAscii(firstName.toLowerCase())}.${deAscii(lastName.toLowerCase())}${ri(10,99)}@example.test` : "";
      lines.push(`${female ? "Frau" : "Herr"};${firstName};${lastName};${address.street};${address.houseNo};${address.plz};${address.district};${year}-${month}-${day};${phone};${email}`);
    });
    state.importText = lines.join("\n");
    actions["run-import"]();
  },
  "run-import": () => {
    if (!state.importText) { toast("Bitte zuerst eine CSV-Datei laden."); return; }
    const rows = parseCsv(state.importText);
    const mapped = rows.map(mapImportRow);
    const result = mapped.reduce((acc, row) => {
      const missing = !row.firstName || !row.lastName || !row.birthDate || !row.street;
      const key = duplicateKey(row);
      const duplicate = !missing && acc.keys.has(key);
      const printedDuplicate = duplicate && acc.printedKeys.has(key);
      const group = streetAssignment(row)?.groupId;
      const log = {
        time: new Date().toLocaleString("de-DE"),
        name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        address: formatStreetAddress(row),
        birthDate: row.birthDate || "",
        age: row.birthDate ? calculateAge(row.birthDate) : "",
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
        keys: missing || duplicate ? acc.keys : new Set([...acc.keys, key])
      };
    }, {
      rows: [],
      logs: [],
      duplicates: 0,
      printedDuplicates: 0,
      keys: new Set(state.data.citizens.map(duplicateKey)),
      printedKeys: new Set(state.data.citizens.filter(isPrintedCitizen).map(duplicateKey))
    });
    state.data.citizens = [...state.data.citizens, ...result.rows];
    state.data.importLog = [...result.logs, ...state.data.importLog];
    saveData();
    render();
    toast(result.printedDuplicates
      ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten gefunden, davon ${result.printedDuplicates} bereits gedruckt.`
      : result.duplicates
        ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten gefunden.`
        : `${result.rows.length} neue Datensätze importiert.`);
  },
  "select-generated": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  }
};
