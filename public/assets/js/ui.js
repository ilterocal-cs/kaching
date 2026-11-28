// Rendering of the main screen: total, count, till roll, status and the setup QR code.
import { $, fmt, reducedMotion } from "./util.js";
import { fmtTime, fmtToday } from "./clock.js";
import { cfg, TOPIC_RE, setupUrl } from "./config.js";
import { day } from "./day.js";
import { qrMatrix } from "./qr.js";
import { flagSvg } from "./flags.js";

const totalEl = $("total"), countEl = $("count"), rollList = $("rollList"), rollDate = $("rollDate");
const statusEl = $("status"), statusText = $("statusText");

// What the screen currently shows; animates towards day.total / day.count.
let shownTotal = day.total;
let shownCount = day.count;

export function renderTotals() {
  $("todayLabel").textContent = `Today · ${cfg.market}`;
  const flag = flagSvg(cfg.market);
  if ($("flag").dataset.market !== cfg.market) { $("flag").innerHTML = flag; $("flag").dataset.market = cfg.market; }
  $("flag").hidden = !flag;
  totalEl.textContent = fmt(shownTotal, null, true);
  countEl.innerHTML = `<strong>${shownCount}</strong> ${shownCount === 1 ? "loan issued" : "loans issued"}`;
}

let totalAnim = null;
export function animateTotalTo(target, targetCount) {
  cancelAnimationFrame(totalAnim);
  const from = shownTotal, start = performance.now(), dur = reducedMotion ? 0 : 1200;
  shownCount = targetCount;
  const step = (now) => {
    const p = dur ? Math.min(1, (now - start) / dur) : 1;
    const e = 1 - Math.pow(1 - p, 3);
    shownTotal = from + (target - from) * e;
    renderTotals();
    if (p < 1) totalAnim = requestAnimationFrame(step); else { shownTotal = target; renderTotals(); }
  };
  totalAnim = requestAnimationFrame(step);
}

// Sets the shown total and count back to zero (new day, reset, new topic or market).
export function resetShown() {
  cancelAnimationFrame(totalAnim);
  shownTotal = 0;
  shownCount = 0;
}

// Animates to the real total if the screen is behind (e.g. after a queue of celebrations).
export function syncTotals() {
  if (Math.abs(shownTotal - day.total) > 1e-9 || shownCount !== day.count) animateTotalTo(day.total, day.count);
}

export function renderRoll(freshFirst) {
  rollDate.textContent = fmtToday();
  if (!day.sales.length) {
    rollList.innerHTML = `<li class="empty" style="display:block">Loans print here as they’re issued.</li>`;
    return;
  }
  rollList.innerHTML = "";
  day.sales.slice(0, 30).forEach((s, i) => {
    const li = document.createElement("li");
    if (i === 0 && freshFirst) li.className = "fresh";
    const t = document.createElement("span"); t.className = "time"; t.textContent = fmtTime(s.t);
    const l = document.createElement("span"); l.className = "label";
    l.textContent = s.label || "";
    const a = document.createElement("span"); a.className = "amt" + (s.amount < 0 ? " neg" : "");
    a.textContent = (s.amount >= 0 ? "+" : "") + fmt(s.amount, s.currency);
    li.append(t, l, a);
    rollList.appendChild(li);
  });
}

export function setStatus(state) {
  statusEl.dataset.state = state;
  statusText.textContent = {
    setup: "Not set up: open settings",
    connecting: "Connecting…",
    live: "Live",
    reconnecting: "Connection lost, retrying…"
  }[state] || state;
}

// Copies the setup link (the same one as the QR code). Falls back to a prompt
// where the clipboard isn't available (e.g. plain http on another host).
const qrCopyBtn = $("qrCopyBtn");
qrCopyBtn.addEventListener("click", async () => {
  const url = setupUrl();
  try {
    await navigator.clipboard.writeText(url);
    qrCopyBtn.textContent = "Copied";
    setTimeout(() => (qrCopyBtn.textContent = "Copy link"), 1500);
  } catch {
    window.prompt("Copy this link:", url);
  }
});

// QR code with this screen's setup link. Call whenever cfg changes.
export function renderQr() {
  const box = $("qr");
  const m = TOPIC_RE.test(cfg.topic) ? qrMatrix(setupUrl()) : null;
  if (!m) { box.hidden = true; return; }
  const n = m.length, q = 4; // q = quiet zone in modules
  let d = "";
  m.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x + q},${y + q}h1v1h-1z`; }));
  const svg = $("qrSvg");
  svg.setAttribute("viewBox", `0 0 ${n + q * 2} ${n + q * 2}`);
  svg.innerHTML = `<path fill="#1E1B16" d="${d}"/>`;
  box.title = setupUrl();
  box.hidden = false;
}
