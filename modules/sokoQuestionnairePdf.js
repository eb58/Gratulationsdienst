import jsQR from 'jsqr';
import {
  SOKO_CHECKBOX_SIZE_MM,
  SOKO_CHECKBOXES,
  SOKO_HANDWRITING_FIELDS,
  SOKO_PAGE_MM,
  SOKO_QR_BOX,
  checkedSokoFieldsFromScores,
  citizenIdFromSokoQuestionnaireCode,
  sokoQuestionnaireDataFromCode
} from './sokoQuestionnaire.js';

const CHECKBOX_THRESHOLD = 0.035;
const CHECKBOX_INSET_MM = 1.25;
const HANDWRITING_THRESHOLD = 0.006;
const MIN_HANDWRITING_PIXELS = 35;
const renderScale = 2.8;

const pdfjsModule = async () => {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
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
const barcodeDetectorQr = async canvas => {
  if (!("BarcodeDetector" in globalThis)) return null;
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const codes = await detector.detect(canvas);
    const code = codes.find(item => item.rawValue);
    const points = (code?.cornerPoints || []).map(point => ({ x: point.x, y: point.y }));
    return code ? { value: code.rawValue, points } : null;
  } catch {
    return null;
  }
};
const jsQrCode = context => {
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  return code ? { value: code.data, points: qrLocationPoints(code.location) } : null;
};
const detectQr = async (canvas, context) => await barcodeDetectorQr(canvas) || jsQrCode(context);

const pageMapper = (canvas, qr) => {
  const scaleX = canvas.width / SOKO_PAGE_MM.width;
  const scaleY = canvas.height / SOKO_PAGE_MM.height;
  const expectedCenter = {
    x: (SOKO_QR_BOX.left + SOKO_QR_BOX.size / 2) * scaleX,
    y: (SOKO_QR_BOX.top + SOKO_QR_BOX.size / 2) * scaleY
  };
  const actualCenter = qr?.points?.length === 4 ? centerOf(qr.points) : expectedCenter;
  const offset = { x: actualCenter.x - expectedCenter.x, y: actualCenter.y - expectedCenter.y };
  return point => ({ x: point.x * scaleX + offset.x, y: point.y * scaleY + offset.y });
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

const analyzePage = async (pdf, pageNumber) => {
  const { canvas, context } = await renderPdfPage(pdf, pageNumber);
  const qr = await detectQr(canvas, context);
  const mapper = pageMapper(canvas, qr);
  const scores = Object.fromEntries(Object.entries(SOKO_CHECKBOXES).map(([key, config]) => [key, checkboxScore(context, mapper, config)]));
  const marks = checkedSokoFieldsFromScores(scores, CHECKBOX_THRESHOLD);
  const textFields = Object.fromEntries(Object.entries(SOKO_HANDWRITING_FIELDS).map(([key, config]) => [key, handwritingStats(context, mapper, config)]));
  const citizenId = citizenIdFromSokoQuestionnaireCode(qr?.value || "");
  const qrData = sokoQuestionnaireDataFromCode(qr?.value || "");
  return {
    pageNumber,
    citizenId,
    qrData,
    qrValue: qr?.value || "",
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
    const pages = await Promise.all(pageNumbers(pdf).map(pageNumber => analyzePage(pdf, pageNumber)));
    return { pages };
  } finally {
    pdf.destroy?.();
  }
};
