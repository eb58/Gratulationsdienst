import { normalize, nextId, todayIso, calculateAge } from './utils.js';
import { duplicateKey } from './assignment.js';

const LABO_FIELDS = ['salutation', 'street', 'houseNo', 'postalCode', 'district', 'phone', 'email'];
const ADDRESS_FIELDS = ['street', 'houseNo', 'postalCode'];
const todayDe = () => todayIso().split('-').reverse().join('.');
const monthOf = value => String(value || "").slice(5, 7);
const importMonths = mapped => new Set(mapped.flatMap(row => [monthOf(row.birthDate), monthOf(row.weddingDate)]).filter(Boolean));
const missingFromImport = (remaining, months) => [...remaining.values()]
  .filter(citizen => citizen.source === "CSV Import")
  .filter(citizen => months.has(monthOf(citizen.birthDate)) || months.has(monthOf(citizen.weddingDate)));

const mergeCitizen = (existing, incoming, hasGroup) => {
  const merged = {
    ...existing,
    ...Object.fromEntries(LABO_FIELDS.map(key => [key, incoming[key] ?? existing[key]])),
    status: hasGroup ? "importiert" : "offen",
    printedAt: "",
    printedAge: "",
    printedYear: "",
    wish: "offen",
    pressPublication: false,
    updatedAt: todayIso()
  };
  const addressChanged = ADDRESS_FIELDS.some(f => incoming[f] && incoming[f] !== existing[f]);
  if (addressChanged && !hasGroup) {
    const note = `Keine SOKO-Zuordnung bei Reimport ${todayDe()}`;
    merged.notes = merged.notes ? `${merged.notes}\n${note}` : note;
  }
  return merged;
};

export const buildImportResult = (mapped, existingCitizens, assignGroup) => {
  const existingByKey = new Map(existingCitizens.map(c => [duplicateKey(c), c]));
  const months = importMonths(mapped);
  const seen = new Set();
  const newRows = [];
  const updates = [];
  let skipped = 0;
  for (const row of mapped) {
    if (!row.firstName || !row.lastName || !row.birthDate || !row.street) continue;
    const key = duplicateKey(row);
    if (existingByKey.has(key)) {
      updates.push(mergeCitizen(existingByKey.get(key), row, assignGroup(row)));
      existingByKey.delete(key);
      seen.add(key);
    } else if (seen.has(key)) {
      skipped++;
    } else {
      seen.add(key);
      const group = assignGroup(row);
      newRows.push({ ...row, id: nextId("G-2026", [...existingCitizens, ...newRows]), source: "CSV Import", createdAt: row.createdAt || todayIso(), updatedAt: todayIso(), status: group ? "importiert" : "offen" });
    }
  }
  return { newRows, updates, skipped, missing: missingFromImport(existingByKey, months) };
};

export const importNotice = ({ newRows, updates, skipped, missing = [] }) => {
  const parts = [];
  if (newRows.length) parts.push(`${newRows.length} neue Datensätze importiert`);
  if (updates.length) parts.push(`${updates.length} Bestände aktualisiert`);
  if (skipped) parts.push(`${skipped} Dubletten übersprungen`);
  if (missing.length) parts.push(`${missing.length} bisherige Datensätze im neuen Import nicht enthalten`);
  return parts.length ? parts.join(", ") + "." : "Keine Änderungen.";
};

export const citizenGridRow = (citizen, group) => ({
  id: citizen.id,
  name: `${citizen.lastName}, ${citizen.firstName}`,
  birthday: citizen.birthDate,
  age: calculateAge(citizen.birthDate),
  address: `${citizen.street} ${citizen.houseNo}`,
  groupId: group?.id || "offen",
  wish: citizen.wish || "",
  status: citizen.status
});

export const memberMatchesFilters = (member, filters) => {
  const haystack = normalize([member.firstName, member.lastName, member.email, member.phone, member.mobile, member.groupId].join(" "));
  return (!filters.q || haystack.includes(normalize(filters.q)))
    && (filters.groupId === "alle" || member.groupId === filters.groupId);
};

export const nextMemberIdAfterDelete = (members, id, filters) => {
  const remaining = members.filter(member => member.id !== id);
  return remaining.find(member => memberMatchesFilters(member, filters))?.id || remaining[0]?.id || "";
};
