import { escapeHtml, normalize, byId, todayIso, calculateAge, formatDate, formatDateDe, toast } from './utils.js';
import { state, saveData } from './state.js';
import { groupForCitizen, selectedCitizen, selectedTemplate, selectedSender } from './assignment.js';
import { render } from './render.js'; // Zyklus OK: render wird nur in Callbacks aufgerufen

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
export const compactBirthdayCardBody = citizen => [
  `{citizen.salutation} ${citizen.lastName},`,
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
  const rendered = renderTemplate(template, citizen, sender);
  const body = isCompactCard ? compactBirthdayCardBody(citizen) : rendered.body;
  return `
    <div class="document-preview ${format.className} ${designClass} ${isCompactCard ? "compact-card" : ""}">
      <div class="document-sheet">
        ${designClass === "birthday-card" ? `<div class="card-age-mark" aria-hidden="true">${escapeHtml(calculateAge(citizen.birthDate))}</div>` : ""}
        ${isSquareGreetingCard ? `
          <img class="square-card-preview-image" src="assets/gratulationskarte-reinickendorf-210.jpg" alt="" aria-hidden="true">
          <div class="square-greeting">
            <div class="doc-title">${escapeHtml(rendered.subject)}</div>
            <div class="doc-body">${escapeHtml(body)}</div>
            <div class="signature">${escapeHtml(sender.signature)}</div>
          </div>
        ` : `
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
        `}
      </div>
    </div>
  `;
};

export const printSquareCardPage = (template, citizen, sender) => {
  const rendered = renderTemplate(template, citizen, sender);
  const base = globalThis.location.href.replace(/[^/]*$/, "");
  const bgImg = state.printBackground
    ? `<img src="${base}assets/gratulationskarte-reinickendorf-210.jpg" style="position:absolute;top:0;left:0;width:210mm;height:210mm;display:block" alt="">`
    : "";
  return `
  <div style="position:relative;width:210mm;height:210mm;page-break-after:always;break-after:page;background:#fff">
    ${bgImg}
    <div style="position:absolute;top:113mm;right:0;bottom:38mm;left:0;box-sizing:border-box;padding:8mm 18mm 0;overflow:hidden">
      <div style="font-weight:800;font-size:12pt;line-height:1.18;margin:0 0 3mm;color:#173b38;font-family:Arial,sans-serif">${escapeHtml(rendered.subject)}</div>
      <div style="font-size:9.5pt;line-height:1.32;white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(rendered.body)}</div>
      <div style="margin-top:3mm;font-size:14pt;color:#0f5d58;font-family:'Segoe Script','Brush Script MT',cursive">${escapeHtml(sender.signature)}</div>
    </div>
  </div>`;
};
export const printSquareCardBack = citizen => {
  const base = globalThis.location.href.replace(/[^/]*$/, "");
  const bgImg = state.printBackground
    ? `<img src="${base}assets/gratulationskarte-reinickendorf-r%C3%BCckseite-210.jpg" style="position:absolute;top:0;left:0;width:210mm;height:210mm;display:block" alt="">`
    : "";
  const sokoLabel = normalize(citizen.wish || "").startsWith("besuch")
    ? (groupForCitizen(citizen)?.id?.replace("SOKO ", "") || "")
    : "P";
  const birthDay = citizen.birthDate?.slice(8, 10) || "";
  return `
  <div style="position:relative;width:210mm;height:210mm;page-break-after:always;break-after:page;background:#fff;transform:rotate(180deg);transform-origin:center center">
    ${bgImg}
    <div style="position:absolute;left:20mm;top:168mm;font-size:10.5pt;font-family:Arial,sans-serif;line-height:6.5mm">
      <div>${escapeHtml(citizen.salutation || "")} ${escapeHtml(citizen.firstName || "")} ${escapeHtml(citizen.lastName || "")}</div>
      <div>${escapeHtml(citizen.street || "")} ${escapeHtml(citizen.houseNo || "")}</div>
      <div>${escapeHtml(citizen.postalCode || "")} Berlin-${escapeHtml(citizen.district || "")}</div>
      <div style="font-size:8.5pt;margin-top:1mm">${escapeHtml(sokoLabel)}&nbsp;&nbsp;${escapeHtml(birthDay)}</div>
    </div>
  </div>`;
};
export const printDocumentPages = () => state.generatedDocs.map(doc => {
  const citizen = byId(state.data.citizens, doc.citizenId);
  const template = byId(state.data.templates, doc.templateId) || selectedTemplate();
  const sender = byId(state.data.senders, doc.senderId) || selectedSender();
  if (!citizen) return "";
  const format = documentFormat(template);
  return format.size === "square"
    ? printSquareCardPage(template, citizen, sender) + printSquareCardBack(citizen)
    : `<section class="print-page ${printFormatClass(template)}">${documentPreview(template, citizen, sender)}</section>`;
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
      state.dialog = { type: "confirm-print", title: "Druck abgeschlossen?", message: "Wurden alle Dokumente erfolgreich gedruckt?", confirmLabel: "Als gedruckt markieren", confirmAction: "confirm-complete-print" };
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
      <td style="${b};padding:2mm 3mm;width:55%">${label("Stellenzeichen")}FinPersBüD Senioren 9 / Soko</td>
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
      <td style="${b};padding:2mm;width:50%">${label("Zahlungspartner-Nummer")}<div style="height:5mm"></div></td>
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

export const renderSokoForm = (citizen, index, imageSrc) => {
  const group = groupForCitizen(citizen);
  const age = calculateAge(citizen.birthDate);
  const month = citizen.birthDate ? citizen.birthDate.slice(5, 7) : "";
  const at = (left, top, extra = "") => `position:absolute;left:${left}mm;top:${top}mm;font-size:9.5pt;font-family:Arial,sans-serif;${extra}`;
  return `
  <div style="position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;background:white">
    <img src="${imageSrc}" style="position:absolute;top:0;left:0;width:210mm;height:297mm;display:block">
    <span style="${at(106, 15)}">${formatDateDe(todayIso())}</span>
    <span style="${at(165, 21)}">${formatDateDe(citizen.birthDate)}</span>
    <div style="${at(110, 24)}line-height:5.5mm">
      <div>${escapeHtml(citizen.salutation || "")} ${escapeHtml(citizen.firstName || "")} ${escapeHtml(citizen.lastName || "")}</div>
      <div>${escapeHtml(citizen.street || "")} ${escapeHtml(citizen.houseNo || "")}</div>
      <div>${escapeHtml(citizen.postalCode || "")} Berlin-${escapeHtml(citizen.district || "")}</div>
      ${citizen.phone ? `<div>${escapeHtml(citizen.phone)}</div>` : ""}
    </div>
    <span style="${at(51, 27)}">${escapeHtml(group?.id || "")}</span>
    <span style="${at(168, 72)}">${String(index + 1).padStart(3, "0")} / ${month}</span>
    <span style="${at(17, 49)}font-size:11pt;font-weight:bold">${age}</span>
  </div>`;
};
