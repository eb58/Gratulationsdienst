import { calculateAge, formatStreetAddress, normalize, nextId, todayIso } from './utils.js';
import { duplicateKey, isPrintedCitizen } from './assignment.js';

const importLogEntry = (row, { missing, duplicate, printedDuplicate, group }) => ({
  time: new Date().toLocaleString("de-DE"),
  firstName: row.firstName || "",
  lastName: row.lastName || "",
  name: [row.lastName, row.firstName].filter(Boolean).join(", "),
  address: formatStreetAddress(row),
  birthDate: row.birthDate || "",
  age: row.age || (row.birthDate ? calculateAge(row.birthDate) : ""),
  groupId: group || "",
  type: missing ? "Fehler" : duplicate ? "Dublette" : "Importiert",
  message: missing
    ? "Pflichtfelder fehlen."
    : duplicate
      ? printedDuplicate ? "Bestehender Datensatz wurde bereits gedruckt." : "Bestehender Datensatz bleibt erhalten."
      : group ? `Zugeordnet zu ${group}.` : "Straße ohne SOKO-Zuordnung."
});

export const buildImportResult = (mapped, existingCitizens, assignGroup) => mapped.reduce((acc, row) => {
  const missing = !row.firstName || !row.lastName || !row.birthDate || !row.street;
  const key = duplicateKey(row);
  const duplicate = !missing && acc.keys.includes(key);
  const printedDuplicate = duplicate && acc.printedKeys.includes(key);
  const group = assignGroup(row);
  const log = importLogEntry(row, { missing, duplicate, printedDuplicate, group });
  const item = { ...row, id: nextId("G-2026", [...existingCitizens, ...acc.rows]), source: "CSV Import", updatedAt: todayIso(), status: group ? "importiert" : "offen" };
  return {
    rows: missing || duplicate ? acc.rows : [...acc.rows, item],
    logs: duplicate ? acc.logs : [...acc.logs, log],
    duplicates: duplicate ? acc.duplicates + 1 : acc.duplicates,
    printedDuplicates: printedDuplicate ? acc.printedDuplicates + 1 : acc.printedDuplicates,
    keys: missing || duplicate ? acc.keys : [...acc.keys, key],
    printedKeys: acc.printedKeys
  };
}, {
  rows: [],
  logs: [],
  duplicates: 0,
  printedDuplicates: 0,
  keys: existingCitizens.map(duplicateKey),
  printedKeys: existingCitizens.filter(isPrintedCitizen).map(duplicateKey)
});

export const importNotice = ({ rows, duplicates, printedDuplicates }) => printedDuplicates
  ? `${rows.length} neue Datensätze importiert. ${duplicates} Dubletten ausgefiltert, davon ${printedDuplicates} bereits gedruckt.`
  : duplicates
    ? `${rows.length} neue Datensätze importiert. ${duplicates} Dubletten ausgefiltert.`
    : `${rows.length} neue Datensätze importiert.`;

export const citizenGridRow = (citizen, group) => ({
  id: citizen.id,
  name: `${citizen.lastName}, ${citizen.firstName}`,
  birthday: citizen.birthDate,
  age: calculateAge(citizen.birthDate),
  address: `${citizen.street} ${citizen.houseNo}`,
  groupId: group?.id || "offen",
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
