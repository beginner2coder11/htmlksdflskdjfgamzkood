/* Particle effects on a full-screen canvas: juice drops, sparkles,
   shockwave rings and confetti. Plus DOM floating text. */
window.FX = (() => {
  const cv = document.getElementById("fx");
  const cx = cv.getContext("2d");
  const floaters = document.getElementById("floaters");
  let parts = [], running = false, dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  const rand = (a, b) => a + Math.random() * (b - a);

  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  function juice(x, y, color, power = 1) {
    const n = Math.round(10 + 8 * power);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(2, 7) * power;
      parts.push({ t: "drop", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, r: rand(3, 7) * Math.min(power, 1.6), color, life: 1, decay: rand(0.018, 0.03), g: 0.32 });
    }
    for (let i = 0; i < 5 + 3 * power; i++) {
      const a = rand(0, Math.PI * 2), s = rand(1, 4);
      parts.push({ t: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(5, 11), color: "#fff", life: 1, decay: rand(0.025, 0.04), g: 0, rot: rand(0, 6), vr: rand(-0.2, 0.2) });
    }
    parts.push({ t: "ring", x, y, r: 10, vr: 5 + 3 * power, color, life: 1, decay: 0.05 });
    kick();
  }

  function smash(x, y, color) {
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), s = rand(3, 10);
      parts.push({ t: "chunk", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, r: rand(4, 9), color, life: 1, decay: rand(0.015, 0.025), g: 0.45, rot: rand(0, 6), vr: rand(-0.3, 0.3) });
    }
    parts.push({ t: "ring", x, y, r: 10, vr: 9, color: "#fff", life: 1, decay: 0.045 });
    kick();
  }

  function sparkle(x, y, n = 8, spread = 40) {
    for (let i = 0; i < n; i++) {
      parts.push({ t: "spark", x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-0.6, 0.6), vy: rand(-1.5, -0.3), r: rand(5, 12), color: Math.random() < 0.5 ? "#fff" : "#ffe36e", life: 1, decay: rand(0.015, 0.03), g: 0, rot: rand(0, 6), vr: rand(-0.1, 0.1) });
    }
    kick();
  }

  const CONFETTI = ["#ff5d8f", "#ffd447", "#3ccf6e", "#3a9dff", "#9d6bff", "#ff9330"];
  function confetti(n = 120) {
    for (let i = 0; i < n; i++) {
      parts.push({ t: "conf", x: rand(0, innerWidth), y: rand(-innerHeight * 0.4, -10), vx: rand(-1.5, 1.5), vy: rand(2, 5), r: rand(5, 10), color: CONFETTI[i % CONFETTI.length], life: 1, decay: rand(0.004, 0.008), g: 0.05, rot: rand(0, 6), vr: rand(-0.2, 0.2) });
    }
    kick();
  }

  function star(r) {
    cx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.28 : r, a = (i * Math.PI) / 4;
      cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    cx.closePath(); cx.fill();
  }

  function loop() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay;
      if (p.life <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      cx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      if (p.t === "ring") {
        p.r += p.vr; p.vr *= 0.9;
        cx.strokeStyle = p.color; cx.lineWidth = 6 * p.life;
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.stroke();
        continue;
      }
      p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.t !== "conf") { p.vx *= 0.97; }
      if (p.rot !== undefined) p.rot += p.vr;
      cx.fillStyle = p.color;
      if (p.t === "drop") {
        cx.beginPath(); cx.arc(p.x, p.y, p.r * (0.5 + p.life * 0.5), 0, Math.PI * 2); cx.fill();
        cx.fillStyle = "rgba(255,255,255,.6)";
        cx.beginPath(); cx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, Math.PI * 2); cx.fill();
      } else if (p.t === "spark") {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); star(p.r * (0.4 + p.life * 0.6)); cx.restore();
      } else {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * (p.t === "conf" ? 0.6 : 0.8));
        cx.restore();
      }
    }
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function text(x, y, html, cls = "") {
    const el = document.createElement("div");
    el.className = "floater " + cls;
    el.innerHTML = html;
    el.style.left = x + "px"; el.style.top = y + "px";
    floaters.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  return { juice, smash, sparkle, confetti, text };
})();
