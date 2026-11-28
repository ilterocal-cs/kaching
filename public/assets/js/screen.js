// Screen helpers: keep the display awake, hide controls when idle, full screen.
import { $ } from "./util.js";
import { isSettingsOpen } from "./settings.js";

// Screen Wake Lock (Chrome, Edge, Safari 16.4+, Firefox 126+). Taken after the start
// click and re-taken whenever the system drops it (tab hidden, battery saver, etc.).
let wakeLock = null, awake = false;
export async function keepAwake() {
  awake = true;
  if (wakeLock || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; setTimeout(retake, 1000); });
  } catch { wakeLock = null; }
}
const retake = () => { if (awake) keepAwake(); };
document.addEventListener("visibilitychange", retake);
document.addEventListener("fullscreenchange", retake);
// Some browsers refuse the lock without a recent user gesture, so retry on input too.
["pointerdown", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, retake, { passive: true }));
// Safety net in case a release went unnoticed.
setInterval(retake, 60000);

// Hides the controls and cursor after 3.5 s without input.
let idleTimer;
export function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!isSettingsOpen()) document.body.classList.add("idle"); }, 3500);
}
["mousemove", "pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, wake, { passive: true }));

// Prefixed versions for older Safari (iPad on iOS 12).
$("fsBtn").addEventListener("click", () => {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen || (() => {})).call(d);
    else {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      if (p && p.catch) p.catch(() => {});
    }
  } catch {}
});
