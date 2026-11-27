// localStorage wrappers that never throw (private mode, blocked storage, bad JSON).
// Bump a key's suffix (.v3) instead of migrating when its shape changes.

export const LS_CFG = "kaching.cfg.v2";
export const LS_DAY = "kaching.day.v2";

export const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
export const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
