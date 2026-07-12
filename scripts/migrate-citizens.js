import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseCsv } from "../modules/import.js";

// Migration der Bürger-/Jubilar-Daten aus dem Alt-CSV (Semikolon-getrennt, Quotes, deutsche Dezimalreste wie "1,00").
// Aufruf: node scripts/migrate-citizens.js <input.csv> [output.json]
// Ausgabe ist ein camelCase-Array passend zur API-Collection citizens (PUT /citizens).

// Entfernt deutsche Dezimalreste ("480,00" -> "480", "1,00" -> "1")
export const cleanNumber = value => String(value ?? "").trim().replace(/[.,]\d{1,2}$/, "");
// Flag-Spalten ("0"/"1"/"1,00") als Boolean
export const isTruthy = value => !["", "0"].includes(cleanNumber(value));

// "26.03.1946" -> "1946-03-26", leer -> ""
export const parseDate = value => {
  const [day, month, year] = String(value ?? "").trim().split(" ")[0].split(".").map(Number);
  return day && month && year ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
};

export const normalizeSalutation = value => {
  const sal = String(value ?? "").trim().toLowerCase();
  if (["m", "herr", "männlich"].includes(sal)) return "Herr";
  if (["w", "f", "frau", "weiblich"].includes(sal)) return "Frau";
  return String(value ?? "").trim();
};

// "Nachname, Vorname" -> { firstName, lastName }
export const splitName = value => {
  const [last, ...rest] = String(value ?? "").split(",");
  return { lastName: (last || "").trim(), firstName: rest.join(",").trim() };
};

// "Musterstr. 19" -> { street: "Musterstr.", houseNo: "19" }
export const splitStreet = value => {
  const match = String(value ?? "").trim().match(/^(.*?)\s+(\d.*)$/);
  return match ? { street: match[1].trim(), houseNo: match[2].trim() } : { street: String(value ?? "").trim(), houseNo: "" };
};

// Reinickendorfer Ortsteil-Kürzel auf die Schreibweise des Straßenverzeichnisses bringen (Fallback: Rohwert).
const districtNames = {
  rdf: "Reinickendorf", tgl: "Tegel", wit: "Wittenau", wdm: "Waidmannslust",
  hdf: "Hermsdorf", hei: "Heiligensee", frn: "Frohnau", kon: "Konradshöhe",
  lüb: "Lübars", lub: "Lübars", mv: "Märkisches Viertel", bor: "Borsigwalde"
};
export const normalizeDistrict = value => {
  const raw = String(value ?? "").trim();
  return districtNames[raw.toLowerCase()] || raw;
};

export const wishFromFlags = row =>
  isTruthy(row["glück nein"]) ? "keine"
    : isTruthy(row["glück soko"]) ? "Besuch erwünscht"
      : isTruthy(row["glück post"]) ? "per Post"
        : "offen";

export const movedInfo = row => {
  const target = [row["verzogen nach plz"], row["verzogen nach ort"], [row["verzogen nach str"], row["verzogen nach nr"]].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return target ? `Verzogen nach ${target}` : (isTruthy(row["verzogen nach ort"]) ? "Verzogen" : "");
};

export const deceasedInfo = row => {
  const date = parseDate(row["verstorben am"]);
  return isTruthy(row["verstorben"]) || date ? (date ? `Verstorben am ${date}` : "Verstorben") : "";
};

export const buildNotes = row => [
  row["Geburtsort"] && `Geburtsort: ${row["Geburtsort"]}`,
  row["Staat"] && !/deutsch/i.test(row["Staat"]) && `Staatsangehörigkeit: ${row["Staat"]}`,
  row["Adr_zusatz"] && `Adresszusatz: ${row["Adr_zusatz"]}`,
  deceasedInfo(row),
  movedInfo(row)
].filter(Boolean).join("\n");

const today = new Date().toISOString().slice(0, 10);

export const mapRow = (row, index) => {
  const fromName = splitName(row["Name"]);
  const { street, houseNo } = splitStreet(row["Str/Nr"]);
  const birthDate = parseDate(row["Geb_Datum"]);
  const deceased = Boolean(deceasedInfo(row));
  const moved = Boolean(movedInfo(row));
  const age = Number(cleanNumber(row["Alter"]));
  const printed = isTruthy(row["kartegedruckt"]);
  const birthYear = Number(birthDate.slice(0, 4));
  return {
    id: `G-2026-${String(index + 1).padStart(3, "0")}`,
    salutation: normalizeSalutation(row["Geschlecht"]),
    firstName: row["neu_vorname"] || fromName.firstName,
    lastName: row["neu_nachname"] || fromName.lastName,
    street,
    houseNo,
    postalCode: cleanNumber(row["plz"]),
    district: normalizeDistrict(row["bezirk"]),
    birthDate,
    phone: "",
    email: "",
    // Verstorbene werden als solche markiert, Verzogene bekommen keine Karte – Detail steht jeweils in den Notizen.
    wish: deceased ? "verstorben" : moved ? "keine" : wishFromFlags(row),
    notes: buildNotes(row),
    source: "CSV Import",
    updatedAt: today,
    status: printed ? "gedruckt" : "importiert",
    printedAt: "",
    printedAge: printed && age ? age : null,
    printedYear: printed && age && birthYear ? birthYear + age : null,
    pressPublication: isTruthy(row["zeitung"]),
    weddingAnniversary: "",
    weddingDate: "",
    spouseName: ""
  };
};

const runImport = () => {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3] || "data/citizens.json";
  if (!inputFile) {
    console.error("Aufruf: node scripts/migrate-citizens.js <input.csv> [output.json]");
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(inputFile, "utf8"));
  const citizens = rows.map(mapRow);
  const deceased = rows.filter(deceasedInfo).length;
  const moved = rows.filter(movedInfo).length;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(citizens, null, 2));

  console.log(`${citizens.length} Bürger migriert -> ${outputFile}`);
  if (deceased) console.log(`Hinweis: ${deceased} verstorben (wish="keine", Detail in notes).`);
  if (moved) console.log(`Hinweis: ${moved} verzogen (wish="keine", Detail in notes).`);
  console.log("Nicht übernommene Spalten: monat, gebtag, Geburtsmonat, Alter_zusatz, Ort (immer Berlin), soko (per Straßenverzeichnis ableitbar), kartentext (Glückwunschtext global je Druck-Lauf), präs, glück, nummer, zahllistenzusatz, arbeitslistenzusatz_soko/_bezirk, anfragegedruckt.");
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runImport();
