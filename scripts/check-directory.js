// Prueft das SOKO-Strassenverzeichnis auf widerspruechliche Zuordnungen:
// Adressen, fuer die das Verzeichnis mehr als eine SOKO hergibt (gleiche Strasse,
// kompatible PLZ, ueberlappender Hausnummern-Bereich inkl. Paritaet, verschiedene SOKO).
// Aufruf: npm run check:directory  (Exit-Code 1, wenn Konflikte gefunden werden)
import { readFileSync } from 'node:fs';

globalThis.window = globalThis;
const dirCode = readFileSync(new URL('../public/data/soko-strassenverzeichnis.js', import.meta.url), 'utf8');
(0, eval)(dirCode); // setzt window.SOKO_STRASSENVERZEICHNIS

const numOr = (value, fallback) => {
  const n = Number.parseInt(String(value ?? '').match(/\d+/)?.[0] || '', 10);
  return Number.isFinite(n) ? n : fallback;
};
const lo = rule => numOr(rule.von, 1);
const hi = rule => numOr(rule.bis, Infinity);
const parityOf = art => art === 'G' ? 'even' : art === 'U' ? 'odd' : 'all';
const plzCompatible = (a, b) => !a.plz || !b.plz || a.plz === b.plz;
const parityOverlap = (a, b) => {
  const x = parityOf(a.art), y = parityOf(b.art);
  return x === 'all' ? y : y === 'all' ? x : x === y ? x : null;
};
const hasNumberInRange = (from, to, parity) => {
  if (from > to) return false;
  if (parity === 'all') return true;
  const want = parity === 'even' ? 0 : 1;
  const start = from % 2 === want ? from : from + 1;
  return start <= to;
};
const rangeLabel = (from, to) => to === Infinity ? `ab ${from}` : from === to ? `${from}` : `${from}-${to}`;

const directoryConflicts = directory => Object.entries(directory).map(([street, rules]) => {
  const issues = rules.flatMap((a, i) => rules.slice(i + 1).flatMap(b => {
    if (String(a.soko) === String(b.soko) || !plzCompatible(a, b)) return [];
    const parity = parityOverlap(a, b);
    if (parity === null) return [];
    const from = Math.max(lo(a), lo(b)), to = Math.min(hi(a), hi(b));
    if (!hasNumberInRange(from, to, parity)) return [];
    const parityNote = parity === 'even' ? ' (gerade)' : parity === 'odd' ? ' (ungerade)' : '';
    return [`SOKO ${a.soko} vs ${b.soko} @ PLZ ${a.plz || b.plz || '?'}, Hausnr. ${rangeLabel(from, to)}${parityNote}`];
  }));
  return { street, issues };
}).filter(entry => entry.issues.length);

const conflicts = directoryConflicts(globalThis.SOKO_STRASSENVERZEICHNIS);
const pairCount = conflicts.reduce((sum, entry) => sum + entry.issues.length, 0);

if (!conflicts.length) {
  console.log('✓ SOKO-Strassenverzeichnis konsistent – keine doppelten Zuordnungen gefunden.');
  process.exit(0);
}

console.error(`✗ ${pairCount} widerspruechliche Zuordnung(en) in ${conflicts.length} Strasse(n):\n`);
conflicts.forEach(({ street, issues }) => {
  console.error(`  ${street}`);
  issues.forEach(issue => console.error(`      ${issue}`));
});
console.error('\nEine Adresse sollte genau einer SOKO zugeordnet sein. Bitte ueberlappende Bereiche aufloesen.');
process.exit(1);
