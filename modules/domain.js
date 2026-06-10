import { normalize, ibanMod97, ibanToNumeric, formatIban, normalizeIban } from './utils.js';

export const months = [
  ["alle", "Alle Monate"],
  ["01", "Januar"],
  ["02", "Februar"],
  ["03", "März"],
  ["04", "April"],
  ["05", "Mai"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "August"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "Dezember"]
];

export const reinickendorfDistricts = [
  "nicht zugeordnet",
  "Borsigwalde",
  "Frohnau",
  "Heiligensee",
  "Hermsdorf",
  "Konradshöhe",
  "Lübars",
  "Märkisches Viertel",
  "Reinickendorf",
  "Tegel",
  "Waidmannslust",
  "Wittenau"
];
export const isKnownDistrictValue = value => value && (reinickendorfDistricts.includes(value) || value.includes(" / "));
export const normalizeStreetDistrict = value => isKnownDistrictValue(value) ? value : "nicht zugeordnet";
export const districtOptions = current => {
  const options = reinickendorfDistricts.map(district => [district, district]);
  return current && !reinickendorfDistricts.includes(current) ? [[current, current], ...options] : options;
};

export const sokoColorPalette = ["#2b7a78", "#8f6b2f", "#c44e52", "#4c78a8", "#6f4e9b", "#59a14f", "#b07aa1", "#f28e2b", "#3f6c51", "#e15759", "#7f7f7f", "#1f77b4"];
export const sokoGroupId = code => `SOKO ${code}`;
export const sokoCodesFromDirectory = () => [...new Set(Object.values(window.SOKO_STRASSENVERZEICHNIS || {}).flat().map(entry => entry.soko))]
  .sort((a, b) => Number(a) - Number(b));
export const sokoMemberId = (groupIndex, memberIndex) => `S-${String((groupIndex * 2) + memberIndex + 1).padStart(3, "0")}`;
export const sokoLeaderId = code => sokoMemberId(sokoCodesFromDirectory().indexOf(code), 0);
export const sokoColors = {
  ...Object.fromEntries(sokoCodesFromDirectory().map((code, index) => [sokoGroupId(code), sokoColorPalette[index % sokoColorPalette.length]])),
  offen: "#9aa0a6"
};
export const sokoStreetNames = code => Object.entries(window.SOKO_STRASSENVERZEICHNIS || {})
  .filter(([, entries]) => entries.some(entry => entry.soko === code))
  .map(([name]) => name);

