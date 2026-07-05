import { todayIso } from './utils.js';

const clean = value => String(value ?? "").trim();
const idPart = value => clean(value).replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "offen";

export const weddingAnniversaryId = citizen => `WA-${idPart(citizen?.id)}-${idPart(citizen?.weddingDate || citizen?.weddingAnniversary)}`;

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
    weddingAnniversary: clean(citizen.weddingAnniversary),
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
