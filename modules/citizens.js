import { normalize, nextId, todayIso, calculateAge } from './utils.js';
import { duplicateKey } from './assignment.js';
import { citizenFlagText, hasCitizenExclusionFlag } from './citizenFlags.js';
import { questionnaireCycleForCitizen } from './questionnaireCases.js';
import { citizenListName } from './citizenNames.js';

const LABO_FIELDS = ['salutation', 'doctoralDegree', 'street', 'houseNo', 'postalCode', 'district', 'age'];
export const monthOf = value => String(value || "").slice(5, 7);
const isImportableRow = row => row.firstName && row.lastName && row.birthDate && row.street;
export const importMonths = mapped => new Set(mapped.filter(isImportableRow).map(row => monthOf(row.birthDate)).filter(Boolean));
const assignmentInfo = assignment => typeof assignment === 'object' && assignment !== null
  ? assignment
  : { groupId: assignment };
const mergeCitizen = (existing, incoming, assignment) => {
  const { groupId, ambiguous } = assignmentInfo(assignment);
  const questionnaireCycle = questionnaireCycleForCitizen(incoming);
  // Verstorbene und Verzogene starten keinen neuen Lauf, falls sie wider Erwarten erneut geliefert werden.
  const keepResponse = existing.questionnaireCycle === questionnaireCycle || hasCitizenExclusionFlag(existing);
  return {
    ...existing,
    ...Object.fromEntries(LABO_FIELDS.map(key => [key, incoming[key] ?? existing[key]])),
    archived: false,
    questionnaireCycle,
    status: hasCitizenExclusionFlag(existing) ? existing.status : ambiguous ? 'offen' : keepResponse ? existing.status : groupId ? 'importiert' : 'offen',
    printedAt: "",
    printedAge: "",
    printedYear: "",
    wish: keepResponse ? existing.wish : 'offen',
    pressPublication: keepResponse ? Boolean(existing.pressPublication) : false,
    weddingAnniversary: keepResponse ? existing.weddingAnniversary || '' : '',
    weddingDate: keepResponse ? existing.weddingDate || '' : '',
    spouseName: keepResponse ? existing.spouseName || '' : '',
    updatedAt: todayIso()
  };
};

export const buildImportResult = (mapped, existingCitizens, assignGroup) => {
  const validRows = mapped.filter(isImportableRow);
  const months = importMonths(mapped);
  const existingByKey = new Map(existingCitizens.map(citizen => [duplicateKey(citizen), citizen]));
  const seen = new Set();
  const newRows = [];
  const updates = [];
  let skipped = 0;
  for (const row of validRows) {
    const key = duplicateKey(row);
    if (existingByKey.has(key)) {
      updates.push(mergeCitizen(existingByKey.get(key), row, assignGroup(row)));
      existingByKey.delete(key);
      seen.add(key);
    } else if (seen.has(key)) {
      skipped++;
    } else {
      seen.add(key);
      const assignment = assignmentInfo(assignGroup(row));
      newRows.push({ ...row, deceased: false, moved: false, id: nextId("G-2026", [...existingCitizens, ...newRows]), archived: false, questionnaireCycle: questionnaireCycleForCitizen(row), source: "CSV Import", createdAt: row.createdAt || todayIso(), updatedAt: todayIso(), status: assignment.ambiguous || !assignment.groupId ? "offen" : "importiert" });
    }
  }
  const missing = existingCitizens.filter(citizen => months.has(monthOf(citizen.birthDate)) && !seen.has(duplicateKey(citizen)));
  const missingIds = new Set(missing.map(citizen => citizen.id));
  const retained = existingCitizens.map(citizen => missingIds.has(citizen.id) && !citizen.archived
    ? { ...citizen, archived: true, updatedAt: todayIso() }
    : citizen);
  return { newRows, updates, skipped, deleted: [], retained, affectedMonths: [...months], missing };
};

export const importNotice = ({ newRows, updates, skipped, deleted = [], missing = [] }) => {
  const parts = [];
  if (deleted.length) parts.push(`${deleted.length} Monatsdatensätze gelöscht`);
  if (newRows.length) parts.push(`${newRows.length} neue Datensätze importiert`);
  if (updates.length) parts.push(`${updates.length} Bestände aktualisiert`);
  if (skipped) parts.push(`${skipped} Dubletten übersprungen`);
  if (missing.length) parts.push(`${missing.length} bisherige Datensätze zur Prüfung archiviert`);
  return parts.length ? parts.join(", ") + "." : "Keine Änderungen.";
};

export const citizenGridRow = (citizen, group) => ({
  id: citizen.id,
  name: citizenListName(citizen),
  birthday: citizen.birthDate,
  age: calculateAge(citizen.birthDate),
  address: `${citizen.street} ${citizen.houseNo}`,
  groupId: group?.id || "offen",
  wish: citizen.wish || "",
  flags: citizenFlagText(citizen),
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
