export const STORAGE_KEY = "gratulationsdienst";
export const PENDING_STORAGE_KEY = "gratulationsdienst.pending";
export const MONTH_KEY = "gd_month_filter";
export const QUITTUNG_MONTH_KEY = "gd_quittung_month";
export const QUITTUNG_SETTINGS_KEY = "gd_quittung_settings";
export const MAP_MONTH_KEY = "gd_map_month";
export const API_BASE = import.meta.env?.VITE_API_BASE ?? "/php-api";
export const SPLITTERS_KEY = "gratulationsdienst.splitters";
const storedSplitters = () => {
  try { return JSON.parse(localStorage.getItem(SPLITTERS_KEY)) || {}; }
  catch { return {}; }
};
export const storedSplit = (key, fallback, min = 20, max = 80) => {
  const value = Number(storedSplitters()[key]);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
};
const isStorageQuotaError = error => error?.name === "QuotaExceededError" || /quota/i.test(error?.message || "");
export const safeStorageSetItem = (storage, key, value, label = key) => {
  try {
    storage?.setItem(key, value);
    return true;
  } catch (error) {
    const quota = isStorageQuotaError(error);
    console.warn(`${label} konnte nicht gespeichert werden${quota ? " (Storage-Quota)" : ""}.`, error);
    toast(quota
      ? `${label} konnte nicht gespeichert werden: Browser-Speicher ist voll.`
      : `${label} konnte nicht gespeichert werden.`);
    return false;
  }
};
export const storeSplit = (key, value) => safeStorageSetItem(localStorage, SPLITTERS_KEY, JSON.stringify({ ...storedSplitters(), [key]: value }), "Splitter-Position");
export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
export const normalize = value => String(value ?? "").trim().toLowerCase();
export const normalizeEmail = value => String(value ?? "").trim();
export const normalizeDigits = value => String(value ?? "").replace(/\D/g, "");
export const isValidPostalCode = value => {
  const postalCode = normalizeDigits(value);
  return !postalCode || postalCode.length === 5;
};
export const normalizeAmount = value => {
  const chars = [...String(value ?? "").trim().replace(".", ",")];
  const result = chars.reduce((acc, char) => {
    if (/\d/.test(char)) return acc.separator ? { ...acc, decimals: `${acc.decimals}${char}`.slice(0, 2) } : { ...acc, euros: `${acc.euros}${char}` };
    if (char === "," && !acc.separator) return { ...acc, separator: true };
    return acc;
  }, { euros: "", separator: false, decimals: "" });
  return result.separator && result.euros ? `${result.euros},${result.decimals}` : result.euros;
};
export const byId = (items, id) => items.find(item => item.id === id);
export const formatDate = value => value ? new Intl.DateTimeFormat("de-DE").format(new Date(value)) : "";
export const isValidEmail = value => {
  const email = normalizeEmail(value);
  return !email || /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/.test(email);
};
export const normalizeIban = value => String(value ?? "").replace(/\s/g, "").toUpperCase();
export const formatIban = value => normalizeIban(value).match(/.{1,4}/g)?.join(" ") || "";
export const ibanToNumeric = value => [...value].map(char => /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char).join("");
export const ibanMod97 = value => [...value].reduce((remainder, char) => Number(`${remainder}${char}`) % 97, 0);
export const isValidIban = value => {
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
export const runYear = () => Number(todayIso().slice(0, 4));
export const birthdayInRunYear = birthDate => {
  const birth = new Date(birthDate);
  return new Date(runYear(), birth.getMonth(), birth.getDate());
};
export const calculateAge = birthDate => runYear() - new Date(birthDate).getFullYear();
export const birthdayMonth = birthDate => String(new Date(birthDate).getMonth() + 1).padStart(2, "0");
export const formatDateDe = iso => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};
const mojibakeByte = char => char === "\u0192" ? 0x83 : char.charCodeAt(0) & 255;
const decodeMojibakeText = value => new TextDecoder().decode(Uint8Array.from([...value].map(mojibakeByte)));
const repairMojibakeString = (value, remaining = 2) => {
  if (!remaining || !/[ÃÂ]/u.test(value)) return value;
  const repaired = decodeMojibakeText(value);
  return repaired === value ? value : repairMojibakeString(repaired, remaining - 1);
};
export const repairMojibakeText = value => typeof value === "string" ? repairMojibakeString(value) : value;
export const repairStoredText = value => Array.isArray(value)
  ? value.map(repairStoredText)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairStoredText(entry)]))
    : repairMojibakeText(value);
export const updateItem = (items, id, patch) => items.map(item => item.id === id ? { ...item, ...patch } : item);
export const nextId = (prefix, items) => {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  const highest = (items || []).reduce((max, item) => {
    const match = pattern.exec(String(item?.id ?? ""));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
};
export const csvEscape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
export const formatStreetAddress = item => [item.street, item.houseNo].filter(Boolean).join(" ");
const UTF8_BOM = "﻿";
export const downloadText = (name, content, type = "text/plain;charset=utf-8") => {
  const needsBom = /csv/i.test(type) && !content.startsWith(UTF8_BOM); // BOM, damit Excel UTF-8 (Umlaute) korrekt liest
  const blob = new Blob([needsBom ? `${UTF8_BOM}${content}` : content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};
let toastTimer = null;
export const toast = (message, options = {}) => {
  const element = $("#toast");
  if (!element) return;
  if (toastTimer) clearTimeout(toastTimer);
  const anchor = options.anchor
    ? typeof options.anchor === "string"
      ? $(options.anchor)
      : options.anchor
    : null;
  element.classList.remove("anchored");
  element.style.removeProperty("--toast-left");
  element.style.removeProperty("--toast-top");
  if (anchor?.getBoundingClientRect) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(520, window.innerWidth - 48);
    const left = Math.max(width / 2 + 24, Math.min(window.innerWidth - width / 2 - 24, rect.left + rect.width / 2));
    const below = rect.bottom + 14;
    const above = rect.top - 14;
    const top = below + 72 <= window.innerHeight ? below : Math.max(24, above);
    element.style.setProperty("--toast-left", `${left}px`);
    element.style.setProperty("--toast-top", `${top}px`);
    element.classList.add("anchored");
  }
  element.textContent = message;
  element.classList.remove("show");
  requestAnimationFrame(() => element.classList.add("show"));
  toastTimer = setTimeout(() => {
    element.classList.remove("show");
    toastTimer = null;
  }, 4200);
};
