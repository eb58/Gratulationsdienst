const STORAGE_KEY = "gratulationsdienst-prototype";
const API_BASE = "php-api/index.php";
const APP_VERSION = "20260608-6";
window.GRATULATIONSDIENST_VERSION = APP_VERSION;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const todayIso = () => new Date().toISOString().slice(0, 10);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[char]);
const normalize = value => String(value ?? "").trim().toLowerCase();
const byId = (items, id) => items.find(item => item.id === id);
const formatDate = value => value ? new Intl.DateTimeFormat("de-DE").format(new Date(value)) : "";
const isValidEmail = value => !String(value ?? "").trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
const normalizeIban = value => String(value ?? "").replace(/\s/g, "").toUpperCase();
const formatIban = value => normalizeIban(value).match(/.{1,4}/g)?.join(" ") || "";
const ibanToNumeric = value => [...value].map(char => /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char).join("");
const ibanMod97 = value => [...value].reduce((remainder, char) => Number(`${remainder}${char}`) % 97, 0);
const isValidIban = value => {
  const iban = normalizeIban(value);
  const countryLengths = { AD: 24, AE: 23, AL: 28, AT: 20, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, XK: 20 };
  const country = iban.slice(0, 2);
  const expectedLength = countryLengths[country];
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  return /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)
    && (!expectedLength || iban.length === expectedLength)
    && iban.length >= 15
    && iban.length <= 34
    && ibanMod97(ibanToNumeric(rearranged)) === 1;
};
const runYear = () => Number(todayIso().slice(0, 4));
const birthdayInRunYear = birthDate => {
  const birth = new Date(birthDate);
  return new Date(runYear(), birth.getMonth(), birth.getDate());
};
const calculateAge = birthDate => runYear() - new Date(birthDate).getFullYear();
const birthdayMonth = birthDate => String(new Date(birthDate).getMonth() + 1).padStart(2, "0");
const isPrintedCitizen = citizen => citizen.status === "gedruckt";
const activeCitizens = () => state.data.citizens.filter(citizen => !isPrintedCitizen(citizen));
const duplicateKey = citizen => normalize([
  citizen.firstName,
  citizen.lastName,
  citizen.street,
  citizen.houseNo,
  citizen.postalCode,
  calculateAge(citizen.birthDate)
].join("|"));
const months = [
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
const reinickendorfDistricts = [
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
const isKnownDistrictValue = value => value && (reinickendorfDistricts.includes(value) || value.includes(" / "));
const normalizeStreetDistrict = value => isKnownDistrictValue(value) ? value : "nicht zugeordnet";
const districtOptions = current => {
  const options = reinickendorfDistricts.map(district => [district, district]);
  return current && !reinickendorfDistricts.includes(current) ? [[current, current], ...options] : options;
};
const repairMojibakeText = value => typeof value === "string"
  ? value.replace(/(?:\u00c3.|\u00c2.)+/gu, match => new TextDecoder().decode(Uint8Array.from([...match].map(char => char.charCodeAt(0) & 255))))
  : value;
const repairStoredText = value => Array.isArray(value)
  ? value.map(repairStoredText)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairStoredText(entry)]))
    : repairMojibakeText(value);
const demoStreetAssignments = {};
const demoStreetDistricts = {
  "Alt-Lübars": "Lübars",
  "Oraniendamm": "Waidmannslust",
  "Zabel-Krüger-Damm": "Wittenau",
  "Scharnweberstraße": "Tegel",
  "Residenzstraße": "Reinickendorf",
  "Hermsdorfer Damm": "Hermsdorf"
};
const sokoColors = {
  "SOKO 01": "#2b7a78",
  "SOKO 02": "#8f6b2f",
  "SOKO 03": "#c44e52",
  "SOKO 04": "#4c78a8",
  "SOKO 05": "#6f4e9b",
  "SOKO 06": "#59a14f",
  "SOKO 07": "#b07aa1",
  "SOKO 08": "#f28e2b",
  "SOKO 09": "#3f6c51",
  "SOKO 10": "#e15759",
  "SOKO 11": "#7f7f7f",
  "SOKO 12": "#1f77b4",
  offen: "#9aa0a6"
};
const fallbackStreets = [
  { id: "STR-001", name: "Alt-Lübars", district: "Lübars", area: "Nordost", groupId: "SOKO 12" },
  { id: "STR-002", name: "Oraniendamm", district: "Waidmannslust", area: "Nordost", groupId: "SOKO 12" },
  { id: "STR-003", name: "Zabel-Krüger-Damm", district: "Wittenau", area: "Nordost", groupId: "SOKO 12" },
  { id: "STR-004", name: "Scharnweberstraße", district: "Tegel", area: "West", groupId: "SOKO 07" },
  { id: "STR-005", name: "Residenzstraße", district: "Reinickendorf", area: "Mitte", groupId: "SOKO 01" },
  { id: "STR-006", name: "Hermsdorfer Damm", district: "Hermsdorf", area: "Nord", groupId: "SOKO 18" },
  { id: "STR-007", name: "Neue Teststraße", district: "unbekannt", area: "offen", groupId: "" }
];
const buildStreetData = () => (window.REINICKENDORF_STREETS || fallbackStreets).map(street => ({
  ...street,
  district: demoStreetDistricts[street.name] || normalizeStreetDistrict(street.district),
  districts: street.districts || [],
  groupId: demoStreetAssignments[street.name] || street.groupId || ""
}));

