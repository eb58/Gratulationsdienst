// Erzeugt die SQL-Importdateien fuer gd_soko_members und gd_citizens.
// Aufruf: node scripts/prepare-sql.js

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { parseCsv } from '../modules/import.js';

export const cleanCitizenNumber = value => String(value ?? '').trim().replace(/[.,]\d{1,2}$/, '');
export const isTruthy = value => !['', '0', 'false', 'falsch', 'nein', 'no'].includes(cleanCitizenNumber(value).toLowerCase());

export const parseCitizenDate = value => {
  const [day, month, year] = String(value ?? '').trim().split(' ')[0].split('.').map(Number);
  return day && month && year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
};

export const normalizeCitizenSalutation = value => {
  const sal = String(value ?? '').trim().toLowerCase();
  if (['m', 'herr', 'männlich'].includes(sal)) return 'Herr';
  if (['w', 'f', 'frau', 'weiblich'].includes(sal)) return 'Frau';
  return String(value ?? '').trim();
};

export const splitName = value => {
  const [last, ...rest] = String(value ?? '').split(',');
  return { lastName: (last || '').trim(), firstName: rest.join(',').trim() };
};

export const splitStreet = value => {
  const match = String(value ?? '').trim().match(/^(.*?)\s+(\d.*)$/);
  return match ? { street: match[1].trim(), houseNo: match[2].trim() } : { street: String(value ?? '').trim(), houseNo: '' };
};

const districtNames = {
  rdf: 'Reinickendorf', rdfd: 'Reinickendorf', tgl: 'Tegel', 'tgl.': 'Tegel',
  wit: 'Wittenau', witt: 'Wittenau', wdm: 'Waidmannslust', hdf: 'Hermsdorf',
  hei: 'Heiligensee', hlgs: 'Heiligensee', hgls: 'Heiligensee', hl: 'Heiligensee',
  frn: 'Frohnau', froh: 'Frohnau', kon: 'Konradshöhe', konrad: 'Konradshöhe',
  lüb: 'Lübars', lub: 'Lübars', mv: 'Märkisches Viertel', bor: 'Borsigwalde'
};
const normalizeDistrictPart = value => {
  const raw = String(value ?? '').trim();
  return districtNames[raw.toLowerCase()] || raw;
};
export const normalizeDistrict = value => String(value ?? '').trim().split('/').map(normalizeDistrictPart).filter(Boolean).join(' / ');

export const legacyWishCode = row => String(row.glück ?? '').trim();
export const wishFromFlags = row => {
  const code = String(row.glück ?? '').trim();
  return { '0': 'keine', '1': 'per Post', '2': 'Besuch erwünscht' }[code] || '';
};

