import fs from "node:fs";
import path from "node:path";

// Migration der SOKO-Mitglieder aus dem Alt-CSV (Semikolon-getrennt, Quotes, deutsche Dezimalreste wie "13349,00").
// Aufruf: node scripts/import-soko-members.js <input.csv> [output.json]
// Ausgabe ist ein camelCase-Array passend zur API-Collection sokoMembers (PUT /sokoMembers).

const inputFile = process.argv[2];
const outputFile = process.argv[3] || "data/soko-members.json";
if (!inputFile) {
  console.error("Aufruf: node scripts/import-soko-members.js <input.csv> [output.json]");
  process.exit(1);
}

// CSV-Zeile mit quoted fields zerlegen (Trennzeichen nur außerhalb von Anführungszeichen)
const splitCsvLine = line => {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ";" && !inQuotes) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells.map(cell => cell.trim());
};

const parseCsv = text => {
  const lines = text.replace(/^﻿/, "").trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
};

// Entfernt deutsche Dezimalreste ("13349,00" -> "13349", "1,00" -> "1")
const cleanNumber = value => String(value ?? "").trim().replace(/[.,]\d{1,2}$/, "");

// "6.4.1966 00:00:00" -> "1966-04-06", leer -> ""
const parseDate = value => {
  const datePart = String(value ?? "").trim().split(" ")[0];
  const [day, month, year] = datePart.split(".").map(Number);
  return day && month && year ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
};

const normalizeSalutation = value => {
  const sal = String(value ?? "").trim().toLowerCase();
  if (sal === "m" || sal === "herr") return "Herr";
  if (sal === "f" || sal === "w" || sal === "frau") return "Frau";
  return String(value ?? "").trim();
};

// Sokonummer -> Gruppen-Id ("1,00" -> "SOKO 01"), passend zu sokoGroupId() in modules/domain.js
const sokoGroupId = value => {
  const code = cleanNumber(value);
  return code ? `SOKO ${code.padStart(2, "0")}` : "";
};

// Deutsche IBAN aus BLZ (8 Stellen) + Kontonummer (auf 10 Stellen aufgefüllt) berechnen.
// Das Geldinstitut steckt in der BLZ und entfällt daher als eigenes Feld.
const buildGermanIban = (blz, konto) => {
  const bankCode = String(blz ?? "").replace(/\D/g, "");
  const accountNo = String(konto ?? "").replace(/\D/g, "").padStart(10, "0");
  if (bankCode.length !== 8 || accountNo.length > 10) return "";
  const checkSource = `${bankCode}${accountNo}131400`; // D=13, E=14, Prüfziffer-Platzhalter 00
  let remainder = 0;
  for (const char of checkSource) remainder = (remainder * 10 + Number(char)) % 97;
  const raw = `DE${String(98 - remainder).padStart(2, "0")}${bankCode}${accountNo}`;
  return raw.match(/.{1,4}/g).join(" ");
};

// Leitung, wenn die Funktion auf eine Leitungs-/Vorstandsrolle hindeutet
const isLeaderFromFunction = value => /leit|vorst/i.test(String(value ?? ""));

const mapRow = (row, index) => ({
  id: `S-${String(index + 1).padStart(3, "0")}`,
  salutation: normalizeSalutation(row["Anrede"]),
  firstName: row["Vorname"] || "",
  lastName: row["Name"] || "",
  birthDate: parseDate(row["Geburtsdatum"]),
  groupId: sokoGroupId(row["Sokonummer"]),
  street: row["Straße"] || "",
  postalCode: cleanNumber(row["Plz"]),
  city: row["Ort"] || "",
  phone: row["Telefon"] || "",
  mobile: "",
  email: "",
  bank: buildGermanIban(row["Blz"], row["Kontonummer"]),
  accountHolder: row["Name des K-Inhabers"] || "",
  allowance: "",
  termFrom: parseDate(row["Eintrittsdatum"]),
  termTo: parseDate(row["Austrittsdatum"]),
  billingAmount: "",
  zpNr: row["ZP-Nr"] || "",
  kassenzeichen: cleanNumber(row["Kassenzeichen"]),
  misc: row["Sonstiges"] || "",
  note: row["Bemerkung"] || "",
  isLeader: isLeaderFromFunction(row["Funktion"])
});

const rows = parseCsv(fs.readFileSync(inputFile, "utf8"));
const members = rows.map(mapRow);
const withoutIban = members.filter(member => !member.bank).length;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(members, null, 2));

console.log(`${members.length} SOKO-Mitglieder migriert -> ${outputFile}`);
if (withoutIban) console.log(`Hinweis: ${withoutIban} Datensätze ohne berechenbare IBAN (BLZ/Kontonummer prüfen).`);
console.log("Nicht übernommene Spalten: Ortsteil, Urlaub von/bis, vertretungsstatus.");
