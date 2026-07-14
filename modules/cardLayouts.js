// Vorlagen-Layouts als JavaScript: pro Vorlagen-ID eine Renderfunktion, die den Inhalt der
// Vorderseite als HTML liefert. Kein Eintrag -> Standard-Layout. Die Fläche ist mm-getreu
// (Quadratkarte 210x210, A4 210x297, A5 148x210; quer entsprechend gedreht).
//
// Spielregeln für Layout-Funktionen:
// - Nur Inline-Styles in mm/pt verwenden - das Druckfenster lädt styles.css nicht.
// - subject/body kommen fertig: Platzhalter ersetzt, altersabhängiger Text gewählt, HTML-escaped.
// - citizen/sender sind rohe Objekte: eigene Feldzugriffe immer durch escapeHtml(...) schicken.
// - signatureHtml ist der fertige Unterschriftsblock (Bild oder Schreibschrift) zum Einbetten;
//   die Bild-Variante positioniert sich absolut am unteren Rand des nächsten positionierten Elternelements.

// Berliner Hausschrift, falls installiert; sonst greifen die Fallbacks.
const FONT = "'Berlin Type Office',Arial,sans-serif";
const FONT_SERIF = "'Berlin Type Office',Georgia,'Times New Roman',serif";

const letterhead = (sender, esc) => `
  <div style="display:flex;justify-content:space-between;gap:8mm;border-bottom:0.8mm solid ${esc(sender.color)};padding-bottom:4mm">
    <div>
      <div style="font-weight:800;font-size:14pt;color:${esc(sender.color)}">${esc(sender.logo)}</div>
      <div style="margin-top:1mm;font-size:9pt;line-height:1.4;color:#555">${esc(sender.department)}<br>${esc(sender.address)}</div>
    </div>
    <div style="font-size:9pt;line-height:1.4;color:#555;text-align:right">${esc(sender.phone)}<br>${esc(sender.email)}</div>
  </div>`;

const addressBlock = (citizen, esc) => `
  <div style="margin-top:12mm;font-size:10pt;line-height:1.5">
    ${esc(citizen.salutation)} ${esc(citizen.firstName)} ${esc(citizen.lastName)}<br>
    ${esc(citizen.street)} ${esc(citizen.houseNo)}<br>
    ${esc(citizen.postalCode)} Berlin
  </div>`;

// T-001: Quadratkarte 210 mm - Text im unteren Drittel, oben bleibt Platz für das Kartenmotiv.
const reinickendorfCard = ({ subject, body, signatureHtml }) => `
  <div class="card-layout" style="position:absolute;top:111mm;right:0;bottom:30mm;left:0;box-sizing:border-box;padding:7mm 18mm 6mm;overflow:hidden;font-family:${FONT}">
    <div style="margin:0 0 3mm;font-weight:800;font-size:12pt;line-height:1.18;color:#173b38">${subject}</div>
    <div style="font-size:9.5pt;line-height:1.32;white-space:pre-wrap">${body}</div>
    ${signatureHtml}
  </div>`;

// T-002: A5-Geburtstagskarte (148 x 210 mm) - große dezente Alterszahl als Schmuckelement.
const birthdayCardA5 = ({ subject, body, age, escapeHtml: esc, signatureHtml }) => `
  <div class="card-layout" style="position:absolute;inset:0;box-sizing:border-box;padding:16mm 14mm 12mm;overflow:hidden;font-family:${FONT_SERIF};color:#173b38;background:#fffdf7">
    <div style="position:absolute;top:4mm;right:8mm;font-weight:800;font-size:38pt;color:#0f5d58;opacity:0.16">${esc(age)}</div>
    <div style="margin-top:12mm;font-weight:800;font-size:14pt;line-height:1.25">${subject}</div>
    <div style="margin-top:7mm;font-size:10.5pt;line-height:1.5;white-space:pre-wrap">${body}</div>
    <div style="position:relative;height:16mm;margin-top:7mm">${signatureHtml}</div>
    <div style="position:absolute;left:14mm;right:14mm;bottom:8mm;border-top:0.4mm solid #0f5d58;opacity:0.35"></div>
  </div>`;

// T-003: DIN-A4-Brief (210 x 297 mm) - klassisch mit Briefkopf und Anschriftfeld.
const formalLetterA4 = ({ subject, body, citizen, sender, escapeHtml: esc, signatureHtml }) => `
  <div class="card-layout" style="position:absolute;inset:0;box-sizing:border-box;padding:18mm 20mm;overflow:hidden;font-family:${FONT};color:#222;background:#fff">
    ${letterhead(sender, esc)}
    ${addressBlock(citizen, esc)}
    <div style="margin:16mm 0 6mm;font-weight:800;font-size:13pt;color:#173b38">${subject}</div>
    <div style="font-size:11pt;line-height:1.55;white-space:pre-wrap">${body}</div>
    <div style="position:relative;height:18mm;margin-top:8mm">${signatureHtml}</div>
  </div>`;

// T-004: A4-Einladung - farbiges Kopfband in der Absenderfarbe, luftiger Textteil.
const invitationA4 = ({ subject, body, sender, escapeHtml: esc, signatureHtml }) => `
  <div class="card-layout" style="position:absolute;inset:0;box-sizing:border-box;overflow:hidden;font-family:${FONT};color:#222;background:#fff">
    <div style="background:${esc(sender.color)};color:#fff;padding:16mm 20mm 12mm">
      <div style="font-size:9pt;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85">${esc(sender.logo)} &middot; ${esc(sender.department)}</div>
      <div style="margin-top:5mm;font-weight:800;font-size:20pt;line-height:1.2">${subject}</div>
    </div>
    <div style="padding:14mm 20mm">
      <div style="font-size:11.5pt;line-height:1.6;white-space:pre-wrap">${body}</div>
      <div style="position:relative;height:18mm;margin-top:10mm">${signatureHtml}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:6mm;background:${esc(sender.color)}"></div>
  </div>`;

export const cardLayouts = {
  "T-001": reinickendorfCard,
  "T-002": birthdayCardA5,
  "T-003": formalLetterA4,
  "T-004": invitationA4
};

export const cardLayoutFor = template => cardLayouts[String(template?.id ?? "")];

// Rückseiten-Layouts: gleiche Mechanik wie cardLayouts. Kein Eintrag -> Standard-Rückseite;
// eine Funktion, die einen leeren String liefert, unterdrückt die Rückseite komplett.
// Zusätzlich im Kontext: addressHtml (fertiger Adressblock des Jubilars) und
// backgroundHtml (fertiges Rückseiten-Hintergrundbild oder "").
//
// T-001: um 180 Grad gedreht, damit die Adresse beim Duplexdruck über die kurze Kante
// nach dem Wenden der Karte richtig herum steht.
const reinickendorfCardBack = ({ addressHtml, backgroundHtml }) => `
  <div class="card-layout" style="position:absolute;inset:0;transform:rotate(180deg)">
    ${backgroundHtml}
    <div style="position:absolute;left:20mm;top:168mm;font-size:10.5pt;font-family:${FONT};line-height:6.5mm">${addressHtml}</div>
  </div>`;

export const cardBackLayouts = {
  "T-001": reinickendorfCardBack
};

export const cardBackLayoutFor = template => cardBackLayouts[String(template?.id ?? "")];
