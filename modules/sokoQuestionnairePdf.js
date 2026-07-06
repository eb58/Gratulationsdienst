import jsQR from 'jsqr';
import {
  SOKO_CHECKBOX_SIZE_MM,
  SOKO_CHECKBOXES,
  SOKO_HANDWRITING_FIELDS,
  SOKO_PAGE_MM,
  SOKO_QR_BOX,
  SOKO_QR_BOXES,
  checkedSokoFieldsFromScores,
  citizenIdFromSokoQuestionnaireCode,
  sokoQuestionnaireDataFromCode
} from './sokoQuestionnaire.js';

const CHECKBOX_THRESHOLD = 0.035;
const CHECKBOX_INSET_MM = 1.25;
const HANDWRITING_THRESHOLD = 0.006;
const MIN_HANDWRITING_PIXELS = 35;
const renderScale = 2.8;
const PDF_RELOAD_KEY = "gd_pdf_import_reload";
const isDynamicImportFetchError = error => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error?.message || "");
const reloadAfterStalePdfChunk = error => {
  if (!isDynamicImportFetchError(error)) return false;
  try {
    if (sessionStorage.getItem(PDF_RELOAD_KEY)) return false;
    sessionStorage.setItem(PDF_RELOAD_KEY, "1");
  } catch {
    return false;
  }
  console.warn("PDF-Modul konnte nicht geladen werden. Anwendung wird wegen eines veralteten Asset-Caches neu geladen.", error);
  location.reload();
  return true;
};

const pdfjsModule = async () => {
  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    try { sessionStorage.removeItem(PDF_RELOAD_KEY); } catch { /* optional cache marker */ }
    return pdfjs;
  } catch (error) {
    if (reloadAfterStalePdfChunk(error)) return new Promise(() => {});
    throw new Error("PDF-Modul konnte nicht geladen werden. Bitte Anwendung neu laden.", { cause: error });
  }
};

const pageNumbers = pdf => Array.from({ length: pdf.numPages }, (_, index) => index + 1);
const canvasForViewport = viewport => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  return canvas;
};
const renderPdfPage = async (pdf, pageNumber) => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = canvasForViewport(viewport);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: context, viewport }).promise;
  return { canvas, context };
};

const centerOf = points => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length
});
const qrLocationPoints = location => {
  const points = [
    location?.topLeftCorner || location?.topLeft,
    location?.topRightCorner || location?.topRight,
    location?.bottomRightCorner || location?.bottomRight,
    location?.bottomLeftCorner || location?.bottomLeft
  ].filter(Boolean);
  return points.length === 4 ? points.map(point => ({ x: point.x, y: point.y })) : [];
};
const barcodeDetectorQrs = async canvas => {
  if (!("BarcodeDetector" in globalThis)) return [];
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const codes = await detector.detect(canvas);
    return codes.filter(item => item.rawValue).map(item => ({
      value: item.rawValue,
      points: (item.cornerPoints || []).map(point => ({ x: point.x, y: point.y }))
    }));
  } catch {
    return [];
  }
};
const QR_SEARCH_RADIUS_MM = 30;
// QR in seiner erwarteten Region suchen — jsQR scheitert, wenn beide (identischen) QRs gleichzeitig im Bild sind.
const jsQrInRegion = (context, box) => {
  const scaleX = context.canvas.width / SOKO_PAGE_MM.width, scaleY = context.canvas.height / SOKO_PAGE_MM.height;
  const cx = (box.left + box.size / 2) * scaleX, cy = (box.top + box.size / 2) * scaleY;
  const x0 = Math.max(0, Math.round(cx - QR_SEARCH_RADIUS_MM * scaleX)), y0 = Math.max(0, Math.round(cy - QR_SEARCH_RADIUS_MM * scaleY));
  const x1 = Math.min(context.canvas.width, Math.round(cx + QR_SEARCH_RADIUS_MM * scaleX)), y1 = Math.min(context.canvas.height, Math.round(cy + QR_SEARCH_RADIUS_MM * scaleY));
  const region = context.getImageData(x0, y0, x1 - x0, y1 - y0);
  const code = jsQR(region.data, region.width, region.height, { inversionAttempts: "attemptBoth" });
  if (!code) return null;
  return { value: code.data, points: qrLocationPoints(code.location).map(p => ({ x: p.x + x0, y: p.y + y0 })), version: code.version };
};
// jsQR je QR-Region zuerst; BarcodeDetector (ganzes Bild) nur als Fallback.
const detectQrs = async (canvas, context) => {
  const regional = SOKO_QR_BOXES.map(box => jsQrInRegion(context, box)).filter(Boolean);
  return regional.length ? regional : await barcodeDetectorQrs(canvas);
};

