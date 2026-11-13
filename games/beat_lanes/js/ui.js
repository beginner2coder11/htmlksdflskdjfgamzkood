/* BEAT LANES — lobby (songs × difficulty), HUD, results, settings, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "mixtape";
  const fresh = () => ({ best: {}, diff: "normal", offset: 0, speedMul: 1, plays: 0, sfx: true, music: true, seenHow: false });
  let M = fresh();
  try { M = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} };
  const id = (s, d) => s.id + ":" + d;
  // a song unlocks when the one before it has been cleared (grade C or better) on any difficulty
  const cleared = s => ["easy", "normal", "hard"].some(d => M.best[id(s, d)] && "SABC".includes(M.best[id(s, d)].letter));
  const open = i => i === 0 || cleared(CF.songs[i - 1]);
  let current = null;

  function at(v) { document.body.dataset.at = v; if (v === "lobby") lobby(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="bubble">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function lobby() {
    document.querySelectorAll("#diffs button").forEach(b => b.classList.toggle("on", b.dataset.d === M.diff));
    $("songs").innerHTML = CF.songs.map((s, i) => { const b = M.best[id(s, M.diff)]; return `<button class="song" data-i="${i}" ${open(i) ? "" : "disabled"}><span class="disc" style="--c1:${CF.lanes[i % 4]};--c2:${CF.lanes[(i + 2) % 4]}"></span><span><b>${open(i) ? s.name : "? ? ?"}</b><small>${open(i) ? `${s.artist} · ${s.bpm} BPM` : "clear the song above to unlock"}${b ? ` · best ${b.score}` : ""}</small></span><span class="gr">${b ? b.letter : ""}</span></button>`; }).join("");
  }
  $("diffs").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b) return; M.diff = b.dataset.d; keep(); Sound.sfx("tap"); lobby(); });
  $("songs").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) play(CF.songs[+b.dataset.i]); });

  async function play(s) {
    close(); current = s; await Sound.ready(); at("play");
    $("h-song").textContent = s.name.toUpperCase() + " · " + M.diff.toUpperCase();
    Game.start(s, M.diff, { offset: M.offset / 1000, speedMul: M.speedMul });
    if (!M.seenHow) { M.seenHow = true; keep(); }
  }
  Game.on("hud", () => { $("h-score").textContent = Game.score; $("h-life").style.width = Math.round(Game.health * 100) + "%"; $("h-life").parentElement.classList.toggle("low", Game.health < 0.25); });
  Game.on("done", r => {
    M.plays++; const k = id(r.song, r.diff), prev = M.best[k]; if (!prev || r.score > prev.score) M.best[k] = { score: r.score, letter: r.letter }; keep();
    setTimeout(() => {
      const m = modal(`<h3>${r.full ? "FULL COMBO ✦" : "CLEAR!"}</h3><div class="grade">${r.letter}</div><p>${r.song.name} · ${r.diff} · ${Math.round(r.acc * 100)}% · max combo ${r.maxCombo}</p>
        <div class="stats"><div><b>${r.counts.perfect}</b>PERFECT</div><div><b>${r.counts.great}</b>GREAT</div><div><b>${r.counts.good}</b>GOOD</div><div><b>${r.counts.miss}</b>MISS</div></div>
        <p>score ${r.score}${!prev || r.score > prev.score ? " · new best!" : ""}</p>
        <div class="acts"><button class="jelly" id="d-lobby">SONGS</button><button class="jelly go" id="d-again">AGAIN</button></div>`);
      const gate = fn => (M.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      m.querySelector("#d-lobby").onclick = () => gate(() => { close(); Game.quit(); at("lobby"); });
      m.querySelector("#d-again").onclick = () => gate(() => play(current));
    }, 600);
  });
  Game.on("failed", r => {
    M.plays++; keep();
    const m = modal(`<h3>OUT OF ENERGY</h3><p>The beat goes on without you…</p><div class="acts">${r.revived ? "" : `<button class="jelly hot wide" id="f-rev">▶ WATCH AD · KEEP DANCING</button>`}<button class="jelly" id="f-lobby">SONGS</button><button class="jelly go" id="f-again">RETRY</button></div>`);
    const rv = m.querySelector("#f-rev"); if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; close(); Game.revive(); });
    m.querySelector("#f-lobby").onclick = () => { close(); Game.quit(); at("lobby"); };
    m.querySelector("#f-again").onclick = () => play(current);
  });
  function pause() {
    if (Game.state !== "play") return; Game.pause();
    const m = modal(`<h3>PAUSED</h3><div class="acts"><button class="jelly go wide" id="p-go">RESUME</button><button class="jelly" id="p-re">RESTART</button><button class="jelly" id="p-lobby">SONGS</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); };
    m.querySelector("#p-re").onclick = () => { Game.quit(); play(current); };
    m.querySelector("#p-lobby").onclick = () => { close(); Game.quit(); at("lobby"); };
  }
  $("h-pause").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "play") pause(); });
  function how() {
    const m = modal(`<h3>HOW TO PLAY</h3><ul class="how"><li>Notes fall down four chrome lanes.</li><li><b>Tap the lane</b> as a note reaches the bar (or press <b>D F J K</b>).</li><li>Long notes: <b>hold</b> until the tail ends.</li><li>Perfect / Great / Good keep your energy up; misses drain it.</li><li>Clear a song to unlock the next one.</li></ul><button class="jelly go" id="h-x">GOT IT ✦</button>`);
    m.querySelector("#h-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>SETTINGS</h3>
      <div class="opt">TIMING OFFSET <span class="stepper"><button id="o-om">−</button><b id="o-ov">${M.offset} ms</b><button id="o-op">+</button></span></div>
      <div class="opt">NOTE SPEED <span class="stepper"><button id="o-sm">−</button><b id="o-sv">${M.speedMul.toFixed(1)}×</b><button id="o-sp">+</button></span></div>
      <button class="opt" id="o-s">SOUND EFFECTS <b>${M.sfx ? "ON" : "OFF"}</b></button>
      <button class="opt" id="o-r">CLEAR SCORES <b>—</b></button><button class="jelly go" id="o-x">DONE</button>`);
    const ov = d => { M.offset = Math.max(-200, Math.min(200, M.offset + d)); m.querySelector("#o-ov").textContent = M.offset + " ms"; keep(); };
    const sv = d => { M.speedMul = Math.max(0.6, Math.min(2, Math.round((M.speedMul + d) * 10) / 10)); m.querySelector("#o-sv").textContent = M.speedMul.toFixed(1) + "×"; keep(); };
    m.querySelector("#o-om").onclick = () => ov(-10); m.querySelector("#o-op").onclick = () => ov(10); m.querySelector("#o-sm").onclick = () => sv(-0.1); m.querySelector("#o-sp").onclick = () => sv(0.1);
    m.querySelector("#o-s").onclick = e => { M.sfx = !M.sfx; Sound.setSfx(M.sfx); e.currentTarget.querySelector("b").textContent = M.sfx ? "ON" : "OFF"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "SURE?") { b.textContent = "SURE?"; return; } M.best = {}; keep(); b.textContent = "DONE"; lobby(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(M.sfx);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("l-how").onclick = () => { Sound.sfx("tap"); how(); };
  $("l-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "play" && $("modal").hidden) pause(); });
  at("lobby");
  return { play, get mixtape() { return M; } };
})();
