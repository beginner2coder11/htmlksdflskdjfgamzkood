/* HOOK & REEL — dock (upgrades), HUD, haul results, fish log, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "tackle";
  const fresh = () => ({ coins: 0, up: { line: 0, hooks: 0, reel: 0, lure: 0 }, seen: [], deepest: 0, trips: 0, sfx: true, music: true });
  let T = fresh();
  try { T = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); } catch (e) {} };
  let doubled = false;

  function at(v) { document.body.dataset.at = v; if (v === "dock") { Game.dock(); dock(); } }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="scroll">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function dock() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = T.coins);
    $("ups").innerHTML = CF.upgrades.map(u => { const lv = T.up[u.id] || 0, max = lv >= u.max, cost = u.cost[lv]; return `<button class="up" data-u="${u.id}" ${max || T.coins < cost ? "disabled" : ""}><b>${u.name}</b><span class="lv">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</span><small>${u.desc}</small><em>${max ? "MAX" : "● " + cost}</em></button>`; }).join("");
  }
  $("ups").addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (!b || b.disabled) return; const u = CF.upgrades.find(x => x.id === b.dataset.u), lv = T.up[u.id] || 0; T.coins -= u.cost[lv]; T.up[u.id] = lv + 1; keep(); Sound.sfx("buy"); dock(); });
  function cast() { close(); doubled = false; at("sea"); Game.cast(T.up); Sound.muffle(false); }
  Game.on("hud", () => { $("h-catch").textContent = `${Game.caught.length}/${Game.cap}`; $("h-phase").textContent = Game.state === "drop" ? "DOWN ↓" : Game.state === "reel" ? "UP ↑ SNAG!" : "HAUL"; });
  Game.on("tick", () => { $("h-depth").textContent = Math.max(0, Math.round(Game.depth)) + " m"; });
  Game.on("species", id => { if (!T.seen.includes(id)) { T.seen.push(id); keep(); } });
  Game.on("haul", r => {
    T.trips++; T.coins += r.coins; T.deepest = Math.max(T.deepest, r.deepest); keep();
    const m = modal(`<h3>The catch</h3><div class="big">● ${r.coins}</div><div class="catch">${r.fish.length ? r.fish.map(f => `<span class="${f.rare ? "rare" : ""}">${f.name}</span>`).join("") : "<span>nothing this time</span>"}</div><p>deepest ${r.deepest} m · best ever ${T.deepest} m</p>
      <div class="acts">${r.coins ? `<button class="stamp paper wide" id="h-x2">▶ WATCH AD · DOUBLE COINS</button>` : ""}<button class="stamp paper" id="h-dock">DOCK</button><button class="stamp" id="h-again">CAST AGAIN</button></div>`);
    const x2 = m.querySelector("#h-x2"); if (x2) x2.onclick = () => { if (doubled) return; doubled = true; x2.disabled = true; Ads.showRewarded().then(ok => { if (ok) { T.coins += r.coins; keep(); m.querySelector(".big").textContent = "● " + r.coins * 2; Sound.sfx("coin"); } }); };
    for (let i = 0; i < Math.min(12, r.fish.length); i++) setTimeout(() => Sound.sfx("coin"), 100 + i * 70);
    const gate = fn => (T.trips % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#h-dock").onclick = () => gate(() => { close(); at("dock"); });
    m.querySelector("#h-again").onclick = () => gate(cast);
  });
  function pause() {
    if (Game.state === "dock" || Game.state === "haul") return; Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>Resting the line</h3><div class="acts"><button class="stamp wide" id="p-go">KEEP FISHING</button><button class="stamp paper wide" id="p-dock">BACK TO THE DOCK</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-dock").onclick = () => { close(); Game.resume(); Sound.muffle(false); at("dock"); };
  }
  $("h-pause").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "sea") pause(); });
  function log() {
    const m = modal(`<h3>Fish log</h3><p>${T.seen.length}/${CF.fish.length} species · ${T.trips} trips</p>${CF.fish.map(f => T.seen.includes(f.id) ? `<div class="logrow"><b>${f.name}</b><span>${f.from}–${f.to} m · ● ${f.value}</span></div>` : `<div class="logrow no"><b>? ? ?</b><span>${f.from}–${f.to} m</span></div>`).join("")}<button class="stamp" id="l-x">CLOSE</button>`);
    m.querySelector("#l-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>Settings</h3><button class="opt" id="o-s">SOUND <b>${T.sfx ? "on" : "off"}</b></button><button class="opt" id="o-m">FLUTE <b>${T.music ? "on" : "off"}</b></button><button class="opt" id="o-r">SELL THE BOAT (reset) <b>—</b></button><button class="stamp" id="o-x">DONE</button>`);
    m.querySelector("#o-s").onclick = e => { T.sfx = !T.sfx; Sound.setSfx(T.sfx); e.currentTarget.querySelector("b").textContent = T.sfx ? "on" : "off"; keep(); };
    m.querySelector("#o-m").onclick = e => { T.music = !T.music; Sound.setMusic(T.music); e.currentTarget.querySelector("b").textContent = T.music ? "on" : "off"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } T = fresh(); keep(); b.textContent = "done"; dock(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(T.sfx); Sound.setMusic(T.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("d-cast").onclick = () => { Sound.sfx("tap"); cast(); };
  $("d-log").onclick = () => { Sound.sfx("tap"); log(); };
  $("d-free").onclick = () => Ads.showRewarded().then(ok => { if (ok) { T.coins += 40; keep(); Sound.sfx("coin"); dock(); } });
  $("d-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "sea" && $("modal").hidden) pause(); });
  at("dock");
  return { cast, get tackle() { return T; } };
})();
