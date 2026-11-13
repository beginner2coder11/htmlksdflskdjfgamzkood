/* RINK RALLY — lobby, ladder, quick match, two players, tables, results, saves. */
window.UI = (() => {
  const CF = window.GAME_CONFIG, $ = id => document.getElementById(id);
  const KEY = CF.storagePrefix + "jukebox";
  const fresh = () => ({ beaten: 0, wins: 0, played: 0, table: "sunset", sfx: true, music: true });
  let J = fresh();
  try { J = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(J)); } catch (e) {} };
  let match = null, revived = false;
  const table = () => CF.tables.find(t => t.id === J.table) || CF.tables[0];

  function at(v) { document.body.dataset.at = v; if (v === "lobby") lobby(); }
  function lobby() { $("l-ladder-sub").textContent = J.beaten >= CF.rivals.length ? "Champion! Play the Champ again" : `Rival ${J.beaten + 1} of ${CF.rivals.length} · ${CF.rivals[J.beaten].name}`; }
  function modal(html) { const m = $("modal"); m.innerHTML = `<div class="tv">${html}</div>`; m.hidden = false; return m.firstElementChild; }
  function close() { $("modal").hidden = true; $("modal").innerHTML = ""; }

  function intro(rival, kind) {
    const m = modal(`<div class="rival" style="justify-content:center"><i style="background:${rival.color};width:64px;height:64px"></i></div><h3>${rival.name}</h3><p class="quote">“${rival.quote}”</p><p>First to ${CF.winScore}. Drag your orange mallet in the bottom half.</p><div class="acts"><button class="chip" id="i-back">Back</button><button class="chip go" id="i-go">Face off!</button></div>`);
    m.querySelector("#i-back").onclick = close;
    m.querySelector("#i-go").onclick = () => begin({ rival, kind });
  }
  function begin(opts) {
    close(); revived = false; match = opts; at("play");
    $("n-me").textContent = opts.kind === "two" ? "P1" : "YOU"; $("n-cpu").textContent = opts.kind === "two" ? "P2" : opts.rival.name.toUpperCase(); $("s-to").textContent = CF.winScore;
    Game.start({ rival: opts.rival, two: opts.kind === "two", theme: table() }); Sound.muffle(false);
  }
  let last = [0, 0];
  Game.on("hud", () => {
    const s = Game.score;
    [["s-me", 0], ["s-cpu", 1]].forEach(([id, i]) => { const e = $(id); e.textContent = s[i]; if (s[i] !== last[i]) { e.classList.remove("tick"); void e.offsetWidth; e.classList.add("tick"); } });
    last = s.slice();
  });
  Game.on("over", r => {
    J.played++;
    if (r.two) { const m = modal(`<h3>${r.score[0] > r.score[1] ? "Player 1" : "Player 2"} wins!</h3><div class="final">${r.score[0]} – ${r.score[1]}</div><div class="acts"><button class="chip" id="o-lobby">Lobby</button><button class="chip go" id="o-again">Rematch</button></div>`); m.querySelector("#o-lobby").onclick = () => { close(); Game.quit(); at("lobby"); }; m.querySelector("#o-again").onclick = () => begin(match); keep(); return; }
    let unlocked = "";
    if (r.won) { J.wins++; const idx = CF.rivals.indexOf(r.rival); if (match.kind === "ladder" && idx === J.beaten && J.beaten < CF.rivals.length) J.beaten++; const t = CF.tables.find(x => x.wins === J.wins); if (t) unlocked = t.name; }
    keep();
    const nextR = CF.rivals[Math.min(J.beaten, CF.rivals.length - 1)];
    const m = modal(`<h3>${r.won ? "Far out!" : "Bummer…"}</h3><div class="final">${r.score[0]} – ${r.score[1]}</div><p>${r.won ? `You beat ${r.rival.name}.` : `${r.rival.name} takes it.`}${unlocked ? ` New table: ${unlocked}!` : ""}</p>
      <div class="acts">${!r.won && !revived ? `<button class="chip go wide" id="o-rev">▶ Watch ad · rematch from ${r.score[0]}–${Math.max(0, r.score[1] - 2)}</button>` : ""}<button class="chip" id="o-lobby">Lobby</button><button class="chip go" id="o-again">${r.won && match.kind === "ladder" && J.beaten < CF.rivals.length ? "Next rival" : "Again"}</button></div>`);
    const gate = fn => (J.played % CF.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve()).then(fn);
    const rv = m.querySelector("#o-rev");
    if (rv) rv.onclick = () => Ads.showRewarded().then(ok => { if (!ok) return; revived = true; const keepScore = [r.score[0], Math.max(0, r.score[1] - 2)]; close(); at("play"); Game.start({ rival: r.rival, theme: table() }); Game.score[0] = keepScore[0]; Game.score[1] = keepScore[1]; $("s-me").textContent = keepScore[0]; $("s-cpu").textContent = keepScore[1]; last = keepScore.slice(); });
    m.querySelector("#o-lobby").onclick = () => gate(() => { close(); Game.quit(); at("lobby"); });
    m.querySelector("#o-again").onclick = () => gate(() => r.won && match.kind === "ladder" && J.beaten < CF.rivals.length ? intro(nextR, "ladder") : begin(match));
  });
  function pause() {
    Game.pause(); Sound.muffle(true);
    const m = modal(`<h3>Time out</h3><div class="acts"><button class="chip go wide" id="p-go">Back on the rink</button><button class="chip" id="p-re">Restart</button><button class="chip" id="p-lobby">Lobby</button></div>`);
    m.querySelector("#p-go").onclick = () => { close(); Game.resume(); Sound.muffle(false); };
    m.querySelector("#p-re").onclick = () => begin(match);
    m.querySelector("#p-lobby").onclick = () => { close(); Game.quit(); Sound.muffle(false); at("lobby"); };
  }
  $("b-pause").onclick = pause;
  Game.on("pauseKey", () => { if ($("modal").hidden && document.body.dataset.at === "play") pause(); });

  function quick() {
    const m = modal(`<h3>Quick match</h3><div class="rivals">${CF.rivals.map((r, i) => `<button class="rival ${i < J.beaten ? "done" : ""}" data-r="${i}" ${i > J.beaten ? "disabled" : ""}><i style="background:${r.color}"></i><span><b>${i > J.beaten ? "???" : r.name}</b><small>${i > J.beaten ? "beat the ladder to meet" : "speed " + Math.round(r.speed / 9) + " · smarts " + Math.round(r.react * 100)}</small></span></button>`).join("")}</div><button class="chip" id="q-x">Close</button>`);
    m.querySelector(".rivals").onclick = e => { const b = e.target.closest("[data-r]"); if (b && !b.disabled) intro(CF.rivals[+b.dataset.r], "quick"); };
    m.querySelector("#q-x").onclick = close;
  }
  function tables() {
    const m = modal(`<h3>Tables</h3><p>${J.wins} wins</p><div class="rivals">${CF.tables.map(t => `<button class="rival ${J.table === t.id ? "done" : ""}" data-t="${t.id}" ${J.wins < t.wins ? "disabled" : ""}><i style="background:conic-gradient(${t.stripes.join(",")})"></i><span><b>${t.name}</b><small>${J.wins < t.wins ? t.wins + " wins to unlock" : J.table === t.id ? "in use" : "tap to use"}</small></span></button>`).join("")}</div><button class="chip" id="t-x">Done</button>`);
    m.querySelector(".rivals").onclick = e => { const b = e.target.closest("[data-t]"); if (!b || b.disabled) return; J.table = b.dataset.t; keep(); Sound.sfx("tap"); tables(); };
    m.querySelector("#t-x").onclick = close;
  }
  function settings() {
    const m = modal(`<h3>Settings</h3><button class="opt" id="s-s">Sound <b>${J.sfx ? "on" : "off"}</b></button><button class="opt" id="s-m">Disco groove <b>${J.music ? "on" : "off"}</b></button><button class="opt" id="s-r">Reset ladder <b>—</b></button><button class="chip go" id="s-x">Done</button>`);
    m.querySelector("#s-s").onclick = e => { J.sfx = !J.sfx; Sound.setSfx(J.sfx); e.currentTarget.querySelector("b").textContent = J.sfx ? "on" : "off"; keep(); };
    m.querySelector("#s-m").onclick = e => { J.music = !J.music; Sound.setMusic(J.music); e.currentTarget.querySelector("b").textContent = J.music ? "on" : "off"; keep(); };
    m.querySelector("#s-r").onclick = e => { const b = e.currentTarget.querySelector("b"); if (b.textContent !== "sure?") { b.textContent = "sure?"; return; } J = fresh(); keep(); b.textContent = "done"; lobby(); };
    m.querySelector("#s-x").onclick = close;
  }
  $("tagline").textContent = CF.tagline; document.title = CF.title;
  Sound.setSfx(J.sfx); Sound.setMusic(J.music);
  document.addEventListener("pointerdown", () => Sound.unlock());
  $("l-ladder").onclick = () => { Sound.sfx("tap"); intro(CF.rivals[Math.min(J.beaten, CF.rivals.length - 1)], "ladder"); };
  $("l-quick").onclick = () => { Sound.sfx("tap"); quick(); };
  $("l-two").onclick = () => { Sound.sfx("tap"); begin({ rival: CF.rivals[0], kind: "two" }); };
  $("l-tables").onclick = () => { Sound.sfx("tap"); tables(); };
  $("l-settings").onclick = () => { Sound.sfx("tap"); settings(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.body.dataset.at === "play" && $("modal").hidden && Game.state !== "over") pause(); });
  at("lobby");
  return { begin, get jukebox() { return J; } };
})();
