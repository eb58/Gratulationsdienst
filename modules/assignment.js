import { normalize, calculateAge, birthdayMonth, byId } from './utils.js';
import { sokoGroupId } from './domain.js';
import { state } from './state.js';

export const isPrintedCitizen = citizen => citizen.status === "gedruckt";
export const isCheckedCitizen = citizen => normalize(citizen.status).startsWith("gepr") || isPrintedCitizen(citizen);
export const wantsGreeting = citizen => normalize(citizen.wish) !== "keine";
export const wantsVisit = citizen => normalize(citizen.wish).startsWith("besuch");
export const activeCitizens = () => state.data.citizens.filter(citizen => !isPrintedCitizen(citizen));
export const duplicateKey = citizen => [
  citizen.firstName,
  citizen.lastName,
  citizen.street,
  citizen.houseNo,
  citizen.postalCode,
  calculateAge(citizen.birthDate)
].map(normalize).join("|");

export const streetNameVariants = value => {
  const name = String(value ?? "").trim();
  return [...new Set([
    name,
    name.replace(/straße/giu, "str."),
    name.replace(/strasse/giu, "str."),
    name.replace(/str\./giu, "straße")
  ].filter(Boolean))];
};
const stripParens = s => s.replace(/\s*\([^)]*\)/g, "").trim();
export const streetByName = name => {
  const norm = normalize(name);
  return state.data.streets.find(street => normalize(street.name) === norm || normalize(stripParens(street.name)) === norm);
};
export const houseNumberValue = value => Number.parseInt(String(value ?? "").match(/\d+/)?.[0] || "", 10);
export const ruleMatchesHouseNo = (rule, houseNo) => {
  const number = houseNumberValue(houseNo);
  if (!Number.isFinite(number)) return !rule.von && !rule.bis;
  const from = rule.von ? houseNumberValue(rule.von) : -Infinity;
  const to = rule.bis ? houseNumberValue(rule.bis) : Infinity;
  const parityMatches = rule.art === "G" ? number % 2 === 0 : rule.art === "U" ? number % 2 !== 0 : true;
  return number >= from && number <= to && parityMatches;
};
export const editableStreetAssignment = citizen => {
  const street = streetNameVariants(citizen.street).map(streetByName).find(Boolean);
  if (!street?.rules?.length) return street || null;
  const plz = String(citizen.postalCode || "").trim();
  const rules = street.rules.filter(rule => (!plz || !rule.plz || rule.plz === plz) && ruleMatchesHouseNo(rule, citizen.houseNo));
  const rule = rules[0] || street.rules.find(item => ruleMatchesHouseNo(item, citizen.houseNo)) || street.rules[0];
  return rule ? { ...street, district: rule.ortsteil || street.district, groupId: sokoGroupId(rule.soko), rule } : street;
};
export const preciseStreetAssignment = citizen => {
  const assignment = streetNameVariants(citizen.street).map(street => {
    try {
      return window.findeSoko?.(street, citizen.houseNo, citizen.postalCode);
    } catch {
      return null;
    }
  }).find(Boolean);
  return assignment ? {
    name: assignment.strasse,
    district: assignment.ortsteil,
    groupId: sokoGroupId(assignment.soko)
  } : null;
};
export const streetAssignment = citizen => {
  const editable = editableStreetAssignment(citizen);
  if (editable?.groupId) return editable;
  const precise = preciseStreetAssignment(citizen);
  const street = streetByName(precise?.name || citizen.street);
  return precise ? { ...(street || {}), ...precise } : street;
};
export const groupForCitizen = citizen => byId(state.data.sokoGroups, streetAssignment(citizen)?.groupId);
export const leaderForGroup = group => byId(state.data.sokoMembers, group?.leaderId);

export const selectedCitizen = () => {
  const citizen = byId(state.data.citizens, state.selectedCitizenId);
  return citizen && !isPrintedCitizen(citizen) ? citizen : activeCitizens()[0];
};
export const selectedTemplate = () => byId(state.data.templates, state.selectedTemplateId) || state.data.templates[0];
export const selectedSender = () => byId(state.data.senders, state.selectedSenderId) || state.data.senders[0];
export const selectedMember = () => byId(state.data.sokoMembers, state.selectedMemberId) || state.data.sokoMembers[0];
export const selectedStreet = () => byId(state.data.streets, state.selectedStreetId) || state.data.streets[0];

export const filteredCitizens = () => state.data.citizens.filter(citizen => {
  const haystack = normalize([citizen.firstName, citizen.lastName, citizen.street, citizen.district, citizen.wish].join(" "));
  const age = calculateAge(citizen.birthDate);
  const group = groupForCitizen(citizen);
  const ageOk = state.filters.age === "alle"
    || (state.filters.age === "85" && age === 85)
    || (state.filters.age === "90plus" && age >= 90)
    || (state.filters.age === "100" && age >= 100);
  return (!state.filters.q || haystack.includes(normalize(state.filters.q)))
    && (state.filters.month === "alle" || String(new Date(citizen.birthDate).getMonth() + 1).padStart(2, "0") === state.filters.month)
    && (state.filters.groupId === "alle" || group?.id === state.filters.groupId)
    && (state.filters.status === "alle" || citizen.status === state.filters.status)
    && ageOk;
});
export const documentCitizens = () => filteredCitizens().filter(citizen => isCheckedCitizen(citizen) && !isPrintedCitizen(citizen) && wantsGreeting(citizen));
export const receiptReviewCitizens = () => activeCitizens().filter(citizen => birthdayMonth(citizen.birthDate) === state.quittungMonat);
export const allReceiptCitizensChecked = () => receiptReviewCitizens().every(isCheckedCitizen);
export const receiptCitizens = () => receiptReviewCitizens().filter(citizen => wantsVisit(citizen) && groupForCitizen(citizen));
export const receiptReviewCitizensForGroup = groupId => receiptReviewCitizens().filter(citizen => groupForCitizen(citizen)?.id === groupId);
export const isReceiptGroupReady = groupId => {
  if (!groupId) return false;
  const citizens = receiptReviewCitizensForGroup(groupId);
  return citizens.length > 0 && citizens.every(isCheckedCitizen);
};
export const receiptCitizensForReadyGroups = () => receiptCitizens().filter(citizen => isReceiptGroupReady(groupForCitizen(citizen)?.id));
