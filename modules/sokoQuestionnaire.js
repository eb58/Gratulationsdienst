import { todayIso } from './utils.js';

export const SOKO_QR_PREFIX = "GD-SOKO:";
export const SOKO_PAGE_MM = { width: 210, height: 297 };
export const SOKO_QR_BOX = { left: 176, top: 24, size: 16 };
export const SOKO_QR_BOX2 = { left: 17, top: 265, size: 16 };
export const SOKO_QR_BOXES = [SOKO_QR_BOX, SOKO_QR_BOX2];
export const SOKO_CHECKBOX_SIZE_MM = 4;

export const SOKO_CHECKBOXES = {
  wishPost: { left: 19, top: 153, group: "wish", value: "per Post" },
  wishVisit: { left: 50, top: 153, group: "wish", value: "Besuch erwünscht" },
  wishNone: { left: 73.5, top: 153, group: "wish", value: "keine" },
  pressPublication: { left: 19, top: 165, group: "pressPublication", value: true },
  weddingGold: { left: 104, top: 149, group: "weddingAnniversary", value: "Goldene Hochzeit" },
  weddingDiamond: { left: 104, top: 155, group: "weddingAnniversary", value: "Diamantene Hochzeit" },
  weddingIron: { left: 104, top: 161, group: "weddingAnniversary", value: "Eiserne Hochzeit" },
  weddingGrace: { left: 104, top: 167, group: "weddingAnniversary", value: "Gnadenhochzeit" }
};

export const SOKO_HANDWRITING_FIELDS = {
  weddingDate: { left: 164, top: 152, width: 28, height: 17, label: "am (Datum)" },
  spouseName: { left: 106, top: 184, width: 86, height: 12, label: "Vorname des Ehegatten" }
};

const entriesForGroup = group => Object.entries(SOKO_CHECKBOXES).filter(([, config]) => config.group === group);
const encodePart = value => encodeURIComponent(String(value ?? "").trim());
const decodePart = value => {
  try { return decodeURIComponent(String(value ?? "")); }
  catch { return String(value ?? ""); }
};
const comparable = value => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const sameText = (a, b) => comparable(a) === comparable(b);

export const sokoQuestionnaireCode = citizen => [
  `${SOKO_QR_PREFIX}${String(citizen?.id || "").trim()}`,
  `fn=${encodePart(citizen?.firstName)}`,
  `ln=${encodePart(citizen?.lastName)}`,
  `bd=${encodePart(citizen?.birthDate)}`,
  `st=${encodePart(citizen?.street)}`,
  `hn=${encodePart(citizen?.houseNo)}`,
  `pc=${encodePart(citizen?.postalCode)}`
].join(";");

export const citizenIdFromSokoQuestionnaireCode = value => {
  const raw = String(value ?? "").trim();
  const prefixed = raw.match(new RegExp(`${SOKO_QR_PREFIX}\\s*(G-[A-Za-z0-9-]+)`, "i"));
  return prefixed?.[1] || raw.match(/\bG-[A-Za-z0-9-]+\b/)?.[0] || "";
};

export const sokoQuestionnaireDataFromCode = value => {
  const raw = String(value ?? "").trim();
  const id = citizenIdFromSokoQuestionnaireCode(raw);
  const parts = Object.fromEntries(raw.split(";").slice(1).map(part => {
    const [key, ...rest] = part.split("=");
    return [key, decodePart(rest.join("="))];
  }));
  return {
    id,
    firstName: parts.fn || "",
    lastName: parts.ln || "",
    birthDate: parts.bd || "",
    street: parts.st || "",
    houseNo: parts.hn || "",
    postalCode: parts.pc || ""
  };
};

export const findSokoQuestionnaireCitizen = (citizens, result) => {
  const byId = citizens.find(citizen => citizen.id === result?.citizenId);
  if (byId) return { citizen: byId, matchSource: "qr-id" };
  const data = result?.qrData || {};
  const candidates = citizens.filter(citizen =>
    data.birthDate
    && data.lastName
    && sameText(citizen.birthDate, data.birthDate)
    && sameText(citizen.lastName, data.lastName)
    && (!data.firstName || sameText(citizen.firstName, data.firstName))
  );
  const exact = candidates.find(citizen =>
    (!data.street || sameText(citizen.street, data.street))
    && (!data.houseNo || sameText(citizen.houseNo, data.houseNo))
    && (!data.postalCode || sameText(citizen.postalCode, data.postalCode))
  );
  const citizen = exact || (candidates.length === 1 ? candidates[0] : null);
  return { citizen, matchSource: citizen ? "qr-data" : "" };
};

export const checkedSokoFieldsFromScores = (scores, threshold = 0.035) =>
  Object.fromEntries(Object.keys(SOKO_CHECKBOXES).map(key => [key, Number(scores?.[key] || 0) >= threshold]));

export const sokoQuestionnairePatchFromMarks = marks => {
  const markedWishes = entriesForGroup("wish").filter(([key]) => marks?.[key]);
  const markedWeddings = entriesForGroup("weddingAnniversary").filter(([key]) => marks?.[key]);
  const errors = [
    markedWishes.length === 1 ? "" : "Glückwunsch-Auswahl ist nicht eindeutig.",
    markedWeddings.length <= 1 ? "" : "Ehejubiläum-Auswahl ist nicht eindeutig."
  ].filter(Boolean);
  const patch = {
    ...(markedWishes.length === 1 ? { wish: markedWishes[0][1].value } : {}),
    pressPublication: Boolean(marks?.pressPublication),
    weddingAnniversary: markedWeddings.length === 1 ? markedWeddings[0][1].value : ""
  };
  return { patch, errors };
};

export const sokoQuestionnaireManualFields = result =>
  Object.entries(result?.textFields || {}).filter(([, field]) => field?.hasText).map(([key, field]) => ({
    key,
    label: SOKO_HANDWRITING_FIELDS[key]?.label || key,
    score: field.score || 0
  }));

export const applySokoQuestionnaireResult = (citizen, result) => {
  if (!citizen) return { ok: false, error: "Jubilar wurde nicht gefunden." };
  const { patch, errors } = sokoQuestionnairePatchFromMarks(result?.marks || {});
  if (errors.length) return { ok: false, applied: false, error: errors.join(" "), citizen };
  const manualFields = sokoQuestionnaireManualFields(result);
  const hasManualText = manualFields.length > 0;
  const patchedCitizen = {
    ...citizen,
    ...patch,
    updatedAt: todayIso(),
    status: hasManualText || citizen.status === "gedruckt" ? citizen.status : "geprüft"
  };
  return {
    ok: !hasManualText,
    applied: true,
    needsManualReview: hasManualText,
    manualFields,
    error: hasManualText ? `Handschriftliche Zusatzangaben vorhanden: ${manualFields.map(field => field.label).join(", ")}.` : "",
    patch,
    citizen: patchedCitizen
  };
};

export const applySokoQuestionnaireResults = (citizens, results) => {
  const pages = results.map(result => {
    const { citizen, matchSource } = findSokoQuestionnaireCitizen(citizens, result);
    const applied = applySokoQuestionnaireResult(citizen, result);
    return { ...result, ...applied, matchedCitizenId: citizen?.id || "", matchSource };
  });
  const updates = new Map(pages.filter(page => page.applied).map(page => [page.citizen.id, page.citizen]));
  return {
    citizens: citizens.map(citizen => updates.get(citizen.id) || citizen),
    pages
  };
};
