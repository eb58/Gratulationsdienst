import { calculateAge, formatDateDe, todayIso } from './utils.js';
import { groupForCitizen } from './assignment.js';
import { qrCodeSvg } from './qr.js';
import {
  SOKO_CHECKBOX_SIZE_MM,
  SOKO_CHECKBOXES,
  SOKO_HANDWRITING_FIELDS,
  SOKO_PAGE_MM,
  SOKO_QR_BOX,
  SOKO_QR_BOX2,
  sokoQuestionnaireCode
} from './sokoQuestionnaire.js';

const PX_PER_MM = 5;
const PDF_WIDTH_PT = 595.28;
const PDF_HEIGHT_PT = 841.89;
const JPEG_QUALITY = 0.74;
const MAX_SIMULATED_PAGES = 8;
const wishKeys = ["wishPost", "wishVisit", "wishNone"];
const weddingKeys = ["weddingGold", "weddingDiamond", "weddingIron", "weddingGrace"];
const checkboxLabels = {
  wishPost: "per Post",
  wishVisit: "Soko",
  wishNone: "keine",
  pressPublication: "Veröffentlichung in der regionalen Presse",
  weddingGold: "Goldene Hochzeit (50 J.)",
  weddingDiamond: "Diamantene Hochzeit (60 J.)",
  weddingIron: "Eiserne Hochzeit (65 J.)",
  weddingGrace: "Gnadenhochzeit (70 J.)"
};
export const SIMULATED_SOKO_PRIVACY_TEXT = [
  "*Datenschutzrechtliche Einwilligungserkl\u00e4rung",
  "",
  "Die Soko-Mitarbeiterin/der Soko-Mitarbeiter hat die Jubilarin/den Jubilar darauf hingewiesen, dass",
  "die im Rahmen der vorstehend genannten Zwecke erhobenen pers\u00f6nlichen Daten Ihrer Person unter",
  "Beachtung der EU-Datenschutzgrundverordnung und des Berliner Datenschutzgesetzes erhoben,",
  "verarbeitet und genutzt werden. Sie sind zudem darauf hingewiesen worden, dass die Erhebung,",
  "Verarbeitung und Nutzung Ihrer Daten auf freiwilliger Basis erfolgt und die Einwilligung auch",
  "verweigert werden kann. Die Verweigerung der Einwilligung f\u00fchrt dazu, dass keine Pressemitteilung",
  "ver\u00f6ffentlicht wird. Es besteht jederzeit die M\u00f6glichkeit, die Einwilligung zu widerrufen. Mit der",
  "Unterschrift der Soko-Mitarbeiterin/des Soko-Mitarbeiters wird best\u00e4tigt, dass die Einwilligung zur",
  "Verarbeitung der personenbezogenen Daten m\u00fcndlich/telefonisch gegeben wurde."
].join("\n");

const choice = (items, random) => items[Math.floor(random() * items.length)];

export const randomSokoQuestionnaireMarks = (random = Math.random) => ({
  ...Object.fromEntries(Object.keys(SOKO_CHECKBOXES).map(key => [key, false])),
  [choice(wishKeys, random)]: true,
  pressPublication: random() < 0.48,
  ...(random() < 0.22 ? { [choice(weddingKeys, random)]: true } : {})
});

