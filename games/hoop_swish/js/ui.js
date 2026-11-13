/* HOOP SWISH — crew screen, modes, HUD, results, ball shop, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "crew";
  const fresh = () => ({ coins: 0, best: {}, owned: ["classic"], ball: "classic", plays: 0, sfx: true, music: true, shotTip: false });
  let C = fresh();
  try { C = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(C)); } catch (e) {} };
  let current = "street", extended = false;

  function at(v) { document.body.dataset.at = v; if (v === "crew") crew(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="wall">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function crew() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = C.coins);
    $("modes").innerHTML = Object.entries(CF.modes).map(([id, m], i) => `<button class="sticker ${i ? "pink" : "lime"} mode" data-m="${id}">${m.name.toUpperCase()}<small>${m.desc}</small><em>BEST ${C.best[id] || 0}</em></button>`).join("");
  }
  $("modes").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { Sound.sfx("spray"); play(b.dataset.m); } });

  function play(m) {
    close(); current = m; extended = false; at("play");
    Game.start(m, CF.balls.find(b => b.id === C.ball)); Sound.muffle(false);
    $("h-clock-box").hidden = !CF.modes[m].time; $("h-fire").hidden = true;
    $("h-how").classList.toggle("show", !C.shotTip);
  }
  Game.on("hud", () => { $("h-score").textContent = Game.score; $("h-streak").textContent = Game.streak; if (Game.shots > 0 && !C.shotTip) { C.shotTip = true; keep(); $("h-how").classList.remove("show"); } });
  Game.on("clock", t => { $("h-clock").textContent = Math.ceil(t); $("h-clock-box").classList.toggle("hot", t <= 10); });
  Game.on("fire", on => $("h-fire").hidden = !on);
  Game.on("over", r => {
    C.plays++; C.coins += r.coins; const best = r.score > (C.best[r.mode] || 0); if (best) C.best[r.mode] = r.score; keep();
    const pct = r.shots ? Math.round(r.made / r.shots * 100) : 0;
    const m = modal(`<h3>${best ? "NEW BEST!" : r.mode === "streak" ? "BRICK!" : "BUZZER!"}</h3><div class="big">${r.score}</div><p>${r.made}/${r.shots} made · ${pct}% · +${r.coins} 🪙</p>
      <div class="acts">${extended ? "" : `<button class="sticker lime wide" id="o-more">▶ WATCH AD · ${r.mode === "streak" ? "ONE MORE LIFE" : "+15 SECONDS"}</button>`}<button class="sticker" id="o-crew">CREW</button><button class="sticker pink" id="o-again">AGAIN</button></div>`);
    const more = m.querySelector("#o-more"); if (more) more.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; extended = true; C.coins -= r.coins; keep(); close(); Game.extend(15); });
    const gate = fn => (C.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#o-crew").onclick = () => gate(() => { close(); Game.quit(); at("crew"); });
    m.querySelector("#o-again").onclick = () => gate(() => play(current));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>TIMEOUT</h3><div class="acts"><button class="sticker lime wide" id="p-go">BACK IN</button><button class="sticker" id="p-re">RESTART</button><button class="sticker pink" id="p-q">QUIT</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-re").onclick = () => play(current);
    m.querySelector("#p-q").onclick = () => { close(); Game.quit(); Sound.muffle(false); at("crew"); };
  }
  $("h-pause").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "play" && Game.state === "play") pause(); });
  function balls() {
    const m = modal(`<h3>BALLS</h3><p>🪙 ${C.coins}</p><div class="balls">${CF.balls.map(b => { const own = C.owned.includes(b.id); return `<button data-b="${b.id}" class="${C.ball === b.id ? "on" : ""}" ${!own && C.coins < b.price ? "disabled" : ""}><i style="background:radial-gradient(circle at 35% 30%, #fff 0 8%, ${b.base} 30%)"></i>${own ? b.name.toUpperCase() : "🪙 " + b.price}</button>`; }).join("")}</div><button class="sticker" id="b-x">DONE</button>`);
    m.querySelector(".balls").onclick = e => { const el = e.target.closest("[data-b]"); if (!el || el.disabled) return; const b = CF.balls.find(x => x.id === el.dataset.b); if (!C.owned.includes(b.id)) { C.coins -= b.price; C.owned.push(b.id); Sound.sfx("spray"); } C.ball = b.id; keep(); balls(); crew(); };
    m.querySelector("#b-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>SETTINGS</h3><button class="opt" id="o-s">SOUND <b>${C.sfx ? "ON" : "OFF"}</b></button><button class="opt" id="o-m">BEAT <b>${C.music ? "ON" : "OFF"}</b></button><button class="opt" id="o-r">WIPE THE WALL <b>—</b></button><button class="sticker lime" id="o-x">DONE</button>`);
    m.querySelector("#o-s").onclick = e => { C.sfx = !C.sfx; Sound.setSfx(C.sfx); e.currentTarget.querySelector("b").textContent = C.sfx ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-m").onclick = e => { C.music = !C.music; Sound.setMusic(C.music); e.currentTarget.querySelector("b").textContent = C.music ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } C = fresh(); keep(); b.textContent = "DONE"; crew(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline.toUpperCase(); document.title = CF.title;
  Sound.setSfx(C.sfx); Sound.setMusic(C.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("c-balls").onclick = () => { Sound.sfx("spray"); balls(); };
  $("c-settings").onclick = () => { Sound.sfx("spray"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "play" && $("modal").hidden && Game.state === "play") pause(); });
  at("crew");
  return { play, get crew() { return C; } };
})();
