// Small shared helpers with no dependencies: DOM lookup, timing, parsing, formatting.

export const BASE = "EUR"; // the daily total is always shown in euros

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const fmtCache = {};
// whole: round to whole units, without cents (used for the big total).
export function fmt(v, cur, whole) {
  cur = cur || BASE;
  const key = cur + (whole ? ":0" : "");
  try {
    fmtCache[key] = fmtCache[key] || new Intl.NumberFormat(undefined, whole
      ? { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { style: "currency", currency: cur });
    return fmtCache[key].format(v);
  } catch {
    return `${v.toFixed(whole ? 0 : 2)} ${cur}`;
  }
}

// Accepts numbers and strings with currency symbols or a decimal comma ("49,90", "49.90 zł").
export function toNum(v) {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  let s = v.trim().replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  return parseFloat(s);
}

// Ignores empty strings and unrendered PostHog templates like "{event.properties.x}".
export const cleanStr = (v) => (typeof v === "string" && v.trim() && !/^\{.*\}$/.test(v.trim())) ? v.trim() : "";
