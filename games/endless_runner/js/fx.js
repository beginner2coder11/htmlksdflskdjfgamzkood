/* Full-screen canvas particles (shards, sparkles, rings, confetti, embers)
   plus DOM floating text and "fly to HUD" collectibles. */
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

  // square shards in the block's color — the core "block breaks" effect
  function shatter(x, y, color, size = 30) {
    for (let i = 0; i < 7; i++) {
      const a = rand(0, Math.PI * 2), s = rand(2, 7);
      parts.push({ t: "shard", x: x + rand(-size / 3, size / 3), y: y + rand(-size / 3, size / 3), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, r: rand(size * 0.15, size * 0.32), color, life: 1, decay: rand(0.016, 0.028), g: 0.38, rot: rand(0, 6), vr: rand(-0.25, 0.25) });
    }
    for (let i = 0; i < 2; i++)
      parts.push({ t: "spark", x, y, vx: rand(-2, 2), vy: rand(-3, 0), r: rand(6, 11), color: "#fff", life: 1, decay: rand(0.03, 0.05), g: 0, rot: rand(0, 6), vr: rand(-0.2, 0.2) });
    kick();
  }
  function ring(x, y, color = "#fff", speed = 8, width = 8) {
    parts.push({ t: "ring", x, y, r: 6, vr: speed, color, life: 1, decay: 0.04, w: width });
    kick();
  }
  function sparkle(x, y, n = 8, spread = 40) {
    for (let i = 0; i < n; i++)
      parts.push({ t: "spark", x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-0.6, 0.6), vy: rand(-1.5, -0.3), r: rand(5, 12), color: Math.random() < 0.5 ? "#fff" : "#ffe36e", life: 1, decay: rand(0.015, 0.03), g: 0, rot: rand(0, 6), vr: rand(-0.1, 0.1) });
    kick();
  }
  function explosion(x, y, radius) {
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2), s = rand(3, 12);
      parts.push({ t: "ember", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(4, 10), color: ["#ffd32a", "#ffa502", "#ff4757", "#fff"][i % 4], life: 1, decay: rand(0.02, 0.04), g: 0.12 });
    }
    ring(x, y, "#ffd32a", radius / 6, 14);
    ring(x, y, "#fff", radius / 9, 6);
    kick();
  }
  const CONFETTI = ["#ff4757", "#ffd32a", "#2ed573", "#1ec8ff", "#a55eea", "#ffa502", "#ff6bcb"];
  function confetti(n = 120) {
    for (let i = 0; i < n; i++)
      parts.push({ t: "conf", x: rand(0, innerWidth), y: rand(-innerHeight * 0.4, -10), vx: rand(-1.5, 1.5), vy: rand(2, 5), r: rand(6, 11), color: CONFETTI[i % CONFETTI.length], life: 1, decay: rand(0.004, 0.008), g: 0.05, rot: rand(0, 6), vr: rand(-0.2, 0.2) });
    kick();
  }

  function star(r) {
    cx.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, a = (i * Math.PI) / 4; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    cx.closePath(); cx.fill();
  }

  function loop() {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= p.decay;
      if (p.life <= 0 || p.y > innerHeight + 60) { parts.splice(i, 1); continue; }
      cx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      if (p.t === "ring") {
        p.r += p.vr; p.vr *= 0.92;
        cx.strokeStyle = p.color; cx.lineWidth = p.w * p.life;
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.stroke();
        continue;
      }
      p.vy += p.g; p.x += p.vx; p.y += p.vy;
      if (p.t !== "conf") p.vx *= 0.98;
      if (p.rot !== undefined) p.rot += p.vr;
      cx.fillStyle = p.color;
      if (p.t === "shard") {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        const s = p.r * (0.6 + p.life * 0.4);
        cx.fillRect(-s / 2, -s / 2, s, s);
        cx.fillStyle = "rgba(255,255,255,.45)"; cx.fillRect(-s / 2, -s / 2, s, s * 0.3);
        cx.restore();
      } else if (p.t === "spark") {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); star(p.r * (0.4 + p.life * 0.6)); cx.restore();
      } else if (p.t === "ember") {
        cx.beginPath(); cx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); cx.fill();
      } else {
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.6); cx.restore();
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
    return el;
  }

  // An icon that arcs from (x,y) to a HUD element, then calls done().
  function fly(x, y, target, html, done, delay = 0) {
    const el = document.createElement("div");
    el.className = "flyer"; el.innerHTML = html;
    el.style.left = x + "px"; el.style.top = y + "px";
    floaters.appendChild(el);
    const r = target.getBoundingClientRect();
    const tx = r.left + r.width / 2 - x, ty = r.top + r.height / 2 - y;
    const anim = el.animate([
      { transform: "translate(-50%,-50%) scale(.4)", offset: 0 },
      { transform: `translate(calc(-50% + ${tx * 0.25 + rand(-40, 40)}px), calc(-50% + ${ty * 0.1 - 60}px)) scale(1.3)`, offset: 0.35 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(.6)`, offset: 1 }
    ], { duration: 750, delay, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" });
    anim.onfinish = () => { el.remove(); done && done(); };
  }

  return { shatter, ring, sparkle, explosion, confetti, text, fly };
})();