const angleOfEdge = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
const averageAngle = (a, b) => Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b));
// Schräglage gescannter Seiten aus den QR-Ecken (Oberkante + Linkskante), mittelpunkt- und randzonenunabhängig.
export const pageRotation = points => points?.length === 4
  ? averageAngle(angleOfEdge(points[0], points[1]), angleOfEdge(points[0], points[3]) - Math.PI / 2)
  : 0;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// QR-Symbolkante in mm: SOKO_QR_BOX abzüglich Quiet-Zone (4 Module je Seite, vgl. margin in qr.js).
const qrSymbolMm = version => SOKO_QR_BOX.size * (17 + 4 * version) / (17 + 4 * version + 8);
// Maßstab (px/mm) direkt aus den QR-Ecken — korrekt auch für nicht-A4-/skalierte Scans; sonst aus den Canvas-Maßen.
export const qrScale = (points, version) => version && points.length === 4
  ? (distance(points[0], points[1]) + distance(points[1], points[2]) + distance(points[2], points[3]) + distance(points[3], points[0])) / 4 / qrSymbolMm(version)
  : 0;

const boxCenterMm = box => ({ x: box.left + box.size / 2, y: box.top + box.size / 2 });
const qrList = qrs => Array.isArray(qrs) ? qrs : [qrs];
// Erkannte QRs den erwarteten Boxen zuordnen: oben-rechts (großes x−y) vs. unten-links.
const matchAnchors = (canvas, qrs) => {
  const scale = canvas.width / SOKO_PAGE_MM.width;
  const valid = qrList(qrs).filter(qr => qr?.points?.length === 4).map(qr => ({ qr, px: centerOf(qr.points) }));
  if (valid.length >= 2) {
    const ranked = [...valid].sort((a, b) => (b.px.x - b.px.y) - (a.px.x - a.px.y));
    return SOKO_QR_BOXES.map((box, index) => ({ mm: boxCenterMm(box), px: ranked[index].px, qr: ranked[index].qr }));
  }
  if (valid.length === 1) {
    const box = SOKO_QR_BOXES.reduce((best, candidate) => {
      const expected = boxCenterMm(candidate);
      const d = Math.hypot(valid[0].px.x - expected.x * scale, valid[0].px.y - expected.y * scale);
      return d < best.d ? { box: candidate, d } : best;
    }, { box: SOKO_QR_BOX, d: Infinity }).box;
    return [{ mm: boxCenterMm(box), px: valid[0].px, qr: valid[0].qr }];
  }
  return [];
};

const buildMapper = (anchorMm, anchorPx, scaleX, scaleY, angle) => {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return point => {
    const dx = (point.x - anchorMm.x) * scaleX;
    const dy = (point.y - anchorMm.y) * scaleY;
    return { x: anchorPx.x + dx * cos - dy * sin, y: anchorPx.y + dx * sin + dy * cos };
  };
};
// Zwei Anker: Ähnlichkeitstransformation über die lange Diagonale — genaueste Rotation und Skalierung.
const mapperFromTwo = (a, b) => {
  const mmVec = { x: b.mm.x - a.mm.x, y: b.mm.y - a.mm.y };
  const pxVec = { x: b.px.x - a.px.x, y: b.px.y - a.px.y };
  const scale = Math.hypot(pxVec.x, pxVec.y) / Math.hypot(mmVec.x, mmVec.y);
  const angle = Math.atan2(pxVec.y, pxVec.x) - Math.atan2(mmVec.y, mmVec.x);
  const anchorMm = { x: (a.mm.x + b.mm.x) / 2, y: (a.mm.y + b.mm.y) / 2 };
  const anchorPx = { x: (a.px.x + b.px.x) / 2, y: (a.px.y + b.px.y) / 2 };
  return buildMapper(anchorMm, anchorPx, scale, scale, angle);
};
// Ein Anker: Skala aus QR-Größe/Version (sonst Canvas), Rotation aus den QR-Ecken.
const mapperFromOne = (canvas, anchor) => {
  const points = anchor?.qr?.points || [];
  const scale = qrScale(points, anchor?.qr?.version);
  const scaleX = scale || canvas.width / SOKO_PAGE_MM.width;
  const scaleY = scale || canvas.height / SOKO_PAGE_MM.height;
  const anchorMm = anchor?.mm || boxCenterMm(SOKO_QR_BOX);
  const anchorPx = anchor?.px || { x: anchorMm.x * scaleX, y: anchorMm.y * scaleY };
  return buildMapper(anchorMm, anchorPx, scaleX, scaleY, pageRotation(points));
};

