/* BULLSEYE RIDGE — menu, HUD, stage grid, bows, results, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "log";
  const fresh = () => ({ coins: 0, stars: {}, bows: ["ash"], bow: "ash", trialBest: 0, plays: 0, sfx: true, music: true, tipped: false });
  let L = fresh();
  try { L = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };
  const next = () => Math.min(CF.stages, Object.keys(L.stars).length + 1);
  const bowNow = () => CF.bows.find(b => b.id === L.bow) || CF.bows[0];
  let extraUsed = false, lastMode = "stage", lastStage = 1;

  function at(s) { document.body.dataset.s = s; if (s === "menu") menu(); }
  function menu() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = L.coins);
    $("m-next").textContent = "Stage " + next(); $("m-stars").textContent = Object.values(L.stars).reduce((a, b) => a + b, 0) + " ★";
    $("m-trialbest").textContent = "best " + L.trialBest; $("m-bow").textContent = bowNow().name;
  }
  function sheet(html) { const s = $("sheet"); s.innerHTML = `<div class="panel">${html}</div>`; s.hidden = false; return s.firstElementChild; }
  function close() { $("sheet").hidden = true; $("sheet").innerHTML = ""; }

  /* ---------- play ---------- */
  function play(mode, n) {
    close(); extraUsed = false; lastMode = mode; lastStage = n; at("play");
    Game.begin(mode, n, bowNow()); Sound.muffle(false);
    $("h-tip").hidden = L.tipped;
  }
  Game.on("shot", s => {
    $("h-dist").textContent = `${s.dist} m · ${Game.mode === "trial" ? "trial · hit " + Game.trialHits : "pass " + Math.round(Game.curve("pass", Game.stage))}`;
    $("h-wind").textContent = Math.abs(s.wind).toFixed(1);
    $("h-wind-arrow").style.transform = `rotate(${s.wind < 0 ? 180 : 0}deg)`;
    $("h-wind-arrow").parentElement.parentElement.classList.toggle("strong", Math.abs(s.wind) > 4);
    hud();
  });
  function hud() {
    $("h-stage").textContent = Game.mode === "trial" ? "Wind trial" : "Stage " + Game.stage;
    $("h-points").textContent = Game.points;
    if (Game.mode === "trial") $("h-quiver").innerHTML = `<i></i><b style="font-size:13px;margin-left:6px">×${Game.trialHits}</b>`;
    else { const used = Game.shots; $("h-quiver").innerHTML = Array.from({ length: CF.arrowsPerStage }, (_, i) => `<i class="${i < used.length ? "used" : ""} ${used[i] >= 9 ? "hit" : ""}"></i>`).join(""); }
    if (Game.shots.length && !L.tipped) { L.tipped = true; keep(); $("h-tip").hidden = true; }
  }
  Game.on("hud", hud);
  Game.on("pauseKey", () => { if ($("sheet").hidden && document.body.dataset.s === "play") pause(); });
  const endsHtml = s => `<div class="ends">${s.map(v => `<span class="${v >= 10 ? "x" : v === 0 ? "m" : ""}">${v >= 10 ? "X" : v === 0 ? "M" : v}</span>`).join("")}</div>`;
  Game.on("stageOver", r => {
    L.plays++;
    let coins = r.points * CF.coinsPerPoint;
    if (r.ok) { const prev = L.stars[r.stage] || 0; L.stars[r.stage] = Math.max(prev, r.stars); coins += r.stars * CF.coinsPerStar; }
    L.coins += coins; keep();
    const p = sheet(`<h3><small>Stage ${r.stage}</small>${r.ok ? "Well shot." : "Not this time."}</h3>
      <div class="big">${r.points}<small> / 50 · pass ${r.pass}</small></div>${endsHtml(r.shots)}
      ${r.ok ? `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? "" : "off"}">★</span>`).join("")}</div>` : ""}
      <p>+${coins} coins</p>
      <div class="row">${!r.ok && !extraUsed ? `<button class="btn soft wide" id="r-more">▶ Watch ad · two more arrows</button>` : ""}<button class="btn" id="r-menu">Menu</button><button class="btn solid" id="r-go">${r.ok ? (r.stage < CF.stages ? "Next stage" : "Again") : "Retry"}</button></div>`);
    if (r.ok) for (let i = 0; i < r.stars; i++) setTimeout(() => Sound.sfx("star", i), 300 + i * 250);
    const gate = fn => (L.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    const more = p.querySelector("#r-more");
    if (more) more.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; extraUsed = true; L.coins -= coins; keep(); close(); Game.extraArrows(2); });
    p.querySelector("#r-menu").onclick = () => gate(() => { close(); Game.quit(); at("menu"); });
    p.querySelector("#r-go").onclick = () => gate(() => play("stage", r.ok ? Math.min(CF.stages, r.stage + 1) : r.stage));
  });
  Game.on("trialOver", r => {
    L.plays++; const best = r.hits > L.trialBest; L.trialBest = Math.max(L.trialBest, r.hits); L.coins += r.points; keep();
    const p = sheet(`<h3><small>Wind trial</small>${best ? "A new best." : "The wind won."}</h3><div class="big">${r.hits}<small> targets in a row</small></div><p>${r.points} points · +${r.points} coins · best ${L.trialBest}</p>
      <div class="row"><button class="btn" id="t-menu">Menu</button><button class="btn solid" id="t-go">Again</button></div>`);
    const gate = fn => (L.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    p.querySelector("#t-menu").onclick = () => gate(() => { close(); Game.quit(); at("menu"); });
    p.querySelector("#t-go").onclick = () => gate(() => play("trial", 1));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const p = sheet(`<h3><small>Paused</small>Take a breath.</h3><div class="row"><button class="btn solid wide" id="z-go">Continue</button><button class="btn" id="z-re">Restart</button><button class="btn" id="z-menu">Menu</button></div>`);
    p.querySelector("#z-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    p.querySelector("#z-re").onclick = () => play(lastMode, lastStage);
    p.querySelector("#z-menu").onclick = () => { close(); Game.quit(); Sound.muffle(false); at("menu"); };
  }
  $("h-pause").onclick = pause;

  /* ---------- menus ---------- */
  function stages() {
    const cur = next();
    let html = "", lastSeason = "";
    for (let n = 1; n <= CF.stages; n++) {
      const sn = CF.seasons[Math.floor((n - 1) / 10) % CF.seasons.length].name;
      if (sn !== lastSeason) { html += `<div class="season">${sn}</div>`; lastSeason = sn; }
      const s = L.stars[n] || 0;
      html += `<button data-st="${n}" class="${n === cur ? "cur" : ""}" ${n > cur ? "disabled" : ""}>${n}<i>${"★".repeat(s)}</i></button>`;
    }
    const p = sheet(`<h3><small>Choose</small>Stages</h3><div class="grid">${html}</div><button class="btn" id="s-x">Close</button>`);
    p.querySelector(".grid").onclick = e => { const b = e.target.closest("[data-st]"); if (b) { Sound.sfx("tap"); play("stage", +b.dataset.st); } };
    p.querySelector("#s-x").onclick = close;
  }
  function bowIcon(b) { return `<svg viewBox="0 0 44 44"><path d="M14 4 Q40 22 14 40" fill="none" stroke="${b.color}" stroke-width="3" stroke-linecap="round"/><path d="M14 4 L14 40" stroke="#3f4448" stroke-width="1"/></svg>`; }
  function bows() {
    const p = sheet(`<h3><small>${L.coins} coins</small>Bows</h3>${CF.bows.map(b => { const own = L.bows.includes(b.id); return `<button class="bow ${L.bow === b.id ? "on" : ""}" data-bow="${b.id}">${bowIcon(b)}<span><b>${b.name}</b><small>power ${Math.round(b.speed / 11.2)} · steadiness ${Math.round((1.1 - b.sway) * 100)} · guide ${Math.round(b.guide * 100)}</small></span><span class="act">${L.bow === b.id ? "in hand" : own ? "use" : b.price + " ◦"}</span></button>`; }).join("")}<button class="btn" id="b-x">Close</button>`);
    p.addEventListener("click", e => {
      const el = e.target.closest("[data-bow]"); if (!el) return;
      const b = CF.bows.find(x => x.id === el.dataset.bow);
      if (!L.bows.includes(b.id)) { if (L.coins < b.price) return; L.coins -= b.price; L.bows.push(b.id); Sound.sfx("coin"); }
      L.bow = b.id; keep(); bows(); menu();
    });
    p.querySelector("#b-x").onclick = close;
  }
  function settings() {
    const p = sheet(`<h3><small>Quiet please</small>Settings</h3><button class="opt" id="o-s">Sound<i>${L.sfx ? "on" : "off"}</i></button><button class="opt" id="o-m">Kalimba<i>${L.music ? "on" : "off"}</i></button><button class="opt" id="o-r">Reset progress<i>—</i></button><button class="btn solid" id="o-x">Done</button>`);
    p.querySelector("#o-s").onclick = e => { L.sfx = !L.sfx; Sound.setSfx(L.sfx); e.currentTarget.querySelector("i").textContent = L.sfx ? "on" : "off"; keep(); };
    p.querySelector("#o-m").onclick = e => { L.music = !L.music; Sound.setMusic(L.music); e.currentTarget.querySelector("i").textContent = L.music ? "on" : "off"; keep(); };
    p.querySelector("#o-r").onclick = e => { const i = e.currentTarget.querySelector("i"); if (i.textContent !== "sure?") { i.textContent = "sure?"; return; } L = fresh(); keep(); i.textContent = "done"; menu(); };
    p.querySelector("#o-x").onclick = close;
  }

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(L.sfx); Sound.setMusic(L.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("m-play").onclick = () => { Sound.sfx("tap"); play("stage", next()); };
  $("m-stages").onclick = () => { Sound.sfx("tap"); stages(); };
  $("m-trial").onclick = () => { Sound.sfx("tap"); play("trial", 1); };
  $("m-bows").onclick = () => { Sound.sfx("tap"); bows(); };
  $("m-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.s === "play" && $("sheet").hidden) pause(); });
  at("menu");
  return { play, stages, bows, get log() { return L; } };
})();
