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

export const sokoColorPalette = Array.from({ length: 42 }, (_, i) => {
  const hue = Math.round((i * 137.508) % 360);
  const [[sat, light]] = [[70, 40], [60, 52], [75, 35]].slice(i % 3, i % 3 + 1);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
});
export const sokoGroupId = code => `SOKO ${code}`;
export const sokoCodesFromDirectory = () => [...new Set(Object.values(globalThis.SOKO_STRASSENVERZEICHNIS || {}).flat().map(entry => entry.soko))]
  .sort((a, b) => Number(a) - Number(b));
export const sokoColors = {
  ...Object.fromEntries(sokoCodesFromDirectory().map((code, index) => [sokoGroupId(code), sokoColorPalette[index % sokoColorPalette.length]])),
  offen: "#9aa0a6"
};
export const sokoStreetNames = code => Object.entries(globalThis.SOKO_STRASSENVERZEICHNIS || {})
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

const memberFirstNames = [
  ["Frau", "Anna"], ["Herr", "Bernd"], ["Frau", "Clara"], ["Herr", "Dieter"], ["Frau", "Eva"],
  ["Herr", "Frank"], ["Frau", "Gisela"], ["Herr", "Heinz"], ["Frau", "Inge"], ["Herr", "Jürgen"],
  ["Frau", "Karin"], ["Herr", "Lothar"], ["Frau", "Monika"], ["Herr", "Norbert"], ["Frau", "Petra"],
  ["Frau", "Julia"], ["Frau", "Maria"], ["Herr", "Georg"], ["Herr", "Joachim"], ["Frau", "Evelyn"],
  ["Herr", "Hans-Peter"], ["Frau", "Sabine"], ["Herr", "Wolfgang"], ["Frau", "Renate"], ["Herr", "Klaus"],
  ["Frau", "Ursula"], ["Herr", "Manfred"], ["Frau", "Brigitte"], ["Herr", "Peter"], ["Frau", "Helga"],
  ["Herr", "Rainer"], ["Frau", "Christine"], ["Herr", "Günter"], ["Frau", "Barbara"], ["Herr", "Horst"],
  ["Frau", "Waltraud"], ["Herr", "Werner"], ["Frau", "Margot"], ["Herr", "Uwe"], ["Frau", "Erika"]
];
const memberLastNames = [
  "Schulz", "Berger", "Klein", "Neumann", "Richter", "Wolf", "Krüger", "Hoffmann", "Werner", "Schneider",
  "Lehmann", "Koch", "Fischer", "Weber", "Brandt", "Piotrowski", "Meyer", "Wagner", "Becker", "Schmidt",
  "Bauer", "Schäfer", "Krause", "Hartmann", "Lange", "Schröder", "Zimmermann", "König", "Walter", "Peters",
  "Möller", "Jung", "Hahn", "Vogel", "Keller", "Günther", "Frank", "Roth", "Lorenz", "Peverali"
];

const memberIban = index => {
  const bankCode = "10050000"; // Berliner Sparkasse
  const accountNo = String(1000000000 + index * 31337);
  const rearranged = `${bankCode}${accountNo}131400`;
  let remainder = 0;
  for (const char of rearranged) remainder = (remainder * 10 + Number(char)) % 97;
  const check = String(98 - remainder).padStart(2, "0");
  const raw = `DE${check}${bankCode}${accountNo}`;
  return [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12), raw.slice(12, 16), raw.slice(16, 20), raw.slice(20)].join(" ");
};

const memberAddress = (code, offset) => {
  const dir = globalThis.SOKO_STRASSENVERZEICHNIS || {};
  const streets = Object.entries(dir).filter(([, entries]) => entries.some(e => e.soko === code));
  if (!streets.length) return { street: "", postalCode: "", city: "Berlin" };
  const [streetName, entries] = streets[offset % streets.length];
  const rule = entries.find(e => e.soko === code);
  const houseNo = Number.parseInt(rule?.von || "") || (offset % 18) + 1;
  return { street: `${streetName} ${houseNo}`, postalCode: rule?.plz || "", city: "Berlin" };
};

export const buildSokoGroups = () => sokoCodesFromDirectory().map(code => {
  const entries = Object.values(globalThis.SOKO_STRASSENVERZEICHNIS || {}).flat().filter(entry => entry.soko === code);
  const districts = [...new Set(entries.map(entry => entry.ortsteil))].join(" / ");
  const streetPreview = sokoStreetNames(code).slice(0, 3).join(", ");
  return {
    id: sokoGroupId(code),
    name: `SOKO ${code}`,
    region: [districts, streetPreview].filter(Boolean).join(" - "),
    leaderId: `SM-${code}`
  };
});

export const buildSokoMembers = () => sokoCodesFromDirectory().flatMap((code, groupIndex) => {
  const n = memberFirstNames.length;
  const l = memberLastNames.length;
  const mk = (id, nameIndex, addrOffset, isLeader) => {
    const [salutation, firstName] = memberFirstNames[nameIndex % n];
    const lastName = memberLastNames[nameIndex % l];
    const phoneSeq = String(9010000 + nameIndex * 73).slice(-7);
    const mobileSeq = String(10000000 + nameIndex * 7919).slice(-8);
    return {
      id,
      salutation,
      firstName,
      lastName,
      birthDate: `${1948 + (nameIndex % 30)}-${String((nameIndex % 12) + 1).padStart(2, "0")}-15`,
      groupId: sokoGroupId(code),
      ...memberAddress(code, addrOffset),
      phone: `030 ${phoneSeq}`,
      mobile: `0160 ${mobileSeq}`,
      email: `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@reinickendorf-test.de`,
      bank: memberIban(nameIndex),
      accountHolder: `${firstName} ${lastName}`,
      allowance: "35,00",
      termFrom: "2025-01-01",
      termTo: "2028-12-31",
      billingAmount: "15,00",
      zpNr: `bln${String(1000000 + nameIndex * 137).slice(-7)}`,
      kassenzeichen: String(35000 + nameIndex),
      misc: "",
      note: "",
      isLeader
    };
  };
  return [
    mk(`SM-${code}`, groupIndex * 2, groupIndex, true),
    mk(`SM-${code}-2`, groupIndex * 2 + 1, groupIndex + 5, false)
  ];
});

export const buildStreetData = () => Object.entries(globalThis.SOKO_STRASSENVERZEICHNIS || {}).map(([name, entries], i) => {
  const rules = normalizeStreetRules(entries, i);
  return {
    id: `STR-${String(i + 1).padStart(4, "0")}`,
    name,
    district: streetDistrictSummary(rules),
    groupId: streetGroupSummary(rules),
    rules
  };
});

export const defaultData = {
  citizens: [],
  weddingAnniversaries: [],
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
};
