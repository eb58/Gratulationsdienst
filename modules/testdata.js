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
export const testBirthDate = (index, month) => {
  const year = Number(todayIso().slice(0, 4));
  const age = [85, 90, 95, 100, 101][index % 5];
  const useMonth = month || String(new Date().getMonth() + 1).padStart(2, "0");
  const day = String((index % 28) + 1).padStart(2, "0");
  return `${year - age}-${useMonth}-${day}`;
};
export const testCsvRow = (index, name, assignment, month, rand = Math.random) => ({
  Anrede: name.salutation,
  Vorname: name.firstName,
  Nachname: name.lastName,
  Strasse: assignment.street.name,
  Hausnummer: testHouseNo(assignment.rule, rand, assignment.street.rules || []),
  PLZ: assignment.rule.plz || "13437",
  Ortsteil: assignment.rule.ortsteil || assignment.street.district || "",
  Geburtsdatum: testBirthDate(index, month),
  Telefon: `030 9000${String(index + 100).padStart(4, "0")}`,
  Email: ""
});
export const testCsvText = rows => {
  const headers = ["Anrede", "Vorname", "Nachname", "Strasse", "Hausnummer", "PLZ", "Ortsteil", "Geburtsdatum", "Telefon", "Email"];
  return [headers, ...rows.map(row => headers.map(header => row[header] || ""))]
    .map(row => row.map(csvEscape).join(";"))
    .join("\n");
};
