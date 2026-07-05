import { todayIso } from './utils.js';

const clean = value => String(value ?? "").trim();
const idPart = value => clean(value).replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "offen";

export const weddingAnniversaryId = citizen => `WA-${idPart(citizen?.id)}-${idPart(citizen?.weddingDate || citizen?.weddingAnniversary)}`;

const ANNIVERSARY_LABELS = new Map([[50, "Goldene Hochzeit"], [60, "Diamantene Hochzeit"], [65, "Eiserne Hochzeit"], [70, "Gnadenhochzeit"]]);
export const weddingAnniversaryLabel = (weddingDate, today = todayIso()) => {
  const wedding = clean(weddingDate);
  const weddingYear = Number(wedding.slice(0, 4));
  const todayYear = Number(clean(today).slice(0, 4));
  if (!weddingYear || !todayYear) return "";
  const label = ANNIVERSARY_LABELS.get(todayYear - weddingYear);
  if (!label) return "";
  const milestoneDate = `${todayYear}${wedding.slice(4)}`;
  return milestoneDate >= today ? label : "";
};

export const weddingAnniversaryFromCitizen = (citizen, source = "Fragebogen") => {
  if (!clean(citizen?.weddingAnniversary)) return null;
  const now = todayIso();
  return {
    id: weddingAnniversaryId(citizen),
    citizenId: clean(citizen.id),
    salutation: clean(citizen.salutation),
    firstName: clean(citizen.firstName),
    lastName: clean(citizen.lastName),
    birthDate: clean(citizen.birthDate),
    street: clean(citizen.street),
    houseNo: clean(citizen.houseNo),
    postalCode: clean(citizen.postalCode),
    district: clean(citizen.district),
    weddingDate: clean(citizen.weddingDate),
    spouseName: clean(citizen.spouseName),
    source,
    capturedAt: clean(citizen.updatedAt) || now,
    updatedAt: now
  };
};

export const upsertWeddingAnniversaryForCitizen = (items = [], citizen, source = "Fragebogen") => {
  const entry = weddingAnniversaryFromCitizen(citizen, source);
  const remaining = items.filter(item => item.citizenId !== citizen?.id);
  return entry ? [...remaining, entry] : remaining;
};

export const upsertWeddingAnniversariesForCitizens = (items = [], citizens = [], source = "Fragebogen") =>
  citizens.reduce((result, citizen) => upsertWeddingAnniversaryForCitizen(result, citizen, source), items);
