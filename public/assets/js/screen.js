// Screen helpers: keep the display awake, hide controls when idle, full screen.
import { $ } from "./util.js";
import { isSettingsOpen } from "./settings.js";

let wakeLock = null;
export async function keepAwake() {
  try { if ("wakeLock" in navigator && document.visibilityState === "visible") wakeLock = await navigator.wakeLock.request("screen"); } catch {}
}
// The browser drops the wake lock when the tab is hidden; take it again once started.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && $("gate").hidden) keepAwake(); });

// Hides the controls and cursor after 3.5 s without input.
let idleTimer;
export function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!isSettingsOpen()) document.body.classList.add("idle"); }, 3500);
}
["mousemove", "pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, wake, { passive: true }));

$("fsBtn").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
