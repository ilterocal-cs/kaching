// Books ntfy messages into today's totals and decides what to celebrate.
// Also handles the midnight rollover and manual resets.
import { day, setDay, freshDay, saveDay, todayKey, startOfDay } from "./day.js";
import { parseSale } from "./sales.js";
import { renderTotals, renderRoll, animateTotalTo, resetShown } from "./ui.js";
import { enqueue, isCelebrating } from "./celebrate.js";

const pageStart = Date.now() / 1000;

// At local midnight: zero the totals but keep lastId so the stream isn't replayed.
export function rollover() {
  if (day.key === todayKey()) return;
  const next = freshDay();
  next.lastId = day.lastId;
  setDay(next);
  resetShown();
  renderTotals(); renderRoll(false);
}

// "Reset today": keep ids and lastId so already-seen messages aren't counted again.
export function resetToday() {
  const next = freshDay();
  next.lastId = day.lastId;
  next.ids = day.ids;
  setDay(next);
  resetShown();
  renderTotals(); renderRoll(false);
}

// New topic or market: start empty; the next connect() replays today from midnight.
export function startFreshDay() {
  setDay(freshDay());
  resetShown();
  renderRoll(false);
}

// m: an ntfy message event { id, time, message }.
export function recordMessage(m) {
  rollover();
  if (day.ids.includes(m.id)) return;
  day.ids.push(m.id);
  if (day.ids.length > 3000) day.ids = day.ids.slice(-3000);
  day.lastId = m.id;
  if (m.time * 1000 < startOfDay()) { saveDay(); return; }

  const sale = parseSale(m.message != null ? m.message : "");
  if (!sale) { saveDay(); return; }

  day.total += sale.eur;
  day.count += 1;
  day.sales.unshift({ t: m.time, amount: sale.amount, currency: sale.currency, market: sale.market, eur: sale.eur, label: sale.label });
  day.sales = day.sales.slice(0, 60);
  saveDay();

  const live = m.time >= pageStart - 2;
  if (live) {
    enqueue({ ...sale, total: day.total, count: day.count });
  } else {
    // Backfilled from earlier today: count it quietly.
    if (!isCelebrating()) animateTotalTo(day.total, day.count);
    renderRoll(false);
  }
}
