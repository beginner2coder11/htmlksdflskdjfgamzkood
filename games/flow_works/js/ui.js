/* FLOW WORKS — index sheet, HUD, all-sheets grid, hints, results, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "drawings";
  const fresh = () => ({ stars: {}, hints: CF.hints, plays: 0, sfx: true, music: true, hintStars: 0 });
  let D = fresh();
  try { D = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  const next = () => Math.min(CF.levels, Object.keys(D.stars).length + 1);
  const total = () => Object.values(D.stars).reduce((a, b) => a + b, 0);
  const pad = n => String(n).padStart(2, "0");

  function view(v) { document.body.dataset.v = v; if (v === "index") index(); }
  function index() { $("i-level").textContent = next(); $("i-stars").textContent = total(); $("i-hints").textContent = D.hints; $("i-play-n").textContent = pad(next()); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }

  function play(n) { close(); view("work"); Game.generate(n); Sound.muffle(false); }
  Game.on("hud", () => {
    $("w-level").textContent = pad(Game.level) + (Game.wrap ? "↻" : ""); $("w-turns").textContent = Game.turns;
    $("w-flow").textContent = Math.round(Game.wetCount / Game.tiles.length * 100) + "%"; $("w-hints").textContent = D.hints;
  });
  Game.on("won", r => {
    D.plays++; const prev = D.stars[r.level] || 0; D.stars[r.level] = Math.max(prev, r.stars);
    const earned = Math.floor(total() / 3) - D.hintStars; if (earned > 0) { D.hints += earned; D.hintStars += earned; }
    keep();
    const m = modal(`<h3>SYSTEM ONLINE</h3><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "" : "off"}">★</span>`).join("")}</div>
      <div class="rows"><span>SHEET</span><b>${pad(r.level)}</b><span>TURNS</span><b>${r.turns}</b><span>MINIMUM</span><b>${r.minTurns}</b>${earned > 0 ? `<span>HINTS EARNED</span><b>+${earned}</b>` : ""}</div>
      <div class="acts"><button class="draft" id="r-index">INDEX</button><button class="draft big" id="r-next">NEXT →</button></div>`);
    for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 200 + i * 220);
    const gate = fn => (D.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#r-next").onclick = () => gate(() => play(Math.min(CF.levels, r.level + 1)));
    m.querySelector("#r-index").onclick = () => gate(() => { close(); view("index"); });
  });
  $("w-hint").onclick = () => {
    if (Game.done) return;
    if (D.hints <= 0) { const m = modal(`<h3>NO HINTS</h3><p>Earn one for every 3 stars, or watch a short video.</p><div class="acts"><button class="draft big wide" id="h-ad">▶ +2 HINTS</button><button class="draft wide" id="h-x">CLOSE</button></div>`); m.querySelector("#h-ad").onclick = () => Ads.showRewarded().then(ok => { if (ok) { D.hints += 2; keep(); } close(); Game.on && $("w-hints") && ($("w-hints").textContent = D.hints); }); m.querySelector("#h-x").onclick = close; return; }
    if (Game.hint()) { D.hints--; keep(); $("w-hints").textContent = D.hints; }
  };
  Game.on("hintKey", () => $("w-hint").onclick());
  $("w-reset").onclick = () => play(Game.level);
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>PAUSED</h3><div class="acts"><button class="draft big wide" id="p-go">RESUME</button><button class="draft" id="p-sheets">ALL SHEETS</button><button class="draft" id="p-index">INDEX</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-sheets").onclick = () => { Game.resume(); sheets(); };
    m.querySelector("#p-index").onclick = () => { close(); Game.resume(); Sound.muffle(false); view("index"); };
  }
  $("w-menu").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.v === "work") pause(); });
  function sheets() {
    const cur = next();
    const m = modal(`<h3>ALL SHEETS</h3><p>${total()} ★ · edges wrap from sheet ${CF.wrapFrom}</p><div class="sheets">${Array.from({ length: CF.levels }, (_, i) => { const n = i + 1, s = D.stars[n] || 0; return `<button data-n="${n}" class="${n === cur ? "cur" : ""}" ${n > cur ? "disabled" : ""}>${pad(n)}<i>${"★".repeat(s)}</i></button>`; }).join("")}</div><button class="draft" id="s-x">CLOSE</button>`);
    m.querySelector(".sheets").onclick = e => { const b = e.target.closest("[data-n]"); if (b) { Sound.sfx("tap"); play(+b.dataset.n); } };
    m.querySelector("#s-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>SETTINGS</h3><button class="opt" id="o-s">SOUND <b>${D.sfx ? "ON" : "OFF"}</b></button><button class="opt" id="o-m">MACHINE HUM <b>${D.music ? "ON" : "OFF"}</b></button><button class="opt" id="o-r">CLEAR DRAWINGS <b>—</b></button><button class="draft big" id="o-x">DONE</button>`);
    m.querySelector("#o-s").onclick = e => { D.sfx = !D.sfx; Sound.setSfx(D.sfx); e.currentTarget.querySelector("b").textContent = D.sfx ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-m").onclick = e => { D.music = !D.music; Sound.setMusic(D.music); e.currentTarget.querySelector("b").textContent = D.music ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } D = fresh(); keep(); b.textContent = "DONE"; index(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(D.sfx); Sound.setMusic(D.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("i-play").onclick = () => { Sound.sfx("tap"); play(next()); };
  $("i-levels").onclick = () => { Sound.sfx("tap"); sheets(); };
  $("i-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  view("index");
  return { play, get drawings() { return D; } };
})();
