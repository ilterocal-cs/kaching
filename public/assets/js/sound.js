// Synthesized cash-register "ka-ching" with the Web Audio API (no audio files).
// Browsers only allow audio after a user gesture: call audio() from a click first.
import { cfg } from "./config.js";

let actx = null;
export function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function bell(a, out, t, vol, base) {
  [[1, 1], [2.0, .45], [2.76, .35], [5.4, .18], [8.93, .08]].forEach(([r, amp]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.value = base * r;
    const decay = 1.8 / Math.pow(r, .4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * amp * .22, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + decay + .05);
  });
}

function noise(a, out, t, dur, freq, vol) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const n = a.createBufferSource(); n.buffer = buf;
  const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = .9;
  const g = a.createGain(); g.gain.value = vol;
  n.connect(bp).connect(g).connect(out);
  n.start(t);
}

export function kaching(big) {
  if (!cfg.sound) return;
  const a = audio(); if (!a) return;
  const t = a.currentTime + .03;
  const out = a.createGain(); out.gain.value = .9; out.connect(a.destination);

  // "ka": the drawer lever and thunk
  noise(a, out, t, .07, 2200, .6);
  const o = a.createOscillator(), g = a.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(190, t + .05);
  o.frequency.exponentialRampToValueAtTime(55, t + .2);
  g.gain.setValueAtTime(.55, t + .05);
  g.gain.exponentialRampToValueAtTime(.0001, t + .24);
  o.connect(g).connect(out); o.start(t + .05); o.stop(t + .26);
  noise(a, out, t + .09, .12, 5200, .35);

  // "ching": the bell
  bell(a, out, t + .14, 1, 1760);
  bell(a, out, t + .16, .5, 2637);

  if (big) {
    bell(a, out, t + .55, .9, 1975);
    bell(a, out, t + .57, .5, 2960);
    for (let i = 0; i < 18; i++) {
      const ct = t + .3 + Math.random() * 1.1;
      const co = a.createOscillator(), cg = a.createGain();
      co.type = "sine"; co.frequency.value = 3200 + Math.random() * 3200;
      cg.gain.setValueAtTime(.0001, ct);
      cg.gain.exponentialRampToValueAtTime(.08, ct + .004);
      cg.gain.exponentialRampToValueAtTime(.0001, ct + .18);
      co.connect(cg).connect(out); co.start(ct); co.stop(ct + .2);
    }
  }
}