export const movedInfo = row => {
  const target = [row['verzogen nach plz'], row['verzogen nach ort'], [row['verzogen nach str'], row['verzogen nach nr']].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return target ? `Verzogen nach ${target}` : (isTruthy(row['verzogen nach ort']) ? 'Verzogen' : '');
};

export const deceasedInfo = row => {
  const date = parseCitizenDate(row['verstorben am']);
  return isTruthy(row.verstorben) || date ? (date ? `Verstorben am ${date}` : 'Verstorben') : '';
};

export const buildNotes = row => [
  row.Geburtsort && `Geburtsort: ${row.Geburtsort}`,
  row.Staat && !/deutsch/i.test(row.Staat) && `Staatsangehörigkeit: ${row.Staat}`,
  row.Adr_zusatz && `Adresszusatz: ${row.Adr_zusatz}`,
  legacyWishCode(row) && `Altdaten-Glück-Code: ${legacyWishCode(row)}`,
  deceasedInfo(row),
  movedInfo(row)
].filter(Boolean).join('\n');

export const isMigratableRow = row => {
  const firstName = row.vorname;
  const lastName = row.nachname;
  return Boolean(firstName && lastName && parseCitizenDate(row.Geb_Datum) && splitStreet(row['Str/Nr']).street);
};

const citizenToday = new Date().toISOString().slice(0, 10);
export const mapCitizenRow = (row, index) => {
  const { street, houseNo } = splitStreet(row['Str/Nr']);
  const birthDate = parseCitizenDate(row.Geb_Datum);
  const deceased = Boolean(deceasedInfo(row));
  const moved = Boolean(movedInfo(row));
  const ageValue = Number(cleanCitizenNumber(row.Alter));
  const age = Number.isInteger(ageValue) && ageValue > 0 ? ageValue : null;
  const printed = isTruthy(row.kartegedruckt);
  const birthYear = Number(birthDate.slice(0, 4));
  return {
    id: `G-2026-${String(index + 1).padStart(3, '0')}`,
    salutation: normalizeCitizenSalutation(row.Geschlecht),
    firstName: row.vorname,
    lastName: row.nachname,
    street,
    houseNo,
    postalCode: cleanCitizenNumber(row.plz),
    district: '',
    birthDate,
    age,
    wish: wishFromFlags(row),
    deceased,
    moved,
    notes: buildNotes(row),
    source: 'CSV Import',
    updatedAt: citizenToday,
    status: printed ? 'gedruckt' : 'importiert',
    printedAt: '',
    printedAge: printed && age !== null ? age : null,
    printedYear: printed && age !== null && birthYear ? birthYear + age : null,
    pressPublication: isTruthy(row.zeitung),
    weddingAnniversary: '',
    weddingDate: '',
    spouseName: ''
  };
};

const expandScientificNumber = value => {
  const match = String(value ?? '').trim().match(/^([+-]?)(\d+)(?:[.,](\d+))?[eE]([+-]?\d+)$/);
  if (!match) return String(value ?? '').trim();

  const [, sign, integerPart, fractionPart = '', exponentText] = match;
  const digits = `${integerPart}${fractionPart}`;
  const decimalIndex = integerPart.length + Number(exponentText);
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
};

export const cleanSokoNumber = value => expandScientificNumber(value).replace(/[.,]\d{1,2}$/, '');
const parseSokoDate = value => {
  const datePart = String(value ?? '').trim().split(' ')[0];
  const [day, month, year] = datePart.split('.').map(Number);
  return day && month && year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
};
const normalizeSokoSalutation = value => {
  const sal = String(value ?? '').trim().toLowerCase();
  if (sal === 'm' || sal === 'herr') return 'Herr';
  if (sal === 'f' || sal === 'w' || sal === 'frau') return 'Frau';
  return String(value ?? '').trim();
};
const sokoGroupId = value => {
  const code = cleanSokoNumber(value);
  return code ? `SOKO ${code.padStart(2, '0')}` : '';
};
const buildGermanIban = (blz, konto) => {
  const bankCode = String(blz ?? '').replace(/\D/g, '');
  const accountNo = String(konto ?? '').replace(/\D/g, '').padStart(10, '0');
  if (bankCode.length !== 8 || accountNo.length > 10) return '';
  const checkSource = `${bankCode}${accountNo}131400`;
  let remainder = 0;
  for (const char of checkSource) remainder = (remainder * 10 + Number(char)) % 97;
  const raw = `DE${String(98 - remainder).padStart(2, '0')}${bankCode}${accountNo}`;
  return raw.match(/.{1,4}/g).join(' ');
};
const isLeaderFromFunction = value => /leit|vorst|vor\./i.test(String(value ?? ''));
export const mapSokoRow = (row, index) => ({
  id: `S-${String(index + 1).padStart(3, '0')}`,
  salutation: normalizeSokoSalutation(row.Anrede),
  firstName: row.Vorname || '',
  lastName: row.Name || '',
  birthDate: parseSokoDate(row.Geburtsdatum),
  groupId: sokoGroupId(row.Sokonummer),
  street: row.Straße || '',
  postalCode: cleanSokoNumber(row.Plz),
  city: row.Ort || '',
  phone: row.Telefon || '',
  mobile: '',
  email: '',
  bank: buildGermanIban(row.Blz, row.Kontonummer),
  accountHolder: row['Name des K-Inhabers'] || '',
  allowance: '',
  termFrom: parseSokoDate(row.Eintrittsdatum),
  termTo: parseSokoDate(row.Austrittsdatum),
  billingAmount: '',
  zpNr: row['ZP-Nr'] || '',
  kassenzeichen: cleanSokoNumber(row.Kassenzeichen),
  misc: row.Sonstiges || '',
  note: row.Bemerkung || '',
  isLeader: isLeaderFromFunction(row.Funktion)
});

const directoryModule = { exports: {} };
const directoryCode = fs.readFileSync(new URL('../public/data/soko-strassenverzeichnis.js', import.meta.url), 'utf8');
vm.runInNewContext(`${directoryCode}\nmodule.exports = { findeSoko };`, { module: directoryModule, window: undefined });
const { findeSoko } = directoryModule.exports;

const sokoColumns = [
  ['id', 'id'], ['salutation', 'salutation'], ['first_name', 'firstName'], ['last_name', 'lastName'],
  ['birth_date', 'birthDate', { nullable: true }], ['group_id', 'groupId'], ['street', 'street'],
  ['postal_code', 'postalCode'], ['city', 'city'], ['phone', 'phone'], ['mobile', 'mobile'], ['email', 'email'],
  ['bank', 'bank'], ['account_holder', 'accountHolder'], ['allowance', 'allowance'],
  ['term_from', 'termFrom', { nullable: true }], ['term_to', 'termTo', { nullable: true }],
  ['billing_amount', 'billingAmount'], ['zp_nr', 'zpNr'], ['kassenzeichen', 'kassenzeichen'], ['misc', 'misc'],
  ['note', 'note'], ['is_leader', 'isLeader', { numeric: true }], ['row_version', 'rowVersion', { numeric: true }],
  ['updated_at', 'updatedAtTimestamp']
];

const citizenColumns = [
  ['id', 'id'], ['salutation', 'salutation'], ['doctoral_degree', 'doctoralDegree'], ['first_name', 'firstName'],
  ['last_name', 'lastName'], ['street', 'street'], ['house_no', 'houseNo'], ['postal_code', 'postalCode'],
  ['district', 'district'], ['birth_date', 'birthDate', { nullable: true }], ['age', 'age', { numeric: true }],
  ['wish', 'wish'], ['deceased', 'deceased', { numeric: true }], ['moved', 'moved', { numeric: true }],
  ['notes', 'notes'], ['source', 'source'], ['updated_at_date', 'updatedAt'], ['status', 'status'],
  ['printed_at_date', 'printedAt', { nullable: true }], ['printed_age', 'printedAge', { numeric: true }],
  ['printed_year', 'printedYear', { numeric: true }], ['press_publication', 'pressPublication', { numeric: true }],
  ['wedding_anniversary', 'weddingAnniversary'], ['wedding_date', 'weddingDate', { nullable: true }],
  ['spouse_name', 'spouseName'], ['archived', 'archived', { numeric: true }],
  ['questionnaire_cycle', 'questionnaireCycle'], ['created_at', 'createdAtTimestamp'],
  ['row_version', 'rowVersion', { numeric: true }], ['updated_at', 'updatedAtTimestamp']
];

const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const sqlText = value => `'${String(value ?? '').replaceAll('\\', '\\\\').replaceAll("'", "''").replace(/\r?\n|\r/g, '\\n')}'`;
const sqlValue = (value, options = {}) => {
  const text = String(value ?? '').trim();
  if (options.nullable && !text) return 'NULL';
  if (options.numeric) return text || 'NULL';
  return sqlText(text);
};
const sqlInsert = (table, columns, rows) => {
  const names = columns.map(([name]) => `\`${name}\``).join(', ');
  const values = rows.map(row => `(${columns.map(([, field, options]) => sqlValue(row[field], options)).join(', ')})`).join(',\n');
  return `INSERT INTO \`${table}\` (${names}) VALUES\n${values};\n`;
};

const validSokoRow = row => Boolean(row.Name && row.Vorname);
const streetAliases = new Map([
  ['AEG-Str.', 'AEG - Siedlung'],
  ['Am Eicrhain', 'Am Eichenhain']
]);
const directoryLookup = (street, houseNo, postalCode) => {
  try {
    return findeSoko(streetAliases.get(street) || street, houseNo, postalCode);
  } catch {
    return null;
  }
};
const directoryCandidates = citizen => {
  const compound = citizen.street === 'Straße' && citizen.houseNo.match(/^(\d+)\s+(.+)$/);
  return compound
    ? [[`Straße ${compound[1]}`, compound[2]]]
    : [[citizen.street, citizen.houseNo]];
};
const resolveCitizenDistrict = citizen => {
  const assignment = directoryCandidates(citizen)
    .map(([street, houseNo]) => directoryLookup(street, houseNo, citizen.postalCode))
    .find(Boolean);
  return {
    ...citizen,
    street: assignment?.strasse || citizen.street,
    district: assignment?.ortsteil || 'nicht zugeordnet'
  };
};

export const buildSokoSql = (rows, importTimestamp = timestamp()) => {
  const members = rows.filter(validSokoRow).map(mapSokoRow).map(member => ({
    ...member,
    id: member.groupId.replace(/^SOKO /, 'SM-'),
    rowVersion: 1,
    updatedAtTimestamp: importTimestamp
  }));
  return sqlInsert('gd_soko_members', sokoColumns, members);
};

export const buildCitizensSql = (rows, importTimestamp = timestamp()) => {
  const citizens = rows.filter(isMigratableRow).map(mapCitizenRow).map(resolveCitizenDistrict).map(citizen => ({
    ...citizen,
    doctoralDegree: '',
    archived: 0,
    questionnaireCycle: '',
    createdAtTimestamp: importTimestamp,
    rowVersion: 1,
    updatedAtTimestamp: importTimestamp
  }));
  return sqlInsert('gd_citizens', citizenColumns, citizens);
};

const run = () => {
  const sokoInput = 'data/Vorsteher.csv';
  const sokoOutput = 'data/Vorsteher-gd_soko_members.sql';
  const citizensInput = 'data/arbeitsliste.csv';
  const citizensOutput = 'data/arbeitsliste-gd_citizens.sql';
  const importTimestamp = timestamp();
  const sokoRows = parseCsv(fs.readFileSync(sokoInput, 'utf8'));
  const citizenRows = parseCsv(fs.readFileSync(citizensInput, 'utf8'));
  const validCitizens = citizenRows.filter(isMigratableRow);

  fs.mkdirSync(path.dirname(sokoOutput), { recursive: true });
  fs.writeFileSync(sokoOutput, buildSokoSql(sokoRows, importTimestamp), 'utf8');
  fs.writeFileSync(citizensOutput, buildCitizensSql(citizenRows, importTimestamp), 'utf8');

  console.log(`${sokoRows.filter(validSokoRow).length} SOKO members prepared -> ${sokoOutput}`);
  console.log(`${validCitizens.length} citizens prepared, ${citizenRows.length - validCitizens.length} incomplete rows skipped -> ${citizensOutput}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
