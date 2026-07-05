import { csvEscape, todayIso } from './utils.js';
import { ruleMatchesHouseNo } from './assignment.js';

const femaleNames = ["Anna", "Clara", "Eva", "Gisela", "Inge", "Karin", "Monika", "Petra", "Julia", "Maria", "Evelyn", "Sabine", "Renate", "Ursula", "Brigitte", "Helga", "Christine", "Barbara", "Waltraud", "Margot", "Erika", "Hildegard", "Elfriede", "Irmgard", "Lieselotte", "Hannelore", "Roswitha", "Ingrid", "Gudrun", "Annemarie", "Dorothea", "Adelheid", "Herta", "Gertrud", "Margarete", "Ilse", "Hedwig", "Frieda", "Käthe", "Helene"];
const maleNames = ["Bernd", "Dieter", "Frank", "Heinz", "Jürgen", "Lothar", "Norbert", "Georg", "Joachim", "Hans-Peter", "Wolfgang", "Klaus", "Manfred", "Peter", "Rainer", "Günter", "Horst", "Werner", "Uwe", "Gerhard", "Helmut", "Karl-Heinz", "Siegfried", "Hartmut", "Volkmar", "Friedhelm", "Eckhard", "Bernhard", "Egon", "Gottfried", "Otto", "Rudolf", "Walter", "Heinrich", "Albert", "Ernst", "Erich", "Herbert", "Wilhelm", "Günther"];
export const testFirstNames = [
  ...femaleNames.map(name => ["Frau", name]),
  ...maleNames.map(name => ["Herr", name])
];
export const testLastNames = ["Schulz", "Berger", "Klein", "Neumann", "Richter", "Wolf", "Krüger", "Hoffmann", "Werner", "Schneider", "Lehmann", "Koch", "Fischer", "Weber", "Peverali", "Brandt", "Piotrowski", "Meyer", "Wagner", "Becker", "Schmidt", "Bauer", "Schäfer", "Krause", "Hartmann", "Lange", "Schröder", "Zimmermann", "König", "Walter", "Peters", "Möller", "Jung", "Hahn", "Vogel", "Keller", "Günther", "Frank", "Roth", "Lorenz", "Braun", "Winkler", "Kaufmann", "Albrecht", "Sommer", "Dietrich", "Böhm", "Schubert", "Ludwig", "Herrmann", "Schwarz", "Nowak", "Fuchs", "Seidel", "Stein", "Baumann", "Pohl", "Engel", "Riedel", "Haase", "Busch", "Kranz", "Groß", "Kaiser", "Pfeiffer", "Wendt", "Sauer", "Arnold", "Brinkmann", "Ziegler", "Kühn", "Voss", "Maier", "Scholz", "Langer", "Huber", "Simon", "Ott", "Stahl", "Kremer", "Münch", "Kunze", "Lenz", "Röder", "Kluge", "Stephan", "Beyer", "Kraft", "Weis", "Fiedler", "Beckmann", "Herrmann", "Probst", "Steinbach", "Feldmann", "Naumann", "Runge", "Witte", "Marquardt", "Krebs", "Dörr", "Geiger", "Heckel", "Stöhr", "Lindner", "Seifert", "Henning", "Gruber", "Böttcher", "Krug", "Lohmann", "Franke", "Bock", "Heinrich", "Stark", "Fink", "Wenzel", "Mayer", "Hofmann", "Schuster", "Grimm", "Hoppe", "Knoll", "Decker", "Weise", "Brauer", "Hanke", "Noll", "Bachmann", "Theis", "Götz", "Janssen", "Schilling", "Reinhardt", "Strauss", "Reuter", "Meier", "Kern", "Hess", "Voigt", "Metz", "Bruns", "Dreher", "Seiler", "Busse", "Kaul", "Rapp", "Nebe", "Hamann", "Krohn", "Wahl", "Stier", "Pflüger", "Kolb", "Gärtner", "Lüttich", "Haberland", "Trost", "Vollmer", "Henkel", "Böhmer", "Herold", "Scheel", "Thoma", "Wiese", "Rau", "Holz", "Bender", "Lux", "Grothe", "Worm", "Barth", "Schoch", "Hölscher", "Dittrich", "Ohlsen", "Lohse", "Fricke", "Wendler", "Hübner", "Schwabe", "Diehl", "Schreiber", "Hauk", "Kuhn", "Winkel", "Noack", "Giese", "Heck", "Röhm", "Zahn", "Bremer", "Fleck", "Voß", "Tempel", "Schade", "Riedl", "Götze", "Krämer", "Pfeifer", "Rauch", "Moll", "Groth", "Scholl", "Pfaff", "Heim", "Löser", "Bauer", "Thiele", "Ritter", "Wulf", "Gräf", "Schirmer", "Böse", "Hörner", "Faber", "Zink", "Krieger", "Hoff", "Sander", "Kamp", "Strauß", "Mende", "Nagler", "Held", "Burk", "Schott", "Wend", "Weis", "Kahl", "Fromm", "Bier", "Haug", "Gerlach", "Birk", "Röhr"];

