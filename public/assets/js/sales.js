// Turns an ntfy message body (the PostHog webhook JSON) into a sale, or null.
import { toNum, cleanStr } from "./util.js";
import { cfg } from "./config.js";

// Only JSON messages for the selected market count, e.g. {"amount": 199, "market": "PL"}.
// Everything else returns null and is ignored.
export function parseSale(text) {
  let obj = null;
  try { obj = JSON.parse(text); } catch {}
  if (!obj || typeof obj !== "object") return null;
  const market = cleanStr(obj.market).toUpperCase();
  if (market !== cfg.market) return null;
  const amount = toNum(obj.amount);
  if (!isFinite(amount)) return null;
  const { currency, rate } = cfg.markets[market];
  const eur = Math.round(amount * rate * 100) / 100;
  return { amount, currency, market, eur, label: cleanStr(obj.label || obj.product || obj.name).slice(0, 60) };
}
