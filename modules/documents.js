import { escapeHtml, normalize, byId, todayIso, calculateAge, formatDate, formatDateDe, toast } from './utils.js';
import { state, saveData } from './state.js';
import { groupForCitizen, selectedCitizen, selectedTemplate, selectedSender } from './assignment.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen
import { qrCodeSvg } from './qr.js';
import { SOKO_QR_BOX, sokoQuestionnaireCode } from './sokoQuestionnaire.js';

export const letterSalutation = salutation => salutation === "Herr"
  ? "Sehr geehrter Herr"
  : salutation === "Frau" ? "Sehr geehrte Frau" : "Sehr geehrte Damen und Herren";

export const renderTemplate = (template = selectedTemplate(), citizen = selectedCitizen(), sender = selectedSender()) => {
  const group = groupForCitizen(citizen);
  const replacements = {
    anrede: letterSalutation(citizen.salutation),
    vorname: citizen.firstName,
    nachname: citizen.lastName,
    strasse: `${citizen.street} ${citizen.houseNo}`,
    plz: citizen.postalCode,
    ortsteil: citizen.district,
    geburtstag: formatDate(new Date(Number(todayIso().slice(0, 4)), new Date(citizen.birthDate).getMonth(), new Date(citizen.birthDate).getDate())),
    alter: calculateAge(citizen.birthDate),
    soko: group?.id || "offen",
    absender: sender.name
  };
  const replace = text => Object.entries(replacements).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), text);
  return { subject: replace(template.subject), body: replace(template.body), group };
};

export const documentFormat = template => {
  const value = normalize(template.format);
  const size = value.includes("quadrat") || value.includes("square") ? "square" : value.includes("a5") ? "a5" : "a4";
  const orientation = value.includes("quer") || value.includes("landscape") ? "landscape" : "portrait";
  return { className: `format-${size}${orientation === "landscape" ? "-landscape" : ""}`, orientation, size };
};
export const printFormatClass = template => documentFormat(template).className;
export const documentDesignClass = template => {
  const format = documentFormat(template);
  if (format.size === "square") return "square-greeting-card";
  return format.size === "a5" && normalize(template.occasion) === "geburtstag" ? "birthday-card" : "";
};
export const templateBackgroundImage = template => String(template.backgroundImage || "").trim();
export const templateBackBackgroundImage = template => String(template.backBackgroundImage || "").trim();
const templateBackgroundLayer = backgroundImage => {
  return backgroundImage ? `<img class="template-background-image" src="${escapeHtml(backgroundImage)}" alt="" aria-hidden="true">` : "";
};
const squareGreetingContent = (subject, body, signature) => `
  <div class="square-greeting" style="position:absolute;top:113mm;right:0;bottom:38mm;left:0;box-sizing:border-box;padding:8mm 18mm 0;overflow:hidden;font-family:Arial,sans-serif">
    <div class="doc-title" style="font-weight:800;font-size:12pt;line-height:1.18;margin:0 0 3mm;color:#173b38">${escapeHtml(subject)}</div>
    <div class="doc-body" style="font-size:9.5pt;line-height:1.32;white-space:pre-wrap">${escapeHtml(body)}</div>
    <div class="signature" style="margin-top:3mm;font-size:14pt;color:#0f5d58;font-family:'Segoe Script','Brush Script MT',cursive">${escapeHtml(signature)}</div>
  </div>`;