export const pageMapper = (canvas, qrs = []) => {
  const anchors = matchAnchors(canvas, qrs);
  return anchors.length >= 2 ? mapperFromTwo(anchors[0], anchors[1]) : mapperFromOne(canvas, anchors[0]);
};
const boundsForRect = (canvas, mapper, rect) => {
  const points = [
    mapper({ x: rect.left, y: rect.top }),
    mapper({ x: rect.left + rect.width, y: rect.top }),
    mapper({ x: rect.left + rect.width, y: rect.top + rect.height }),
    mapper({ x: rect.left, y: rect.top + rect.height })
  ];
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const x = Math.max(0, Math.floor(Math.min(...xs)));
  const y = Math.max(0, Math.floor(Math.min(...ys)));
  const right = Math.min(canvas.width, Math.ceil(Math.max(...xs)));
  const bottom = Math.min(canvas.height, Math.ceil(Math.max(...ys)));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
};
const luminance = (data, index) => data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
const darkPixelStats = image => {
  let dark = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    if (luminance(image.data, index) < 155) dark += 1;
  }
  const total = image.data.length / 4;
  return { dark, total, score: total ? dark / total : 0 };
};
const rectImageData = (context, bounds) => context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
const checkboxScore = (context, mapper, config) => {
  const inset = CHECKBOX_INSET_MM;
  const rect = {
    left: config.left + inset,
    top: config.top + inset,
    width: SOKO_CHECKBOX_SIZE_MM - inset * 2,
    height: SOKO_CHECKBOX_SIZE_MM - inset * 2
  };
  return darkPixelStats(rectImageData(context, boundsForRect(context.canvas, mapper, rect))).score;
};
const handwritingStats = (context, mapper, config) => {
  const bounds = boundsForRect(context.canvas, mapper, config);
  const stats = darkPixelStats(rectImageData(context, bounds));
  return { ...stats, hasText: stats.score >= HANDWRITING_THRESHOLD && stats.dark >= MIN_HANDWRITING_PIXELS };
};

// Debug-Ausgabe der Erkennung pro Seite — nur aktiv mit localStorage["soko-debug"].
const sokoDebugEnabled = () => { try { return Boolean(globalThis.localStorage?.getItem("soko-debug")); } catch { return false; } };
const logPageDetection = ({ pageNumber, qrs, citizenId, canvas, scores, marks, textFields }) => {
  if (!sokoDebugEnabled()) return;
  const anchors = matchAnchors(canvas, qrs);
  const mapper = pageMapper(canvas, qrs);
  const o = mapper({ x: 0, y: 0 }), ex = mapper({ x: 100, y: 0 });
  const scale = Math.hypot(ex.x - o.x, ex.y - o.y) / 100;
  const rotationDeg = Math.atan2(ex.y - o.y, ex.x - o.x) * 180 / Math.PI;
  console.group(`[SOKO-PDF] Seite ${pageNumber} — Jubilar-Code: ${citizenId || "—"}`);
  console.log(`QR-Codes: ${anchors.length}/${SOKO_QR_BOXES.length} erkannt — ${qrs.find(qr => qr.value)?.value || "(keiner)"}`);
  console.log(`Registrierung: Rotation ${rotationDeg.toFixed(2)}°, Maßstab ${scale.toFixed(2)} px/mm`);
  console.table(Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, { score: Number(score.toFixed(4)), angekreuzt: marks[key] }])));
  console.table(Object.fromEntries(Object.entries(textFields).map(([key, field]) => [key, { score: Number(field.score.toFixed(4)), dunkel: field.dark, handschrift: field.hasText }])));
  console.groupEnd();
};

const analyzePage = async (pdf, pageNumber) => {
  const { canvas, context } = await renderPdfPage(pdf, pageNumber);
  const qrs = await detectQrs(canvas, context);
  const mapper = pageMapper(canvas, qrs);
  const scores = Object.fromEntries(Object.entries(SOKO_CHECKBOXES).map(([key, config]) => [key, checkboxScore(context, mapper, config)]));
  const marks = checkedSokoFieldsFromScores(scores, CHECKBOX_THRESHOLD);
  const textFields = Object.fromEntries(Object.entries(SOKO_HANDWRITING_FIELDS).map(([key, config]) => [key, handwritingStats(context, mapper, config)]));
  const qrValue = qrs.find(qr => qr.value)?.value || "";
  const citizenId = citizenIdFromSokoQuestionnaireCode(qrValue);
  const qrData = sokoQuestionnaireDataFromCode(qrValue);
  logPageDetection({ pageNumber, qrs, citizenId, canvas, scores, marks, textFields });
  return {
    citizenId,
    qrData,
    qrValue,
    image: canvas.toDataURL?.("image/jpeg", 0.78) || "",
    marks,
    scores,
    textFields,
    error: citizenId ? "" : "Jubilar-Code konnte nicht gelesen werden."
  };
};

export const parseSokoQuestionnairePdf = async file => {
  if (!globalThis.document?.createElement) throw new Error("PDF-Erkennung läuft nur im Browser.");
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await pdfjsModule();
  const task = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await task.promise;
  try {
    const pages = [];
    for (const pageNumber of pageNumbers(pdf)) pages.push(await analyzePage(pdf, pageNumber));
    return { pages };
  } finally {
    pdf.destroy?.();
  }
};
