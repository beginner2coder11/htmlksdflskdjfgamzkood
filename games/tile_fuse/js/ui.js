/* TILE FUSE — menu, HUD, tools, overlays, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, el = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "state";
  const base = () => ({ tokens: 30, best: {}, bestTile: 0, games: 0, sfx: true, music: true, daily: {}, saved: null });
  let S = base();
  try { S = Object.assign(base(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const store = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  let revived = false, overlayOpen = false;
  const today = () => new Date().toISOString().slice(0, 10);

  function at(view) { document.body.dataset.at = view; if (view === "menu") menu(); }
  function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1600); }
  function overlay(head, html) {
    const o = el("overlay"); o.innerHTML = `<div class="card"><header><span>${head}</span><span>TILE FUSE</span></header>${html}</div>`; o.hidden = false; overlayOpen = true; return o.firstElementChild;
  }
  function closeOverlay() { el("overlay").hidden = true; el("overlay").innerHTML = ""; overlayOpen = false; }

  /* ---------- menu ---------- */
  function menu() {
    el("m-tokens").textContent = S.tokens; el("m-best").textContent = S.bestTile; el("m-games").textContent = S.games;
    el("modes").innerHTML = CF.modes.map(m => {
      const done = m.daily && S.daily[today()] !== undefined;
      return `<li><button class="mode" data-mode="${m.id}"><span class="no">${m.code}</span><span class="nm">${m.name}<small>${m.desc}</small></span><span class="bt">BEST<b>${(m.daily ? S.daily[today()] : S.best[m.id]) || 0}</b>${done ? "PLAYED" : ""}</span></button></li>`;
    }).join("");
  }
  el("modes").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b) { Sound.sfx("tap"); start(b.dataset.mode); } });
  setInterval(() => { const d = new Date(); el("clock-now").textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }, 1000);

  /* ---------- play ---------- */
  function start(id) {
    closeOverlay(); revived = false;
    at("play"); Game.newGame(id);
    const m = Game.mode;
    el("g-mode").textContent = `MODE ${m.code} / ${m.name.toUpperCase()}`;
    el("g-goal").textContent = m.goal; el("g-clock-box").hidden = !m.time;
    el("g-best").textContent = S.best[m.id] || 0;
    Sound.muffle(false); hud();
  }
  function hud() {
    el("g-score").textContent = Game.score;
    el("g-best").textContent = Math.max(Game.score, S.best[Game.mode.id] || 0);
    el("t-undo-n").textContent = Game.undos > 0 ? "×" + Game.undos : CF.tools.undoPrice + " TK";
    el("t-smash-n").textContent = CF.tools.smashPrice + " TK · " + S.tokens + " LEFT";
    el("t-undo").disabled = !Game.history.length;
  }
  Game.on("hud", hud);
  Game.on("canPlay", () => document.body.dataset.at === "play" && !overlayOpen);
  Game.on("clock", t => { el("g-clock").textContent = Math.ceil(t); el("g-clock-box").classList.toggle("hot", t <= 10); });
  Game.on("bonusTime", s => { const p = el("g-plus"); p.textContent = "+" + s + "S"; p.parentElement === el("g-clock-box") || el("g-clock-box").appendChild(p); });
  Game.on("fused", f => {
    const p = el("g-plus"); el("g-score").parentElement.appendChild(p);
    p.textContent = "+" + f.points; p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
  });
  Game.on("combo", n => stamp(n >= 4 ? `${n}× FUSE!` : `${n}× COMBO`, 600));
  Game.on("goal", g => {
    stamp(`${g.tile} REACHED`, 1200);
    setTimeout(() => {
      const c = overlay("GOAL", `<h3>You made <em>${g.tile}</em>.</h3><div class="rows"><span>SCORE</span><b>${Game.score}</b><span>MOVES</span><b>${Game.moves}</b></div>
        <div class="acts"><button id="o-menu">MENU</button><button class="go" id="o-keep">KEEP GOING →</button></div>`);
      Game.pause();
      c.querySelector("#o-keep").onclick = () => { closeOverlay(); Game.resume(); };
      c.querySelector("#o-menu").onclick = () => { finish(); at("menu"); };
    }, 900);
  });
  function stamp(text, ms) { const s = el("stamp"); s.textContent = text; s.hidden = false; s.style.animation = "none"; void s.offsetWidth; s.style.animation = ""; clearTimeout(stamp.t); stamp.t = setTimeout(() => s.hidden = true, ms); }

  function finish() {
    if (Game.over && Game.finished) return;
    const m = Game.mode, sc = Game.score;
    S.best[m.id] = Math.max(S.best[m.id] || 0, sc);
    if (m.daily) S.daily[today()] = Math.max(S.daily[today()] || 0, sc);
    S.bestTile = Math.max(S.bestTile, Game.maxTile);
    Game.stop();
  }
  Game.on("over", r => {
    const earned = CF.tokensPerGame + Math.floor(r.maxTile / 2);
    S.games++; S.tokens += earned;
    const prevBest = S.best[r.mode] || 0;
    finish(); store();
    setTimeout(() => {
      const c = overlay(r.why === "time" ? "TIME" : "BOARD FULL", `<h3>${r.why === "time" ? "Time's<br><em>up.</em>" : "No moves<br><em>left.</em>"}</h3>
        <div class="rows"><span>SCORE</span><b>${r.score}${r.score > prevBest ? " ★" : ""}</b><span>TOP TILE</span><b>${r.maxTile}</b><span>MOVES</span><b>${r.moves}</b><span>TOKENS</span><b id="o-tk">+${earned}</b></div>
        <div class="acts">${revived ? "" : `<button class="sig" id="o-revive">▶ WATCH AD · CLEAR 3 TILES & CONTINUE</button>`}<button id="o-menu">MENU</button><button class="go" id="o-again">AGAIN →</button></div>`);
      const rv = c.querySelector("#o-revive");
      if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; closeOverlay(); Game.continueAfterOver(); });
      const gate = fn => (S.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      c.querySelector("#o-menu").onclick = () => gate(() => { closeOverlay(); at("menu"); });
      c.querySelector("#o-again").onclick = () => gate(() => start(r.mode));
    }, 500);
  });

  /* ---------- tools ---------- */
  el("t-undo").onclick = () => {
    if (Game.undos > 0) { Game.useUndo(); return; }
    if (S.tokens < CF.tools.undoPrice) { askTokens(); return; }
    S.tokens -= CF.tools.undoPrice; store(); Game.addUndo(1); Game.useUndo();
  };
  el("t-smash").onclick = () => {
    const btn = el("t-smash");
    if (btn.classList.contains("on")) { btn.classList.remove("on"); Game.armSmash(false); return; }
    if (S.tokens < CF.tools.smashPrice) { askTokens(); return; }
    btn.classList.add("on"); Game.armSmash(true); toast("TAP A TILE TO SMASH IT");
  };
  Game.on("smashed", () => { S.tokens -= CF.tools.smashPrice; store(); el("t-smash").classList.remove("on"); hud(); });
  el("t-new").onclick = () => {
    const c = overlay("RESET", `<h3>New<br><em>board?</em></h3><div class="acts"><button id="o-no">CANCEL</button><button class="go" id="o-yes">RESET →</button></div>`);
    c.querySelector("#o-no").onclick = closeOverlay;
    c.querySelector("#o-yes").onclick = () => { finish(); store(); start(Game.mode.id); };
  };
  function askTokens() {
    const c = overlay("TOKENS", `<h3>Out of<br><em>tokens.</em></h3><div class="rows"><span>YOU HAVE</span><b>${S.tokens} TK</b></div>
      <div class="acts"><button class="sig" id="o-ad">▶ WATCH AD · +20 TK</button><button id="o-x">CLOSE</button><button class="go" id="o-x2">OK</button></div>`);
    c.querySelector("#o-ad").onclick = () => Ads.showRewarded().then(ok => { if (ok) { S.tokens += 20; store(); hud(); } closeOverlay(); });
    c.querySelector("#o-x").onclick = c.querySelector("#o-x2").onclick = closeOverlay;
  }
  el("g-menu").onclick = () => {
    Game.pause(); Sound.muffle(true);
    const c = overlay("PAUSED", `<h3>Paused.</h3><div class="rows"><span>SCORE</span><b>${Game.score}</b></div><div class="acts"><button id="o-quit">QUIT TO MENU</button><button class="go" id="o-res">RESUME →</button></div>`);
    c.querySelector("#o-res").onclick = () => { closeOverlay(); Game.resume(); Sound.muffle(false); };
    c.querySelector("#o-quit").onclick = () => { finish(); store(); closeOverlay(); Sound.muffle(false); at("menu"); };
  };
  Game.on("pauseKey", () => { if (document.body.dataset.at === "play" && !overlayOpen) el("g-menu").onclick(); });
  Game.on("undoKey", () => el("t-undo").onclick());

  /* ---------- settings ---------- */
  el("m-settings").onclick = () => {
    const c = overlay("SETTINGS", `<button class="sw ${S.sfx ? "on" : ""}" id="o-sfx">SOUND<i>${S.sfx ? "ON" : "OFF"}</i></button><button class="sw ${S.music ? "on" : ""}" id="o-mus">PULSE<i>${S.music ? "ON" : "OFF"}</i></button>
      <button class="sw" id="o-reset">RESET ALL PROGRESS<i>!</i></button><div class="acts"><button class="go" id="o-done" style="grid-column:1/-1">DONE</button></div>`);
    const flip = (id, k, fn) => c.querySelector(id).onclick = e => { S[k] = !S[k]; fn(S[k]); e.currentTarget.classList.toggle("on", S[k]); e.currentTarget.querySelector("i").textContent = S[k] ? "ON" : "OFF"; store(); };
    flip("#o-sfx", "sfx", v => Sound.setSfx(v)); flip("#o-mus", "music", v => Sound.setMusic(v));
    c.querySelector("#o-reset").onclick = e => { if (!e.currentTarget.dataset.y) { e.currentTarget.dataset.y = 1; e.currentTarget.querySelector("i").textContent = "SURE?"; return; } S = base(); store(); closeOverlay(); menu(); toast("PROGRESS RESET"); };
    c.querySelector("#o-done").onclick = closeOverlay;
  };

  el("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(S.sfx); Sound.setMusic(S.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "play" && !overlayOpen && !Game.over) el("g-menu").onclick(); });
  menu();
  return { start, menu: () => at("menu"), get data() { return S; } };
})();