const squareBackAddress = citizen => {
  const sokoLabel = normalize(citizen.wish || "").startsWith("besuch")
    ? (groupForCitizen(citizen)?.id?.replace("SOKO ", "") || "")
    : "P";
  const birthDay = citizen.birthDate?.slice(8, 10) || "";
  return `
    <div>${escapeHtml(citizen.salutation || "")} ${escapeHtml(citizen.firstName || "")} ${escapeHtml(citizen.lastName || "")}</div>
    <div>${escapeHtml(citizen.street || "")} ${escapeHtml(citizen.houseNo || "")}</div>
    <div>${escapeHtml(citizen.postalCode || "")} Berlin-${escapeHtml(citizen.district || "")}</div>
    <div class="square-back-meta" style="font-size:8.5pt;margin-top:1mm">${escapeHtml(sokoLabel)}&nbsp;&nbsp;${escapeHtml(birthDay)}</div>
  `;
};
export const compactBirthdayCardBody = citizen => [
  `${citizen.salutation} ${citizen.lastName},`,
  `zu Ihrem ${calculateAge(citizen.birthDate)}. Geburtstag gratulieren wir sehr herzlich.`,
  "Für das neue Lebensjahr wünschen wir Gesundheit, Zuversicht und viele gute Begegnungen."
].join("\n\n");
export const printPageSettings = format => {
  const value = normalize(format);
  if (value.includes("quadrat") || value.includes("square")) return { size: "210mm 210mm", className: "format-square" };
  if (value.includes("a5") && (value.includes("quer") || value.includes("landscape"))) return { size: "A5 landscape", className: "format-a5-landscape" };
  if (value.includes("a5")) return { size: "A5 portrait", className: "format-a5" };
  if (value.includes("quer") || value.includes("landscape")) return { size: "A4 landscape", className: "format-a4-landscape" };
  return { size: "A4 portrait", className: "format-a4" };
};

export const documentPreview = (template = selectedTemplate(), citizen = selectedCitizen(), sender = selectedSender()) => {
  if (!citizen) return `<div class="empty-state">Kein Jubilar ausgewählt</div>`;
  const format = documentFormat(template);
  const designClass = documentDesignClass(template);
  const isCompactCard = designClass && format.orientation === "landscape";
  const isSquareGreetingCard = format.size === "square";
  const backgroundImage = templateBackgroundImage(template);
  const hasTemplateBackground = !!backgroundImage;
  const rendered = renderTemplate(template, citizen, sender);
  const body = isCompactCard ? compactBirthdayCardBody(citizen) : rendered.body;
  return `
    <div class="document-preview ${format.className} ${designClass} ${isCompactCard ? "compact-card" : ""}">
      <div class="document-sheet ${hasTemplateBackground ? "has-template-background" : ""}">
        ${!isSquareGreetingCard ? templateBackgroundLayer(backgroundImage) : ""}
        ${designClass === "birthday-card" ? `<div class="card-age-mark" aria-hidden="true">${escapeHtml(calculateAge(citizen.birthDate))}</div>` : ""}
        ${isSquareGreetingCard ? `
          ${backgroundImage ? `<img class="square-card-preview-image" src="${escapeHtml(backgroundImage)}" alt="" aria-hidden="true">` : ""}
          ${squareGreetingContent(rendered.subject, body, sender.signature)}
        ` : `
          <div class="document-content">
            <div class="doc-letterhead" style="border-color:${escapeHtml(sender.color)}">
              <div>
                <strong style="color:${escapeHtml(sender.color)}">${escapeHtml(sender.logo)}</strong>
                <div class="doc-address">${escapeHtml(sender.department)}<br>${escapeHtml(sender.address)}</div>
              </div>
              <div class="doc-meta">${escapeHtml(sender.phone)}<br>${escapeHtml(sender.email)}</div>
            </div>
            <div class="doc-address">
              ${escapeHtml(citizen.salutation)} ${escapeHtml(citizen.firstName)} ${escapeHtml(citizen.lastName)}<br>
              ${escapeHtml(citizen.street)} ${escapeHtml(citizen.houseNo)}<br>
              ${escapeHtml(citizen.postalCode)} Berlin
            </div>
            <div class="doc-title">${escapeHtml(rendered.subject)}</div>
            <div class="doc-body">${escapeHtml(body)}</div>
            <div class="signature">${escapeHtml(sender.signature)}</div>
          </div>
        `}
      </div>
    </div>
  `;
};

