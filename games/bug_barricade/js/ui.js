/* BUG BARRICADE — cover, map picker, HUD, build/tower popover, bug book, modals, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, T = CF.towers, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "notes";
  const fresh = () => ({ stars: {}, best: {}, sfx: true, music: true, plays: 0, seen: [] });
  let N = fresh();
  try { N = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(N)); } catch (e) {} };
  let revived = false, chosen = null;

  const view = v => { document.body.dataset.v = v; };
  function toast(t) { const e = document.createElement("div"); e.className = "toast"; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 1500); }
  function banner(t) { const b = $("banner"); b.textContent = t; b.hidden = false; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; clearTimeout(b.t); b.t = setTimeout(() => b.hidden = true, 1800); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function shut() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  const starsTotal = () => Object.values(N.stars).reduce((a, b) => a + b, 0);

  /* ---------- maps ---------- */
  function maps() {
    $("m-stars").textContent = starsTotal();
    $("maplist").innerHTML = CF.maps.map((m, i) => {
      const locked = m.unlock && !N.stars[m.unlock - 1];
      return `<button class="mapcard ${locked ? "locked" : ""}" data-map="${i}" ${locked ? "disabled" : ""}><canvas width="92" height="128"></canvas><span><b>${m.name}</b><small>${locked ? "Finish " + CF.maps[m.unlock - 1].name + " to unlock" : `${CF.wavesPerMap} waves · best wave ${N.best[i] || 0}`}</small><div class="st">${"★".repeat(N.stars[i] || 0)}${"☆".repeat(3 - (N.stars[i] || 0))}</div></span></button>`;
    }).join("");
    // tiny path previews
    $("maplist").querySelectorAll("canvas").forEach((c, i) => {
      const x = c.getContext("2d"), s = 92 / 10; x.fillStyle = CF.maps[i].paper; x.fillRect(0, 0, 92, 128);
      x.strokeStyle = "#c4a06e"; x.lineWidth = s * 0.8; x.lineJoin = "round"; x.beginPath();
      CF.maps[i].path.forEach(([cc, r], k) => { const px = cc * s + s / 2, py = r * s * 128 / 129 + s / 2; k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    });
    view("maps");
  }
  $("maplist").addEventListener("click", e => { const b = e.target.closest("[data-map]"); if (b && !b.disabled) { Sound.sfx("tap"); play(+b.dataset.map); } });

  /* ---------- game ---------- */
  function play(i) { shut(); closePop(); revived = false; view("game"); Game.start(i); Sound.muffle(false); hud(); banner(CF.maps[i].name + " — build, then send the bugs!"); }
  function hud() {
    $("h-lives").textContent = Game.lives; $("h-coins").textContent = Game.coins; $("h-wave").textContent = `${Game.wave}/${CF.wavesPerMap}`;
    $("h-lives").parentElement.classList.toggle("warn", Game.lives <= 5);
    const w = $("d-wave"), last = Game.wave >= CF.wavesPerMap;
    w.disabled = Game.waveActive || last;
    w.textContent = last ? "Final wave!" : Game.waveActive ? "Bugs incoming…" : Game.bugs.length ? `Call wave ${Game.wave + 1} early +${CF.earlyCallBonus}` : `Send wave ${Game.wave + 1} →`;
    $("d-speed").textContent = `▶ ${Game.speed}×`;
    if (!$("pop").hidden && $("pop").dataset.kind === "tower") towerPop();
    if (!$("pop").hidden && $("pop").dataset.kind === "build") buildPop();
  }
  Game.on("hud", hud);
  Game.on("float", d => toast(d.text));
  Game.on("banner", banner);
  Game.on("leak", () => { document.body.animate([{ background: "#ffe1dc" }, { background: "" }], 300); });
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.v === "game") pause(); });
  $("d-wave").onclick = () => { Sound.sfx("tap"); if (Game.sendWave()) { const types = [...new Set(Game.waveList(Game.wave).map(q => q.type))]; types.forEach(t => { if (!N.seen.includes(t)) { N.seen.push(t); keep(); toast("New bug in the Bug book: " + CF.bugs[t].name); } }); } closePop(); };
  $("d-speed").onclick = () => { Game.setSpeed(Game.speed === 3 ? 1 : Game.speed + 1); Sound.sfx("tap"); hud(); };
  $("h-pause").onclick = () => pause();

  /* ---------- popover ---------- */
  let popAt = null;
  function place(sx, sy) {
    const p = $("pop"), w = 260, h = p.offsetHeight || 180;
    let x = Math.max(8, Math.min(innerWidth - w - 8, sx - w / 2)), y = sy - h - 24; if (y < 70) y = sy + 34;
    p.style.left = x + "px"; p.style.top = Math.min(innerHeight - h - 80, y) + "px";
  }
  function buildPop() {
    const p = $("pop"); p.dataset.kind = "build";
    const pick = chosen && T[chosen];
    p.innerHTML = `<h4>Build here <span>🪙${Game.coins}</span></h4><div class="list">${Object.entries(T).map(([id, t]) => `<button class="tw ${Game.coins < t.cost[0] ? "no" : ""} ${chosen === id ? "pick" : ""}" data-tw="${id}">${t.icon}<small>${t.cost[0]}</small></button>`).join("")}</div>
      ${pick ? `<p><b>${pick.name}</b> — ${pick.desc}</p><div class="row"><button class="doodle" id="p-x">Cancel</button><button class="doodle go" id="p-build" ${Game.coins < pick.cost[0] ? "disabled" : ""}>Build 🪙${pick.cost[0]}</button></div>` : `<p>Tap a doodle to see what it does.</p>`}`;
    p.hidden = false; place(...popAt);
  }
  function towerPop() {
    const p = $("pop"), t = popAt.tower; p.dataset.kind = "tower";
    const d = T[t.type], next = t.lvl < 2 ? d.cost[t.lvl + 1] : null, s = k => Game.stat(t, k);
    const nx = k => t.lvl < 2 ? ` → ${d[k][t.lvl + 1]}` : "";
    p.innerHTML = `<h4>${d.icon} ${d.name} <span>Lv ${t.lvl + 1}</span></h4>
      <div class="stats"><span>Range</span><b>${s("range")}${nx("range")}</b>${d.kind !== "slow" ? `<span>Damage</span><b>${s("dmg")}${nx("dmg")}</b><span>Every</span><b>${s("rate")}s${t.lvl < 2 ? " → " + d.rate[t.lvl + 1] + "s" : ""}</b>` : `<span>Slow</span><b>${Math.round(s("slow") * 100)}%${t.lvl < 2 ? " → " + Math.round(d.slow[t.lvl + 1] * 100) + "%" : ""}</b>`}<span>Hits</span><b>${d.targets === "all" ? "ground + flying" : "ground only"}</b></div>
      <div class="row" style="margin-top:8px"><button class="doodle" id="p-sell">Sell 🪙${Math.floor(t.spent * CF.sellBack)}</button>${next ? `<button class="doodle go" id="p-up" ${Game.coins < next ? "disabled" : ""}>Upgrade 🪙${next}</button>` : `<button class="doodle" disabled>Max level</button>`}</div>`;
    p.hidden = false; place(popAt.sx, popAt.sy);
  }
  function closePop() { $("pop").hidden = true; chosen = null; popAt = null; Game.deselect(); }
  Game.on("select", s => {
    if (!s) { closePop(); return; }
    if (s.tower) { popAt = { tower: s.tower, sx: s.sx, sy: s.sy }; towerPop(); }
    else { popAt = [s.sx, s.sy]; popAt.cell = s.cell; chosen = null; buildPop(); }
  });
  $("pop").addEventListener("click", e => {
    const tw = e.target.closest("[data-tw]");
    if (tw) { chosen = tw.dataset.tw; Game.previewRange(popAt.cell, chosen); Sound.sfx("tap"); buildPop(); return; }
    if (e.target.closest("#p-x")) { closePop(); return; }
    if (e.target.closest("#p-build")) { if (Game.build(chosen, ...popAt.cell)) closePop(); return; }
    if (e.target.closest("#p-sell")) { Game.sell(popAt.tower); closePop(); return; }
    if (e.target.closest("#p-up")) { Game.upgrade(popAt.tower); towerPop(); }
  });

  /* ---------- results ---------- */
  Game.on("won", r => {
    N.stars[r.map] = Math.max(N.stars[r.map] || 0, r.stars); N.best[r.map] = CF.wavesPerMap; N.plays++; keep();
    const c = modal(`<h3>Picnic saved!</h3><div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "on" : ""}" style="animation-delay:${.2 + i * .25}s">⭐</span>`).join("")}</div>
      <p>${r.lives} sandwiches left. ${CF.maps[r.map + 1] ? CF.maps[r.map + 1].name + " is open!" : "You beat every map!"}</p>
      <div class="row"><button class="doodle" id="r-cover">Cover</button><button class="doodle go" id="r-maps">Maps →</button></div>`);
    const gate = fn => (N.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#r-cover").onclick = () => gate(() => { shut(); Game.quit(); view("cover"); });
    c.querySelector("#r-maps").onclick = () => gate(() => { shut(); Game.quit(); maps(); });
  });
  Game.on("lost", r => {
    N.best[r.map] = Math.max(N.best[r.map] || 0, r.wave - 1); N.plays++; keep();
    const c = modal(`<h3>The bugs ate lunch!</h3><p>You held out until wave ${r.wave}.</p>
      ${revived ? "" : `<button class="doodle go" id="r-rev">▶ Watch ad · +5 sandwiches</button>`}
      <div class="row"><button class="doodle" id="r-maps">Maps</button><button class="doodle" id="r-again">Try again</button></div>`);
    const rv = c.querySelector("#r-rev");
    if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; shut(); Game.revive(); });
    const gate = fn => (N.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    c.querySelector("#r-maps").onclick = () => gate(() => { shut(); Game.quit(); maps(); });
    c.querySelector("#r-again").onclick = () => gate(() => play(r.map));
  });
  function pause() {
    closePop(); Game.pause(); Sound.muffle(true);
    const c = modal(`<h3>Paused</h3><button class="doodle go" id="z-go">Keep defending</button><button class="doodle" id="z-coins">▶ Watch ad · +60 coins</button><div class="row"><button class="doodle" id="z-re">Restart</button><button class="doodle" id="z-q">Quit</button></div>`);
    c.querySelector("#z-go").onclick = () => { shut(); Game.resume(); Sound.muffle(false); };
    c.querySelector("#z-coins").onclick = e => { e.target.disabled = true; Ads.showRewarded().then(ok => { if (ok) { Game.coins += 60; Sound.sfx("coin"); } }); };
    c.querySelector("#z-re").onclick = () => play(Game.mapIdx);
    c.querySelector("#z-q").onclick = () => { shut(); Game.quit(); Sound.muffle(false); maps(); };
  }

  /* ---------- bug book + settings ---------- */
  const bugEmoji = { ant: "🐜", lady: "🐞", beetle: "🪲", bee: "🐝", cater: "🐛", queen: "👑" };
  function bugbook() {
    const c = modal(`<h3>Bug book</h3>${Object.entries(CF.bugs).map(([id, b]) => N.seen.includes(id) ? `<div class="bugrow"><span class="e">${bugEmoji[id]}</span><span><b>${b.name}</b><small>${b.flying ? "Flies over honey and swatters. " : ""}${b.armor ? "Armour blocks " + b.armor + " damage per hit. " : ""}${b.splits ? "Splits into two ants. " : ""}${b.boss ? "Boss: eats " + b.lives + " sandwiches." : ""}Speed ${b.speed}, worth ${b.coins} coins.</small></span></div>` : `<div class="bugrow"><span class="e">❔</span><span><b>???</b><small>Not spotted yet.</small></span></div>`).join("")}<button class="doodle go" id="b-x">Close</button>`);
    c.querySelector("#b-x").onclick = shut;
  }
  function settings() {
    const c = modal(`<h3>Settings</h3><button class="opt" id="o-s">Sound effects <b>${N.sfx ? "on" : "off"}</b></button><button class="opt" id="o-m">Toy-piano march <b>${N.music ? "on" : "off"}</b></button><button class="opt" id="o-r">Erase notebook <b>!</b></button><button class="doodle go" id="o-x">Done</button>`);
    c.querySelector("#o-s").onclick = e => { N.sfx = !N.sfx; Sound.setSfx(N.sfx); e.currentTarget.querySelector("b").textContent = N.sfx ? "on" : "off"; keep(); };
    c.querySelector("#o-m").onclick = e => { N.music = !N.music; Sound.setMusic(N.music); e.currentTarget.querySelector("b").textContent = N.music ? "on" : "off"; keep(); };
    c.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } N = fresh(); keep(); b.textContent = "erased"; };
    c.querySelector("#o-x").onclick = shut;
  }

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(N.sfx); Sound.setMusic(N.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("c-play").onclick = () => { Sound.sfx("tap"); maps(); };
  $("c-bugbook").onclick = () => { Sound.sfx("tap"); bugbook(); };
  $("c-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.querySelectorAll("[data-cover]").forEach(b => b.onclick = () => { Sound.sfx("tap"); view("cover"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.v === "game" && $("modal").hidden && Game.state !== "over" && Game.state !== "won") pause(); });
  return { play, maps, bugbook, get notes() { return N; } };
})();
