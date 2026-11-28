// Dates and times in the selected market's time zone, so "today" and midnight
// follow the country, not the device's clock. Markets without a zone use the device's.
import { cfg } from "./config.js";

const ZONES = {
  PL: "Europe/Warsaw",
  SE: "Europe/Stockholm",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  EE: "Europe/Tallinn",
  UK: "Europe/London",
  ES: "Europe/Madrid",
  CZ: "Europe/Prague"
};

// The market's IANA zone, or undefined (device time) if unknown or unsupported.
const supported = {};
export function marketZone() {
  const tz = ZONES[cfg.market];
  if (!tz) return undefined;
  if (!(tz in supported)) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); supported[tz] = true; } catch { supported[tz] = false; }
  }
  return supported[tz] ? tz : undefined;
}

// Calendar date and time of day of an instant in the market's zone.
const partFmts = {};
function parts(ms) {
  const tz = marketZone() || "";
  const f = partFmts[tz] || (partFmts[tz] = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || undefined, hour12: false,
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"
  }));
  const p = {};
  f.formatToParts(new Date(ms)).forEach(({ type, value }) => { p[type] = +value; });
  p.hour %= 24; // some engines print midnight as 24
  return p;
}

// How far the market's clock is ahead of UTC at that instant, in ms.
function offsetAt(ms) {
  const p = parts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

export function todayKey() {
  const p = parts(Date.now());
  return `${p.year}-${p.month}-${p.day}`;
}

// Epoch ms of the market's most recent midnight. Re-checks the offset at midnight
// itself, because it differs from the current one on daylight saving days.
export function startOfDay() {
  const p = parts(Date.now());
  const utcMidnight = Date.UTC(p.year, p.month - 1, p.day);
  let t = utcMidnight - offsetAt(utcMidnight);
  const off = offsetAt(t);
  if (utcMidnight - off !== t) t = utcMidnight - off;
  return t;
}

const opts = (o) => Object.assign({ timeZone: marketZone() }, o);
export const fmtTime = (unix) => new Date(unix * 1000).toLocaleTimeString([], opts({ hour: "2-digit", minute: "2-digit" }));
export const fmtToday = () => new Date().toLocaleDateString([], opts({ weekday: "long", day: "numeric", month: "long" }));