export const pickSokoQuestionnaireSimulationCitizens = (citizens, random = Math.random) => {
  const pool = (citizens || []).filter(citizen => citizen?.id);
  const count = Math.min(pool.length, MAX_SIMULATED_PAGES, Math.max(1, Math.ceil(pool.length * 0.35)));
  return pool
    .map(citizen => ({ citizen, order: random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .map(item => item.citizen);
};

const imageFromSvg = svg => new Promise((resolve, reject) => {
  const image = new Image();
  const source = svg.includes("xmlns=") ? svg : svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  image.addEventListener("load", () => {
    URL.revokeObjectURL(url);
    resolve(image);
  }, { once: true });
  image.addEventListener("error", () => {
    URL.revokeObjectURL(url);
    reject(new Error("QR-Code konnte nicht gerendert werden."));
  }, { once: true });
  image.src = url;
});

const withCanvas = () => {
  if (!globalThis.document?.createElement) throw new Error("SOKO-PDF-Simulation läuft nur im Browser.");
  const canvas = document.createElement("canvas");
  canvas.width = SOKO_PAGE_MM.width * PX_PER_MM;
  canvas.height = SOKO_PAGE_MM.height * PX_PER_MM;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.scale(PX_PER_MM, PX_PER_MM);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, SOKO_PAGE_MM.width, SOKO_PAGE_MM.height);
  context.strokeStyle = "#111";
  context.fillStyle = "#111";
  context.lineWidth = 0.24;
  return { canvas, context };
};

const setFont = (context, size = 3.1, weight = "") => {
  context.font = `${weight ? `${weight} ` : ""}${size}px Arial, sans-serif`;
  context.fillStyle = "#111";
};
const text = (context, value, x, y, size = 3.1, weight = "") => {
  setFont(context, size, weight);
  context.fillText(String(value || ""), x, y);
};
const multiText = (context, value, x, y, lineHeight = 4.3, size = 3.1, weight = "") =>
  String(value || "").split("\n").forEach((line, index) => text(context, line, x, y + index * lineHeight, size, weight));
const box = (context, x, y, width, height) => context.strokeRect(x, y, width, height);
const drawCheck = (context, config) => {
  const x = config.left, y = config.top, size = SOKO_CHECKBOX_SIZE_MM;
  context.save();
  context.strokeStyle = "#111";
  context.lineWidth = 0.75;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x + 0.85, y + 0.9);
  context.lineTo(x + size - 0.85, y + size - 0.9);
  context.moveTo(x + size - 0.85, y + 0.9);
  context.lineTo(x + 0.85, y + size - 0.9);
  context.stroke();
  context.restore();
};
const drawCheckbox = (context, key, checked) => {
  const config = SOKO_CHECKBOXES[key];
  context.save();
  context.strokeStyle = "#aaa";
  context.fillStyle = "#aaa";
  context.lineWidth = 0.12;
  context.strokeRect(config.left, config.top, SOKO_CHECKBOX_SIZE_MM, SOKO_CHECKBOX_SIZE_MM);
  context.font = "3px Arial, sans-serif";
  context.fillText(checkboxLabels[key], config.left + SOKO_CHECKBOX_SIZE_MM + 1.5, config.top + 3.1);
  context.restore();
  if (checked) drawCheck(context, config);
};
const clearBlankHandwritingAreas = context => {
  context.save();
  context.fillStyle = "#fff";
  Object.values(SOKO_HANDWRITING_FIELDS).forEach(field => context.fillRect(field.left, field.top, field.width, field.height));
  context.restore();
};
const drawQr = async (context, citizen, rect) => {
  const image = await imageFromSvg(qrCodeSvg(sokoQuestionnaireCode(citizen)));
  context.drawImage(image, rect.left, rect.top, rect.size, rect.size);
};
const drawQuestionnairePage = async (citizen, marks, pageIndex) => {
  const { canvas, context } = withCanvas();
  const group = groupForCitizen(citizen);
  const age = calculateAge(citizen.birthDate);
  const month = citizen.birthDate?.slice(5, 7) || "";
  const address = [
    `${citizen.salutation || ""} ${citizen.firstName || ""} ${citizen.lastName || ""}`.trim(),
    `${citizen.street || ""} ${citizen.houseNo || ""}`.trim(),
    `${citizen.postalCode || ""} Berlin-${citizen.district || ""}`.trim(),
    citizen.phone || ""
  ].filter(Boolean).join("\n");

  await Promise.all([drawQr(context, citizen, SOKO_QR_BOX), drawQr(context, citizen, SOKO_QR_BOX2)]);

  text(context, "Bezirksamt Reinickendorf von Berlin", 15, 14, 5, "bold");
  text(context, "Abt. Finanzen, Personal und Bürgerdienste", 15, 20, 3);
  text(context, "Senioren 2", 15, 26, 3);
  text(context, `UR Sozialkommission: ${group?.id || ""}`, 15, 40, 4.1, "bold");
  text(context, citizen.id || "", 168, SOKO_QR_BOX.top + SOKO_QR_BOX.size + 4, 2.2);

  box(context, 104, 8, 27, 14);
  box(context, 131, 8, 25, 14);
  box(context, 156, 8, 39, 14);
  text(context, "Datum", 106, 12, 2.7);
  text(context, formatDateDe(todayIso()), 106, 18, 3);
  text(context, "Telefon", 133, 12, 2.7);
  text(context, "90294 4055", 133, 18, 3);
  text(context, "Geburtsdatum", 158, 12, 2.7);
  text(context, formatDateDe(citizen.birthDate), 162, 18, 3);
  box(context, 104, 22, 91, 58);
  multiText(context, address, 108, 31, 5, 3.4);
  text(context, `${String(pageIndex + 1).padStart(3, "0")} / ${month}`, 176, 77, 3);
  box(context, 166, 80, 29, 9);
  text(context, "Lfd. Nr. / Monat", 169, 86, 3);

  box(context, 14, 47, 86, 17);
  text(context, `${age}. Geburtstag d. nebenstehend Genannten`, 20, 57, 3.6, "bold");
  text(context, "Sehr geehrte Damen und Herren,", 15, 77, 3.4);
  multiText(context, "bitte senden Sie mir diesen Fragebogen\ninnerhalb von drei Wochen ausgef\u00fcllt und unterschrieben zur\u00fcck.", 15, 89, 5.2, 3.45);
  text(context, "F\u00fcr weitere Angaben bitte die R\u00fcckseite benutzen.", 15, 108, 3.2);
  text(context, "Ihre Gratulationsstelle", 16, 121, 3.4);

  box(context, 104, 94, 48, 16);
  text(context, "Zutreffendes ist", 112, 101, 4, "bold");
  text(context, "angekreuzt", 116, 106, 4, "bold");
  box(context, 15, 134, 180, 7);
  text(context, "Von der Sozialkommission auszufüllen", 72, 139, 3.5, "bold");
  box(context, 15, 141, 88, 33);
  box(context, 103, 141, 58, 33);
  box(context, 161, 141, 34, 33);
  text(context, "Glückwünsche", 18, 147, 3.2);
  text(context, "Es steht bevor die", 106, 147, 3.2);
  text(context, "am (Datum)", 164, 147, 3.2);
  Object.keys(SOKO_CHECKBOXES).forEach(key => drawCheckbox(context, key, marks[key]));
  box(context, 15, 174, 88, 25);
  box(context, 103, 174, 92, 25);
  text(context, "Unterschrift der Sozialkommission und Datum", 18, 180, 3.1);
  text(context, "Vorname des Ehegatten, ggf. abweichender Familienname", 106, 180, 2.8);
  box(context, 15, 203, 180, 80);
  multiText(context, SIMULATED_SOKO_PRIVACY_TEXT, 18, 212, 3.9, 3.0);
  clearBlankHandwritingAreas(context);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
};

const dataUrlBytes = dataUrl => Uint8Array.from(atob(String(dataUrl).split(",")[1] || ""), char => char.charCodeAt(0));
const concatBytes = chunks => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  chunks.reduce((offset, chunk) => {
    result.set(chunk, offset);
    return offset + chunk.length;
  }, 0);
  return result;
};

