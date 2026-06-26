import { csvEscape, todayIso } from './utils.js';
import { ruleMatchesHouseNo } from './assignment.js';

export const testFirstNames = [
  ["Frau", "Anna"], ["Herr", "Bernd"], ["Frau", "Clara"], ["Herr", "Dieter"], ["Frau", "Eva"],
  ["Herr", "Frank"], ["Frau", "Gisela"], ["Herr", "Heinz"], ["Frau", "Inge"], ["Herr", "Jürgen"],
  ["Frau", "Karin"], ["Herr", "Lothar"], ["Frau", "Monika"], ["Herr", "Norbert"], ["Frau", "Petra"],
  ["Frau", "Julia"], ["Frau", "Maria"], ["Herr", "Georg"], ["Herr", "Joachim"], ["Frau", "Evelyn"],
  ["Herr", "Hans-Peter"], ["Frau", "Sabine"], ["Herr", "Wolfgang"], ["Frau", "Renate"], ["Herr", "Klaus"],
  ["Frau", "Ursula"], ["Herr", "Manfred"], ["Frau", "Brigitte"], ["Herr", "Peter"], ["Frau", "Helga"],
  ["Herr", "Rainer"], ["Frau", "Christine"], ["Herr", "Günter"], ["Frau", "Barbara"], ["Herr", "Horst"],
  ["Frau", "Waltraud"], ["Herr", "Werner"], ["Frau", "Margot"], ["Herr", "Uwe"], ["Frau", "Erika"]
];
export const testLastNames = ["Schulz", "Berger", "Klein", "Neumann", "Richter", "Wolf", "Krüger", "Hoffmann", "Werner", "Schneider", "Lehmann", "Koch", "Fischer", "Weber", "Peverali", "Brandt", "Piotrowski", "Meyer", "Wagner", "Becker", "Schmidt", "Bauer", "Schäfer", "Krause", "Hartmann", "Lange", "Schröder", "Zimmermann", "König", "Walter", "Peters", "Möller", "Jung", "Hahn", "Vogel", "Keller", "Günther", "Frank", "Roth", "Lorenz"];

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
export const testHouseNo = (rule, rand = Math.random, siblingRules = []) => {
  const candidates = ruleHouseNumbers(rule, siblingRules);
  return String(candidates.length ? candidates[Math.floor(rand() * candidates.length)] : numberFrom(rule.von) || numberFrom(rule.bis) || 1);
};
export const testBirthDate = (index, month, age = mortalityWeightedTestAges(index + 1).at(-1) || 85) => {
  const year = Number(todayIso().slice(0, 4));
  const useMonth = month || String(new Date().getMonth() + 1).padStart(2, "0");
  const day = String((index % 28) + 1).padStart(2, "0");
  return `${year - age}-${useMonth}-${day}`;
};
export const testCsvRow = (index, name, assignment, month, rand = Math.random, age) => ({
  Anrede: name.salutation,
  Vorname: name.firstName,
  Nachname: name.lastName,
  Strasse: assignment.street.name,
  Hausnummer: testHouseNo(assignment.rule, rand, assignment.street.rules || []),
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
