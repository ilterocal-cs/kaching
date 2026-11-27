// Celebration queue: live sales pop up one at a time with sound and coins.
import { $, BASE, fmt, sleep, reducedMotion } from "./util.js";
import { cfg } from "./config.js";
import { animateTotalTo, renderRoll, syncTotals } from "./ui.js";
import { kaching } from "./sound.js";
import { coinBurst } from "./coins.js";

const burst = $("burst"), windowEl = $("window"), burstLabel = $("burstLabel");

const queue = [];
let running = false;

export const isCelebrating = () => running;

// s: { amount, currency, eur, label, test?, total?, count? }. Test sales never touch totals.
export function enqueue(s) {
  queue.push(s);
  runQueue();
}

async function runQueue() {
  if (running) return;
  running = true;
  while (queue.length) {
    const s = queue.shift();
    const hold = queue.length > 2 ? 2200 : 4200;
    await celebrate(s, hold);
    // The total counts up after the celebration, so the screen counts the sale it just showed.
    if (!s.test) { animateTotalTo(s.total, s.count); renderRoll(true); }
    await sleep(400);
  }
  running = false;
  syncTotals();
}

async function celebrate(s, hold) {
  const big = s.eur >= cfg.big;
  const text = (s.amount >= 0 ? "+" : "") + fmt(s.amount, s.currency);
  windowEl.innerHTML = "";
  windowEl.setAttribute("aria-label", text);
  [...text].forEach((ch, i) => {
    const t = document.createElement("span");
    t.className = "tab" + (/\s/.test(ch) ? " gap" : /[\d]/.test(ch) ? "" : " sym");
    t.textContent = /\s/.test(ch) ? "" : ch;
    t.style.setProperty("--i", i);
    t.setAttribute("aria-hidden", "true");
    windowEl.appendChild(t);
  });
  const title = s.test ? "Test sale" : (s.label || (big ? "Big sale!" : "New sale"));
  const inEur = s.currency !== BASE ? `≈ ${fmt(s.eur)}` : "";
  burstLabel.textContent = [title, inEur].filter(Boolean).join(" · ");
  void windowEl.offsetWidth;
  burst.classList.add("on");
  kaching(big);
  if (!reducedMotion) coinBurst(big ? 140 : 60);
  await sleep(hold);
  burst.classList.remove("on");
  await sleep(350);
}