export const shuffledTestValues = values => values.map(value => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(item => item.value);
export const numberFrom = value => Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
export const honouredTestAges = [85, ...Array.from({ length: 12 }, (_, index) => index + 90)];
const mortalityAgeWeights = {
  unknown: new Map([[85, 28], [90, 20], [91, 17], [92, 14], [93, 11], [94, 9], [95, 7], [96, 5], [97, 4], [98, 3], [99, 2], [100, 1.4], [101, 1]]),
  female: new Map([[85, 24], [90, 20], [91, 18], [92, 16], [93, 14], [94, 12], [95, 10], [96, 8], [97, 6], [98, 4.5], [99, 3.4], [100, 2.4], [101, 1.7]]),
  male: new Map([[85, 32], [90, 21], [91, 16], [92, 12], [93, 9], [94, 6.5], [95, 4.5], [96, 3], [97, 2], [98, 1.3], [99, 0.8], [100, 0.45], [101, 0.25]])
};
const salutationMortalityKey = salutation => String(salutation || "").toLowerCase() === "frau"
  ? "female"
  : String(salutation || "").toLowerCase() === "herr" ? "male" : "unknown";
const weightedAges = (count, weights) => {
  const baseAges = count >= honouredTestAges.length ? honouredTestAges : honouredTestAges.slice(0, count);
  const baseCount = baseAges.length;
  const remaining = Math.max(0, count - baseCount);
  const totalWeight = baseAges.reduce((sum, age) => sum + weights.get(age), 0);
  const weighted = baseAges.map(age => {
    const exact = remaining * weights.get(age) / totalWeight;
    const extra = Math.floor(exact);
    return { age, count: 1 + extra, remainder: exact - extra };
  });
  const assigned = weighted.reduce((sum, item) => sum + item.count, 0);
  const rounded = new Set([...weighted].sort((a, b) => b.remainder - a.remainder).slice(0, count - assigned).map(item => item.age));
  const counts = weighted.map(item => ({ ...item, count: item.count + (rounded.has(item.age) ? 1 : 0) }));
  const maxCount = Math.max(0, ...counts.map(item => item.count));
  return Array.from({ length: maxCount }, (_, round) => counts.filter(item => round < item.count).map(item => item.age)).flat().slice(0, count);
};
export const mortalityWeightedTestAges = (count, salutations = []) => {
  if (!salutations.length) return weightedAges(count, mortalityAgeWeights.unknown);
  const keys = Array.from({ length: count }, (_, index) => salutationMortalityKey(salutations[index]));
  const agesByKey = ["female", "male", "unknown"].reduce((acc, key) => {
    acc[key] = weightedAges(keys.filter(item => item === key).length, mortalityAgeWeights[key]);
    return acc;
  }, {});
  return keys.map(key => agesByKey[key].shift() || 85);
};

export const testAssignments = streets => streets.flatMap(street => (street.rules || [])
  .filter(rule => rule.soko)
  .map(rule => ({ street, rule })));
export const groupedTestAssignments = streets => [...testAssignments(streets).reduce((groups, assignment) => {
  const group = groups.get(assignment.rule.soko) || [];
  group.push(assignment);
  groups.set(assignment.rule.soko, group);
  return groups;
}, new Map()).entries()]
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([soko, assignments]) => ({ soko, assignments }));
export const balancedTestAssignments = (groups, count, rand = Math.random) => Array.from({ length: count }, (_, index) => {
  const group = groups[index % groups.length];
  return group.assignments[Math.floor(rand() * group.assignments.length)];
});