export const documentBackPreview = (template = selectedTemplate(), citizen = selectedCitizen(), options = {}) => {
  if (!citizen) return "";
  const includeBlank = options.includeBlank ?? false;
  const format = documentFormat(template);
  const isSquareGreetingCard = format.size === "square";
  const backgroundImage = templateBackBackgroundImage(template);
  if (!includeBlank && !isSquareGreetingCard && !backgroundImage) return "";
  return `
    <div class="document-preview document-back-preview ${format.className} ${isSquareGreetingCard ? "square-card-back" : ""}">
      <div class="document-sheet ${backgroundImage ? "has-template-background" : ""}">
        ${isSquareGreetingCard ? `
          <div class="square-back-content">
            ${backgroundImage ? `<img class="square-card-preview-image" src="${escapeHtml(backgroundImage)}" alt="" aria-hidden="true">` : ""}
            <div class="square-back-address">${squareBackAddress(citizen)}</div>
          </div>
        ` : templateBackgroundLayer(backgroundImage)}
      </div>
    </div>
  `;
};

export const printSquareCardPage = (template, citizen, sender) => {
  const rendered = renderTemplate(template, citizen, sender);
  const backgroundImage = templateBackgroundImage(template);
  const bgImg = state.printBackground && backgroundImage
    ? `<img src="${escapeHtml(backgroundImage)}" style="position:absolute;top:0;left:0;width:210mm;height:210mm;display:block" alt="">`
    : "";
  return `
  <div style="position:relative;width:210mm;height:210mm;page-break-after:always;break-after:page;background:#fff">
    ${bgImg}
    ${squareGreetingContent(rendered.subject, rendered.body, sender.signature)}
  </div>`;
};
export const printSquareCardBack = (template, citizen) => {
  const backgroundImage = templateBackBackgroundImage(template);
  const bgImg = state.printBackground && backgroundImage
    ? `<img src="${escapeHtml(backgroundImage)}" style="position:absolute;top:0;left:0;width:210mm;height:210mm;display:block" alt="">`
    : "";
  return `
  <div style="position:relative;width:210mm;height:210mm;page-break-after:always;break-after:page;background:#fff;transform:rotate(180deg);transform-origin:center center">
    ${bgImg}
    <div style="position:absolute;left:20mm;top:168mm;font-size:10.5pt;font-family:Arial,sans-serif;line-height:6.5mm">
      ${squareBackAddress(citizen)}
    </div>
  </div>`;
};
export const printDocumentPages = () => state.generatedDocs.map(doc => {
  const citizen = byId(state.data.citizens, doc.citizenId);
  const template = byId(state.data.templates, doc.templateId) || selectedTemplate();
  const sender = byId(state.data.senders, doc.senderId) || selectedSender();
  if (!citizen) return "";
  const format = documentFormat(template);
  const printTemplate = state.printBackground ? template : { ...template, backgroundImage: "", backBackgroundImage: "" };
  const frontPage = `<section class="print-page ${printFormatClass(template)}">${documentPreview(printTemplate, citizen, sender)}</section>`;
  const backPage = documentBackPreview(printTemplate, citizen, { includeBlank: false });
  return format.size === "square"
    ? printSquareCardPage(printTemplate, citizen, sender) + printSquareCardBack(printTemplate, citizen)
    : `${frontPage}${backPage ? `<section class="print-page ${printFormatClass(template)}">${backPage}</section>` : ""}`;
}).join("");

