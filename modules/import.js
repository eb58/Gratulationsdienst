export const cleanCell = value => String(value ?? "").trim().replace(/^"|"$/g, "").replaceAll('""', '"');
const parsedCell = value => String(value ?? "").trim();
const parseCsvRecords = (text, delimiter) => {
  const records = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = String(text ?? "").replace(/^\uFEFF/, "").trim();
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"' && (inQuotes || cell.trim() === "")) {
      if (inQuotes && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(parsedCell(cell));
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(parsedCell(cell));
      records.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length) {
    row.push(parsedCell(cell));
    records.push(row);
  }
  return records.filter(record => record.some(value => value !== ""));
};
export const detectDelimiter = text => [";", "\t", ","]
  .map(delimiter => [delimiter, (parseCsvRecords(text, delimiter)[0]?.length || 1) - 1])
  .sort((a, b) => b[1] - a[1])[0][0];
export const parseCsv = text => {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvRecords(text, delimiter);
  const headers = rows[0] || [];
  return rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
};
const normalizeDate = value => {
  const raw = String(value ?? "").trim();
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  return raw;
};
const normalizeDistrict = value => String(value ?? '').trim().replace(/^Berlin(?:[-\s]+)(?=\S)/i, '');
export const mapImportRow = row => ({
  salutation: row.Anrede || '',
  doctoralDegree: row['Dr.-Grad'] || '',
  firstName: row.Rufname || '',
  lastName: row.Familienname || '',
  street: row['Straße'] || '',
  houseNo: row['Hs-Nr.'] || '',
  postalCode: row.PLZ || '',
  district: normalizeDistrict(row.Wohnort),
  birthDate: normalizeDate(row.Geburtsdatum),
  age: row.Alter || '',
  wish: 'offen',
  deceased: false,
  moved: false,
  notes: ''
});
