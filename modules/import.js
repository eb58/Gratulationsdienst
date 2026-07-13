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
export const getAny = (row, keys) => keys.map(key => row[key]).find(value => value !== undefined && value !== "") || "";
const normalizeDate = value => {
  const raw = String(value ?? "").trim();
  const german = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (german) return `${german[3]}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  return raw;
};
export const mapImportRow = row => ({
  salutation: getAny(row, ["Anrede", "salutation"]),
  firstName: getAny(row, ["Vorname", "firstName", "Vorname(n)"]),
  lastName: getAny(row, ["Nachname", "Name", "lastName"]),
  street: getAny(row, ["Straße", "Strasse", "street"]),
  houseNo: getAny(row, ["Hausnummer", "Nr", "houseNo"]),
  postalCode: getAny(row, ["PLZ", "postalCode"]),
  district: getAny(row, ["Ortsteil", "district"]),
  birthDate: normalizeDate(getAny(row, ["Geburtsdatum", "Geburtstag", "Geb.-Datum", "Geb.Dat.", "birthDate", "birthday"])),
  age: getAny(row, ["Alter", "age"]),
  phone: getAny(row, ["Telefon", "phone"]),
  email: getAny(row, ["E-Mail", "Email", "email"]),
  wish: "offen",
  deceased: false,
  moved: false,
  notes: ""
});