const sokoCode = rule => String(rule.soko).padStart(2, "0");
// Hausnummern, die nur die gewünschte Regel treffen – nicht auch eine andere SOKO derselben Straße (überlappende Bereiche im Verzeichnis)
const ruleHouseNumbers = (rule, siblingRules = []) => {
  const conflicts = siblingRules.filter(other => other !== rule && sokoCode(other) !== sokoCode(rule));
  return Array.from({ length: 220 }, (_, index) => index + 1)
    .filter(number => ruleMatchesHouseNo(rule, number) && !conflicts.some(other => ruleMatchesHouseNo(other, number)));
};
export const testHouseNo = (rule, siblingRules = [], rand = Math.random) => {
  const candidates = ruleHouseNumbers(rule, siblingRules);
  return String(candidates.length ? candidates[Math.floor(rand() * candidates.length)] : numberFrom(rule.von) || numberFrom(rule.bis) || 1);
};
export const testBirthDate = (index, month, age = mortalityWeightedTestAges(index + 1).at(-1) || 85) => {
  const year = Number(todayIso().slice(0, 4));
  const useMonth = month || String(new Date().getMonth() + 1).padStart(2, "0");
  const day = String((index % 28) + 1).padStart(2, "0");
  return `${year - age}-${useMonth}-${day}`;
};
export const monthAfterNext = (date = new Date()) => String(new Date(date.getFullYear(), date.getMonth() + 2, 1).getMonth() + 1).padStart(2, "0");
export const testCsvRow = (index, name, assignment, month, age, rand = Math.random) => ({
  Anrede: name.salutation,
  Vorname: name.firstName,
  Nachname: name.lastName,
  Strasse: assignment.street.name,
  Hausnummer: testHouseNo(assignment.rule, assignment.street.rules || [], rand),
  PLZ: assignment.rule.plz || "13437",
  Ortsteil: assignment.rule.ortsteil || assignment.street.district || "",
  Geburtsdatum: testBirthDate(index, month, age),
  Telefon: `030 9000${String(index + 100).padStart(4, "0")}`,
  Email: ""
});
export const testCsvText = rows => {
  const headers = ["Anrede", "Vorname", "Nachname", "Strasse", "Hausnummer", "PLZ", "Ortsteil", "Geburtsdatum", "Telefon", "Email"];
  return [headers, ...rows.map(row => headers.map(header => row[header] || ""))]
    .map(row => row.map(csvEscape).join(";"))
    .join("\n");
};

export const seedCsvRows = (streets, rowCount, dateForIndex, rand = Math.random) => {
  const groups = groupedTestAssignments(streets);
  if (!groups.length) return { assignments: [], rows: [] };
  const assignments = balancedTestAssignments(groups, rowCount, rand);
  const firstNames = shuffledTestValues(testFirstNames);
  const lastNames = shuffledTestValues(testLastNames);
  const names = assignments.map((_, index) => {
    const [salutation, firstName] = firstNames[index % firstNames.length];
    return { salutation, firstName, lastName: lastNames[index % lastNames.length] };
  });
  const ages = mortalityWeightedTestAges(rowCount, names.map(name => name.salutation));
  const rows = assignments.map((assignment, index) => {
    const date = dateForIndex(index);
    const month = date instanceof Date ? String(date.getMonth() + 1).padStart(2, "0") : date;
    const row = testCsvRow(index, names[index], assignment, month, ages[index], rand);
    return date instanceof Date ? { ...row, Geburtsdatum: `${date.getFullYear() - ages[index]}-${row.Geburtsdatum.slice(5)}` } : row;
  });
  return { assignments, rows };
};
export const seedCsv = (streets, rowCount, dateForIndex, rand = Math.random) => testCsvText(seedCsvRows(streets, rowCount, dateForIndex, rand).rows);

const shuffledBy = (values, rand = Math.random) => values.map(value => ({ value, order: rand() })).sort((a, b) => a.order - b.order).map(item => item.value);
const csvRowFromCitizen = citizen => ({
  Anrede: citizen.salutation,
  Vorname: citizen.firstName,
  Nachname: citizen.lastName,
  Strasse: citizen.street,
  Hausnummer: citizen.houseNo,
  PLZ: citizen.postalCode,
  Ortsteil: citizen.district,
  Geburtsdatum: citizen.birthDate,
  Telefon: citizen.phone,
  Email: citizen.email
});
const simulationMonthMatches = (citizen, month) => citizen.birthDate?.slice(5, 7) === month;
const removedFollowUpCount = count => count >= 8 ? 3 : count >= 4 ? 2 : 0;
const changedAddressCitizen = (citizen, assignment, rand = Math.random) => ({
  ...citizen,
  street: assignment.street.name,
  houseNo: testHouseNo(assignment.rule, assignment.street.rules || [], rand),
  postalCode: assignment.rule.plz || citizen.postalCode || "13437",
  district: assignment.rule.ortsteil || assignment.street.district || citizen.district || ""
});
const assignmentDiffersFromCitizen = (assignment, citizen) =>
  assignment.street.name !== citizen.street || (assignment.rule.plz && assignment.rule.plz !== citizen.postalCode);
