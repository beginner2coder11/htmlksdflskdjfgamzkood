/* SUNSET PINBALL — dot-matrix display, title, high scores, tables, modals, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "cab";
  const fresh = () => ({ scores: [], best: 0, theme: "sunset", sfx: true, music: true, games: 0, seenHint: false });
  let D = fresh();
  try { D = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
  let revived = false;

  /* ---------- DMD: text is drawn small, sampled, then shown as round amber dots ---------- */
  const dmd = $("dmd"), dx = dmd.getContext("2d"), COLS = 128, ROWS = 16;
  const src = document.createElement("canvas"); src.width = COLS; src.height = ROWS; const sx = src.getContext("2d", { willReadFrequently: true });
  let msg = { text: "SUNSET PINBALL", kind: "info", t: 0, until: 0 }, scrollX = 0;
  function show(text, kind = "info") { msg = { text, kind, t: 0, until: kind === "big" ? 2.2 : 0 }; scrollX = COLS; }
  function drawDMD(dt) {
    msg.t += dt;
    sx.fillStyle = "#000"; sx.fillRect(0, 0, COLS, ROWS); sx.fillStyle = "#fff"; sx.textBaseline = "middle";
    const scoreLine = Game.state !== "idle" && (msg.until === 0 || msg.t > msg.until);
    if (scoreLine) {
      sx.font = "bold 9px monospace"; sx.textAlign = "left"; sx.fillText(String(Game.score).replace(/\B(?=(\d{3})+(?!\d))/g, ","), 2, 5);
      sx.font = "7px monospace"; sx.textAlign = "left";
      const w = sx.measureText(msg.text).width;
      if (w > COLS - 4) { scrollX -= dt * 34; if (scrollX < -w) scrollX = COLS; sx.fillText(msg.text, scrollX, 13); }
      else sx.fillText(msg.text, 2, 13);
    } else {
      sx.font = "bold 10px monospace"; sx.textAlign = "center";
      const on = msg.kind !== "big" || Math.floor(msg.t * 6) % 2 === 0 || msg.t > 1;
      const w = sx.measureText(msg.text).width;
      if (w > COLS - 4) { scrollX -= dt * 40; if (scrollX < -w / 2) scrollX = COLS + w / 2; if (on) sx.fillText(msg.text, scrollX, 9); }
      else if (on) sx.fillText(msg.text, COLS / 2, 9);
    }
    const px = sx.getImageData(0, 0, COLS, ROWS).data, cw = dmd.width / COLS, ch = dmd.height / ROWS;
    dx.fillStyle = "#120802"; dx.fillRect(0, 0, dmd.width, dmd.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const v = px[(y * COLS + x) * 4];
      dx.fillStyle = v > 90 ? "#ffb02e" : v > 30 ? "#9a5a12" : "#2a1606";
      dx.beginPath(); dx.arc(x * cw + cw / 2, y * ch + ch / 2, cw * 0.38, 0, 7); dx.fill();
    }
  }
  let lt = 0; (function tick(t) { drawDMD(Math.min(0.05, (t - lt) / 1000 || 0.016)); lt = t; requestAnimationFrame(tick); })(0);

  /* ---------- game flow ---------- */
  function mode(m) { document.body.dataset.mode = m; }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="panel">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function play() {
    close(); revived = false; mode("play"); Game.setTheme(D.theme); Game.start(); Sound.muffle(false);
    if (!D.seenHint) { $("touch-hint").hidden = false; setTimeout(() => $("touch-hint").hidden = true, 5000); D.seenHint = true; keep(); }
  }
  Game.on("display", d => show(d.text, d.kind));
  Game.on("hud", () => { $("d-ball").textContent = Game.ball; $("d-mult").textContent = Game.mult; });
  Game.on("mission", d => show(`${d.m.text} ${d.n}/${d.m.need}`, "info"));
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.mode === "play") pause(); });
  Game.on("over", r => {
    D.games++; D.best = Math.max(D.best, r.score);
    D.scores.push({ s: r.score, d: new Date().toISOString().slice(0, 10) }); D.scores.sort((a, b) => b.s - a.s); D.scores = D.scores.slice(0, 8);
    keep();
    const rank = D.scores.findIndex(x => x.s === r.score);
    show(rank === 0 ? "NEW HIGH SCORE!" : "GAME OVER", "big");
    const unlocked = CF.themes.filter(t => t.unlock > 0 && r.score >= t.unlock && D.best - r.score <= 0);
    const p = modal(`<h3>Game over</h3><div class="big-score">${r.score.toLocaleString()}</div>
      <p>${r.missions} mission${r.missions === 1 ? "" : "s"} complete${rank >= 0 && rank < 8 ? ` · #${rank + 1} on the board` : ""}</p>
      ${unlocked.length ? `<p>New table unlocked: <b>${unlocked.map(t => t.name).join(", ")}</b></p>` : ""}
      ${revived ? "" : `<button class="btn hot" id="m-rev">▶ Watch ad · one more ball</button>`}
      <div class="row"><button class="btn" id="m-title">Title</button><button class="btn go" id="m-again">Play again</button></div>`);
    const rv = p.querySelector("#m-rev");
    if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; close(); Game.revive(); });
    const gate = fn => (D.games % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    p.querySelector("#m-again").onclick = () => gate(play);
    p.querySelector("#m-title").onclick = () => gate(title);
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const p = modal(`<h3>Paused</h3><button class="btn go" id="m-res">Resume</button><div class="row"><button class="btn" id="m-re">Restart</button><button class="btn" id="m-q">Quit</button></div>`);
    p.querySelector("#m-res").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    p.querySelector("#m-re").onclick = play;
    p.querySelector("#m-q").onclick = title;
  }
  function title() { close(); Game.quit(); mode("title"); Sound.muffle(false); show("SUNSET PINBALL  ·  BEST " + D.best.toLocaleString()); }

  /* ---------- title menus ---------- */
  function scores() {
    const p = modal(`<h3>High scores</h3>${D.scores.length ? `<ol class="hs">${D.scores.map(x => `<li><span>${x.d}</span>${x.s.toLocaleString()}</li>`).join("")}</ol>` : "<p>No games yet. Go flip!</p>"}<button class="btn go" id="m-x">Close</button>`);
    p.querySelector("#m-x").onclick = close;
  }
  function tables() {
    const p = modal(`<h3>Tables</h3><div class="tables">${CF.themes.map(t => `<button class="tbl ${D.theme === t.id ? "on" : ""}" data-t="${t.id}" ${D.best < t.unlock ? "disabled" : ""}><i style="background:linear-gradient(${t.sky.join(",")})"></i><span><b>${t.name}</b><small>${D.best < t.unlock ? "Score " + t.unlock.toLocaleString() + " to unlock" : D.theme === t.id ? "Selected" : "Tap to select"}</small></span></button>`).join("")}</div><button class="btn go" id="m-x">Done</button>`);
    p.querySelector(".tables").onclick = e => { const b = e.target.closest("[data-t]"); if (!b || b.disabled) return; D.theme = b.dataset.t; keep(); Game.setTheme(D.theme); Sound.sfx("tap"); tables(); };
    p.querySelector("#m-x").onclick = close;
  }
  function rules() {
    const p = modal(`<h3>How to play</h3><ul class="rules">
      <li>Tap or hold the <b>left / right half</b> of the screen for each flipper (or ← → / Z M keys).</li>
      <li>When the ball sits in the lane, <b>hold, then release</b> to launch (Space). Longer hold = stronger shot.</li>
      <li>Pop the hibiscus <b>bumpers</b>, drop all 4 <b>targets</b>, roll through <b>S-U-N</b> and shoot the <b>volcano</b>.</li>
      <li>Each mission raises the multiplier. Every third mission starts <b>multiball</b>.</li>
      <li>Ball save protects each new ball for ${CF.ballSave} seconds. Extra balls at ${CF.extraBallAt.map(x => x.toLocaleString()).join(" and ")}.</li></ul>
      <button class="btn go" id="m-x">Got it</button>`);
    p.querySelector("#m-x").onclick = close;
  }
  function settings() {
    const p = modal(`<h3>Settings</h3><button class="toggle" id="t-s">Sound effects<i>${D.sfx ? "ON" : "OFF"}</i></button><button class="toggle" id="t-m">Steel-drum groove<i>${D.music ? "ON" : "OFF"}</i></button><button class="toggle" id="t-r">Clear high scores<i>!</i></button><button class="btn go" id="m-x">Done</button>`);
    p.querySelector("#t-s").onclick = e => { D.sfx = !D.sfx; Sound.setSfx(D.sfx); e.currentTarget.querySelector("i").textContent = D.sfx ? "ON" : "OFF"; keep(); };
    p.querySelector("#t-m").onclick = e => { D.music = !D.music; Sound.setMusic(D.music); e.currentTarget.querySelector("i").textContent = D.music ? "ON" : "OFF"; keep(); };
    p.querySelector("#t-r").onclick = e => { const i = e.currentTarget.querySelector("i"); if (i.textContent !== "SURE?") { i.textContent = "SURE?"; return; } D.scores = []; D.best = 0; keep(); i.textContent = "DONE"; };
    p.querySelector("#m-x").onclick = close;
  }

  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(D.sfx); Sound.setMusic(D.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("b-start").onclick = () => { Sound.sfx("tap"); play(); };
  $("b-scores").onclick = scores; $("b-tables").onclick = tables; $("b-rules").onclick = rules; $("b-settings").onclick = settings;
  $("b-pause").onclick = pause;
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.mode === "play" && $("modal").hidden && Game.state !== "over") pause(); });
  Game.setTheme(D.theme);
  title();
  return { play, title, scores, tables, get data() { return D; } };
})();
