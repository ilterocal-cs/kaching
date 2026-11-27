// Entry point: wires the modules together and starts the display.
import { $ } from "./util.js";
import { cfg, TOPIC_RE } from "./config.js";
import { renderTotals, renderRoll, renderQr } from "./ui.js";
import { audio } from "./sound.js";
import { rollover } from "./ledger.js";
import { connect } from "./ntfy.js";
import { openSettings } from "./settings.js";
import { keepAwake, wake } from "./screen.js";

setInterval(rollover, 30000);

// Browsers block audio until a user gesture, so the start gate's click unlocks it.
const gate = $("gate");
function start() {
  audio();
  gate.hidden = true;
  keepAwake();
  wake();
  if (!TOPIC_RE.test(cfg.topic)) openSettings();
}
$("startBtn").addEventListener("click", (e) => { e.stopPropagation(); start(); });
gate.addEventListener("click", start);

renderTotals();
renderRoll(false);
renderQr();
connect();
