/* SPIRAL DROP — home, HUD, balls, level list, results, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "pad";
  const fresh = () => ({ level: 1, best: 0, ball: "pop", plays: 0, sfx: true, music: true });
  let P = fresh();
  try { P = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  let revived = false, current = 1;
  const skin = () => CF.balls.find(b => b.id === P.ball) || CF.balls[0];

  function at(v) { document.body.dataset.on = v; if (v === "home") paint(); }
  function paint() { $("m-best").textContent = P.best; $("m-level").textContent = P.level; }
  function modal(html, cls = "") { const m = $("modal"); m.innerHTML = `<div class="card ${cls}">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }

  function play(n) { close(); revived = false; current = n; at("play"); Game.start(n, skin()); Sound.muffle(false); hud(); }
  function hud() {
    $("h-lv").textContent = Game.level; $("h-next").textContent = Game.level + 1;
    $("h-fill").style.width = Math.min(100, Game.passed / Math.max(1, Game.total) * 100) + "%";
    $("h-score").textContent = Game.score;
  }
  Game.on("hud", hud);
  Game.on("fever", on => { $("h-fever").hidden = !on; });
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.on === "play") pause(); });
  Game.on("dead", r => {
    P.plays++; P.best = Math.max(P.best, r.score); keep();
    setTimeout(() => {
      const pct = Math.round(r.passed / r.total * 100);
      const c = modal(`<h3>OOPS!</h3><div class="pct">${pct}%</div><p>of level ${r.level} · score ${r.score}</p>
        <div class="acts">${revived ? "" : `<button class="chunky ad wide" id="d-rev">▶ CONTINUE</button>`}<button class="chunky" id="d-home">HOME</button><button class="chunky go" id="d-retry">RETRY</button></div>`);
      const rv = c.querySelector("#d-rev"); if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; close(); Game.revive(); });
      const gate = fn => (P.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      c.querySelector("#d-home").onclick = () => gate(() => { close(); Game.quit(); at("home"); });
      c.querySelector("#d-retry").onclick = () => gate(() => play(current));
    }, 500);
  });
  Game.on("won", r => {
    P.plays++; P.best = Math.max(P.best, r.score); if (r.level >= P.level) P.level = Math.min(CF.levels, r.level + 1); keep();
    const unlocked = CF.balls.filter(b => b.level === r.level + 1);
    const c = modal(`<h3>LEVEL ${r.level}<br>DONE!</h3><p>score ${r.score}</p>${unlocked.length ? `<p>New ball unlocked: ${unlocked.map(b => b.name).join(", ")}</p>` : ""}
      <div class="acts"><button class="chunky" id="w-home">HOME</button><button class="chunky go" id="w-next">NEXT ▶</button></div>`, "win");
    const gate = fn => (P.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#w-home").onclick = () => gate(() => { close(); Game.quit(); at("home"); });
    c.querySelector("#w-next").onclick = () => gate(() => play(Math.min(CF.levels, r.level + 1)));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const c = modal(`<h3>PAUSED</h3><div class="acts"><button class="chunky go wide" id="p-go">RESUME</button><button class="chunky" id="p-re">RESTART</button><button class="chunky" id="p-home">HOME</button></div>`);
    c.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    c.querySelector("#p-re").onclick = () => play(current);
    c.querySelector("#p-home").onclick = () => { close(); Game.quit(); Sound.muffle(false); at("home"); };
  }
  $("h-pause").onclick = pause;

  function ballIcon(cv, b) {
    const x = cv.getContext("2d"); cv.width = cv.height = 92; x.scale(2, 2); x.translate(23, 23);
    x.fillStyle = b.color; x.beginPath(); x.arc(0, 0, 18, 0, 7); x.fill(); x.fillStyle = "#161616"; x.strokeStyle = "#161616";
    if (b.pattern === "dots") [[-6, -6], [6, -1], [-1, 8]].forEach(([a, c]) => { x.beginPath(); x.arc(a, c, 3, 0, 7); x.fill(); });
    if (b.pattern === "stripes") { x.save(); x.beginPath(); x.arc(0, 0, 18, 0, 7); x.clip(); x.fillStyle = "#fff"; for (let i = -2; i <= 2; i++) x.fillRect(i * 9 - 2, -18, 4, 36); x.restore(); }
    if (b.pattern === "half") { x.beginPath(); x.arc(0, 0, 18, -Math.PI / 2, Math.PI / 2); x.fill(); }
    if (b.pattern === "ring") { x.fillStyle = "#ffe7d6"; x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); }
    if (b.pattern === "zigzag") { x.lineWidth = 3; x.beginPath(); x.moveTo(-15, 0); for (let i = 0; i < 5; i++) x.lineTo(-15 + (i + 1) * 6, i % 2 ? 0 : -6); x.stroke(); }
    x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 18, 0, 7); x.stroke();
  }
  function balls() {
    const c = modal(`<h3>BALLS</h3><div class="balls">${CF.balls.map(b => `<button data-b="${b.id}" class="${P.ball === b.id ? "on" : ""}" ${P.level < b.level ? "disabled" : ""}><canvas></canvas>${P.level < b.level ? "LEVEL " + b.level : b.name.toUpperCase()}</button>`).join("")}</div><button class="chunky go" id="b-x">DONE</button>`);
    c.querySelectorAll("canvas").forEach((cv, i) => ballIcon(cv, CF.balls[i]));
    c.querySelector(".balls").onclick = e => { const b = e.target.closest("[data-b]"); if (!b || b.disabled) return; P.ball = b.dataset.b; keep(); Sound.sfx("tap"); balls(); };
    c.querySelector("#b-x").onclick = close;
  }
  function levels() {
    const shown = Math.min(CF.levels, Math.max(25, Math.ceil(P.level / 25) * 25));
    const c = modal(`<h3>LEVELS</h3><div class="lvgrid">${Array.from({ length: shown }, (_, i) => { const n = i + 1; return `<button data-l="${n}" class="${n < P.level ? "done" : n === P.level ? "cur" : ""}" ${n > P.level ? "disabled" : ""}>${n}</button>`; }).join("")}</div><button class="chunky go" id="l-x">CLOSE</button>`);
    c.querySelector(".lvgrid").onclick = e => { const b = e.target.closest("[data-l]"); if (b) play(+b.dataset.l); };
    c.querySelector("#l-x").onclick = close;
  }
  function settings() {
    const c = modal(`<h3>SETTINGS</h3><button class="opt" id="o-s">SOUND <b>${P.sfx ? "ON" : "OFF"}</b></button><button class="opt" id="o-m">MUSIC <b>${P.music ? "ON" : "OFF"}</b></button><button class="opt" id="o-r">RESET <b>!</b></button><button class="chunky go" id="o-x">DONE</button>`);
    c.querySelector("#o-s").onclick = e => { P.sfx = !P.sfx; Sound.setSfx(P.sfx); e.currentTarget.querySelector("b").textContent = P.sfx ? "ON" : "OFF"; keep(); };
    c.querySelector("#o-m").onclick = e => { P.music = !P.music; Sound.setMusic(P.music); e.currentTarget.querySelector("b").textContent = P.music ? "ON" : "OFF"; keep(); };
    c.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } P = fresh(); keep(); b.textContent = "DONE"; paint(); };
    c.querySelector("#o-x").onclick = close;
  }

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(P.sfx); Sound.setMusic(P.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("m-play").onclick = () => { Sound.sfx("tap"); play(P.level); };
  $("m-balls").onclick = () => { Sound.sfx("tap"); balls(); };
  $("m-levels").onclick = () => { Sound.sfx("tap"); levels(); };
  $("m-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.on === "play" && $("modal").hidden && Game.state === "play") pause(); });
  at("home");
  // a tower stands behind the home screen
  Game.start(P.level, skin()); Game.pause();
  return { play, balls, levels, get pad() { return P; } };
})();
