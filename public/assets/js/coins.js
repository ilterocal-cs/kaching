// Gold coins bursting across a full-screen canvas during a celebration.
import { $ } from "./util.js";

const cv = $("coins"), cx = cv.getContext("2d");
let coins = [], coinRaf = null;
function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", sizeCanvas); sizeCanvas();

export function coinBurst(n) {
  const w = innerWidth, h = innerHeight, s = Math.max(14, Math.min(w, h) / 34);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1;
    const v = (8 + Math.random() * 12) * (h / 900);
    coins.push({
      x: w / 2 + (Math.random() - .5) * w * .2, y: h * .55,
      vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
      r: s * (.7 + Math.random() * .6), spin: Math.random() * Math.PI * 2,
      vs: .1 + Math.random() * .25, life: 0
    });
  }
  if (!coinRaf) coinRaf = requestAnimationFrame(drawCoins);
}

function drawCoins() {
  const h = innerHeight;
  cx.clearRect(0, 0, innerWidth, h);
  const g = .32 * (h / 900);
  coins = coins.filter((c) => c.y < h + 60 && c.life < 400);
  coins.forEach((c) => {
    c.vy += g; c.x += c.vx; c.y += c.vy; c.spin += c.vs; c.life++;
    const sx = Math.max(.12, Math.abs(Math.cos(c.spin)));
    cx.save();
    cx.translate(c.x, c.y);
    cx.scale(sx, 1);
    const grd = cx.createRadialGradient(-c.r * .3, -c.r * .3, c.r * .1, 0, 0, c.r);
    grd.addColorStop(0, "#FFF1B0"); grd.addColorStop(.55, "#E2B93B"); grd.addColorStop(1, "#9C7414");
    cx.fillStyle = grd;
    cx.beginPath(); cx.arc(0, 0, c.r, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = "rgba(110, 80, 10, .55)"; cx.lineWidth = Math.max(1, c.r * .12);
    cx.beginPath(); cx.arc(0, 0, c.r * .72, 0, Math.PI * 2); cx.stroke();
    cx.restore();
  });
  if (coins.length) coinRaf = requestAnimationFrame(drawCoins);
  else { coinRaf = null; cx.clearRect(0, 0, innerWidth, h); }
}
