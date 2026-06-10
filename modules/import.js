export const detectDelimiter = text => [";", "\t", ","]
  .map(delimiter => [delimiter, ((text.split("\n")[0] || "").split(delimiter).length - 1)])
  .sort((a, b) => b[1] - a[1])[0][0];
export const cleanCell = value => String(value ?? "").trim().replace(/^"|"$/g, "").replaceAll('""', '"');
export const parseCsv = text => {
  const delimiter = detectDelimiter(text);
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map(line => line.split(delimiter).map(cleanCell));
  const headers = rows[0] || [];
  return rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
};
export const getAny = (row, keys) => keys.map(key => row[key]).find(value => value !== undefined && value !== "") || "";
export const mapImportRow = row => ({
  salutation: getAny(row, ["Anrede", "salutation"]),
  firstName: getAny(row, ["Vorname", "firstName", "Vorname(n)"]),
  lastName: getAny(row, ["Nachname", "Name", "lastName"]),
  street: getAny(row, ["Straße", "Strasse", "street"]),
  houseNo: getAny(row, ["Hausnummer", "Nr", "houseNo"]),
  postalCode: getAny(row, ["PLZ", "postalCode"]),
  district: getAny(row, ["Ortsteil", "district"]),
  birthDate: getAny(row, ["Geburtsdatum", "birthDate"]),
  phone: getAny(row, ["Telefon", "phone"]),
  email: getAny(row, ["E-Mail", "Email", "email"]),
  wish: "offen",
  notes: ""
});