export const preparePrint = () => {
  const firstDoc = state.generatedDocs[0];
  if (!firstDoc) return false;
  const template = byId(state.data.templates, firstDoc.templateId) || selectedTemplate();
  const settings = printPageSettings(template.format);
  document.body.classList.remove("print-format-a4", "print-format-a4-landscape", "print-format-a5", "print-format-a5-landscape", "print-format-square");
  document.body.classList.add(`print-${settings.className}`);
  document.getElementById("dynamic-print-style")?.remove();
  const style = document.createElement("style");
  style.id = "dynamic-print-style";
  style.textContent = `@media print { @page { size: ${settings.size}; margin: 0; } }`;
  document.head.append(style);
  return true;
};
export const completePrintRun = () => {
  const printedIds = new Set(state.generatedDocs.map(doc => doc.citizenId));
  if (!printedIds.size) return;
  state.data.citizens = state.data.citizens.map(citizen => printedIds.has(citizen.id)
    ? { ...citizen, status: "gedruckt", printedAt: todayIso(), printedAge: calculateAge(citizen.birthDate), printedYear: Number(todayIso().slice(0, 4)), updatedAt: todayIso() }
    : citizen);
  state.generatedDocs = [];
  state.selectedCitizenId = state.data.citizens.find(c => c.status !== "gedruckt")?.id || "";
  saveData();
  render();
  toast(`${printedIds.size} Jubilare als gedruckt vermerkt.`);
};
export const printCurrentRun = () => {
  if (!state.generatedDocs.length) {
    toast("Bitte zuerst einen Dokumentlauf erzeugen.");
    return;
  }
  const firstDoc = state.generatedDocs[0];
  const template = byId(state.data.templates, firstDoc.templateId) || selectedTemplate();
  const settings = printPageSettings(template.format);
  const pages = printDocumentPages();
  const html = `<!doctype html><html lang="de"><head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #888; }
      @page { size: ${settings.size}; margin: 0; }
      @media print { body { background: none; } }
    </style>
  </head><body>${pages}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = globalThis.open(url, "_blank", "width=900,height=700");
  w.addEventListener("load", () => {
    URL.revokeObjectURL(url);
    w.addEventListener("afterprint", () => {
      w.close();
      state.dialog = { type: "confirm-print", title: "Druck abgeschlossen?", message: "Wurden alle Dokumente erfolgreich gedruckt?", cancelLabel: "Nein", confirmLabel: "Ja", confirmAction: "confirm-complete-print", destructive: false };
      render();
    }, { once: true });
    const imgs = [...w.document.querySelectorAll("img")];
    let pending = imgs.filter(i => !i.complete).length;
    const doPrint = () => { w.focus(); w.print(); };
    if (pending === 0) {
      doPrint();
    } else {
      imgs.forEach(img => {
        if (!img.complete) {
          img.addEventListener("load", () => { if (--pending === 0) doPrint(); }, { once: true });
          img.addEventListener("error", () => { if (--pending === 0) doPrint(); }, { once: true });
        }
      });
    }
  }, { once: true });
};

export const renderSokoQuittung = (citizens, groupId = "", betragProPerson = "8,50", telefon = "90294 4055", monat = "", kapitel = "3930", titel = "68154") => {
  const today = formatDateDe(todayIso());
  const month = monat || todayIso().slice(5, 7);
  const leader = state.data.sokoMembers.find(m => m.isLeader && m.groupId === groupId);
  const leaderAddr = [leader?.street, [leader?.postalCode, leader?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const leaderLine = leader ? `${escapeHtml(leader.salutation)} ${escapeHtml(leader.firstName)} ${escapeHtml(leader.lastName)}, ${escapeHtml(leaderAddr)}` : "";
  const sokoLabel = groupId ? `Soko ${escapeHtml(groupId.replace(/^SOKO\s+/i, ""))}` : "Soko";
  const ROW_COUNT = 12;
  const b = "border:1px solid #333";
  const td = (style, content = "") => `<td style="${b};${style}">${content}</td>`;
  const betragNum = Number.parseFloat(betragProPerson.replace(",", ".")) || 0;
  const summe = (citizens.length * betragNum).toFixed(2).replace(".", ",");
  const rows = Array.from({ length: ROW_COUNT }, (_, i) => {
    const c = citizens[i];
    const age = c ? calculateAge(c.birthDate) : "";
    const name = c ? `${escapeHtml(c.lastName)}, ${escapeHtml(c.firstName)}, ${escapeHtml(c.street)} ${escapeHtml(c.houseNo)}, ${escapeHtml(c.postalCode)} Berlin` : "&nbsp;";
    return `<tr>
      ${td("padding:1mm 2mm;width:8mm;height:8mm;text-align:center", i + 1)}
      ${td("padding:1mm 2mm;border-left:0;", name)}
      ${td("padding:1mm 2mm;border-left:0;width:28mm;text-align:right", c ? `${betragProPerson} €` : "")}
      ${td("padding:1mm 2mm;border-left:0;width:22mm;", age ? `${age}. Geb.` : "")}
    </tr>`;
  }).join("");
  const label = (text) => `<div style="font-size:7.5pt;color:#555;margin-bottom:1mm">${text}</div>`;
  return `
  <div style="font-family:Arial,sans-serif;font-size:9pt;width:210mm;min-height:297mm;padding:12mm 15mm;box-sizing:border-box;background:white;page-break-after:always">
    <table style="width:100%;border-collapse:collapse;margin-bottom:3mm"><tr>
      <td style="${b};padding:2mm 3mm;width:55%">${label("Stellenzeichen")}FinPersBüD Senioren 9 / ${sokoLabel}</td>
      <td style="${b};border-left:0;padding:2mm 3mm;width:25%">${label("Telefon")}${escapeHtml(telefon)}</td>
      <td style="${b};border-left:0;padding:2mm 3mm;width:20%">${label("Datum")}${today}</td>
    </tr></table>
    <h2 style="font-size:12pt;font-weight:bold;margin:0 0 3mm">Quittung der Sozialkommission</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:2mm"><tr>
      <td style="${b};padding:2mm;width:38%">${label("Gesamtbetrag Euro")}<strong>${summe} €</strong></td>
      <td style="${b};border-left:0;padding:2mm;width:12%">${label("Kapitel")}${escapeHtml(kapitel)}</td>
      <td style="${b};border-left:0;padding:2mm;width:12%">${label("Titel")}${escapeHtml(titel)}</td>
      <td style="${b};border-left:0;padding:2mm;width:38%">${label("Zahlungs-Beweis Nr.")}<div style="height:6mm"></div></td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:2mm"><tr>
      <td style="${b};padding:2mm;width:55%">${label("Empfangsberechtigt (Vorname, Name, Anschrift)")}${leaderLine}</td>
      <td style="${b};border-left:0;padding:3mm;width:45%;text-align:center;font-weight:bold">zur Weiterzahlung an<br>untengenannte Personen</td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:2mm"><tr>
      <td style="${b};padding:2mm;width:50%">${label("Zahlungspartner-Nummer")}${escapeHtml(leader?.zpNr || "")}<div style="height:5mm"></div></td>
      <td style="${b};border-left:0;padding:2mm;width:50%">${label("Kurzzeichen")}<div style="height:5mm"></div></td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:3mm"><tr>
      <td style="padding:2mm 0;width:60%"><span style="font-size:7.5pt;color:#555">Begründung: </span><strong>Zuwendung für Alters- und Ehejubilare</strong></td>
      <td style="${b};padding:2mm;width:40%">${label("Monat")}${month}</td>
    </tr></table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:4mm">
      <thead><tr>
        <th style="${b};padding:1.5mm 2mm;text-align:left;font-size:8pt;width:8mm">Lfd.<br>Nr.</th>
        <th style="${b};border-left:0;padding:1.5mm 2mm;text-align:left;font-size:8pt">Empfangsberechtigt (Name, Vorname, Anschrift)</th>
        <th style="${b};border-left:0;padding:1.5mm 2mm;text-align:left;font-size:8pt;width:28mm">Betrag (Euro)</th>
        <th style="${b};border-left:0;padding:1.5mm 2mm;text-align:left;font-size:8pt;width:22mm">Anlaß</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10mm"><tr>
      <td style="${b};padding:2mm 3mm;width:60%"><strong>Summe:</strong></td>
      <td style="${b};border-left:0;padding:2mm;width:40%;text-align:right;font-weight:bold">${summe} €</td>
    </tr></table>
    <h3 style="font-size:10pt;font-weight:bold;margin:0 0 1mm">Quittung der Sozialkommission</h3>
    <p style="font-size:8.5pt;margin:0 0 3mm">Obenstehenden Betrag habe ich erhalten und werde ihn für die genannten Anlässe verwenden.</p>
    <div style="${b};padding:2mm 3mm;width:55%;min-height:15mm">${label("Unterschrift und Datum")}</div>
  </div>`;
};

export const renderSokoForm = (citizen, index) => {
  const group = groupForCitizen(citizen);
  const age = calculateAge(citizen.birthDate);
  const month = citizen.birthDate ? citizen.birthDate.slice(5, 7) : "";
  const qrCode = qrCodeSvg(sokoQuestionnaireCode(citizen)).replace("<svg ", `<svg style="width:${SOKO_QR_BOX.size}mm;height:${SOKO_QR_BOX.size}mm;display:block;border:0;background:#fff" `);
  const page = "position:relative;width:210mm;height:297mm;box-sizing:border-box;font-family:Arial,sans-serif;font-size:9pt;line-height:1.15;color:#111;background:#fff;page-break-after:always;overflow:hidden";
  const pos = (left, top, width, height, extra = "") => `position:absolute;left:${left}mm;top:${top}mm;width:${width}mm;height:${height}mm;box-sizing:border-box;${extra}`;
  const box = (left, top, width, height, content = "", extra = "") => `<div style="${pos(left, top, width, height, `border:1px solid #111;${extra}`)}">${content}</div>`;
  const text = (left, top, width, height, content, extra = "") => `<div style="${pos(left, top, width, height, extra)}">${content}</div>`;
  const checkbox = label => `<span style="display:inline-block;width:4mm;height:4mm;border:1px solid #111;vertical-align:-.9mm;margin-right:2mm"></span>${label}`;
  const addr = `
    <div>${escapeHtml(citizen.salutation || "")} ${escapeHtml(citizen.firstName || "")} ${escapeHtml(citizen.lastName || "")}</div>
    <div>${escapeHtml(citizen.street || "")} ${escapeHtml(citizen.houseNo || "")}</div>
    <div>${escapeHtml(citizen.postalCode || "")} Berlin-${escapeHtml(citizen.district || "")}</div>
    ${citizen.phone ? `<div>${escapeHtml(citizen.phone)}</div>` : ""}
  `;
  return `
  <div style="${page}">
    ${text(15, 8, 102, 8, "Bezirksamt Reinickendorf von Berlin", "font-weight:bold;font-size:14pt;white-space:nowrap")}
    ${text(15, 16, 82, 5, "Abt. Finanzen, Personal und B&uuml;rgerdienste", "font-size:8.5pt")}
    ${text(15, 22, 40, 5, "Senioren 2", "font-size:8.5pt")}
    ${text(15, 34, 82, 7, `UR Sozialkommission: <strong>${escapeHtml(group?.id || "")}</strong>`, "font-size:11pt")}
    ${text(SOKO_QR_BOX.left, SOKO_QR_BOX.top, SOKO_QR_BOX.size, SOKO_QR_BOX.size, qrCode, "background:#fff")}
    ${text(168, SOKO_QR_BOX.top + SOKO_QR_BOX.size + 1, 27, 4, escapeHtml(citizen.id || ""), "font-size:6.2pt;text-align:center;letter-spacing:.1pt")}

    ${box(104, 8, 27, 14, `<div>Datum</div><div style="margin-top:2mm">${formatDateDe(todayIso())}</div>`, "padding:1.2mm;font-size:8.5pt")}
    ${box(131, 8, 25, 14, `<div>Telefon</div><div style="margin-top:2mm">90294 4055</div>`, "padding:1.2mm;border-left:0;font-size:8.5pt")}
    ${box(156, 8, 39, 14, `<div>Geburtsdatum</div><div style="margin-top:3.2mm">${formatDateDe(citizen.birthDate)}</div>`, "padding:1.2mm;text-align:center;border-left:0;font-size:8.5pt")}
    ${box(104, 22, 91, 58, `${addr}<div style="position:absolute;right:4mm;bottom:1.5mm">${String(index + 1).padStart(3, "0")} / ${month}</div>`, "padding:3mm 25mm 3mm 3mm;line-height:1.25;font-size:9.5pt")}
    ${box(166, 80, 29, 9, `<div style="margin-top:2.4mm">Lfd. Nr. / Monat</div>`, "text-align:center;font-size:9pt;line-height:1.1")}

    ${box(14, 47, 86, 17, `${age}. Geburtstag d. nebenstehend Genannten`, "display:flex;align-items:center;justify-content:center;text-align:center;font-weight:bold;font-size:10.5pt")}
    ${box(104, 94, 48, 16, "Zutreffendes ist<br>angekreuzt", "display:flex;align-items:center;justify-content:center;text-align:center;font-weight:bold;font-size:11pt")}

    ${text(15, 77, 85, 7, "Sehr geehrte Damen und Herren,", "font-size:10.5pt")}
    ${text(15, 89, 92, 14, "bitte senden Sie mir diesen <strong>Fragebogen</strong><br><strong>innerhalb von drei Wochen</strong> ausgef&uuml;llt und unterschrieben zur&uuml;ck.", "font-size:10.5pt;line-height:1.18")}
    ${text(15, 108, 92, 7, "F&uuml;r weitere Angaben bitte die R&uuml;ckseite benutzen.", "font-size:10.5pt")}
    ${text(16, 121, 50, 7, "Ihre Gratulationsstelle", "font-size:10.5pt")}

    ${box(15, 134, 180, 7, "Von der Sozialkommission auszuf&uuml;llen", "display:flex;align-items:center;justify-content:center;font-size:11pt")}
    ${box(15, 141, 88, 33, `
      <div style="margin-bottom:6mm">Gl&uuml;ckw&uuml;nsche</div>
      <div style="display:flex;gap:10mm;margin-bottom:7mm">
        <span>${checkbox("per Post")}</span><span>${checkbox("Soko")}</span><span>${checkbox("keine")}</span>
      </div>
      <div>${checkbox("Ver&ouml;ffentlichung in der regionalen Presse *")}</div>
    `, "padding:2mm;font-size:9.8pt")}
    ${box(103, 141, 58, 33, `
      <div style="margin-bottom:2mm">Es steht bevor die</div>
      <div style="white-space:nowrap">${checkbox("Goldene Hochzeit&nbsp;&nbsp;&nbsp;(50 J.)")}</div>
      <div style="white-space:nowrap">${checkbox("Diamantene Hochzeit (60 J.)")}</div>
      <div style="white-space:nowrap">${checkbox("Eiserne Hochzeit&nbsp;&nbsp;&nbsp;&nbsp;(65 J.)")}</div>
      <div style="white-space:nowrap">${checkbox("Gnadenhochzeit&nbsp;&nbsp;&nbsp;(70 J.)")}</div>
    `, "padding:2mm;border-left:0;font-size:9.2pt;line-height:1.14")}
    ${box(161, 141, 34, 33, "am (Datum)", "padding:2mm;border-left:0;font-size:9.8pt")}
    ${box(15, 174, 88, 25, "Unterschrift der Sozialkommission und Datum", "padding:2mm;border-top:0;font-size:9.8pt")}
    ${box(103, 174, 92, 25, "Vorname des Ehegatten, ggf. abweichender Familienname", "padding:2mm;border-top:0;border-left:0;font-size:9.8pt")}

    ${box(15, 203, 180, 10, "", "")}
    ${box(15, 213, 180, 66, `
      <div style="font-size:11pt;text-decoration:underline;margin-bottom:17mm">*Datenschutzrechtliche Einwilligungserkl&auml;rung</div>
      <div style="font-size:9.2pt;line-height:1.22;text-decoration:none">
        Die Soko-Mitarbeiterin/der Soko-Mitarbeiter hat die Jubilarin/den Jubilar darauf hingewiesen, dass
        die im Rahmen der vorstehend genannten Zwecke erhobenen pers&ouml;nlichen Daten Ihrer Person unter
        Beachtung der EU-Datenschutzgrundverordnung und des Berliner Datenschutzgesetzes erhoben,
        verarbeitet und genutzt werden. Sie sind zudem darauf hingewiesen worden, dass die Erhebung,
        Verarbeitung und Nutzung Ihrer Daten auf freiwilliger Basis erfolgt und die Einwilligung auch
        verweigert werden kann. Die Verweigerung der Einwilligung f&uuml;hrt dazu, dass keine Pressemitteilung
        ver&ouml;ffentlicht wird. Es besteht jederzeit die M&ouml;glichkeit, die Einwilligung zu widerrufen. Mit der
        Unterschrift der Soko-Mitarbeiterin/des Soko-Mitarbeiters wird best&auml;tigt, dass die Einwilligung zur
        Verarbeitung der personenbezogenen Daten m&uuml;ndlich/telefonisch gegeben wurde.
      </div>
    `, "padding:2mm;border-top:0")}
  </div>`;
};
