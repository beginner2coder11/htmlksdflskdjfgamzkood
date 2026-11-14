/* LANE RUSH — garage, modes, HUD, missions, records, sheets, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "garage";
  const fresh = () => ({ coins: 0, owned: ["bean"], car: "bean", mode: "endless", best: { endless: 0, twoway: 0 }, far: { endless: 0, twoway: 0 }, mis: [], tiers: {}, runs: 0, sfx: true, music: true, hinted: false });
  let G = fresh();
  try { G = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} };
  let view = CF.cars.findIndex(c => c.id === G.car), revived = false, spin = 0;

  /* ---------- missions ---------- */
  function fillMissions() {
    while (G.mis.length < 3) {
      const pool = CF.missions.filter(m => !G.mis.some(x => x.id === m.id));
      const m = pool[Math.floor(Math.random() * pool.length)], tier = Math.min(m.n.length - 1, G.tiers[m.id] || 0);
      G.mis.push({ id: m.id, n: m.n[tier], reward: m.reward[tier], done: false });
    }
  }
  const mText = m => CF.missions.find(x => x.id === m.id).text.replace("{n}", m.n);
  function checkMissions(r) {
    const val = { dist: r.dist, near: r.near, coins: r.coins, nitro: r.boost, two: r.mode === "twoway" ? r.dist : 0 };
    const done = [];
    G.mis.forEach(m => { if (!m.done && val[m.id] >= m.n) { m.done = true; done.push(m); } });
    return done;
  }
  function claim(i) {
    const m = G.mis[i]; if (!m || !m.done) return;
    G.coins += m.reward; G.tiers[m.id] = (G.tiers[m.id] || 0) + 1; G.mis.splice(i, 1); fillMissions(); keep(); Sound.sfx("mission"); missions(); paint();
  }

  /* ---------- garage ---------- */
  function paint() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = G.coins);
    const c = CF.cars[view], own = G.owned.includes(c.id);
    $("car-name").textContent = c.name;
    const bar = (lbl, v, min, max) => `<span>${lbl}</span><i><b style="width:${Math.round((v - min) / (max - min) * 80 + 20)}%"></b></i>`;
    $("car-meters").innerHTML = bar("Grip", c.grip, 1, 1.3) + bar("Top speed", c.top, 1, 1.18) + bar("Nitro tank", c.tank, 1, 1.35);
    const btn = $("car-action");
    btn.textContent = own ? (G.car === c.id ? "Drive!" : "Pick & drive") : `Buy 🪙 ${c.price}`;
    btn.disabled = !own && G.coins < c.price;
    document.querySelectorAll(".mode").forEach(b => b.classList.toggle("on", b.dataset.mode === G.mode));
    $("m-dot").hidden = !G.mis.some(m => m.done);
  }
  (function turntable() { spin += 0.012; if (document.body.dataset.at === "garage") Game.paintCar($("car-view"), CF.cars[view], Math.sin(spin) * 0.5 + spin * 0.4); requestAnimationFrame(turntable); })();
  $("car-prev").onclick = () => { view = (view + CF.cars.length - 1) % CF.cars.length; Sound.sfx("tap"); paint(); };
  $("car-next").onclick = () => { view = (view + 1) % CF.cars.length; Sound.sfx("tap"); paint(); };
  $("car-action").onclick = () => {
    const c = CF.cars[view];
    if (!G.owned.includes(c.id)) { if (G.coins < c.price) return; G.coins -= c.price; G.owned.push(c.id); Sound.sfx("mission"); keep(); paint(); return; }
    G.car = c.id; keep(); drive();
  };
  document.querySelectorAll(".mode").forEach(b => b.onclick = () => { G.mode = b.dataset.mode; keep(); Sound.sfx("tap"); paint(); });

  /* ---------- driving ---------- */
  function sheet(html) { const s = $("sheet"); s.innerHTML = `<div class="card">${html}</div>`; s.hidden = false; return s.firstElementChild; }
  function close() { $("sheet").hidden = true; $("sheet").innerHTML = ""; }
  function drive() {
    close(); revived = false; document.body.dataset.at = "drive";
    Game.start(G.mode, CF.cars.find(c => c.id === G.car)); Sound.muffle(false);
    $("g-hint").hidden = G.hinted; if (!G.hinted) { G.hinted = true; keep(); setTimeout(() => $("g-hint").hidden = true, 5000); }
  }
  Game.on("tick", () => {
    $("g-dist").textContent = Game.metres; $("g-score").textContent = Game.score; $("g-coins").textContent = Game.coins;
    const n = $("g-nitro"); $("g-nitro-ring").style.strokeDashoffset = 276.5 * (1 - Game.nitro);
    n.classList.toggle("on", Game.boosting); n.classList.toggle("full", Game.nitro >= 1 && !Game.boosting);
    const pw = []; if (Game.shield > 0) pw.push(`🛡 ${Game.shield.toFixed(0)}s`); if (Game.magnet > 0) pw.push(`🧲 ${Game.magnet.toFixed(0)}s`);
    $("g-powers").innerHTML = pw.map(p => `<span>${p}</span>`).join("");
    const cb = $("g-combo"); if (Game.combo > 1) { if (cb.hidden || cb.dataset.n != Game.combo) { cb.textContent = `${Game.combo}× combo!`; cb.dataset.n = Game.combo; cb.hidden = false; cb.style.animation = "none"; void cb.offsetWidth; cb.style.animation = ""; } } else cb.hidden = true;
  });
  Game.on("area", a => { const e = $("g-area"); e.textContent = "Welcome to " + a.name; e.hidden = false; e.style.animation = "none"; void e.offsetWidth; e.style.animation = ""; clearTimeout(e.t); e.t = setTimeout(() => e.hidden = true, 2200); });
  Game.on("pauseKey", () => { if ($("sheet").hidden && document.body.dataset.at === "drive" && Game.state !== "over") pause(); });
  const nb = $("g-nitro");
  nb.addEventListener("pointerdown", e => { e.stopPropagation(); Game.setNitro(true); });
  nb.addEventListener("pointerup", () => Game.setNitro(false)); nb.addEventListener("pointerleave", () => Game.setNitro(false));
  $("g-pause").onclick = () => pause();
  function pause() {
    Game.pause(); Sound.muffle(true);
    const c = sheet(`<h3>Pit stop</h3><div class="acts"><button class="puff go wide" id="p-go">Back on the road</button><button class="puff" id="p-re">Restart</button><button class="puff" id="p-gar">Garage</button></div>`);
    c.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    c.querySelector("#p-re").onclick = drive;
    c.querySelector("#p-gar").onclick = () => { close(); Game.quit(); garage(); };
  }
  Game.on("over", r => {
    const newBest = r.score > (G.best[r.mode] || 0);
    G.best[r.mode] = Math.max(G.best[r.mode] || 0, r.score); G.far[r.mode] = Math.max(G.far[r.mode] || 0, r.dist);
    G.coins += r.coins; G.runs++;
    const done = checkMissions(r); keep();
    const c = sheet(`<h3>${newBest ? "New best!" : "Crashed!"}</h3>
      <div class="nums"><div class="${newBest ? "best" : ""}"><small>score</small><b>${r.score}</b></div><div><small>metres</small><b>${r.dist}</b></div><div><small>near misses</small><b>${r.near}</b></div><div><small>coins</small><b id="o-c">+${r.coins}</b></div></div>
      ${done.length ? `<p>🎯 Mission done: ${done.map(mText).join(", ")} — claim it in Missions</p>` : ""}
      <div class="acts">${revived ? "" : `<button class="puff ad wide" id="o-rev">▶ Watch ad · keep driving</button>`}<button class="puff ad wide" id="o-dbl">▶ Double coins</button><button class="puff" id="o-gar">Garage</button><button class="puff go" id="o-again">Again!</button></div>`);
    const rv = c.querySelector("#o-rev"); if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; G.coins -= r.coins; keep(); close(); Game.revive(); });
    c.querySelector("#o-dbl").onclick = e => { e.target.disabled = true; Ads.showRewarded().then(ok => { if (ok) { G.coins += r.coins; keep(); c.querySelector("#o-c").textContent = "+" + r.coins * 2; Sound.sfx("coin"); } }); };
    const gate = fn => (G.runs % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#o-again").onclick = () => gate(drive);
    c.querySelector("#o-gar").onclick = () => gate(() => { close(); Game.quit(); garage(); });
  });
  function garage() { document.body.dataset.at = "garage"; Sound.muffle(false); Game.start("endless", CF.cars[0], true); paint(); }

  /* ---------- sheets ---------- */
  function missions() {
    fillMissions(); keep();
    const c = sheet(`<h3>Missions</h3>${G.mis.map((m, i) => `<div class="mission ${m.done ? "done" : ""}"><span style="flex:1"><b>${mText(m)}</b><div class="bar2"><i style="width:${m.done ? 100 : 0}%"></i></div></span>${m.done ? `<button class="puff go" data-claim="${i}">Claim 🪙${m.reward}</button>` : `<span class="rw">🪙 ${m.reward}</span>`}</div>`).join("")}<p>Missions count one run at a time.</p><button class="puff" id="m-x">Close</button>`);
    c.addEventListener("click", e => { const b = e.target.closest("[data-claim]"); if (b) claim(+b.dataset.claim); });
    c.querySelector("#m-x").onclick = close;
  }
  function records() {
    const c = sheet(`<h3>Records</h3><div class="nums"><div><small>endless best</small><b>${G.best.endless}</b></div><div><small>endless farthest</small><b>${G.far.endless} m</b></div><div><small>two-way best</small><b>${G.best.twoway}</b></div><div><small>two-way farthest</small><b>${G.far.twoway} m</b></div></div><p>${G.runs} runs · ${G.owned.length}/${CF.cars.length} cars</p>
      <button class="opt" id="r-s">Sound <b>${G.sfx ? "on" : "off"}</b></button><button class="opt" id="r-m">Lo-fi radio <b>${G.music ? "on" : "off"}</b></button><button class="puff" id="r-x">Close</button>`);
    c.querySelector("#r-s").onclick = e => { G.sfx = !G.sfx; Sound.setSfx(G.sfx); e.currentTarget.querySelector("b").textContent = G.sfx ? "on" : "off"; keep(); };
    c.querySelector("#r-m").onclick = e => { G.music = !G.music; Sound.setMusic(G.music); e.currentTarget.querySelector("b").textContent = G.music ? "on" : "off"; keep(); };
    c.querySelector("#r-x").onclick = close;
  }
  function settings() {
    const c = sheet(`<h3>Settings</h3><button class="opt" id="t-s">Sound <b>${G.sfx ? "on" : "off"}</b></button><button class="opt" id="t-m">Lo-fi radio <b>${G.music ? "on" : "off"}</b></button><button class="opt" id="t-r">Reset garage <b>!</b></button><button class="puff go" id="t-x">Done</button>`);
    c.querySelector("#t-s").onclick = e => { G.sfx = !G.sfx; Sound.setSfx(G.sfx); e.currentTarget.querySelector("b").textContent = G.sfx ? "on" : "off"; keep(); };
    c.querySelector("#t-m").onclick = e => { G.music = !G.music; Sound.setMusic(G.music); e.currentTarget.querySelector("b").textContent = G.music ? "on" : "off"; keep(); };
    c.querySelector("#t-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } G = fresh(); fillMissions(); keep(); view = 0; close(); paint(); };
    c.querySelector("#t-x").onclick = close;
  }
  $("s-missions").onclick = () => { Sound.sfx("tap"); missions(); };
  $("s-records").onclick = () => { Sound.sfx("tap"); records(); };
  $("s-settings").onclick = () => { Sound.sfx("tap"); settings(); };

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(G.sfx); Sound.setMusic(G.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "drive" && $("sheet").hidden && Game.state === "play") pause(); });
  fillMissions(); keep(); paint();
  // the road keeps scrolling behind the garage as an attract mode
  Game.start("endless", CF.cars[0], true);
  return { drive, garage, missions, get data() { return G; } };
})();
