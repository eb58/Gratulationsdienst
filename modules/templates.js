import { safeStorageSetItem } from './utils.js';

export const defaultTemplateTextAges = [85, ...Array.from({ length: 21 }, (_, index) => index + 90)];
const TEMPLATE_AGE_TEXTS_OPEN_KEY = 'gd_template_age_texts_open';

const storedTemplateAgeTextOpenState = () => {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_AGE_TEXTS_OPEN_KEY)) || {}; }
  catch { return {}; }
};

export const normalizeTemplateAgeTexts = ageTexts => {
  if (!ageTexts || typeof ageTexts !== 'object' || Array.isArray(ageTexts)) return {};
  return Object.fromEntries(Object.entries(ageTexts)
    .map(([age, text]) => [String(Number.parseInt(age, 10)), String(text ?? '')])
    .filter(([age, text]) => /^\d+$/.test(age) && text.trim()));
};

export const templateTextAges = template => [...new Set([
  ...defaultTemplateTextAges,
  ...Object.keys(normalizeTemplateAgeTexts(template?.ageTexts)).map(age => Number.parseInt(age, 10)).filter(Number.isFinite)
])].sort((a, b) => a - b);

export const templateBodyForAge = (template, age) => templateAgeTextsForTemplate(template)[String(age)] || template?.body || '';
export const templateAgeTextsForTemplate = (template, perspective = 'wir') => {
  const ageTexts = normalizeTemplateAgeTexts(template?.ageTexts);
  if (String(template?.occasion || '').toLowerCase() !== 'geburtstag') return ageTexts;
  return { ...buildBirthdayAgeTexts(perspective), ...ageTexts };
};
export const templateAgeTextsForView = template => templateAgeTextsForTemplate(template, 'wir');
export const templateAgeTextOpen = age => storedTemplateAgeTextOpenState()[String(age)] !== false;
export const storeTemplateAgeTextOpen = (age, open) => safeStorageSetItem(
  localStorage,
  TEMPLATE_AGE_TEXTS_OPEN_KEY,
  JSON.stringify({ ...storedTemplateAgeTextOpenState(), [String(age)]: Boolean(open) }),
  'Vorlagen-Aufklappzustand'
);

const birthdayAgeMessages = {
  85: '85 Jahre sind ein beeindruckender Lebensweg voller Erfahrungen, Erinnerungen und Begegnungen.',
  90: '90 Jahre sind ein außergewöhnlicher Meilenstein und ein Anlass, auf vieles mit Dankbarkeit zurückzublicken.',
  91: '91 Jahre zeigen, wie viel Stärke, Ruhe und Lebensklugheit in einem langen Leben steckt.',
  92: '92 Jahre sind ein würdiger Moment für Anerkennung, Freude und herzliche Glückwünsche.',
  93: '93 Jahre stehen für viele gute Erinnerungen und die besondere Gelassenheit eines reichen Lebens.',
  94: '94 Jahre sind ein besonderer Anlass, der große Wertschätzung verdient.',
  95: '95 Jahre sind ein bemerkenswertes Lebensjubiläum voller Geschichte und Charakter.',
  96: '96 Jahre zeigen eindrucksvoll, wie kostbar gelebte Zeit ist.',
  97: '97 Jahre sind ein schöner Beleg für Ausdauer, Lebensfreude und innere Stärke.',
  98: '98 Jahre sind ein seltener und sehr besonderer Geburtstag.',
  99: '99 Jahre markieren einen außergewöhnlichen Abschnitt voller Erfahrung und Würde.',
  100: '100 Jahre sind ein ganz besonderes Lebenswerk und ein Anlass für tiefen Respekt.',
  101: '101 Jahre sind ein stilles Wunder voller Erinnerungen, Erfahrungen und Lebensmut.',
  102: '102 Jahre zeigen eine beeindruckende Lebensgeschichte mit vielen Spuren von Zuversicht.',
  103: '103 Jahre sind ein seltener Meilenstein, der außergewöhnliche Anerkennung verdient.',
  104: '104 Jahre stehen für Gelassenheit, Stärke und einen reichen Schatz an Erinnerungen.',
  105: '105 Jahre sind ein außerordentlicher Geburtstag und ein besonderer Moment der Wertschätzung.',
  106: '106 Jahre sind ein schönes Zeichen für ein langes, reiches und bewegtes Leben.',
  107: '107 Jahre sind ein Fest der Lebensfreude, der Erfahrung und der vielen kleinen Geschichten.',
  108: '108 Jahre verdienen von Herzen Respekt, Dank und die besten Wünsche.',
  109: '109 Jahre sind ein bemerkenswerter Anlass, auf ein außergewöhnliches Leben zu blicken.',
  110: '110 Jahre sind ein ganz seltener und außergewöhnlicher Geburtstag voller Anerkennung.'
};

export const buildBirthdayAgeTexts = (perspective = 'wir') => Object.fromEntries(defaultTemplateTextAges.map(age => {
  const isFirstPerson = perspective === 'ich';
  const intro = isFirstPerson
    ? `zu Ihrem ${age}. Geburtstag gratuliere ich Ihnen sehr herzlich.`
    : `zu Ihrem ${age}. Geburtstag gratulieren wir Ihnen sehr herzlich.`;
  const outlook = isFirstPerson
    ? 'Für das neue Lebensjahr wünsche ich Ihnen Gesundheit, Zuversicht und viele gute Begegnungen.'
    : 'Für das neue Lebensjahr wünschen wir Ihnen Gesundheit, Freude und viele gute Begegnungen.';
  const closing = isFirstPerson ? 'Mit freundlichen Grüßen' : '';
  const body = [
    '{{anrede}} {{nachname}},',
    intro,
    birthdayAgeMessages[age],
    outlook,
    closing
  ].filter(Boolean).join('\n\n');
  return [age, body];
}));