const withOneChangedAddress = (citizens, groups, rand = Math.random) => {
  const assignments = shuffledBy(groups.flatMap(group => group.assignments), rand);
  const index = citizens.findIndex(citizen => assignments.some(assignment => assignmentDiffersFromCitizen(assignment, citizen)));
  if (index < 0) return citizens;
  const assignment = assignments.find(item => assignmentDiffersFromCitizen(item, citizens[index]));
  return citizens.map((citizen, citizenIndex) => citizenIndex === index ? changedAddressCitizen(citizen, assignment, rand) : citizen);
};
const csvDuplicateKey = row => [row.Vorname, row.Nachname, row.Geburtsdatum].map(value => String(value ?? "").trim().toLowerCase()).join("|");
const avoidExistingCsvDuplicates = (rows, existingRows) => {
  const existing = new Set(existingRows.map(csvDuplicateKey));
  return rows.map((row, index) => {
    const key = csvDuplicateKey(row);
    if (!existing.has(key)) {
      existing.add(key);
      return row;
    }
    const unique = { ...row, Nachname: `${row.Nachname}-${index + 1}` };
    existing.add(csvDuplicateKey(unique));
    return unique;
  });
};
export const followUpSeedCsvRows = (streets, citizens = [], targetRowCount = null, month = monthAfterNext(), rand = Math.random) => {
  const groups = groupedTestAssignments(streets);
  if (!groups.length || !citizens.length) return null;
  const candidates = citizens.filter(citizen => simulationMonthMatches(citizen, month));
  if (!candidates.length) return null;
  const target = Math.max(1, targetRowCount || candidates.length);
  const removedIds = new Set(shuffledBy(candidates, rand).slice(0, removedFollowUpCount(candidates.length)).map(citizen => citizen.id));
  const kept = withOneChangedAddress(candidates.filter(citizen => !removedIds.has(citizen.id)), groups, rand);
  const newCount = Math.max(0, target - kept.length);
  const keptRows = kept.map(csvRowFromCitizen);
  const newRows = avoidExistingCsvDuplicates(seedCsvRows(streets, newCount, () => month, rand).rows, keptRows);
  return {
    removedIds: [...removedIds],
    rows: [...keptRows, ...newRows]
  };
};
export const followUpSeedCsv = (streets, citizens = [], targetRowCount = null, month = monthAfterNext(), rand = Math.random) => {
  const result = followUpSeedCsvRows(streets, citizens, targetRowCount, month, rand);
  return result ? testCsvText(result.rows) : "";
};

export const isoLocalDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const rollingSimulationStart = (date = new Date()) => new Date(date.getFullYear() - 1, Number(monthAfterNext(date)) - 1, 1);
export const rollingSimulationOffset = (index, rowCount) => Math.min(11, Math.floor((index * 12) / rowCount));
export const rollingSimulationDate = (index, rowCount, day = 1, date = new Date()) => {
  const start = rollingSimulationStart(date);
  return new Date(start.getFullYear(), start.getMonth() + rollingSimulationOffset(index, rowCount), day);
};
const pseudoBucket = (index, modulo, step) => (index * step) % modulo;
export const questionnaireWish = index => {
  const bucket = pseudoBucket(index, 100, 37);
  if (bucket < 14) return "keine";
  if (bucket < 43) return "Besuch erwünscht";
  return "per Post";
};
export const questionnaireWedding = index => {
  const bucket = pseudoBucket(index, 1000, 41);
  if (bucket < 45) return ["Goldene Hochzeit", 50];
  if (bucket < 75) return ["Diamantene Hochzeit", 60];
  if (bucket < 84) return ["Eiserne Hochzeit", 65];
  if (bucket < 87) return ["Gnadenhochzeit", 70];
  return ["", 0];
};
const spouseNameFor = (citizen, index) => {
  const spouseSalutation = citizen.salutation === "Frau" ? "Herr" : "Frau";
  const names = testFirstNames.filter(([salutation]) => salutation === spouseSalutation);
  return names[index % names.length]?.[1] || "";
};
export const questionnaireCitizenPatch = (citizen, index, rowCount) => {
  const [weddingAnniversary, weddingYears] = questionnaireWedding(index);
  const day = Number.parseInt(citizen.birthDate?.slice(8, 10) || "1", 10);
  const anniversary = rollingSimulationDate(index, rowCount, Math.max(1, Math.min(28, day)));
  const printedAt = isoLocalDate(anniversary);
  const printedYear = anniversary.getFullYear();
  const weddingDate = weddingYears ? isoLocalDate(new Date(anniversary.getFullYear() - weddingYears, anniversary.getMonth(), anniversary.getDate())) : "";
  return {
    ...citizen,
    createdAt: isoLocalDate(rollingSimulationDate(index, rowCount)),
    updatedAt: todayIso(),
    status: "gedruckt",
    printedAt,
    printedAge: printedYear - Number(citizen.birthDate?.slice(0, 4)),
    printedYear,
    wish: questionnaireWish(index),
    pressPublication: pseudoBucket(index, 100, 53) < 36,
    weddingAnniversary,
    weddingDate,
    spouseName: weddingAnniversary ? spouseNameFor(citizen, index) : ""
  };
};
