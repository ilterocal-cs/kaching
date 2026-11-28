// Small shared helpers with no dependencies: DOM lookup, timing, parsing, formatting.

export const BASE = "EUR"; // the daily total is always shown in euros

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const fmtCache = {};
export function fmt(v, cur) {
  cur = cur || BASE;
  try {
    fmtCache[cur] = fmtCache[cur] || new Intl.NumberFormat(undefined, { style: "currency", currency: cur });
    return fmtCache[cur].format(v);
  } catch {
    return `${v.toFixed(2)} ${cur}`;
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