export const streetRuleId = (streetIndex, ruleIndex) => `SR-${String(streetIndex + 1).padStart(4, "0")}-${String(ruleIndex + 1).padStart(2, "0")}`;
export const normalizeStreetRules = (rules = [], streetIndex = 0) => rules.map((rule, ruleIndex) => ({
  id: rule.id || streetRuleId(streetIndex, ruleIndex),
  plz: rule.plz || "",
  ortsteil: normalizeStreetDistrict(rule.ortsteil || rule.district),
  soko: rule.soko ? String(rule.soko).padStart(2, "0") : "",
  von: rule.von || "",
  bis: rule.bis || "",
  art: rule.art || "F"
}));
export const streetDistrictSummary = rules => [...new Set(rules.map(rule => rule.ortsteil).filter(Boolean))].join(" / ");
export const streetGroupSummary = rules => {
  const groups = [...new Set(rules.map(rule => rule.soko).filter(Boolean))];
  return groups.length === 1 ? sokoGroupId(groups[0]) : "";
};
export const streetGroupDisplay = street => {
  const groups = [...new Set((street.rules || []).map(rule => rule.soko).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  return street.groupId || (groups.length ? groups.map(sokoGroupId).join(", ") : "offen");
};
export const streetRangeLabel = rule => [rule.von || "alle", rule.bis || "alle"].some(value => value !== "alle")
  ? `${rule.von || "ab Anfang"}-${rule.bis || "offen"} ${rule.art || "F"}`
  : "alle Hausnummern";

export const buildSokoGroups = () => sokoCodesFromDirectory().map(code => {
  const entries = Object.values(window.SOKO_STRASSENVERZEICHNIS || {}).flat().filter(entry => entry.soko === code);
  const districts = [...new Set(entries.map(entry => entry.ortsteil))].join(" / ");
  const sampleStreets = sokoStreetNames(code).slice(0, 3).join(", ");
  return {
    id: sokoGroupId(code),
    name: `SOKO ${code}`,
    region: [districts, sampleStreets].filter(Boolean).join(" - "),
    leaderId: sokoLeaderId(code)
  };
});

export const demoMemberFirstNames = ["Andrea", "Peter", "Ursula", "Uwe", "Marion", "Dieter", "Birgit", "Ralf", "Claudia", "Thomas", "Heike", "Norbert", "Sabine", "Frank", "Gisela", "Stefan", "Petra", "Michael", "Monika", "Juergen", "Anja", "Martin", "Renate", "Klaus", "Inge", "Werner", "Brigitte", "Joachim", "Hilde", "Manfred", "Elisabeth", "Karl"];
export const demoMemberLastNames = ["Schulz", "Klein", "Falk", "Scholz", "Berndt", "Krause", "Meyer", "Krueger", "Richter", "Brandt", "Sommer", "Peters", "Koch", "Wagner", "Kranz", "Moeller", "Hahn", "Berger", "Seidel", "Neumann", "Vogel", "Becker", "Lange", "Fischer", "Lorenz", "Wolf", "Hoffmann", "Schmidt", "Zimmermann", "Braun", "Hartmann", "Weber"];
export const demoEmailPart = value => String(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replaceAll("ß", "ss").replace(/[^a-z0-9]+/g, "");
export const demoIban = memberNo => {
  const bban = `10000000${String(memberNo + 1).padStart(10, "0")}`;
  const checkDigits = String(98 - ibanMod97(ibanToNumeric(`${bban}DE00`))).padStart(2, "0");
  return formatIban(`DE${checkDigits}${bban}`);
};
export const buildSokoMembers = () => sokoCodesFromDirectory().flatMap((code, groupIndex) => [0, 1].map(memberIndex => {
  const memberNo = (groupIndex * 2) + memberIndex;
  const firstName = demoMemberFirstNames[memberNo % demoMemberFirstNames.length];
  const lastName = demoMemberLastNames[memberNo % demoMemberLastNames.length];
  const streets = sokoStreetNames(code);
  return {
    id: sokoMemberId(groupIndex, memberIndex),
    salutation: memberNo % 2 ? "Herr" : "Frau",
    firstName,
    lastName,
    groupId: sokoGroupId(code),
    street: `${streets[memberIndex % Math.max(streets.length, 1)] || "Eichborndamm"} ${12 + groupIndex + memberIndex}`,
    phone: memberIndex ? "" : `030 ${String(401000 + groupIndex).padStart(6, "0")}`,
    mobile: memberIndex ? `0170 ${String(200000 + memberNo).padStart(6, "0")}` : "",
    email: `${demoEmailPart(firstName)}.${demoEmailPart(lastName)}.${code}@example.test`,
    bank: demoIban(memberNo),
    allowance: "35,00",
    termFrom: "2025-01-01",
    termTo: "2028-12-31",
    billingAmount: "15,00",
    isLeader: memberIndex === 0
  };
}));

export const buildStreetData = () => Object.entries(window.SOKO_STRASSENVERZEICHNIS || {}).map(([name, entries], i) => {
  const rules = normalizeStreetRules(entries, i);
  return {
    id: `STR-${String(i + 1).padStart(4, "0")}`,
    name,
    district: streetDistrictSummary(rules),
    groupId: streetGroupSummary(rules),
    rules
  };
});

export const sampleData = {
  citizens: [
    { id: "G-2026-001", salutation: "Frau", firstName: "Hilde", lastName: "Krüger", street: "Alt-Lübars", houseNo: "17", postalCode: "13469", district: "Lübars", birthDate: "1936-07-14", phone: "", email: "", wish: "Besuch erwünscht", notes: "Runder Geburtstag, Besuch durch SOKO vormerken.", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-002", salutation: "Herr", firstName: "Karl", lastName: "Lehmann", street: "Oraniendamm", houseNo: "42", postalCode: "13469", district: "Waidmannslust", birthDate: "1931-07-03", phone: "030 403000", email: "", wish: "per Post", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "geprüft" },
    { id: "G-2026-003", salutation: "Frau", firstName: "Elisabeth", lastName: "Sommer", street: "Scharnweberstr.", houseNo: "108", postalCode: "13405", district: "Reinickendorf", birthDate: "1941-08-22", phone: "", email: "familie.sommer@example.test", wish: "Veranstaltungseinladung", notes: "Einladung bevorzugt per Brief.", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-004", salutation: "Herr", firstName: "Manfred", lastName: "Wolter", street: "Residenzstr.", houseNo: "88", postalCode: "13409", district: "Reinickendorf", birthDate: "1926-07-29", phone: "", email: "", wish: "Besuch erwünscht", notes: "100. Geburtstag, Amtsleitung informieren.", source: "LABO CSV", updatedAt: "2026-06-06", status: "geprüft" },
    { id: "G-2026-005", salutation: "Frau", firstName: "Renate", lastName: "Berger", street: "Hermsdorfer Damm", houseNo: "92", postalCode: "13467", district: "Hermsdorf", birthDate: "1936-08-02", phone: "", email: "", wish: "per Post", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-006", salutation: "Herr", firstName: "Joachim", lastName: "Neumann", street: "Zabel-Krüger-Damm", houseNo: "5", postalCode: "13469", district: "Wittenau", birthDate: "1941-07-18", phone: "", email: "", wish: "Besuch erwünscht", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "offen" }
  ],
  sokoGroups: buildSokoGroups(),
  sokoMembers: buildSokoMembers(),
  streets: buildStreetData(),
  senders: [
    { id: "A-001", role: "Bezirksbürgermeisterin", name: "Bezirksbürgermeisterin Reinickendorf", department: "Bezirksamt Reinickendorf von Berlin", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "gratulationsdienst@example.test", logo: "Bezirksamt Reinickendorf", signature: "Emine Demirbüken-Wegner", color: "#0f5d58" },
    { id: "A-002", role: "Stadtrat", name: "Stadtrat für Soziales", department: "Abteilung Soziales und Bürgerdienste", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "soziales@example.test", logo: "Berlin Reinickendorf", signature: "Dr. Weber", color: "#b64036" },
    { id: "A-003", role: "Fachbereich", name: "Fachbereich Gratulationsdienst", department: "Amt für Bürgerdienste", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "gratulation@example.test", logo: "Gratulationsdienst", signature: "Müller", color: "#315a8c" }
  ],
  templates: [
    { id: "T-001", name: "Quadratische Reinickendorf-Karte", occasion: "Geburtstag", format: "Quadratkarte 210 mm", senderId: "A-001", subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "{{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratulieren wir Ihnen im Namen des Bezirksamtes Reinickendorf sehr herzlich.\n\nFür das neue Lebensjahr wünschen wir Ihnen Gesundheit, Freude und viele gute Begegnungen.", updatedAt: "2026-06-08" },
    { id: "T-002", name: "Geburtstagskarte 85+", occasion: "Geburtstag", format: "A5 Karte", senderId: "A-001", subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "{{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratuliere ich Ihnen im Namen des Bezirksamtes Reinickendorf sehr herzlich.\n\nFür das neue Lebensjahr wünsche ich Ihnen Gesundheit, Zuversicht und viele gute Begegnungen.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" },
    { id: "T-003", name: "Jubiläumsanschreiben Besuch", occasion: "Jubiläum", format: "DIN A4 Brief", senderId: "A-002", subject: "Ihr Jubiläum am {{geburtstag}}", body: "{{anrede}} {{nachname}},\n\nanlässlich Ihres besonderen Jubiläums möchten wir Ihnen persönlich gratulieren. Die zuständige Sozialkommission {{soko}} wird die weiteren Schritte abstimmen.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" },
    { id: "T-004", name: "Veranstaltungseinladung", occasion: "Einladung", format: "DIN A4 Brief", senderId: "A-003", subject: "Einladung des Bezirksamtes Reinickendorf", body: "{{anrede}} {{nachname}},\n\nwir laden Sie herzlich zur nächsten Veranstaltung des Bezirksamtes Reinickendorf ein.\n\nWeitere Informationen erhalten Sie mit diesem Schreiben.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" }
  ],
  importLog: []
};
