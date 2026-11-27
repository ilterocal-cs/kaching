// Today's state: total (EUR), count, till roll, and the ntfy position (seen IDs, lastId).
import { cfg } from "./config.js";
import { load, store, LS_DAY } from "./storage.js";

export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const freshDay = () => ({ key: todayKey(), topic: cfg.topic, market: cfg.market, total: 0, count: 0, ids: [], lastId: null, sales: [] });

// Live binding: replace with setDay(), or mutate fields and call saveDay().
// A new day, topic or market starts fresh. A fresh day has no lastId, so the
// stream is replayed from midnight and today's sales for this market are counted.
export let day = load(LS_DAY);
if (!day || day.key !== todayKey() || day.topic !== cfg.topic || day.market !== cfg.market) day = freshDay();

export const saveDay = () => store(LS_DAY, day);
export function setDay(next) {
  day = next;
  saveDay();
}
