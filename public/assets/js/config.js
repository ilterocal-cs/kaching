// Display settings: defaults, markets and rates, URL parameters, and the setup link.
import { toNum } from "./util.js";
import { load, store, LS_CFG } from "./storage.js";

export const TOPIC_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Each market maps to its local currency and a rate to EUR:
// amount in local currency * rate = amount in EUR.
export const defaults = {
  topic: "", market: "PL",
  // Approximate fixed rates; update by hand in Settings → Markets.
  markets: {
    PL: { currency: "PLN", rate: 0.23 },
    SE: { currency: "SEK", rate: 0.09 },
    DK: { currency: "DKK", rate: 0.134 },
    FI: { currency: "EUR", rate: 1 },
    EE: { currency: "EUR", rate: 1 },
    UK: { currency: "GBP", rate: 1.17 },
    ES: { currency: "EUR", rate: 1 },
    CZ: { currency: "CZK", rate: 0.04 }
  },
  big: 4000, sound: true
};

const MARKET_RE = /^[A-Z]{2,3}$/;
const validCurrency = (c) => { try { new Intl.NumberFormat(undefined, { style: "currency", currency: c }); return /^[A-Z]{3}$/.test(c); } catch { return false; } };

// Parses "PL PLN 0.23" lines (or "PL:PLN:0.23" items) into { PL: { currency, rate } }.
// Returns { markets } or { error }.
export function parseMarkets(text) {
  const markets = {};
  // Commas separate items only before a letter, so "0,23" still works as a rate.
  const items = String(text).split(/[\n;]+|,(?=\s*[A-Za-z])/).map((s) => s.trim()).filter(Boolean);
  for (const item of items) {
    const [m, c, r] = item.split(/[\s:]+/);
    const market = (m || "").toUpperCase(), currency = (c || "").toUpperCase(), rate = toNum(r || "");
    if (!MARKET_RE.test(market) || !validCurrency(currency) || !(rate > 0)) return { error: `Can’t read “${item}”. Use: PL PLN 0.23` };
    markets[market] = { currency, rate };
  }
  if (!Object.keys(markets).length) return { error: "Add at least one market, e.g. PL PLN 0.23" };
  return { markets };
}
export const marketsToText = (ms, sep) => Object.entries(ms).map(([m, v]) => `${m} ${v.currency} ${v.rate}`).join(sep);

// Live binding: other modules always see the current settings. Replace them with setCfg().
export let cfg = Object.assign({}, defaults, load(LS_CFG) || {});

// URL parameters override saved settings, so one link can set up any screen.
const qp = new URLSearchParams(location.search);
if (qp.get("topic")) cfg.topic = qp.get("topic");
if (qp.get("markets")) { const r = parseMarkets(qp.get("markets")); if (r.markets) cfg.markets = r.markets; }
if (qp.get("market")) cfg.market = qp.get("market").toUpperCase();
if (qp.get("big") && isFinite(+qp.get("big"))) cfg.big = +qp.get("big");
if (qp.get("sound") === "0") cfg.sound = false;
if (!cfg.markets[cfg.market]) cfg.market = Object.keys(cfg.markets)[0];
store(LS_CFG, cfg);

export function setCfg(next) {
  cfg = next;
  store(LS_CFG, cfg);
}

// Link that sets up another screen exactly like this one (shown as a QR code).
// Markets are only included when they differ from the defaults, to keep the code small.
export function setupUrl() {
  const p = new URLSearchParams({ topic: cfg.topic, market: cfg.market, big: String(cfg.big) });
  if (!cfg.sound) p.set("sound", "0");
  const ms = marketsToText(cfg.markets, ",");
  if (ms !== marketsToText(defaults.markets, ",")) p.set("markets", ms.replace(/ /g, ":"));
  return `${location.origin}${location.pathname}?${p}`;
}
