// Settings dialog: topic, market, rates, big-sale threshold, sound, test sale and reset.
import { $ } from "./util.js";
import { cfg, defaults, TOPIC_RE, parseMarkets, marketsToText, setCfg } from "./config.js";
import { renderTotals, renderQr } from "./ui.js";
import { resetToday, startFreshDay } from "./ledger.js";
import { enqueue } from "./celebrate.js";
import { audio } from "./sound.js";
import { connect } from "./ntfy.js";

const dlg = $("settings"), form = $("form");

// Older browsers (Safari < 15.4, e.g. iOS 12) have no <dialog>: show it with a
// class and our own backdrop instead, closing on Escape or a backdrop tap.
const nativeDialog = typeof dlg.showModal === "function";
let backdrop = null;
function showDlg() {
  if (nativeDialog) return dlg.showModal();
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "dialog-backdrop";
    backdrop.addEventListener("click", closeDlg);
    document.body.appendChild(backdrop);
  }
  backdrop.hidden = false;
  dlg.classList.add("fallback");
  dlg.setAttribute("open", "");
}
function closeDlg() {
  if (nativeDialog) return dlg.close();
  dlg.removeAttribute("open");
  if (backdrop) backdrop.hidden = true;
}
if (!nativeDialog) addEventListener("keydown", (e) => { if (e.key === "Escape" && isSettingsOpen()) closeDlg(); });

export const isSettingsOpen = () => dlg.hasAttribute("open");

function randomTopic() {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return "kaching-" + [...bytes].map((b) => abc[b % abc.length]).join("");
}

function updateHook() {
  const t = form.topic.value.trim();
  $("hookUrl").textContent = TOPIC_RE.test(t) ? `https://ntfy.sh/${t}` : "Set a topic first";
}

// Fills the market dropdown from a markets object, keeping the selection if it still exists.
function fillMarketSelect(markets, selected) {
  const sel = form.market;
  sel.innerHTML = "";
  Object.entries(markets).forEach(([m, v]) => sel.add(new Option(`${m} (${v.currency})`, m)));
  sel.value = markets[selected] ? selected : Object.keys(markets)[0];
}

export function openSettings() {
  form.topic.value = cfg.topic;
  form.markets.value = marketsToText(cfg.markets, "\n");
  fillMarketSelect(cfg.markets, cfg.market);
  form.big.value = cfg.big;
  form.sound.checked = cfg.sound;
  $("formError").textContent = "";
  updateHook();
  showDlg();
}

form.topic.addEventListener("input", updateHook);
form.markets.addEventListener("input", () => {
  const r = parseMarkets(form.markets.value);
  if (r.markets) fillMarketSelect(r.markets, form.market.value);
});
$("genBtn").addEventListener("click", () => { form.topic.value = randomTopic(); updateHook(); });
$("copyBtn").addEventListener("click", async () => {
  const t = $("hookUrl").textContent;
  if (!t.startsWith("https://")) return;
  try { await navigator.clipboard.writeText(t); $("copyBtn").textContent = "Copied"; setTimeout(() => ($("copyBtn").textContent = "Copy URL"), 1500); }
  catch { window.prompt("Copy this URL:", t); }
});
$("testBtn").addEventListener("click", () => {
  audio();
  const amount = Math.round((20 + Math.random() * 180) * 100) / 100;
  closeDlg();
  const m = cfg.markets[cfg.market];
  enqueue({ amount, currency: m.currency, market: cfg.market, eur: Math.round(amount * m.rate * 100) / 100, label: "", test: true });
});
$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset today’s total and the till roll? Loans from ntfy won’t be pulled in again.")) return;
  resetToday();
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const topic = form.topic.value.trim();
  if (!TOPIC_RE.test(topic)) { $("formError").textContent = "Use 1–64 letters, numbers, dashes or underscores for the topic."; return; }
  const parsed = parseMarkets(form.markets.value);
  if (parsed.error) { $("formError").textContent = parsed.error; return; }
  const market = form.market.value;
  if (!parsed.markets[market]) { $("formError").textContent = "Pick a market from the list."; return; }
  const changedStream = topic !== cfg.topic || market !== cfg.market;
  setCfg({
    topic,
    market,
    markets: parsed.markets,
    big: isFinite(+form.big.value) && form.big.value !== "" ? +form.big.value : defaults.big,
    sound: form.sound.checked
  });
  if (changedStream) startFreshDay();
  renderTotals();
  renderQr();
  closeDlg();
  connect();
});
$("settingsBtn").addEventListener("click", openSettings);