const sampleData = {
  citizens: [
    { id: "G-2026-001", salutation: "Frau", firstName: "Hilde", lastName: "Krüger", street: "Alt-Lübars", houseNo: "17", postalCode: "13469", district: "Lübars", birthDate: "1936-07-14", phone: "", email: "", wish: "Besuch erwünscht", notes: "Runder Geburtstag, Besuch durch SOKO vormerken.", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-002", salutation: "Herr", firstName: "Karl", lastName: "Lehmann", street: "Oraniendamm", houseNo: "42", postalCode: "13469", district: "Waidmannslust", birthDate: "1931-07-03", phone: "030 403000", email: "", wish: "Nur Karte", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "geprüft" },
    { id: "G-2026-003", salutation: "Frau", firstName: "Elisabeth", lastName: "Sommer", street: "Scharnweberstraße", houseNo: "108", postalCode: "13405", district: "Tegel", birthDate: "1941-08-22", phone: "", email: "familie.sommer@example.test", wish: "Veranstaltungseinladung", notes: "Einladung bevorzugt per Brief.", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-004", salutation: "Herr", firstName: "Manfred", lastName: "Wolter", street: "Residenzstraße", houseNo: "88", postalCode: "13409", district: "Reinickendorf", birthDate: "1926-07-29", phone: "", email: "", wish: "Besuch erwünscht", notes: "100. Geburtstag, Amtsleitung informieren.", source: "LABO CSV", updatedAt: "2026-06-06", status: "geprüft" },
    { id: "G-2026-005", salutation: "Frau", firstName: "Renate", lastName: "Berger", street: "Hermsdorfer Damm", houseNo: "14", postalCode: "13467", district: "Hermsdorf", birthDate: "1936-08-02", phone: "", email: "", wish: "Nur Karte", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "importiert" },
    { id: "G-2026-006", salutation: "Herr", firstName: "Joachim", lastName: "Neumann", street: "Zabel-Krüger-Damm", houseNo: "5", postalCode: "13469", district: "Wittenau", birthDate: "1941-07-18", phone: "", email: "", wish: "Besuch erwünscht", notes: "", source: "LABO CSV", updatedAt: "2026-06-06", status: "offen" }
  ],
  sokoGroups: [
    { id: "SOKO 01", name: "SOKO Reinickendorf West", region: "Reinickendorf westlich / Schäfersee", leaderId: "S-001" },
    { id: "SOKO 02", name: "SOKO Reinickendorf Ost", region: "Reinickendorf Ost / Residenzstraße", leaderId: "S-004" },
    { id: "SOKO 03", name: "SOKO Borsigwalde", region: "Borsigwalde / Tegel Südost", leaderId: "S-007" },
    { id: "SOKO 04", name: "SOKO Tegel Mitte", region: "Tegel Mitte / Berliner Straße", leaderId: "S-010" },
    { id: "SOKO 05", name: "SOKO Tegel Nord", region: "Tegel Nord / Flughafenbereich", leaderId: "S-013" },
    { id: "SOKO 06", name: "SOKO Heiligensee", region: "Heiligensee", leaderId: "S-016" },
    { id: "SOKO 07", name: "SOKO Konradshöhe", region: "Konradshöhe / Tegelort", leaderId: "S-019" },
    { id: "SOKO 08", name: "SOKO Frohnau", region: "Frohnau", leaderId: "S-022" },
    { id: "SOKO 09", name: "SOKO Hermsdorf", region: "Hermsdorf", leaderId: "S-025" },
    { id: "SOKO 10", name: "SOKO Lübars-Waidmannslust", region: "Lübars / Waidmannslust", leaderId: "S-028" },
    { id: "SOKO 11", name: "SOKO Wittenau", region: "Wittenau", leaderId: "S-031" },
    { id: "SOKO 12", name: "SOKO Märkisches Viertel", region: "Märkisches Viertel", leaderId: "S-034" }
  ],
  sokoMembers: [
    { id: "S-001", salutation: "Frau", firstName: "Andrea", lastName: "Schulz", groupId: "SOKO 01", street: "Mittelbruchzeile 12", phone: "030 401000", mobile: "", email: "andrea.schulz@example.test", bank: "DE50 1000 0000 0000 0000 01", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-002", salutation: "Herr", firstName: "Peter", lastName: "Klein", groupId: "SOKO 01", street: "Reginhardstraße 5", phone: "", mobile: "0170 000002", email: "peter.klein@example.test", bank: "DE23 1000 0000 0000 0000 02", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-003", salutation: "Frau", firstName: "Ursula", lastName: "Falk", groupId: "SOKO 01", street: "Aroser Allee 67", phone: "030 401100", mobile: "", email: "ursula.falk@example.test", bank: "DE93 1000 0000 0000 0000 03", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-004", salutation: "Herr", firstName: "Uwe", lastName: "Scholz", groupId: "SOKO 02", street: "Residenzstraße 88", phone: "", mobile: "0170 000004", email: "uwe.scholz@example.test", bank: "DE66 1000 0000 0000 0000 04", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-005", salutation: "Frau", firstName: "Marion", lastName: "Berndt", groupId: "SOKO 02", street: "Lindauer Allee 41", phone: "030 401200", mobile: "", email: "marion.berndt@example.test", bank: "DE39 1000 0000 0000 0000 05", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-006", salutation: "Herr", firstName: "Dieter", lastName: "Krause", groupId: "SOKO 02", street: "Provinzstraße 19", phone: "", mobile: "0170 000006", email: "dieter.krause@example.test", bank: "DE12 1000 0000 0000 0000 06", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-007", salutation: "Frau", firstName: "Birgit", lastName: "Meyer", groupId: "SOKO 03", street: "Buddestraße 9", phone: "030 402000", mobile: "", email: "birgit.meyer@example.test", bank: "DE82 1000 0000 0000 0000 07", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-008", salutation: "Herr", firstName: "Ralf", lastName: "Krüger", groupId: "SOKO 03", street: "Ernststraße 27", phone: "", mobile: "0170 000008", email: "ralf.krueger@example.test", bank: "DE55 1000 0000 0000 0000 08", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-009", salutation: "Frau", firstName: "Claudia", lastName: "Richter", groupId: "SOKO 03", street: "Borsigwalder Weg 12", phone: "030 402100", mobile: "", email: "claudia.richter@example.test", bank: "DE28 1000 0000 0000 0000 09", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-010", salutation: "Herr", firstName: "Thomas", lastName: "Brandt", groupId: "SOKO 04", street: "Scharnweberstraße 84", phone: "", mobile: "0170 000010", email: "thomas.brandt@example.test", bank: "DE98 1000 0000 0000 0000 10", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-011", salutation: "Frau", firstName: "Heike", lastName: "Sommer", groupId: "SOKO 04", street: "Berliner Straße 31", phone: "030 402200", mobile: "", email: "heike.sommer@example.test", bank: "DE71 1000 0000 0000 0000 11", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-012", salutation: "Herr", firstName: "Norbert", lastName: "Peters", groupId: "SOKO 04", street: "Miraustraße 52", phone: "", mobile: "0170 000012", email: "norbert.peters@example.test", bank: "DE44 1000 0000 0000 0000 12", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-013", salutation: "Frau", firstName: "Sabine", lastName: "Koch", groupId: "SOKO 05", street: "Ackerplanweg 12", phone: "030 403000", mobile: "", email: "sabine.koch@example.test", bank: "DE17 1000 0000 0000 0000 13", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-014", salutation: "Herr", firstName: "Frank", lastName: "Wagner", groupId: "SOKO 05", street: "Karolinenstraße 18", phone: "030 403100", mobile: "", email: "frank.wagner@example.test", bank: "DE87 1000 0000 0000 0000 14", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-015", salutation: "Frau", firstName: "Gisela", lastName: "Kranz", groupId: "SOKO 05", street: "Rue du Commandant Jean Tulasne 6", phone: "", mobile: "0170 000015", email: "gisela.kranz@example.test", bank: "DE60 1000 0000 0000 0000 15", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-016", salutation: "Herr", firstName: "Stefan", lastName: "Möller", groupId: "SOKO 06", street: "Ruppiner Chaussee 112", phone: "", mobile: "0170 000016", email: "stefan.moeller@example.test", bank: "DE33 1000 0000 0000 0000 16", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-017", salutation: "Frau", firstName: "Petra", lastName: "Hahn", groupId: "SOKO 06", street: "Heiligenseestraße 55", phone: "030 404000", mobile: "", email: "petra.hahn@example.test", bank: "DE06 1000 0000 0000 0000 17", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-018", salutation: "Herr", firstName: "Michael", lastName: "Berger", groupId: "SOKO 06", street: "Sandhauser Straße 69", phone: "", mobile: "0170 000018", email: "michael.berger@example.test", bank: "DE76 1000 0000 0000 0000 18", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-019", salutation: "Frau", firstName: "Monika", lastName: "Seidel", groupId: "SOKO 07", street: "Eichelhäherstraße 18", phone: "030 405000", mobile: "", email: "monika.seidel@example.test", bank: "DE49 1000 0000 0000 0000 19", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-020", salutation: "Herr", firstName: "Jürgen", lastName: "Neumann", groupId: "SOKO 07", street: "Sandhauser Straße 22", phone: "", mobile: "0170 000020", email: "juergen.neumann@example.test", bank: "DE22 1000 0000 0000 0000 20", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-021", salutation: "Frau", firstName: "Anja", lastName: "Vogel", groupId: "SOKO 07", street: "Elchdamm 7", phone: "030 405100", mobile: "", email: "anja.vogel@example.test", bank: "DE92 1000 0000 0000 0000 21", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-022", salutation: "Herr", firstName: "Martin", lastName: "Becker", groupId: "SOKO 08", street: "Frohnauer Straße 21", phone: "", mobile: "0170 000022", email: "martin.becker@example.test", bank: "DE65 1000 0000 0000 0000 22", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-023", salutation: "Frau", firstName: "Renate", lastName: "Lange", groupId: "SOKO 08", street: "Ludolfingerplatz 4", phone: "030 406000", mobile: "", email: "renate.lange@example.test", bank: "DE38 1000 0000 0000 0000 23", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-024", salutation: "Herr", firstName: "Klaus", lastName: "Fischer", groupId: "SOKO 08", street: "Oranienburger Chaussee 73", phone: "", mobile: "0170 000024", email: "klaus.fischer@example.test", bank: "DE11 1000 0000 0000 0000 24", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-025", salutation: "Frau", firstName: "Heike", lastName: "Lorenz", groupId: "SOKO 09", street: "Heinsestraße 17", phone: "030 406100", mobile: "", email: "heike.lorenz@example.test", bank: "DE81 1000 0000 0000 0000 25", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-026", salutation: "Herr", firstName: "Manfred", lastName: "Wolf", groupId: "SOKO 09", street: "Hermsdorfer Damm 92", phone: "", mobile: "0170 000026", email: "manfred.wolf@example.test", bank: "DE54 1000 0000 0000 0000 26", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-027", salutation: "Frau", firstName: "Elfriede", lastName: "Becker", groupId: "SOKO 09", street: "Burgfrauenstraße 11", phone: "030 406200", mobile: "", email: "elfriede.becker@example.test", bank: "DE27 1000 0000 0000 0000 27", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-028", salutation: "Herr", firstName: "Joachim", lastName: "Brandt", groupId: "SOKO 10", street: "Waidmannsluster Damm 8", phone: "", mobile: "0170 000028", email: "joachim.brandt@example.test", bank: "DE97 1000 0000 0000 0000 28", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-029", salutation: "Frau", firstName: "Hilde", lastName: "Krüger", groupId: "SOKO 10", street: "Alt-Lübars 22", phone: "030 407000", mobile: "", email: "hilde.krueger@example.test", bank: "DE70 1000 0000 0000 0000 29", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-030", salutation: "Herr", firstName: "Werner", lastName: "Schmidt", groupId: "SOKO 10", street: "Oraniendamm 57", phone: "", mobile: "0170 000030", email: "werner.schmidt@example.test", bank: "DE43 1000 0000 0000 0000 30", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-031", salutation: "Frau", firstName: "Inge", lastName: "Fischer", groupId: "SOKO 11", street: "Zabel-Krüger-Damm 17", phone: "030 407100", mobile: "", email: "inge.fischer@example.test", bank: "DE16 1000 0000 0000 0000 31", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-032", salutation: "Herr", firstName: "Dieter", lastName: "Hoffmann", groupId: "SOKO 11", street: "Eichborndamm 215", phone: "", mobile: "0170 000032", email: "dieter.hoffmann@example.test", bank: "DE86 1000 0000 0000 0000 32", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-033", salutation: "Frau", firstName: "Brigitte", lastName: "Neumann", groupId: "SOKO 11", street: "Triftstraße 44", phone: "030 407200", mobile: "", email: "brigitte.neumann@example.test", bank: "DE59 1000 0000 0000 0000 33", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-034", salutation: "Herr", firstName: "Michael", lastName: "Berger", groupId: "SOKO 12", street: "Wilhelmsruher Damm 140", phone: "", mobile: "0170 000034", email: "michael.berger@example.test", bank: "DE32 1000 0000 0000 0000 34", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: true },
    { id: "S-035", salutation: "Frau", firstName: "Petra", lastName: "Hahn", groupId: "SOKO 12", street: "Senftenberger Ring 82", phone: "030 408000", mobile: "", email: "petra.hahn@example.test", bank: "DE05 1000 0000 0000 0000 35", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false },
    { id: "S-036", salutation: "Frau", firstName: "Gisela", lastName: "Kranz", groupId: "SOKO 12", street: "Finsterwalder Straße 44", phone: "030 408100", mobile: "", email: "gisela.kranz@example.test", bank: "DE75 1000 0000 0000 0000 36", allowance: "35,00", termFrom: "2025-01-01", termTo: "2028-12-31", billingAmount: "15,00", isLeader: false }
  ],
  streets: buildStreetData(),
  senders: [
    { id: "A-001", role: "Bezirksbürgermeisterin", name: "Bezirksbürgermeisterin Reinickendorf", department: "Bezirksamt Reinickendorf von Berlin", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "gratulationsdienst@example.test", logo: "Bezirksamt Reinickendorf", signature: "Emine Demirbüken-Wegner", color: "#0f5d58" },
    { id: "A-002", role: "Stadtrat", name: "Stadtrat für Soziales", department: "Abteilung Soziales und Bürgerdienste", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "soziales@example.test", logo: "Berlin Reinickendorf", signature: "Dr. Weber", color: "#b64036" },
    { id: "A-003", role: "Fachbereich", name: "Fachbereich Gratulationsdienst", department: "Amt für Bürgerdienste", address: "Eichborndamm 215, 13437 Berlin", phone: "030 90294-0", email: "gratulation@example.test", logo: "Gratulationsdienst", signature: "Müller", color: "#315a8c" }
  ],
  templates: [
    { id: "T-001", name: "Quadratische Reinickendorf-Karte", occasion: "Geburtstag", format: "Quadratkarte 210 mm", senderId: "A-001", subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "Sehr geehrte/r {{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratulieren wir Ihnen im Namen des Bezirksamtes Reinickendorf sehr herzlich.\n\nFür das neue Lebensjahr wünschen wir Ihnen Gesundheit, Freude und viele gute Begegnungen.", updatedAt: "2026-06-08" },
    { id: "T-002", name: "Geburtstagskarte 85+", occasion: "Geburtstag", format: "A5 Karte", senderId: "A-001", subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag", body: "Sehr geehrte/r {{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratuliere ich Ihnen im Namen des Bezirksamtes Reinickendorf sehr herzlich.\n\nFür das neue Lebensjahr wünsche ich Ihnen Gesundheit, Zuversicht und viele gute Begegnungen.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" },
    { id: "T-003", name: "Jubiläumsanschreiben Besuch", occasion: "Jubiläum", format: "DIN A4 Brief", senderId: "A-002", subject: "Ihr Jubiläum am {{geburtstag}}", body: "Sehr geehrte/r {{anrede}} {{nachname}},\n\nanlässlich Ihres besonderen Jubiläums möchten wir Ihnen persönlich gratulieren. Die zuständige Sozialkommission {{soko}} wird die weiteren Schritte abstimmen.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" },
    { id: "T-004", name: "Veranstaltungseinladung", occasion: "Einladung", format: "DIN A4 Brief", senderId: "A-003", subject: "Einladung des Bezirksamtes Reinickendorf", body: "Sehr geehrte/r {{anrede}} {{nachname}},\n\nwir laden Sie herzlich zur nächsten Veranstaltung des Bezirksamtes Reinickendorf ein.\n\nWeitere Informationen erhalten Sie mit diesem Schreiben.\n\nMit freundlichen Grüßen", updatedAt: "2026-06-06" }
  ],
  importLog: []
};

const mergeStreetData = streets => {
  const existingByName = Object.fromEntries((streets || []).map(street => [street.name, street]));
  return buildStreetData().map(street => ({
    ...street,
    district: normalizeStreetDistrict(existingByName[street.name]?.district) !== "nicht zugeordnet" ? existingByName[street.name].district : street.district,
    area: street.area || existingByName[street.name]?.area || "",
    groupId: street.groupId || existingByName[street.name]?.groupId || ""
  }));
};
const mergeById = (existing, defaults, keep = () => true) => [
  ...defaults,
  ...(existing || []).filter(item => keep(item) && !defaults.some(entry => entry.id === item.id))
];
const normalizeTemplate = template => {
  const fallback = byId(sampleData.templates, template.id) || {};
  return { ...fallback, ...template, format: template.format || fallback.format || "DIN A4 Brief" };
};
const normalizeTemplates = templates => [
  ...sampleData.templates.map(template => normalizeTemplate({ ...template, ...byId(templates || [], template.id) })),
  ...(templates || []).filter(template => !byId(sampleData.templates, template.id)).map(normalizeTemplate)
];
const normalizeLoadedData = data => {
  const repaired = repairStoredText(data);
  const activeGroupIds = new Set(sampleData.sokoGroups.map(group => group.id));
  return {
    ...repaired,
    sokoGroups: mergeById(repaired?.sokoGroups, sampleData.sokoGroups, group => activeGroupIds.has(group.id)),
    sokoMembers: mergeById(repaired?.sokoMembers, sampleData.sokoMembers, member => activeGroupIds.has(member.groupId)),
    streets: mergeStreetData(repaired?.streets),
    templates: normalizeTemplates(repaired?.templates)
  };
};

const loadData = () => {
  try {
    return normalizeLoadedData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(sampleData));
  } catch {
    return normalizeLoadedData(structuredClone(sampleData));
  }
};

const state = {
  view: "dashboard",
  data: loadData(),
  filters: { q: "", month: "alle", groupId: "alle", age: "alle", status: "alle", occasion: "Geburtstag" },
  selectedCitizenId: "G-2026-001",
  selectedMemberId: "S-001",
  selectedStreetId: "STR-001",
  selectedSenderId: "A-001",
  selectedTemplateId: "T-004",
  importText: "",
  importSplit: 42,
  citizenSplit: 50,
  generatedDocs: [],
  gridApis: {},
  dialog: null
};

const apiCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates", "importLog"];
const persistedCollections = ["citizens", "sokoGroups", "sokoMembers", "streets", "senders", "templates"];
const hasBackendData = data => data && persistedCollections.some(key => Array.isArray(data[key]) && data[key].length);
const apiRequest = (path, options = {}) => fetch(`${API_BASE}${path}`, {
  ...options,
  headers: { "Content-Type": "application/json", ...(options.headers || {}) }
}).then(response => response.ok ? response.json() : Promise.reject(new Error(`API ${response.status}`)));
const loadBackendCollection = collection => apiRequest(`/${collection}`).then(items => [collection, items]);
const saveBackendCollection = (collection, items) => apiRequest(`/${collection}`, {
  method: "PUT",
  body: JSON.stringify(items)
});
const loadCollectionData = () => {
  if (location.protocol === "file:") return;
  Promise.all(apiCollections.map(loadBackendCollection))
    .then(entries => {
      const data = Object.fromEntries(entries);
      if (!hasBackendData(data)) {
        saveCollectionData(state.data);
        return;
      }
      state.data = normalizeLoadedData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
      render();
      toast("Daten aus der Datenbank geladen.");
    })
    .catch(error => console.warn("Datenbank-Laden nicht verfügbar.", error));
};
const saveCollectionData = data => location.protocol === "file:"
  ? Promise.resolve()
  : Promise.all(apiCollections.map(collection => saveBackendCollection(collection, data[collection] || [])))
    .catch(error => console.warn("Datenbank-Speicherung nicht verfügbar.", error));
const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  saveCollectionData(state.data);
};
const toast = message => {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2200);
};

const streetAssignment = citizen => state.data.streets.find(street => normalize(street.name) === normalize(citizen.street));
const groupForCitizen = citizen => byId(state.data.sokoGroups, streetAssignment(citizen)?.groupId);
const leaderForGroup = group => byId(state.data.sokoMembers, group?.leaderId);
const selectedCitizen = () => {
  const citizen = byId(state.data.citizens, state.selectedCitizenId);
  return citizen && !isPrintedCitizen(citizen) ? citizen : activeCitizens()[0];
};
const selectedTemplate = () => byId(state.data.templates, state.selectedTemplateId) || state.data.templates[0];
const selectedSender = () => byId(state.data.senders, state.selectedSenderId) || state.data.senders[0];
const selectedMember = () => byId(state.data.sokoMembers, state.selectedMemberId) || state.data.sokoMembers[0];
const selectedStreet = () => byId(state.data.streets, state.selectedStreetId) || state.data.streets[0];

const filteredCitizens = () => activeCitizens().filter(citizen => {
  const haystack = normalize([citizen.firstName, citizen.lastName, citizen.street, citizen.district, citizen.wish].join(" "));
  const age = calculateAge(citizen.birthDate);
  const group = groupForCitizen(citizen);
  const ageOk = state.filters.age === "alle" || (state.filters.age === "85" && age === 85) || (state.filters.age === "90plus" && age >= 90) || (state.filters.age === "100" && age >= 100);
  return (!state.filters.q || haystack.includes(normalize(state.filters.q)))
    && (state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month)
    && (state.filters.groupId === "alle" || group?.id === state.filters.groupId)
    && (state.filters.status === "alle" || citizen.status === state.filters.status)
    && ageOk;
});
const documentCitizens = () => filteredCitizens().filter(citizen => citizen.status === "geprüft");

const field = (name, label, value, type = "text", extra = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}">
  </div>
`;
const emailField = (name, label, value, extra = "") => {
  const valid = isValidEmail(value);
  return `
    <div class="field ${extra}">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" class="${valid ? "" : "invalid"}" type="email" value="${escapeHtml(value)}" placeholder="name@example.de" autocomplete="email">
      <small class="field-hint ${valid ? "" : "error"}">${String(value ?? "").trim() ? valid ? "E-Mail gültig" : "E-Mail-Adresse ist ungültig" : ""}</small>
    </div>
  `;
};
const ibanField = (name, label, value, extra = "") => {
  const normalized = normalizeIban(value);
  const valid = !normalized || isValidIban(normalized);
  return `
    <div class="field ${extra}">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" class="${valid ? "" : "invalid"}" type="text" value="${escapeHtml(value)}" placeholder="DE89 3704 0044 0532 0130 00" autocomplete="off">
      <small class="field-hint ${valid ? "" : "error"}">${normalized ? valid ? "IBAN gültig" : "IBAN-Prüfziffer ist ungültig" : "Optional, mit IBAN-Prüfzifferprüfung"}</small>
    </div>
  `;
};
const selectField = (name, label, value, options, extra = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <select id="${name}" name="${name}">
      ${options.map(option => `<option value="${escapeHtml(option[0])}" ${String(option[0]) === String(value) ? "selected" : ""}>${escapeHtml(option[1])}</option>`).join("")}
    </select>
  </div>
`;
const textField = (name, label, value, extra = "") => `
  <div class="field ${extra}">
    <label for="${name}">${label}</label>
    <textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea>
  </div>
`;
const checkField = (name, label, value, extra = "") => `
  <div class="field ${extra}">
    <label>${label}</label>
    <label class="toggle-label">
      <input type="hidden" name="${name}" value="false">
      <input id="${name}" type="checkbox" name="${name}" value="true" class="toggle" ${value === "true" || value === true ? "checked" : ""}>
      ${label}
    </label>
  </div>
`;
const radioField = (name, label, value, options, extra = "") => `
  <div class="field ${extra}">
    <label>${escapeHtml(label)}</label>
    <div class="radio-group" role="group" aria-label="${escapeHtml(label)}">
      ${options.map(([optValue, optLabel]) => `
        <label class="radio-option">
          <input type="radio" name="${name}" value="${escapeHtml(optValue)}" ${String(value ?? "") === String(optValue) ? "checked" : ""}>
          ${escapeHtml(optLabel)}
        </label>
      `).join("")}
    </div>
  </div>
`;
const groupOptions = () => [["alle", "Alle SOKO-Gruppen"], ...state.data.sokoGroups.map(group => [group.id, group.id])];
const senderOptions = () => state.data.senders.map(sender => [sender.id, sender.role]);
const templateOptions = () => state.data.templates.map(template => [template.id, template.name]);
const occasionOptions = () => [["Geburtstag", "Geburtstag"], ["Jubiläum", "Jubiläum"], ["Einladung", "Einladung"]];
const formatOptions = () => [["DIN A4 Brief", "DIN A4 Brief"], ["DIN A4 quer", "DIN A4 quer"], ["A5 Karte", "A5 Karte"], ["A5 Karte quer", "A5 Karte quer"], ["Quadratkarte 210 mm", "Quadratkarte 210 mm"]];
const statusPill = status => `<span class="pill ${status === "offen" ? "gold" : status === "geprüft" ? "green" : ""}">${escapeHtml(status)}</span>`;
const assignmentPill = citizen => {
  const group = groupForCitizen(citizen);
  return group ? `<span class="pill">${escapeHtml(group.id)}</span>` : `<span class="pill red">offen</span>`;
};
const confirmDialog = () => state.dialog ? `
  <div class="dialog-backdrop" role="presentation">
    <section class="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div class="dialog-icon">!</div>
      <div>
        <h2 id="dialog-title">${escapeHtml(state.dialog.title)}</h2>
        <p>${escapeHtml(state.dialog.message)}</p>
        <div class="dialog-actions">
          <button type="button" class="ghost-button" data-action="close-dialog">Abbrechen</button>
          <button type="button" class="danger-button" data-action="${escapeHtml(state.dialog.confirmAction)}">${escapeHtml(state.dialog.confirmLabel)}</button>
        </div>
      </div>
    </section>
  </div>
` : "";
const gridHost = (name, height = 430) => `<div class="ag-grid-host" data-grid="${name}" style="height:${height}px"></div>`;
const mapData = () => window.REINICKENDORF_STREET_GEOMETRIES || { bbox: [], segments: [] };
const mapSegments = () => mapData().segments || [];
const mapSegmentCounts = () => mapSegments().reduce((counts, segment) => ({ ...counts, [segment.groupId]: (counts[segment.groupId] || 0) + 1 }), {});
const lonLatToWorld = ([lon, lat], zoom) => {
  const scale = 256 * 2 ** zoom;
  const sinLat = Math.sin(lat * Math.PI / 180);
  return [
    (lon + 180) / 360 * scale,
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  ];
};
const mapViewport = (bbox, width, height, padding, zoom = 13) => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const topLeft = lonLatToWorld([minLon, maxLat], zoom);
  const bottomRight = lonLatToWorld([maxLon, minLat], zoom);
  const scale = Math.min((width - padding * 2) / (bottomRight[0] - topLeft[0]), (height - padding * 2) / (bottomRight[1] - topLeft[1]));
  const xOffset = (width - (bottomRight[0] - topLeft[0]) * scale) / 2;
  const yOffset = (height - (bottomRight[1] - topLeft[1]) * scale) / 2;
  return { zoom, scale, topLeft, xOffset, yOffset };
};
const mapProject = (coord, viewport) => {
  const world = lonLatToWorld(coord, viewport.zoom);
  return [
    viewport.xOffset + (world[0] - viewport.topLeft[0]) * viewport.scale,
    viewport.yOffset + (world[1] - viewport.topLeft[1]) * viewport.scale
  ];
};
const mapTileImages = (bbox, viewport) => {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const minWorld = lonLatToWorld([minLon, maxLat], viewport.zoom);
  const maxWorld = lonLatToWorld([maxLon, minLat], viewport.zoom);
  const minX = Math.floor(minWorld[0] / 256);
  const maxX = Math.floor(maxWorld[0] / 256);
  const minY = Math.floor(minWorld[1] / 256);
  const maxY = Math.floor(maxWorld[1] / 256);
  return Array.from({ length: maxX - minX + 1 }, (_, xIndex) => minX + xIndex).flatMap(tileX =>
    Array.from({ length: maxY - minY + 1 }, (_, yIndex) => {
      const tileY = minY + yIndex;
      const x = viewport.xOffset + (tileX * 256 - viewport.topLeft[0]) * viewport.scale;
      const y = viewport.yOffset + (tileY * 256 - viewport.topLeft[1]) * viewport.scale;
      const size = 256 * viewport.scale;
      return `<image class="map-tile" href="https://tile.openstreetmap.org/${viewport.zoom}/${tileX}/${tileY}.png" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}"></image>`;
    })
  ).join("");
};
const mapPath = (coords, project) => coords.map((coord, index) => {
  const [x, y] = project(coord);
  return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ");
const streetMapSvg = () => {
  const data = mapData();
  const width = 1120;
  const height = 760;
  const viewport = mapViewport(data.bbox, width, height, 28);
  const project = coord => mapProject(coord, viewport);
  const segments = mapSegments();
  return data.bbox.length ? `
    <svg class="street-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Straßenkarte Reinickendorf nach SOKO-Zuständigkeit">
      <rect class="map-background" width="${width}" height="${height}" rx="0"></rect>
      <g class="map-tiles">${mapTileImages(data.bbox, viewport)}</g>
      <g class="map-streets">
        ${segments.map(segment => `
          <path d="${mapPath(segment.coords, project)}" stroke="${escapeHtml(sokoColors[segment.groupId] || sokoColors.offen)}">
            <title>${escapeHtml(segment.name)} · ${escapeHtml(segment.groupId)}</title>
          </path>
        `).join("")}
      </g>
    </svg>
  ` : `<div class="empty-state">Keine Kartendaten geladen</div>`;
};
const gridTheme = () => window.agGrid?.themeQuartz?.withParams ? window.agGrid.themeQuartz.withParams({
  accentColor: "#0f5d58",
  borderColor: "#d9d5ca",
  browserColorScheme: "light",
  fontFamily: "Berlin Type, BerlinType, Berlin Type Office, Segoe UI, Arial, sans-serif",
  headerBackgroundColor: "#fbfaf7",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#f1f7f5",
  selectedRowBackgroundColor: "#d8efe8"
}) : undefined;

const renderTemplate = (template = selectedTemplate(), citizen = selectedCitizen(), sender = selectedSender()) => {
  const group = groupForCitizen(citizen);
  const replacements = {
    anrede: citizen.salutation,
    vorname: citizen.firstName,
    nachname: citizen.lastName,
    strasse: `${citizen.street} ${citizen.houseNo}`,
    plz: citizen.postalCode,
    ortsteil: citizen.district,
    geburtstag: formatDate(birthdayInRunYear(citizen.birthDate)),
    alter: calculateAge(citizen.birthDate),
    soko: group?.id || "offen",
    absender: sender.name
  };
  const replace = text => Object.entries(replacements).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), text);
  return { subject: replace(template.subject), body: replace(template.body), group };
};
const documentFormat = template => {
  const value = normalize(template.format);
  const size = value.includes("quadrat") || value.includes("square") ? "square" : value.includes("a5") ? "a5" : "a4";
  const orientation = value.includes("quer") || value.includes("landscape") ? "landscape" : "portrait";
  return { className: `format-${size}${orientation === "landscape" ? "-landscape" : ""}`, orientation, size };
};
const printFormatClass = template => documentFormat(template).className;
const documentDesignClass = template => {
  const format = documentFormat(template);
  if (format.size === "square") return "square-greeting-card";
  return format.size === "a5" && normalize(template.occasion) === "geburtstag" ? "birthday-card" : "";
};
const compactBirthdayCardBody = citizen => [
  `Sehr geehrte/r ${citizen.salutation} ${citizen.lastName},`,
  `zu Ihrem ${calculateAge(citizen.birthDate)}. Geburtstag gratulieren wir sehr herzlich.`,
  "Für das neue Lebensjahr wünschen wir Gesundheit, Zuversicht und viele gute Begegnungen."
].join("\n\n");
const printPageSettings = format => {
  const value = normalize(format);
  if (value.includes("quadrat") || value.includes("square")) return { size: "210mm 210mm", className: "format-square" };
  if (value.includes("a5") && (value.includes("quer") || value.includes("landscape"))) return { size: "A5 landscape", className: "format-a5-landscape" };
  if (value.includes("a5")) return { size: "A5 portrait", className: "format-a5" };
  if (value.includes("quer") || value.includes("landscape")) return { size: "A4 landscape", className: "format-a4-landscape" };
  return { size: "A4 portrait", className: "format-a4" };
};
const preparePrint = () => {
  const firstDoc = state.generatedDocs[0];
  if (!firstDoc) return false;
  const template = byId(state.data.templates, firstDoc.templateId) || selectedTemplate();
  const settings = printPageSettings(template.format);
  document.body.classList.remove("print-format-a4", "print-format-a4-landscape", "print-format-a5", "print-format-a5-landscape", "print-format-square");
  document.body.classList.add(`print-${settings.className}`);
  $("#dynamic-print-style")?.remove();
  const style = document.createElement("style");
  style.id = "dynamic-print-style";
  style.textContent = `@media print { @page { size: ${settings.size}; margin: 0; } }`;
  document.head.append(style);
  return true;
};
const completePrintRun = () => {
  const printedIds = new Set(state.generatedDocs.map(doc => doc.citizenId));
  if (!printedIds.size) return;
  state.data.citizens = state.data.citizens.map(citizen => printedIds.has(citizen.id)
    ? { ...citizen, status: "gedruckt", printedAt: todayIso(), printedAge: calculateAge(citizen.birthDate), printedYear: runYear(), updatedAt: todayIso() }
    : citizen);
  state.generatedDocs = [];
  state.selectedCitizenId = activeCitizens()[0]?.id || "";
  saveData();
  render();
  toast(`${printedIds.size} Jubilare als gedruckt vermerkt.`);
};
const printCurrentRun = () => {
  if (!preparePrint()) {
    toast("Bitte zuerst einen Dokumentlauf erzeugen.");
    return;
  }
  window.addEventListener("afterprint", completePrintRun, { once: true });
  window.print();
};

const documentPreview = (template = selectedTemplate(), citizen = selectedCitizen(), sender = selectedSender()) => {
  if (!citizen) return `<div class="empty-state">Kein Jubilar ausgewählt</div>`;
  const format = documentFormat(template);
  const designClass = documentDesignClass(template);
  const isCompactCard = designClass && format.orientation === "landscape";
  const isSquareGreetingCard = format.size === "square";
  const rendered = renderTemplate(template, citizen, sender);
  const body = isCompactCard ? compactBirthdayCardBody(citizen) : rendered.body;
  return `
    <div class="document-preview ${format.className} ${designClass} ${isCompactCard ? "compact-card" : ""}">
      <div class="document-sheet">
        ${designClass === "birthday-card" ? `<div class="card-age-mark" aria-hidden="true">${escapeHtml(calculateAge(citizen.birthDate))}</div>` : ""}
        ${isSquareGreetingCard ? `
          <img class="square-card-preview-image" src="assets/gratulationskarte-reinickendorf-210.jpg" alt="" aria-hidden="true">
          <div class="square-greeting">
            <div class="doc-title">${escapeHtml(rendered.subject)}</div>
            <div class="doc-body">${escapeHtml(body)}</div>
            <div class="signature">${escapeHtml(sender.signature)}</div>
          </div>
        ` : `
          <div class="doc-letterhead" style="border-color:${escapeHtml(sender.color)}">
            <div>
              <strong style="color:${escapeHtml(sender.color)}">${escapeHtml(sender.logo)}</strong>
              <div class="doc-address">${escapeHtml(sender.department)}<br>${escapeHtml(sender.address)}</div>
            </div>
            <div class="doc-meta">${escapeHtml(sender.phone)}<br>${escapeHtml(sender.email)}</div>
          </div>
          <div class="doc-address">
            ${escapeHtml(citizen.salutation)} ${escapeHtml(citizen.firstName)} ${escapeHtml(citizen.lastName)}<br>
            ${escapeHtml(citizen.street)} ${escapeHtml(citizen.houseNo)}<br>
            ${escapeHtml(citizen.postalCode)} Berlin
          </div>
          <div class="doc-title">${escapeHtml(rendered.subject)}</div>
          <div class="doc-body">${escapeHtml(body)}</div>
          <div class="signature">${escapeHtml(sender.signature)}</div>
        `}
      </div>
    </div>
  `;
};
const printDocumentPages = () => {
  return state.generatedDocs.map(doc => {
    const citizen = byId(state.data.citizens, doc.citizenId);
    const template = byId(state.data.templates, doc.templateId) || selectedTemplate();
    const sender = byId(state.data.senders, doc.senderId) || selectedSender();
    return citizen ? `<section class="print-page ${printFormatClass(template)}">${documentPreview(template, citizen, sender)}</section>` : "";
  }).join("");
};

const viewTitles = {
  dashboard: "Übersicht",
  citizens: "Jubilare prüfen",
  soko: "Stammdaten: SOKO",
  regions: "Stammdaten: SOKO Straßen & Zuständigkeit",
  map: "SOKO-Straßenkarte",
  senders: "Stammdaten: Absender",
  templates: "Stammdaten: Vorlagen",
  documents: "Dokumentlauf",
  import: "LABO-Import"
};
const wizardSteps = [
  { id: "import", label: "Import" },
  { id: "citizens", label: "Jubilare prüfen" },
  { id: "documents", label: "Dokumentlauf" }
];
const wizardControls = current => {
  const index = wizardSteps.findIndex(step => step.id === current);
  const previous = wizardSteps[index - 1];
  const next = wizardSteps[index + 1];
  return `
    <div class="wizard-bar">
      <div class="wizard-steps" aria-label="Ablaufschritte">
        ${wizardSteps.map((step, stepIndex) => `
          <button type="button" class="wizard-step ${step.id === current ? "active" : ""}" data-nav="${step.id}" aria-current="${step.id === current ? "step" : "false"}">
            <span>${stepIndex + 1}</span>
            <strong>${escapeHtml(step.label)}</strong>
          </button>
        `).join("")}
      </div>
      <div class="wizard-actions">
        ${previous ? `<button type="button" class="ghost-button" data-nav="${previous.id}"><span class="button-arrow">←</span> ${escapeHtml(previous.label)}</button>` : ""}
        ${next ? `<button type="button" class="primary-button" data-nav="${next.id}">${escapeHtml(next.label)} <span class="button-arrow">→</span></button>` : ""}
      </div>
    </div>
  `;
};

const views = {
  dashboard: () => {
    const citizens = activeCitizens();
    const assigned = citizens.filter(citizen => groupForCitizen(citizen)).length;
    const july = citizens.filter(citizen => birthdayMonth(citizen.birthDate) === "07").length;
    const openStreets = state.data.streets.filter(street => !street.groupId).length;
    const counts = state.data.sokoGroups.map(group => [group, citizens.filter(citizen => groupForCitizen(citizen)?.id === group.id).length]);
    return `
      <div class="grid four">
        <div class="metric"><span>Jubilare</span><strong>${citizens.length}</strong><em>${july} im Juli</em></div>
        <div class="metric"><span>SOKO-Zuordnung</span><strong>${assigned}/${citizens.length}</strong><em>${openStreets} Straße offen</em></div>
        <div class="metric"><span>Vorlagen</span><strong>${state.data.templates.length}</strong><em>${state.data.senders.length} Absender</em></div>
        <div class="metric"><span>Letzter Lauf</span><strong>${state.generatedDocs.length}</strong><em>${state.generatedDocs.length ? "bereit" : "nicht gestartet"}</em></div>
      </div>
      <div class="grid two" style="margin-top:16px">
        <section class="panel">
          <h2>Arbeitsstand</h2>
          <div class="progress-list">
            ${counts.map(([group, count]) => `
              <div class="progress-row">
                <strong>${escapeHtml(group.id)}</strong>
                <div class="bar"><span style="width:${Math.max(8, count / Math.max(citizens.length, 1) * 100)}%"></span></div>
                <span>${count}</span>
              </div>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Nächste Druckauswahl</h2>
          <div class="list">
            ${citizens.slice(0, 4).map(citizen => `
              <div class="list-item">
                <div>
                  <strong>${escapeHtml(citizen.firstName)} ${escapeHtml(citizen.lastName)}</strong>
                  <span class="muted">${calculateAge(citizen.birthDate)} Jahre, ${escapeHtml(citizen.district)}</span>
                </div>
                ${assignmentPill(citizen)}
              </div>
            `).join("")}
          </div>
        </section>
      </div>
      <div class="grid two" style="margin-top:16px">
        <section class="panel">
          <h2>Phase-1-Kernprozess</h2>
          <div class="list">
            ${["LABO-Daten importieren", "Jubilare prüfen", "Dokumentlauf erzeugen", "Drucken / Export"].map((label, index) => `
              <div class="list-item"><strong>${index + 1}. ${label}</strong><span class="pill green">bereit</span></div>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Dokumentvorschau</h2>
          ${documentPreview()}
        </section>
      </div>
    `;
  },

  citizens: () => {
    const citizens = filteredCitizens();
    const citizen = citizens.find(item => item.id === state.selectedCitizenId) || citizens[0];
    return `
      ${wizardControls("citizens")}
      <div class="toolbar">
        <input name="q" data-filter placeholder="Suche" value="${escapeHtml(state.filters.q)}">
        <select name="month" data-filter>${months.map(month => `<option value="${month[0]}" ${state.filters.month === month[0] ? "selected" : ""}>${month[1]}</option>`).join("")}</select>
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <select name="age" data-filter>
          ${[["alle", "Alle Alter"], ["85", "85 Jahre"], ["90plus", "90+"], ["100", "100+"]].map(option => `<option value="${option[0]}" ${state.filters.age === option[0] ? "selected" : ""}>${option[1]}</option>`).join("")}
        </select>
      </div>
      <div class="${citizen ? "citizen-split" : ""}" ${citizen ? `style="--citizen-left:${state.citizenSplit}%"` : ""}>
        <section class="panel">
          <h2>Datensätze</h2>
          ${gridHost("citizens", 500)}
        </section>
        ${citizen ? `<div class="vertical-splitter" data-splitter="citizen" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="20" aria-valuemax="80" aria-valuenow="${state.citizenSplit}" tabindex="0"></div>
        <section class="panel">
          <h2>Detailmaske</h2>
          <form id="citizen-form" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(citizen.id)}">
            ${selectField("salutation", "Anrede", citizen.salutation, [["Frau", "Frau"], ["Herr", "Herr"], ["Divers", "Divers"]])}
            ${field("firstName", "Vorname", citizen.firstName)}
            ${field("lastName", "Nachname", citizen.lastName)}
            ${field("birthDate", "Geburtsdatum", citizen.birthDate, "date")}
            ${field("street", "Straße", citizen.street)}
            ${field("houseNo", "Hausnummer", citizen.houseNo)}
            ${field("postalCode", "PLZ", citizen.postalCode)}
            ${field("district", "Ortsteil", citizen.district)}
            ${field("phone", "Telefon", citizen.phone)}
            ${emailField("email", "E-Mail", citizen.email)}
            ${selectField("wish", "Wunsch", citizen.wish, [["Besuch erwünscht", "Besuch erwünscht"], ["per Post", "per Post"], ["keine", "keine"], ["offen", "offen"]], "full")}
            ${radioField("weddingAnniversary", "Es steht bevor die", citizen.weddingAnniversary ?? "", [
              ["", "—"],
              ["Goldene Hochzeit", "Goldene Hochzeit"],
              ["Diamantene Hochzeit", "Diamantene Hochzeit"],
              ["Eiserne Hochzeit", "Eiserne Hochzeit"],
              ["Gnadenhochzeit", "Gnadenhochzeit"]
            ], "full")}
            ${checkField("pressPublication", "Veröffentlichung in der lokalen Presse", citizen.pressPublication, "full")}
            ${textField("notes", "Notiz", citizen.notes, "full")}
            <div class="field full button-row">
              <button type="button" class="primary-button" data-action="save-citizen">Speichern</button>
              <button type="button" class="ghost-button" data-nav="import"><span class="button-arrow">←</span> Import</button>
              <button type="button" class="ghost-button" data-nav="documents">Dokumentlauf <span class="button-arrow">→</span></button>
            </div>
          </form>
        </section>` : ""}
      </div>
    `;
  },

  soko: () => {
    const member = selectedMember();
    return `
      <div class="toolbar">
        <input name="q" data-filter placeholder="Suche" value="${escapeHtml(state.filters.q)}">
        <select name="groupId" data-filter>${groupOptions().map(group => `<option value="${group[0]}" ${state.filters.groupId === group[0] ? "selected" : ""}>${group[1]}</option>`).join("")}</select>
        <button type="button" class="ghost-button" data-action="new-member">Neues Mitglied</button>
        <button type="button" class="ghost-button" data-action="export-soko">XLSX/CSV Export</button>
      </div>
      <div class="grid two">
        <section class="panel">
          <h2>Mitglieder und Leitungen</h2>
          ${gridHost("members", 500)}
        </section>
        <section class="panel">
          <h2>Erfassungsmaske</h2>
          ${member ? `
            <form id="member-form" class="form-grid">
              <input type="hidden" name="id" value="${escapeHtml(member.id)}">
              ${selectField("salutation", "Anrede", member.salutation, [["Frau", "Frau"], ["Herr", "Herr"], ["Divers", "Divers"]])}
              ${field("firstName", "Vorname", member.firstName)}
              ${field("lastName", "Nachname", member.lastName)}
              ${selectField("groupId", "SOKO", member.groupId, state.data.sokoGroups.map(group => [group.id, `${group.id} ${group.region}`]))}
              ${field("street", "Adresse", member.street, "text", "full")}
              ${field("phone", "Telefon", member.phone)}
              ${field("mobile", "Handy", member.mobile)}
              ${emailField("email", "E-Mail", member.email)}
              ${ibanField("bank", "Bankverbindung / IBAN", member.bank, "full")}
              ${field("allowance", "Aufwandspauschale", member.allowance)}
              ${field("billingAmount", "Abrechnungsbetrag", member.billingAmount)}
              ${field("termFrom", "Berufung von", member.termFrom, "date")}
              ${field("termTo", "Berufung bis", member.termTo, "date")}
              ${selectField("isLeader", "Rolle", String(member.isLeader), [["false", "Mitglied"], ["true", "Leitung"]], "full")}
              <div class="field full">
                <button type="button" class="primary-button" data-action="save-member">Speichern</button>
              </div>
            </form>
          ` : `<div class="empty-state">Kein Mitglied ausgewählt</div>`}
        </section>
      </div>
    `;
  },

  regions: () => {
    const street = selectedStreet();
    const unassigned = state.data.streets.filter(item => !item.groupId);
    return `
      <div class="grid two">
        <section class="panel">
          <h2>Straßenverzeichnis</h2>
          ${unassigned.length ? `<div class="alert">${unassigned.length} Straße ohne SOKO-Zuordnung</div>` : ""}
          <div style="margin-top:12px">${gridHost("streets", 500)}</div>
        </section>
        <section class="panel">
          <h2>Zuordnung</h2>
          ${street ? `
            <form id="street-form" class="form-grid">
              <input type="hidden" name="id" value="${escapeHtml(street.id)}">
              ${field("name", "Straße", street.name)}
              ${selectField("district", "Ortsteil", street.district, districtOptions(street.district))}
              ${field("area", "Planquadrat/Gebiet", street.area)}
              ${selectField("groupId", "SOKO-Gruppe", street.groupId, [["", "offen"], ...state.data.sokoGroups.map(group => [group.id, `${group.id} ${group.region}`])])}
              <div class="field full">
                <button type="button" class="primary-button" data-action="save-street">Zuordnung speichern</button>
              </div>
            </form>
            <div class="list" style="margin-top:16px">
              ${activeCitizens().filter(citizen => normalize(citizen.street) === normalize(street.name)).map(citizen => `
                <div class="list-item">
                  <div><strong>${escapeHtml(citizen.firstName)} ${escapeHtml(citizen.lastName)}</strong><span class="muted">${formatDate(citizen.birthDate)}</span></div>
                  ${assignmentPill(citizen)}
                </div>
              `).join("") || `<div class="empty-state">Keine Jubilare in dieser Straße</div>`}
            </div>
          ` : `<div class="empty-state">Keine Straße ausgewählt</div>`}
        </section>
      </div>
    `;
  },

  map: () => {
    return `
      <div class="panel">
        <div class="section-head">
          <div>
            <h2>Straßenkarte Reinickendorf</h2>
          </div>
        </div>
        <div class="map-legend">
          ${state.data.sokoGroups.map(group => `<div class="legend-item"><span style="background:${escapeHtml(sokoColors[group.id])}"></span><strong>${escapeHtml(group.id)}</strong><em>${escapeHtml(group.region)}</em></div>`).join("")}
        </div>
        <div class="map-shell">${streetMapSvg()}</div>
      </div>
    `;
  },

  senders: () => {
    const sender = selectedSender();
    return `
      <div class="grid two">
        <section class="panel">
          <h2>Profile</h2>
          <div class="list">
            ${state.data.senders.map(item => `
              <button type="button" class="list-item" data-action="select-sender" data-id="${escapeHtml(item.id)}">
                <div><strong>${escapeHtml(item.role)}</strong><span class="muted">${escapeHtml(item.department)}</span></div>
                <span class="pill" style="background:${escapeHtml(item.color)}22;color:${escapeHtml(item.color)}">${escapeHtml(item.logo)}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Profilverwaltung</h2>
          <form id="sender-form" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(sender.id)}">
            ${field("role", "Rolle", sender.role)}
            ${field("name", "Name", sender.name)}
            ${field("department", "Organisation", sender.department, "text", "full")}
            ${field("address", "Adresse", sender.address, "text", "full")}
            ${field("phone", "Telefon", sender.phone)}
            ${emailField("email", "E-Mail", sender.email)}
            ${field("logo", "Logo/Briefkopf", sender.logo)}
            ${field("signature", "Unterschrift", sender.signature)}
            ${field("color", "Akzentfarbe", sender.color, "color", "full")}
            <div class="field full">
              <button type="button" class="primary-button" data-action="save-sender">Speichern</button>
            </div>
          </form>
        </section>
      </div>
    `;
  },

  templates: () => {
    const template = selectedTemplate();
    const citizen = selectedCitizen();
    const sender = byId(state.data.senders, template.senderId) || selectedSender();
    return `
      <div class="grid two">
        <section class="panel">
          <div class="section-head">
            <h2>Vorlagen</h2>
            <button type="button" class="ghost-button" data-action="new-template">Neue Vorlage</button>
          </div>
          <div class="list">
            ${state.data.templates.map(item => `
              <button type="button" class="list-item ${item.id === template.id ? "selected" : ""}" data-action="select-template" data-id="${escapeHtml(item.id)}">
                <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.occasion)} · ${escapeHtml(item.format)}</span></div>
                <span class="pill">${escapeHtml(item.id)}</span>
              </button>
            `).join("")}
          </div>
        </section>
        <section class="panel">
          <h2>Editor</h2>
          <form id="template-form" class="form-grid">
            <input type="hidden" name="id" value="${escapeHtml(template.id)}">
            ${field("name", "Vorlagenname", template.name)}
            ${selectField("occasion", "Anlass", template.occasion, occasionOptions())}
            ${selectField("format", "Format", template.format, formatOptions())}
            ${selectField("senderId", "Standard-Absender", template.senderId, senderOptions())}
            ${field("subject", "Betreff/Titel", template.subject, "text", "full")}
            <div class="field full">
              <label>Platzhalter</label>
              <div class="placeholder-row">
                ${["{{anrede}}", "{{vorname}}", "{{nachname}}", "{{alter}}", "{{geburtstag}}", "{{soko}}", "{{absender}}"].map(token => `<button type="button" data-action="insert-token" data-token="${escapeHtml(token)}">${escapeHtml(token)}</button>`).join("")}
              </div>
            </div>
            ${textField("body", "Text", template.body, "full")}
            <div class="field full">
              <button type="button" class="primary-button" data-action="save-template">Vorlage speichern</button>
              <button type="button" class="ghost-button danger-button" data-action="delete-template">Vorlage löschen</button>
            </div>
          </form>
          <div style="margin-top:16px">
            <h2>Vorschau</h2>
            ${documentPreview(template, citizen, sender)}
          </div>
        </section>
      </div>
    `;
  },

  documents: () => {
    const template = selectedTemplate();
    const sender = selectedSender();
    const docs = state.generatedDocs;
    const previewDoc = docs.find(doc => doc.citizenId === state.selectedCitizenId) || docs[0];
    const checkedCount = documentCitizens().length;
    const previewCitizen = previewDoc ? byId(state.data.citizens, previewDoc.citizenId) : documentCitizens()[0] || selectedCitizen();
    const previewTemplate = previewDoc ? byId(state.data.templates, previewDoc.templateId) || template : template;
    const previewSender = previewDoc ? byId(state.data.senders, previewDoc.senderId) || sender : sender;
    return `
      ${wizardControls("documents")}
      <div class="panel">
        <h2>Dokumentlauf konfigurieren</h2>
        <div class="split-controls">
          ${selectField("doc-template", "Vorlage", template.id, templateOptions())}
          ${selectField("doc-sender", "Absender", sender.id, senderOptions())}
          ${selectField("doc-month", "Geburtsmonat", state.filters.month, months)}
          ${selectField("doc-group", "SOKO", state.filters.groupId, groupOptions())}
        </div>
        <div class="button-row" style="margin-top:14px">
          <button type="button" class="ghost-button" data-nav="citizens"><span class="button-arrow">←</span> Jubilare prüfen</button>
          <button type="button" class="primary-button" data-action="generate-docs">Lauf erzeugen</button>
          <button type="button" class="ghost-button" data-action="print-docs">Drucken</button>
          <button type="button" class="ghost-button" data-action="export-docs">PDF/XLSX/XML Export</button>
        </div>
        <p class="muted" style="margin:12px 0 0">Es werden nur geprüfte Jubilare berücksichtigt. Aktuelle Auswahl: ${checkedCount}</p>
      </div>
      <div class="grid two print-target" style="margin-top:16px">
        <section class="panel">
          <h2>Druckliste</h2>
          ${docs.length ? gridHost("documents", 500) : `<div class="empty-state">Kein Dokumentlauf erzeugt</div>`}
        </section>
        <section class="panel">
          <h2>Seriendruck-Vorschau</h2>
          ${documentPreview(previewTemplate, previewCitizen, previewSender)}
        </section>
      </div>
      <div class="print-pages print-only">
        ${docs.length ? printDocumentPages() : ""}
      </div>
    `;
  },

  import: () => `
    ${wizardControls("import")}
    <div class="import-split" style="--import-left:${state.importSplit}%">
      <section class="panel">
        <h2>CSV-Import</h2>
        <div class="form-grid">
          <div class="field full">
            <label for="import-file">Datei</label>
            <div class="file-action-row">
              <label class="file-picker" for="import-file">
                <span>Aus CSV laden</span>
              <em>${state.importText ? "Datei geladen oder Daten eingefügt" : "Noch keine Datei geladen"}</em>
              </label>
              <button type="button" class="ghost-button" data-action="sample-import">Beispiel laden</button>
            </div>
            <input id="import-file" class="file-input" type="file" accept=".csv,text/csv">
          </div>
        </div>
      </section>
      <div class="vertical-splitter" data-splitter="import" role="separator" aria-orientation="vertical" aria-label="Bereiche aufteilen" aria-valuemin="30" aria-valuemax="70" aria-valuenow="${state.importSplit}" tabindex="0"></div>
      <section class="panel">
        <h2>Import-Protokoll</h2>
        ${state.data.importLog.length ? gridHost("importLog", 500) : `<div class="empty-state">Noch kein Import-Protokoll</div>`}
      </section>
    </div>
  `
};

const badgeCell = (value, tone = "") => `<span class="pill ${tone}">${escapeHtml(value)}</span>`;
const agTheme = () => {
  const theme = gridTheme();
  return theme ? { theme } : {};
};
const baseGridOptions = () => ({
  ...agTheme(),
  animateRows: true,
  defaultColDef: {
    filter: true,
    floatingFilter: true,
    resizable: true,
    sortable: true
  },
  localeText: {
    advancedFilterAnd: "UND",
    advancedFilterApply: "Anwenden",
    advancedFilterBlank: "leer",
    advancedFilterBuilder: "Filter-Assistent",
    advancedFilterCancel: "Abbrechen",
    advancedFilterClear: "Löschen",
    advancedFilterColumn: "Spalte",
    advancedFilterContains: "enthält",
    advancedFilterEndsWith: "endet mit",
    advancedFilterEquals: "gleich",
    advancedFilterFalse: "falsch",
    advancedFilterGreaterThan: "größer als",
    advancedFilterGreaterThanOrEqual: "größer oder gleich",
    advancedFilterJoin: "Verknüpfung",
    advancedFilterLessThan: "kleiner als",
    advancedFilterLessThanOrEqual: "kleiner oder gleich",
    advancedFilterNotBlank: "nicht leer",
    advancedFilterNotContains: "enthält nicht",
    advancedFilterNotEqual: "ungleich",
    advancedFilterOr: "ODER",
    advancedFilterStartsWith: "beginnt mit",
    advancedFilterTrue: "wahr",
    advancedFilterValue: "Wert",
    after: "nach",
    andCondition: "UND",
    applyFilter: "Anwenden",
    ariaAdvancedFilterBuilderItem: "Filterbedingung",
    ariaColumn: "Spalte",
    ariaColumnFiltered: "Spalte gefiltert",
    ariaColumnGroup: "Spaltengruppe",
    ariaColumnList: "Spaltenliste",
    ariaColumnPanelList: "Spaltenbereich",
    ariaColumnSelectAll: "Alle Spalten auswählen",
    ariaDateFilterInput: "Datumsfilter-Eingabe",
    ariaDefaultListName: "Liste",
    ariaFilterColumnsInput: "Spalten suchen",
    ariaFilterFromValue: "Filter von Wert",
    ariaFilterInput: "Filtereingabe",
    ariaFilterList: "Filterliste",
    ariaFilterMenuOpen: "Filtermenü öffnen",
    ariaFilterToValue: "Filter bis Wert",
    ariaFilteringOperator: "Filteroperator",
    ariaHidden: "ausgeblendet",
    ariaIndeterminate: "unbestimmt",
    ariaInputEditor: "Eingabeeditor",
    ariaMenuColumn: "Spaltenmenü öffnen",
    ariaPageSizeSelectorLabel: "Seitengröße",
    ariaRowDeselect: "Zeile abwählen",
    ariaRowSelect: "Zeile auswählen",
    ariaSearch: "Suche",
    ariaSortableColumn: "Sortierbare Spalte",
    ariaToggleVisibility: "Sichtbarkeit umschalten",
    ariaUnchecked: "nicht ausgewählt",
    ariaVisible: "sichtbar",
    autosizeAllColumns: "Alle Spalten automatisch anpassen",
    autosizeThisColumn: "Diese Spalte automatisch anpassen",
    before: "vor",
    blanks: "Leer",
    cancelFilter: "Abbrechen",
    clearFilter: "Zurücksetzen",
    columns: "Spalten",
    contains: "Enthält",
    copy: "Kopieren",
    copyWithHeaders: "Mit Überschriften kopieren",
    dateFormatOoo: "tt.mm.jjjj",
    endsWith: "Endet mit",
    equals: "Gleich",
    false: "Falsch",
    filterOoo: "Filtern...",
    first: "Erste",
    firstPage: "Erste Seite",
    greaterThan: "Größer als",
    greaterThanOrEqual: "Größer oder gleich",
    inRange: "Im Bereich",
    lessThan: "Kleiner als",
    lessThanOrEqual: "Kleiner oder gleich",
    last: "Letzte",
    lastPage: "Letzte Seite",
    loadingOoo: "Lade...",
    next: "Weiter",
    nextPage: "Nächste Seite",
    noRowsToShow: "Keine Datensätze vorhanden",
    notBlank: "Nicht leer",
    notContains: "Enthält nicht",
    notEqual: "Ungleich",
    of: "von",
    orCondition: "ODER",
    page: "Seite",
    pageSizeSelectorLabel: "Zeilen:",
    paste: "Einfügen",
    previous: "Zurück",
    previousPage: "Vorherige Seite",
    resetColumns: "Spalten zurücksetzen",
    searchOoo: "Suchen...",
    selectAll: "Alle auswählen",
    selectAllSearchResults: "Alle Suchergebnisse auswählen",
    sortAscending: "Aufsteigend sortieren",
    sortDescending: "Absteigend sortieren",
    startsWith: "Beginnt mit",
    to: "bis",
    true: "Wahr"
  },
  pagination: true,
  paginationPageSize: 10,
  paginationPageSizeSelector: [10, 20, 50],
  rowHeight: 46,
  rowSelection: { checkboxes: false, enableClickSelection: true, mode: "singleRow" },
  suppressCellFocus: true
});
const filteredMembers = () => state.data.sokoMembers.filter(member => {
  const haystack = normalize([member.firstName, member.lastName, member.groupId, member.email, member.phone, member.mobile].join(" "));
  return (state.filters.groupId === "alle" || member.groupId === state.filters.groupId)
    && (!state.filters.q || haystack.includes(normalize(state.filters.q)));
});
const gridDefinitions = {
  citizens: () => ({
    ...baseGridOptions(),
    rowData: filteredCitizens().map(citizen => ({
      id: citizen.id,
      name: `${citizen.lastName}, ${citizen.firstName}`,
      birthday: formatDate(citizen.birthDate),
      age: calculateAge(citizen.birthDate),
      address: `${citizen.street} ${citizen.houseNo}`,
      groupId: groupForCitizen(citizen)?.id || "offen",
      status: citizen.status
    })),
    columnDefs: [
      { headerName: "Name", field: "name", minWidth: 130, flex: 1 },
      { headerName: "Geburtstag", field: "birthday", width: 105 },
      { headerName: "Alter", field: "age", width: 70, filter: "agNumberColumnFilter" },
      { headerName: "Adresse", field: "address", minWidth: 125, flex: 1 },
      { headerName: "SOKO", field: "groupId", width: 94, cellRenderer: params => params.value === "offen" ? badgeCell("offen", "red") : badgeCell(params.value) },
      { headerName: "Status", field: "status", width: 98, cellRenderer: params => statusPill(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => {
      state.selectedCitizenId = params.data.id;
      render();
    }
  }),
  members: () => ({
    ...baseGridOptions(),
    rowData: filteredMembers().map(member => ({
      id: member.id,
      name: `${member.lastName}, ${member.firstName}`,
      groupId: member.groupId,
      contact: member.email || member.phone || member.mobile,
      term: `${formatDate(member.termFrom)} bis ${formatDate(member.termTo)}`,
      role: member.isLeader ? "Leitung" : "Mitglied"
    })),
    columnDefs: [
      { headerName: "Name", field: "name", minWidth: 190, flex: 1 },
      { headerName: "SOKO", field: "groupId", width: 125, cellRenderer: params => badgeCell(params.value) },
      { headerName: "Kontakt", field: "contact", minWidth: 210, flex: 1 },
      { headerName: "Berufung", field: "term", minWidth: 210 },
      { headerName: "Rolle", field: "role", width: 130, cellRenderer: params => params.value === "Leitung" ? badgeCell(params.value, "green") : badgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedMemberId ? "selected" : "",
    onRowClicked: params => {
      state.selectedMemberId = params.data.id;
      render();
    }
  }),
  streets: () => ({
    ...baseGridOptions(),
    rowData: state.data.streets.map(street => ({
      id: street.id,
      name: street.name,
      district: street.district,
      area: street.area,
      groupId: street.groupId || "offen"
    })),
    columnDefs: [
      { headerName: "Straße", field: "name", minWidth: 210, flex: 1 },
      { headerName: "Ortsteil", field: "district", minWidth: 145 },
      { headerName: "Planquadrat/Gebiet", field: "area", minWidth: 160 },
      { headerName: "SOKO", field: "groupId", width: 130, cellRenderer: params => params.value === "offen" ? badgeCell("offen", "red") : badgeCell(params.value) }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.id === state.selectedStreetId ? "selected" : "",
    onRowClicked: params => {
      state.selectedStreetId = params.data.id;
      render();
    }
  }),
  documents: () => ({
    ...baseGridOptions(),
    rowData: state.generatedDocs,
    columnDefs: [
      { headerName: "Empfänger", field: "recipient", minWidth: 190, flex: 1 },
      { headerName: "Adresse", field: "address", minWidth: 230, flex: 1 },
      { headerName: "SOKO", field: "groupId", width: 125, cellRenderer: params => params.value ? badgeCell(params.value) : badgeCell("offen", "red") },
      { headerName: "Vorlage", field: "templateName", minWidth: 190 }
    ],
    getRowId: params => params.data.id,
    getRowClass: params => params.data.citizenId === state.selectedCitizenId ? "selected" : "",
    onRowClicked: params => {
      state.selectedCitizenId = params.data.citizenId;
      render();
    }
  }),
  importLog: () => ({
    ...baseGridOptions(),
    rowData: state.data.importLog.map((item, index) => ({ ...item, id: `LOG-${index}` })),
    columnDefs: [
      { headerName: "Zeit", field: "time", minWidth: 170 },
      { headerName: "Name", field: "name", minWidth: 190, flex: 1 },
      { headerName: "Ergebnis", field: "type", width: 135, cellRenderer: params => params.value === "Fehler" ? badgeCell("Fehler", "red") : params.value === "Dublette" ? badgeCell("Dublette", "gold") : badgeCell("Importiert", "green") },
      { headerName: "Hinweis", field: "message", minWidth: 260, flex: 1 }
    ],
    getRowId: params => params.data.id
  })
};
const mountGrid = element => {
  const definition = gridDefinitions[element.dataset.grid]?.();
  if (!definition) return;
  if (!window.agGrid?.createGrid) {
    element.innerHTML = `<div class="empty-state">AG Grid konnte nicht geladen werden.</div>`;
    return;
  }
  window.agGrid.createGrid(element, definition);
};
const mountGrids = () => $$("[data-grid]").forEach(mountGrid);

const render = () => {
  $("#page-title").textContent = viewTitles[state.view];
  $$(".nav button").forEach(button => button.classList.toggle("active", button.dataset.nav === state.view));
  $("#view").innerHTML = `${views[state.view]()}${confirmDialog()}`;
  mountGrids();
};

const formValues = selector => Object.fromEntries(new FormData($(selector)).entries());
const validateEmailFields = selector => {
  const fields = [...$(selector).querySelectorAll("input[type='email']")];
  const invalid = fields.filter(input => !isValidEmail(input.value));
  fields.forEach(input => input.classList.toggle("invalid", invalid.includes(input)));
  return !invalid.length;
};
const updateItem = (items, id, patch) => items.map(item => item.id === id ? { ...item, ...patch } : item);
const nextId = (prefix, items) => `${prefix}-${String(items.length + 1).padStart(3, "0")}`;
const csvEscape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
const downloadText = (name, content, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const actions = {
  "reset-data": () => {
    state.data = structuredClone(sampleData);
    state.generatedDocs = [];
    saveData();
    render();
    toast("Beispieldaten wurden neu geladen.");
  },
  "select-citizen": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-citizen": () => {
    const values = formValues("#citizen-form");
    if (!validateEmailFields("#citizen-form")) {
      toast("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    const currentList = filteredCitizens();
    const currentIndex = currentList.findIndex(citizen => citizen.id === values.id);
    state.data.citizens = updateItem(state.data.citizens, values.id, { ...values, updatedAt: todayIso(), status: "geprüft" });
    const nextCitizen = currentList[currentIndex + 1] || currentList[0];
    state.selectedCitizenId = nextCitizen?.id || values.id;
    saveData();
    render();
    toast("Jubilar gespeichert.");
  },
  "select-member": event => {
    state.selectedMemberId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "new-member": () => {
    const id = nextId("S", state.data.sokoMembers);
    const member = { id, salutation: "Frau", firstName: "", lastName: "", groupId: state.data.sokoGroups[0].id, street: "", phone: "", mobile: "", email: "", bank: "", allowance: "35,00", termFrom: todayIso(), termTo: "2028-12-31", billingAmount: "15,00", isLeader: false };
    state.data.sokoMembers = [...state.data.sokoMembers, member];
    state.selectedMemberId = id;
    saveData();
    render();
    toast("Neues SOKO-Mitglied angelegt.");
  },
  "save-member": () => {
    const values = formValues("#member-form");
    if (!validateEmailFields("#member-form")) {
      toast("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (values.bank && !isValidIban(values.bank)) {
      $("#bank")?.classList.add("invalid");
      toast("Bitte eine gültige IBAN eingeben.");
      return;
    }
    const patch = { ...values, bank: formatIban(values.bank), isLeader: values.isLeader === "true" };
    state.data.sokoMembers = updateItem(state.data.sokoMembers, values.id, patch);
    state.data.sokoGroups = state.data.sokoGroups.map(group => patch.isLeader && group.id === patch.groupId ? { ...group, leaderId: values.id } : group);
    saveData();
    render();
    toast("SOKO-Daten gespeichert.");
  },
  "export-soko": () => {
    const header = ["id", "anrede", "vorname", "nachname", "soko", "email", "telefon", "leitung"];
    const rows = state.data.sokoMembers.map(member => [member.id, member.salutation, member.firstName, member.lastName, member.groupId, member.email, member.phone || member.mobile, member.isLeader ? "ja" : "nein"]);
    downloadText("soko-mitglieder.csv", [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n"), "text/csv;charset=utf-8");
  },
  "select-street": event => {
    state.selectedStreetId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-street": () => {
    const values = formValues("#street-form");
    state.data.streets = updateItem(state.data.streets, values.id, values);
    saveData();
    render();
    toast("Zuständigkeit gespeichert.");
  },
  "select-sender": event => {
    state.selectedSenderId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "save-sender": () => {
    const values = formValues("#sender-form");
    if (!validateEmailFields("#sender-form")) {
      toast("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    state.data.senders = updateItem(state.data.senders, values.id, values);
    state.selectedSenderId = values.id;
    saveData();
    render();
    toast("Absenderprofil gespeichert.");
  },
  "insert-token": event => {
    const textarea = $("#body");
    const token = event.target.dataset.token;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = `${textarea.value.slice(0, start)}${token}${textarea.value.slice(end)}`;
    textarea.focus();
    textarea.setSelectionRange(start + token.length, start + token.length);
  },
  "select-template": event => {
    state.selectedTemplateId = event.target.closest("[data-id]").dataset.id;
    render();
  },
  "new-template": () => {
    const id = nextId("T", state.data.templates);
    const template = {
      id,
      name: "Neue Vorlage",
      occasion: "Geburtstag",
      format: "DIN A4 Brief",
      senderId: selectedSender().id,
      subject: "Herzliche Glückwünsche zum {{alter}}. Geburtstag",
      body: "Sehr geehrte/r {{anrede}} {{nachname}},\n\nzu Ihrem {{alter}}. Geburtstag gratulieren wir Ihnen sehr herzlich.\n\nMit freundlichen Grüßen\n{{absender}}",
      updatedAt: todayIso()
    };
    state.data.templates = [...state.data.templates, template];
    state.selectedTemplateId = id;
    saveData();
    render();
    toast("Neue Vorlage angelegt.");
  },
  "save-template": () => {
    const values = formValues("#template-form");
    state.data.templates = updateItem(state.data.templates, values.id, { ...values, updatedAt: todayIso() });
    state.selectedTemplateId = values.id;
    saveData();
    render();
    toast("Vorlage gespeichert.");
  },
  "delete-template": () => {
    const template = selectedTemplate();
    if (state.data.templates.length <= 1) {
      toast("Die letzte Vorlage kann nicht gelöscht werden.");
      return;
    }
    state.dialog = {
      type: "delete-template",
      templateId: template.id,
      title: "Vorlage löschen",
      message: `Soll die Vorlage "${template.name}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmLabel: "Vorlage löschen",
      confirmAction: "confirm-delete-template"
    };
    render();
  },
  "close-dialog": () => {
    state.dialog = null;
    render();
  },
  "confirm-delete-template": () => {
    const templateId = state.dialog?.templateId;
    if (!templateId) return;
    state.data.templates = state.data.templates.filter(item => item.id !== templateId);
    state.selectedTemplateId = state.data.templates[0].id;
    state.dialog = null;
    saveData();
    render();
    toast("Vorlage gelöscht.");
  },
  "generate-docs": () => {
    const template = byId(state.data.templates, $("#doc-template").value);
    const sender = byId(state.data.senders, $("#doc-sender").value);
    state.selectedTemplateId = template.id;
    state.selectedSenderId = sender.id;
    state.filters.month = $("#doc-month").value;
    state.filters.groupId = $("#doc-group").value;
    const citizens = documentCitizens();
    state.generatedDocs = citizens.map(citizen => ({
      id: `DOC-${citizen.id}`,
      citizenId: citizen.id,
      templateId: template.id,
      senderId: sender.id,
      recipient: `${citizen.firstName} ${citizen.lastName}`,
      address: `${citizen.street} ${citizen.houseNo}, ${citizen.postalCode} Berlin`,
      groupId: groupForCitizen(citizen)?.id || "",
      templateName: template.name,
      sender: sender.role,
      createdAt: todayIso()
    }));
    render();
    toast(state.generatedDocs.length ? `${state.generatedDocs.length} Dokumente erzeugt.` : "Keine geprüften Jubilare in der aktuellen Auswahl.");
  },
  "print-docs": printCurrentRun,
  "export-docs": () => {
    const header = ["id", "empfaenger", "adresse", "soko", "vorlage", "absender", "datum"];
    const rows = state.generatedDocs.map(doc => [doc.id, doc.recipient, doc.address, doc.groupId, doc.templateName, doc.sender, doc.createdAt]);
    downloadText("dokumentlauf.csv", [header, ...rows].map(row => row.map(csvEscape).join(";")).join("\n"), "text/csv;charset=utf-8");
  },
  "sample-import": () => {
    const batch = String(Date.now()).slice(-6);
    const door = value => `${value}${batch.slice(-2)}`;
    state.importText = [
      "Anrede;Vorname;Nachname;Straße;Hausnummer;PLZ;Ortsteil;Geburtsdatum;Telefon;E-Mail",
      `Frau;Lena;Bachmann;Ackerplanweg;${door("12")};13507;Tegel;1941-07-21;030 401${batch};lena.bachmann.${batch}@example.test`,
      `Herr;Martin;Feldmann;Alt-Lübars;${door("8")};13469;Lübars;1936-08-03;;`,
      `Frau;Clara;Wegner;Auguste Viktoria-Allee;${door("44")};13403;Reinickendorf;1931-09-14;030 412${batch};`,
      `Herr;Rolf;Henning;Hermsdorfer Damm;${door("92")};13467;Hermsdorf;1926-10-02;;rolf.henning.${batch}@example.test`,
      `Frau;Marlies;Keller;Oraniendamm;${door("33")};13469;Waidmannslust;1941-11-18;030 423${batch};`,
      `Herr;Bernd;Sommer;Zabel-Krüger-Damm;${door("17")};13469;Wittenau;1936-12-09;;`,
      `Frau;Hannelore;Brandes;Wilhelmsruher Damm;${door("140")};13439;Märkisches Viertel;1931-07-30;030 434${batch};hannelore.brandes.${batch}@example.test`,
      `Herr;Kurt;Seifert;Scharnweberstraße;${door("106")};13405;Tegel;1926-08-25;;`,
      `Frau;Ilse;Lorenz;Frohnauer Straße;${door("21")};13465;Frohnau;1941-09-06;030 445${batch};`,
      `Herr;Günter;Pohl;Heiligenseestraße;${door("55")};13503;Heiligensee;1936-10-11;;guenter.pohl.${batch}@example.test`,
      `Frau;Erika;Mertens;Alt-Lübars;${door("9")};13469;Lübars;1931-07-26;;`,
      `Frau;Sabine;Reuter;Triftstraße;${door("4")};13509;Wittenau;1941-08-19;;sabine.reuter.${batch}@example.test`
    ].join("\n");
    actions["run-import"]();
  },
  "run-import": () => {
    if (!state.importText) {
      toast("Bitte zuerst eine CSV-Datei laden.");
      return;
    }
    const rows = parseCsv(state.importText);
    const mapped = rows.map(mapImportRow);
    const result = mapped.reduce((acc, row) => {
      const missing = !row.firstName || !row.lastName || !row.birthDate || !row.street;
      const key = duplicateKey(row);
      const duplicate = !missing && acc.keys.has(key);
      const printedDuplicate = duplicate && acc.printedKeys.has(key);
      const group = state.data.streets.find(street => normalize(street.name) === normalize(row.street))?.groupId;
      const log = {
        time: new Date().toLocaleString("de-DE"),
        name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        type: missing ? "Fehler" : duplicate ? "Dublette" : "Importiert",
        message: missing
          ? "Pflichtfelder fehlen."
          : duplicate
            ? printedDuplicate ? "Bestehender Datensatz wurde bereits gedruckt." : "Bestehender Datensatz bleibt erhalten."
            : group ? `Zugeordnet zu ${group}.` : "Straße ohne SOKO-Zuordnung."
      };
      const item = { ...row, id: nextId("G-2026", [...state.data.citizens, ...acc.rows]), source: "CSV Import", updatedAt: todayIso(), status: group ? "importiert" : "offen" };
      const keys = missing || duplicate ? acc.keys : new Set([...acc.keys, key]);
      return {
        rows: missing || duplicate ? acc.rows : [...acc.rows, item],
        logs: [...acc.logs, log],
        duplicates: duplicate ? acc.duplicates + 1 : acc.duplicates,
        printedDuplicates: printedDuplicate ? acc.printedDuplicates + 1 : acc.printedDuplicates,
        keys
      };
    }, {
      rows: [],
      logs: [],
      duplicates: 0,
      printedDuplicates: 0,
      keys: new Set(state.data.citizens.map(duplicateKey)),
      printedKeys: new Set(state.data.citizens.filter(isPrintedCitizen).map(duplicateKey))
    });
    state.data.citizens = [...state.data.citizens, ...result.rows];
    state.data.importLog = [...result.logs, ...state.data.importLog].slice(0, 40);
    saveData();
    render();
    toast(result.printedDuplicates
      ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten gefunden, davon ${result.printedDuplicates} bereits gedruckt.`
      : result.duplicates
        ? `${result.rows.length} neue Datensätze importiert. ${result.duplicates} Dubletten gefunden.`
        : `${result.rows.length} neue Datensätze importiert.`);
  },
  "select-generated": event => {
    state.selectedCitizenId = event.target.closest("[data-id]").dataset.id;
    render();
  }
};

const detectDelimiter = text => [";", "\t", ","].map(delimiter => [delimiter, ((text.split("\n")[0] || "").split(delimiter).length - 1)]).sort((a, b) => b[1] - a[1])[0][0];
const cleanCell = value => String(value ?? "").trim().replace(/^"|"$/g, "").replaceAll('""', '"');
const parseCsv = text => {
  const delimiter = detectDelimiter(text);
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map(line => line.split(delimiter).map(cleanCell));
  const headers = rows[0] || [];
  return rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
};
const getAny = (row, keys) => keys.map(key => row[key]).find(value => value !== undefined && value !== "") || "";
const mapImportRow = row => ({
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

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-nav]");
  const action = event.target.closest("[data-action]");
  if (nav) {
    state.view = nav.dataset.nav;
    render();
  }
  if (action) {
    actions[action.dataset.action]?.(event);
  }
});

document.addEventListener("input", event => {
  const input = event.target.closest("[data-filter]");
  if (input) {
    state.filters[input.name] = input.value;
    render();
  }
  const email = event.target.closest("input[type='email']");
  if (email) {
    email.classList.toggle("invalid", !isValidEmail(email.value));
  }
});

document.addEventListener("pointerdown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`.${key}-split`);
  if (!split) return;
  event.preventDefault();
  splitter.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing");
  const move = moveEvent => {
    const rect = split.getBoundingClientRect();
    const raw = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    const next = Math.max(20, Math.min(80, Math.round(raw)));
    state[`${key}Split`] = next;
    split.style.setProperty(`--${key}-left`, `${next}%`);
  };
  const done = () => {
    splitter.releasePointerCapture(event.pointerId);
    document.body.classList.remove("is-resizing");
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", done);
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", done);
});

document.addEventListener("keydown", event => {
  const splitter = event.target.closest("[data-splitter]");
  if (!splitter) return;
  const key = splitter.dataset.splitter;
  const split = splitter.closest(`.${key}-split`);
  const delta = event.key === "ArrowLeft" ? -4 : event.key === "ArrowRight" ? 4 : 0;
  if (!split || !delta) return;
  event.preventDefault();
  const next = Math.max(20, Math.min(80, state[`${key}Split`] + delta));
  state[`${key}Split`] = next;
  split.style.setProperty(`--${key}-left`, `${next}%`);
  splitter.setAttribute("aria-valuenow", String(next));
});

document.addEventListener("change", event => {
  if (event.target.matches("#doc-template")) {
    state.selectedTemplateId = event.target.value;
    state.generatedDocs = [];
    render();
    return;
  }
  if (event.target.matches("#doc-sender")) {
    state.selectedSenderId = event.target.value;
    state.generatedDocs = [];
    render();
    return;
  }
  const file = event.target.matches("#import-file") ? event.target.files[0] : null;
  if (file) {
    file.text().then(text => {
      state.importText = text;
      actions["run-import"]();
    });
  }
});

state.view = viewTitles[new URLSearchParams(location.search).get("view")] ? new URLSearchParams(location.search).get("view") : state.view;
render();
loadCollectionData();
