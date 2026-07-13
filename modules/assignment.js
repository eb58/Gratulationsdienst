import { normalize, calculateAge, birthdayMonth, byId } from './utils.js';
import { sokoGroupId } from './domain.js';
import { state } from './state.js';
import { citizenFlagText, hasCitizenExclusionFlag } from './citizenFlags.js';

export { isDeceasedCitizen, isMovedCitizen } from './citizenFlags.js';

export const isPrintedCitizen = citizen => citizen.status === "gedruckt";
export const isArchivedCitizen = citizen => Boolean(citizen.archived) || citizen.status === 'archiviert';
export const isCheckedCitizen = citizen => normalize(citizen.status).startsWith("gepr") || isPrintedCitizen(citizen);
export const wantsGreeting = citizen => !hasCitizenExclusionFlag(citizen) && normalize(citizen.wish) !== "keine";
export const wantsVisit = citizen => wantsGreeting(citizen) && normalize(citizen.wish).startsWith("besuch");
export const activeCitizens = () => state.data.citizens.filter(citizen => !isPrintedCitizen(citizen) && !isArchivedCitizen(citizen) && !hasCitizenExclusionFlag(citizen));
export const duplicateKey = citizen => [
  citizen.firstName,
  citizen.lastName,
  citizen.birthDate
].map(normalize).join("|");

const stripParens = value => String(value ?? "").replace(/\s*\([^)]*\)/g, " ").trim();
export const normalizeStreetName = value => stripParens(value)
  .toLowerCase()
  .replaceAll('ß', "ss")
  .replace(/strasse(?=\s|$)/g, "str")
  .replace(/str\.?(?=\s|$)/g, "str")
  .replace(/[.,;:]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
let streetLookupSource = null;
let streetLookupCache = new Map();
const streetLookup = () => {
  if (streetLookupSource === state.data.streets) return streetLookupCache;
  streetLookupSource = state.data.streets;
  streetLookupCache = new Map();
  state.data.streets.forEach(street => {
    const nameKey = normalizeStreetName(street.name);
    if (!streetLookupCache.has(nameKey)) streetLookupCache.set(nameKey, street);
  });
  return streetLookupCache;
};
export const streetByName = name => streetLookup().get(normalizeStreetName(name));
export const houseNumberValue = value => Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
const ruleParityMatches = (rule, number) => {
  if (rule.art === "G") return number % 2 === 0;
  if (rule.art === "U") return number % 2 !== 0;
  return true;
};
const uniqueRule = rules => {
  const sokoRules = rules.filter(rule => rule.soko);
  const sokos = [...new Set(sokoRules.map(rule => String(rule.soko)))];
  return sokos.length === 1 ? sokoRules[0] : null;
};
export const ruleMatchesHouseNo = (rule, houseNo) => {
  const number = houseNumberValue(houseNo);
  if (!Number.isFinite(number)) return !rule.von && !rule.bis;
  const from = rule.von ? houseNumberValue(rule.von) : -Infinity;
  const to = rule.bis ? houseNumberValue(rule.bis) : Infinity;
  return number >= from && number <= to && ruleParityMatches(rule, number);
};
export const editableStreetAssignment = citizen => {
  const street = streetByName(citizen.street);
  if (!street?.rules?.length) return street || null;
  const plz = String(citizen.postalCode || "").trim();
  const rules = street.rules.filter(rule => (!plz || !rule.plz || rule.plz === plz) && ruleMatchesHouseNo(rule, citizen.houseNo));
  const rule = uniqueRule(rules) || uniqueRule(street.rules.filter(item => ruleMatchesHouseNo(item, citizen.houseNo)));
  if (rule) return { ...street, district: rule.ortsteil || street.district, groupId: sokoGroupId(rule.soko), rule };
  return { ...street, groupId: "", ambiguous: true };
};
export const preciseStreetAssignment = citizen => {
  const assignment = (() => {
    try {
      return window.findeSoko?.(citizen.street, citizen.houseNo, citizen.postalCode);
    } catch {
      return null;
    }
  })();
  return assignment ? {
    name: assignment.strasse,
    district: assignment.ortsteil,
    groupId: sokoGroupId(assignment.soko)
  } : null;
};
export const streetAssignment = citizen => {
  const editable = editableStreetAssignment(citizen);
  if (editable?.ambiguous) return editable;
  if (editable?.groupId) return editable;
  const precise = preciseStreetAssignment(citizen);
  const street = streetByName(precise?.name || citizen.street);
  return precise ? { ...(street || {}), ...precise } : street;
};
export const groupForCitizen = citizen => byId(state.data.sokoGroups, streetAssignment(citizen)?.groupId);
export const leaderForGroup = group => byId(state.data.sokoMembers, group?.leaderId);

export const selectedCitizen = () => {
  const citizen = byId(state.data.citizens, state.selectedCitizenId);
  return citizen && !isPrintedCitizen(citizen) && !isArchivedCitizen(citizen) ? citizen : activeCitizens()[0];
};
export const selectedTemplate = () => byId(state.data.templates, state.selectedTemplateId) || state.data.templates[0];
export const selectedSender = () => byId(state.data.senders, state.selectedSenderId) || state.data.senders[0];
export const selectedMember = () => byId(state.data.sokoMembers, state.selectedMemberId) || state.data.sokoMembers[0];
export const selectedStreet = () => byId(state.data.streets, state.selectedStreetId) || state.data.streets[0];

export const matchesSelectedMonth = citizen => state.filters.month === "alle" || birthdayMonth(citizen.birthDate) === state.filters.month;

export const filteredCitizens = () => state.data.citizens.filter(citizen => !isArchivedCitizen(citizen)).filter(citizen => {
  const haystack = normalize([citizen.firstName, citizen.lastName, citizen.street, citizen.district, citizen.wish, citizenFlagText(citizen)].join(" "));
  const age = calculateAge(citizen.birthDate);
  const group = groupForCitizen(citizen);
  const ageOk = state.filters.age === "alle"
    || (state.filters.age === "85" && age === 85)
    || (state.filters.age === "90plus" && age >= 90)
    || (state.filters.age === "100" && age >= 100);
  return (!state.filters.q || haystack.includes(normalize(state.filters.q)))
    && matchesSelectedMonth(citizen)
    && (state.filters.groupId === "alle" || group?.id === state.filters.groupId)
    && (state.filters.status === "alle" || citizen.status === state.filters.status)
    && ageOk;
});
export const documentCitizens = () => filteredCitizens().filter(citizen => isCheckedCitizen(citizen) && !isPrintedCitizen(citizen) && wantsGreeting(citizen));
export const receiptReviewCitizens = () => activeCitizens().filter(citizen => matchesSelectedMonth(citizen) && wantsVisit(citizen));
export const allReceiptCitizensChecked = () => receiptReviewCitizens().every(isCheckedCitizen);
export const receiptCitizens = () => receiptReviewCitizens().filter(citizen => groupForCitizen(citizen));
export const receiptReviewCitizensForGroup = groupId => receiptReviewCitizens().filter(citizen => groupForCitizen(citizen)?.id === groupId);
export const isReceiptGroupReady = groupId => {
  if (!groupId) return false;
  const citizens = receiptReviewCitizensForGroup(groupId);
  return citizens.length > 0 && citizens.every(isCheckedCitizen);
};
export const receiptCitizensForReadyGroups = () => receiptCitizens().filter(citizen => isReceiptGroupReady(groupForCitizen(citizen)?.id));
