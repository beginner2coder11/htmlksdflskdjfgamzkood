/* MOLE PATROL — gate, sizes, HUD, dig/flag switch, results, help, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "notes";
  const fresh = () => ({ seeds: 30, best: {}, wins: {}, plays: 0, daily: "", sfx: true, music: true, seenHelp: false });
  let N = fresh();
  try { N = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(N)); } catch (e) {} };
  const today = () => new Date().toISOString().slice(0, 10);
  let current = null, chanceUsed = false;

  function at(v) { document.body.dataset.at = v; if (v === "gate") gate(); }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="card">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }
  function gate() {
    document.querySelectorAll("[data-seeds]").forEach(e => e.textContent = N.seeds);
    $("g-daily-done").hidden = N.daily !== today();
    $("sizes").innerHTML = CF.sizes.map(s => `<button class="size" data-s="${s.id}"><b>${s.name}</b><small>${s.cols}×${s.rows} · ${s.moles} moles</small><em>${N.best[s.id] ? "best " + N.best[s.id] + "s" : "not cleared yet"}</em></button>`).join("");
  }
  $("sizes").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) { Sound.sfx("tap"); play(CF.sizes.find(s => s.id === b.dataset.s)); } });

  function play(size, daily = false) {
    close(); chanceUsed = false; current = { size, daily }; at("yard"); Game.setup(size, daily); Game.setFlagMode(false); Sound.muffle(false);
    $("y-hint-cost").textContent = CF.hintPrice;
    if (!N.seenHelp) { N.seenHelp = true; keep(); help(); }
  }
  Game.on("hud", () => { $("y-moles").textContent = Game.molesLeft; $("y-time").textContent = Game.time; });
  Game.on("mode", v => { document.body.classList.toggle("flagging", v); document.querySelectorAll("#mode button").forEach(b => b.classList.toggle("on", (b.dataset.m === "flag") === v)); });
  $("mode").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { Game.setFlagMode(b.dataset.m === "flag"); Sound.sfx("tap"); } });
  $("y-hint").onclick = () => {
    if (Game.state !== "play") return;
    if (N.seeds < CF.hintPrice) { seedsOffer(); return; }
    if (Game.hint()) { N.seeds -= CF.hintPrice; keep(); }
  };
  function seedsOffer() {
    const m = modal(`<h3>Out of seeds</h3><p>A hint costs ${CF.hintPrice} seeds. You have ${N.seeds}.</p><div class="acts"><button class="pebble leafy wide" id="s-ad">▶ Watch ad · +30 seeds</button><button class="pebble wide" id="s-x">Not now</button></div>`);
    m.querySelector("#s-ad").onclick = () => Ads.showRewarded().then(ok => { if (ok) { N.seeds += 30; keep(); } close(); });
    m.querySelector("#s-x").onclick = close;
  }
  Game.on("won", r => {
    N.plays++; const earn = CF.seedsPerWin[r.size] || 5; N.seeds += earn; N.wins[r.size] = (N.wins[r.size] || 0) + 1;
    const best = !N.best[r.size] || r.time < N.best[r.size]; if (best) N.best[r.size] = r.time; if (current.daily) N.daily = today(); keep();
    const m = modal(`<h3>Garden cleared!</h3><div class="big">${r.time}s</div><p>${best ? "A new best time." : "Best " + N.best[r.size] + "s."} +${earn} seeds 🌱</p>
      <div class="acts"><button class="pebble" id="w-gate">Garden gate</button><button class="pebble go" id="w-again">${current.daily ? "Done" : "Again"}</button></div>`);
    const gateFn = fn => (N.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    m.querySelector("#w-gate").onclick = () => gateFn(() => { close(); Game.stop(); at("gate"); });
    m.querySelector("#w-again").onclick = () => gateFn(() => current.daily ? (close(), Game.stop(), at("gate")) : play(current.size));
  });
  Game.on("lost", () => {
    N.plays++; keep();
    setTimeout(() => {
      const m = modal(`<h3>You woke a mole!</h3><p>It's grumpy, but it'll go back to sleep for a video.</p>
        <div class="acts">${chanceUsed ? "" : `<button class="pebble leafy wide" id="l-chance">▶ Second chance</button>`}<button class="pebble" id="l-gate">Garden gate</button><button class="pebble go" id="l-again">New garden</button></div>`);
      const c = m.querySelector("#l-chance"); if (c) c.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; chanceUsed = true; close(); Game.secondChance(); });
      const gateFn = fn => (N.plays % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
      m.querySelector("#l-gate").onclick = () => gateFn(() => { close(); Game.stop(); at("gate"); });
      m.querySelector("#l-again").onclick = () => gateFn(() => play(current.size, current.daily));
    }, 1200);
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>Tea in the shed</h3><div class="acts"><button class="pebble go wide" id="p-go">Back to the garden</button><button class="pebble" id="p-re">Restart</button><button class="pebble" id="p-gate">Gate</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-re").onclick = () => play(current.size, current.daily);
    m.querySelector("#p-gate").onclick = () => { close(); Game.stop(); Sound.muffle(false); at("gate"); };
  }
  $("y-back").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "yard") pause(); });
  function help() {
    const m = modal(`<h3>How to play</h3><ul><li><b>Tap</b> a hedge to dig. Your first dig is always safe.</li><li>A <b>number</b> tells how many moles sleep in the 8 squares around it.</li><li><b>Long-press</b> (or switch to 🚩 Flag) to mark a mole.</li><li>Tap a number whose moles are all flagged to dig around it at once.</li><li>Clear every square without a mole to win.</li></ul><button class="pebble go" id="h-x">Let's dig</button>`);
    m.querySelector("#h-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>Settings</h3><button class="opt" id="o-s">Sounds <b>${N.sfx ? "on" : "off"}</b></button><button class="opt" id="o-m">Flute tune <b>${N.music ? "on" : "off"}</b></button><button class="opt" id="o-r">Reset records <b>—</b></button><button class="pebble go" id="o-x">Done</button>`);
    m.querySelector("#o-s").onclick = e => { N.sfx = !N.sfx; Sound.setSfx(N.sfx); e.currentTarget.querySelector("b").textContent = N.sfx ? "on" : "off"; keep(); };
    m.querySelector("#o-m").onclick = e => { N.music = !N.music; Sound.setMusic(N.music); e.currentTarget.querySelector("b").textContent = N.music ? "on" : "off"; keep(); };
    m.querySelector("#o-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } N = fresh(); keep(); b.textContent = "done"; gate(); };
    m.querySelector("#o-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(N.sfx); Sound.setMusic(N.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("g-daily").onclick = () => { Sound.sfx("tap"); play({ id: "daily", name: "Daily", ...CF.daily }, true); };
  $("g-how").onclick = () => { Sound.sfx("tap"); help(); };
  $("g-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "yard" && $("modal").hidden && Game.state === "play") pause(); });
  at("gate");
  return { play, get notes() { return N; } };
})();
