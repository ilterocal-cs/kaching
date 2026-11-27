// Live connection to the ntfy.sh topic over Server-Sent Events.
import { cfg, TOPIC_RE } from "./config.js";
import { day, startOfDay } from "./day.js";
import { setStatus } from "./ui.js";
import { rollover, recordMessage } from "./ledger.js";

let es = null, retryTimer = null;

// (Re)connects to the current topic. Safe to call again after settings change.
export function connect() {
  if (es) { es.close(); es = null; }
  clearTimeout(retryTimer);
  if (!TOPIC_RE.test(cfg.topic)) { setStatus("setup"); return; }
  rollover();
  // Resume after the last message we saw, or pull everything since midnight
  // (ntfy.sh keeps messages for about 12 hours), so a reload doesn't lose sales.
  const since = day.lastId || Math.floor(startOfDay() / 1000);
  setStatus("connecting");
  es = new EventSource(`https://ntfy.sh/${encodeURIComponent(cfg.topic)}/sse?since=${since}`);
  es.onopen = () => setStatus("live");
  es.onmessage = (e) => handle(e.data);
  es.addEventListener("open", () => setStatus("live"));
  es.addEventListener("keepalive", () => setStatus("live"));
  // Reconnect ourselves with the latest lastId; EventSource's own retry would reuse the old ?since=.
  es.onerror = () => {
    setStatus("reconnecting");
    if (es) es.close();
    es = null;
    retryTimer = setTimeout(connect, 4000);
  };
}

function handle(raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (m.event !== "message") { if (m.event === "open" || m.event === "keepalive") setStatus("live"); return; }
  recordMessage(m);
}