export const jpegImagesToPdfBytes = images => {
  const encoder = new TextEncoder();
  const bytes = part => typeof part === "string" ? encoder.encode(part) : part;
  const pageIds = images.map((_, index) => 3 + index * 3);
  const objects = [
    { id: 1, parts: ["<< /Type /Catalog /Pages 2 0 R >>\n"] },
    { id: 2, parts: [`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${images.length} >>\n`] },
    ...images.flatMap((image, index) => {
      const pageId = 3 + index * 3;
      const imageId = pageId + 1;
      const contentId = pageId + 2;
      const name = `Im${index + 1}`;
      const content = `q\n${PDF_WIDTH_PT} 0 0 ${PDF_HEIGHT_PT} 0 0 cm\n/${name} Do\nQ\n`;
      return [
        { id: pageId, parts: [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH_PT} ${PDF_HEIGHT_PT}] /Resources << /XObject << /${name} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`] },
        { id: imageId, parts: [`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`, image.data, "\nendstream\n"] },
        { id: contentId, parts: [`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\n`] }
      ];
    })
  ];
  const header = bytes("%PDF-1.4\n");
  const built = objects.reduce((acc, object) => {
    const objectBytes = concatBytes([bytes(`${object.id} 0 obj\n`), ...object.parts.map(bytes), bytes("endobj\n")]);
    return {
      chunks: [...acc.chunks, objectBytes],
      offset: acc.offset + objectBytes.length,
      offsets: [...acc.offsets, acc.offset]
    };
  }, { chunks: [header], offset: header.length, offsets: [] });
  const xrefOffset = built.offset;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...built.offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  ].join("");
  return concatBytes([...built.chunks, bytes(xref)]);
};

const fileFromPdfBytes = (bytes, name) =>
  typeof File === "function"
    ? new File([bytes], name, { type: "application/pdf", lastModified: Date.now() })
    : Object.assign(new Blob([bytes], { type: "application/pdf" }), { name, lastModified: Date.now() });

export const createSokoQuestionnaireSimulation = async (citizens, options = {}) => {
  const random = options.random || Math.random;
  const selected = options.selectedCitizens || pickSokoQuestionnaireSimulationCitizens(citizens, random);
  const createdAt = todayIso();
  const pages = await Promise.all(selected.map(async (citizen, index) => {
    const marks = options.marksByCitizenId?.[citizen.id] || randomSokoQuestionnaireMarks(random);
    const image = await drawQuestionnairePage(citizen, marks, index);
    return { citizenId: citizen.id, image, marks, pageNumber: index + 1, createdAt };
  }));
  const pdfBytes = jpegImagesToPdfBytes(pages.map(page => ({
    data: dataUrlBytes(page.image),
    width: SOKO_PAGE_MM.width * PX_PER_MM,
    height: SOKO_PAGE_MM.height * PX_PER_MM
  })));
  const name = `Soko-Fragebogen-Simulation-${createdAt}.pdf`;
  return { file: fileFromPdfBytes(pdfBytes, name), pages, name };
};

export const mergeSokoQuestionnaireImages = (citizens, pages) => {
  const byCitizen = pages.reduce((acc, page) => ({
    ...acc,
    [page.citizenId]: [...(acc[page.citizenId] || []), {
      id: page.id || `SIM-${page.createdAt}-${page.citizenId}-${page.pageNumber || index + 1}`,
      createdAt: page.createdAt,
      image: page.image,
      marks: page.marks,
      pageNumber: page.pageNumber || index + 1,
      source: page.source || "simulation"
    }]
  }), {});
  return citizens.map(citizen => {
    const images = byCitizen[citizen.id];
    if (!images?.length) return citizen;
    const existing = Array.isArray(citizen.sokoQuestionnaireImages) ? citizen.sokoQuestionnaireImages : [];
    return { ...citizen, sokoQuestionnaireImages: [...images, ...existing] };
  });
};
