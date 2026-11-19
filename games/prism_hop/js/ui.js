/* PRISM HOP — menus, HUD, saves, missions, shop, daily gift, revive and results */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
  };
  const S = {
    gems: store.get("gems", 0), best: store.get("best", 0), owned: store.get("owned", ["pip"]), skin: store.get("skin", "pip"),
    totals: store.get("totals", { totalGems: 0, totalRuns: 0, totalBoost: 0, totalPower: 0 }),
    missions: store.get("missions", null), mPtr: store.get("mPtr", 0), daily: store.get("daily", { last: "", streak: 0 }), games: 0
  };
  const save = () => { ["gems", "best", "owned", "skin", "totals", "missions", "mPtr", "daily"].forEach(k => store.set(k, S[k])); };
  const MDEF = Object.fromEntries(C.missions.map(m => [m.id, m]));

  /* ---------- missions ---------- */
  function nextMission() {
    const active = (S.missions || []).map(m => m.id);
    for (let k = 0; k < C.missions.length; k++) {
      const d = C.missions[(S.mPtr + k) % C.missions.length];
      if (!active.includes(d.id)) { S.mPtr = (S.mPtr + k + 1) % C.missions.length; return { id: d.id, base: S.totals[d.stat] || 0, best: 0, claimed: false }; }
    }
  }
  if (!S.missions) { S.missions = []; for (let i = 0; i < 3; i++) S.missions.push(nextMission()); save(); }
  const runVal = (stat, r) => !r ? 0 : ({ runPerfect: r.perfects, runStreak: r.bestStreak, runStage: r.stage + 1, runFever: r.fevers, runScore: r.score })[stat] || 0;
  const liveTotals = r => !r ? S.totals : { totalGems: S.totals.totalGems + r.gems, totalRuns: S.totals.totalRuns, totalBoost: S.totals.totalBoost + r.boosts, totalPower: S.totals.totalPower + r.powers };
  function progress(m, r) {
    const d = MDEF[m.id]; if (!d) return 0;
    const v = d.stat.startsWith("total") ? liveTotals(r)[d.stat] - m.base : Math.max(m.best, runVal(d.stat, r));
    return Math.min(d.goal, v);
  }
  const isDone = (m, r) => progress(m, r) >= MDEF[m.id].goal;
  let toldDone = new Set();
  function checkLive(r) {
    for (const m of S.missions) if (!m.claimed && !toldDone.has(m.id) && isDone(m, r)) { toldDone.add(m.id); toast("Mission complete · " + MDEF[m.id].text); Sound.play("buy"); }
  }
  const claimable = () => S.missions.filter(m => !m.claimed && isDone(m)).length;

  /* ---------- daily gift ---------- */
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();

  /* ---------- HUD ---------- */
  const hud = { score: $("#h-score"), mult: $("#h-mult"), gems: $("#h-gems"), world: $("#h-world"), stage: $("#h-stage"), stageN: $("#h-stage-n"), fever: $("#h-fever"), feverWrap: $("#h-fever-wrap"), powers: $("#h-powers") };
  function refreshHud() {
    const r = Game.run; if (!r) return;
    hud.score.textContent = r.score;
    const mult = Math.min(4, 1 + Math.floor(r.streak / 5)) * (r.feverLeft > 0 ? C.fever.scoreMult : 1);
    hud.mult.hidden = mult < 2; hud.mult.textContent = "x" + mult;
    hud.gems.textContent = S.gems + r.gems;
    const inStage = (Game.ball.row % C.stageHops) / C.stageHops;
    hud.stage.style.width = (inStage * 100).toFixed(1) + "%";
    hud.stageN.textContent = r.stage + 1;
    hud.world.textContent = C.worlds[r.stage % C.worlds.length].name;
    const f = r.feverLeft > 0 ? r.feverLeft / C.fever.hops : r.fever / C.fever.need;
    hud.fever.style.width = (Math.min(1, f) * 100).toFixed(1) + "%";
    hud.feverWrap.classList.toggle("on", r.feverLeft > 0);
    const pw = [];
    if (r.shield > 0) pw.push(`<span class="pw" style="--c:#7fdcff">Shield${r.shield > 1 ? " x" + r.shield : ""}</span>`);
    if (r.magnet > 0) pw.push(`<span class="pw" style="--c:#ff6f8f">Magnet ${r.magnet}</span>`);
    if (r.slow > 0) pw.push(`<span class="pw" style="--c:#b48cff">Slow ${r.slow}</span>`);
    const html = pw.join(""); if (hud.powers.innerHTML !== html) hud.powers.innerHTML = html;
  }
  function bump() { hud.score.classList.remove("bump"); void hud.score.offsetWidth; hud.score.classList.add("bump"); }
  let toastT = 0;
  function toast(msg) { const t = $("#toast"); t.hidden = false; t.textContent = msg; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2400); }

  Game.on.start = () => { $("#hint").hidden = true; S.totals.totalRuns++; toldDone = new Set(S.missions.filter(m => isDone(m)).map(m => m.id)); save(); refreshHud(); };
  Game.on.land = () => { refreshHud(); bump(); checkLive(Game.run); };
  Game.on.gem = () => { refreshHud(); checkLive(Game.run); };
  Game.on.fever = () => { refreshHud(); checkLive(Game.run); Sound.duck(true); setTimeout(() => Sound.duck(false), 1200); };
  Game.on.feverEnd = refreshHud;
  Game.on.stage = () => { refreshHud(); checkLive(Game.run); };
  Game.on.power = () => { refreshHud(); checkLive(Game.run); };
  Game.on.boost = () => checkLive(Game.run);
  Game.on.save = refreshHud;
  Game.on.dead = r => { refreshHud(); if (!r.revived) offerRevive(r); else results(r); };

  /* ---------- sheets ---------- */
  const wrap = $("#sheet-wrap"), sheet = $("#sheet");
  let reviveTimer = 0;
  function open(html, cls = "") { sheet.className = "sheet " + cls; sheet.innerHTML = html; wrap.hidden = false; }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; clearInterval(reviveTimer); }
  const gemTag = n => `<span class="price"><i class="gem-ico"></i>${n}</span>`;

  function offerRevive(r) {
    const can = S.gems >= C.revive.gems, total = 6;
    let left = total;
    open(`<h2>Keep hopping?</h2><p class="sub">Score ${r.score} · you get a free shield</p>
      <div class="revive-ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="rg"><stop offset="0" stop-color="#ff5ad8"/><stop offset="1" stop-color="#4ff2ff"/></linearGradient></defs>
      <circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="rv-fg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><b id="rv-n">${total}</b></div>
      <div class="stack">
        <button class="btn alt" id="rv-ad">Revive <span class="ad">AD</span></button>
        <button class="btn gold" id="rv-gem" ${can ? "" : "disabled"}>Revive · ${gemTag(C.revive.gems)}</button>
        <button class="btn ghost" id="rv-no">No thanks</button>
      </div>`);
    const tick = () => {
      left -= 0.1; const fg = $("#rv-fg"); if (!fg) return;
      fg.style.strokeDashoffset = (326.7 * (1 - left / total)).toFixed(1); $("#rv-n").textContent = Math.max(0, Math.ceil(left));
      if (left <= 0) { clearInterval(reviveTimer); close(); results(r); }
    };
    reviveTimer = setInterval(tick, 100);
    $("#rv-ad").onclick = async () => { clearInterval(reviveTimer); Sound.play("tap"); const ok = await Ads.showRewarded(); close(); if (ok) doRevive(); else results(r); };
    $("#rv-gem").onclick = () => { clearInterval(reviveTimer); S.gems -= C.revive.gems; save(); Sound.play("buy"); close(); doRevive(); };
    $("#rv-no").onclick = () => { clearInterval(reviveTimer); close(); results(r); };
  }
  function doRevive() { Game.revive(); $("#hint").hidden = false; document.body.dataset.at = "play"; refreshHud(); }

  function results(r) {
    // bank the run
    const newBest = r.score > S.best;
    if (newBest) S.best = r.score;
    S.gems += r.gems;
    S.totals.totalGems += r.gems; S.totals.totalBoost += r.boosts; S.totals.totalPower += r.powers;
    for (const m of S.missions) { const d = MDEF[m.id]; if (d && !d.stat.startsWith("total")) m.best = Math.max(m.best, runVal(d.stat, r)); }
    S.games++; save();
    let doubled = false;
    open(`<h2>Run over</h2>
      <p class="big-score">${r.score}</p>
      ${newBest ? `<span class="new-best">NEW BEST</span>` : `<p class="sub" style="margin-top:6px">Best ${S.best}</p>`}
      <div class="stats">
        <div><b>${r.perfects}</b><small>PERFECT</small></div><div><b>${r.bestStreak}</b><small>BEST CHAIN</small></div>
        <div><b>${r.stage + 1}</b><small>STAGE</small></div><div><b>${r.fevers}</b><small>FEVER</small></div>
      </div>
      <p class="earn">+<span id="rs-gems">${r.gems}</span> <i class="gem-ico"></i></p>
      <div class="mlist" id="rs-missions"></div>
      <div class="stack">
        ${r.gems > 0 ? `<button class="btn alt" id="rs-double">Double gems <span class="ad">AD</span></button>` : ""}
        <div class="row2"><button class="btn ghost" id="rs-home">Home</button><button class="btn" id="rs-again">Play again</button></div>
      </div>`);
    renderMissions($("#rs-missions"));
    const dbl = $("#rs-double");
    if (dbl) dbl.onclick = async () => {
      if (doubled) return; dbl.disabled = true; const ok = await Ads.showRewarded();
      if (ok) { doubled = true; S.gems += r.gems; S.totals.totalGems += r.gems; save(); $("#rs-gems").textContent = r.gems * 2; Sound.play("buy"); toast("Gems doubled!"); renderMissions($("#rs-missions")); }
      else dbl.disabled = false;
    };
    $("#rs-again").onclick = async () => { Sound.play("tap"); close(); await maybeInterstitial(); play(); };
    $("#rs-home").onclick = async () => { Sound.play("tap"); close(); await maybeInterstitial(); home(); };
  }
  async function maybeInterstitial() { if (C.ads.interstitialEvery > 0 && S.games > 0 && S.games % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); }

  function renderMissions(el) {
    el.innerHTML = S.missions.map((m, i) => {
      const d = MDEF[m.id], p = progress(m), done = p >= d.goal;
      return `<div class="mi ${done ? "done" : ""}"><p>${d.text}</p>
        <div class="rw">${done ? `<button class="btn gold claim" data-claim="${i}">Claim ${gemTag(d.reward)}</button>` : gemTag(d.reward)}</div>
        <div class="bar"><i style="width:${(p / d.goal * 100).toFixed(0)}%"></i></div></div>`;
    }).join("");
    el.querySelectorAll("[data-claim]").forEach(b => b.onclick = () => {
      const i = +b.dataset.claim, d = MDEF[S.missions[i].id];
      S.gems += d.reward; S.missions[i] = nextMission(); save(); Sound.play("buy"); toast(`+${d.reward} gems`);
      renderMissions(el); refreshMenu();
    });
  }

  /* ---------- menu panels ---------- */
  function shop() {
    open(`<button class="x" id="x">✕</button><h2>Orbs</h2><p class="sub">You have ${gemTag(S.gems)}</p><div class="grid" id="grid"></div>`);
    const grid = $("#grid");
    const draw = () => {
      grid.innerHTML = "";
      C.skins.forEach(sk => {
        const owned = S.owned.includes(sk.id), on = S.skin === sk.id, can = S.gems >= sk.price;
        const card = document.createElement("button");
        card.className = "card" + (on ? " on" : "") + (owned ? "" : " locked") + (!owned && !can ? " cant" : "");
        card.innerHTML = `<canvas width="152" height="152"></canvas><b>${sk.name}</b>${on ? `<span class="price">Equipped</span>` : owned ? `<span class="price" style="color:#fff">Use</span>` : gemTag(sk.price)}`;
        const g = card.querySelector("canvas").getContext("2d");
        Game.drawOrb(g, 76, 80, 46, sk, { look: 0.3, rot: 0.6 });
        card.onclick = () => {
          if (owned) { S.skin = sk.id; Game.setSkin(sk.id); Sound.play("tap"); }
          else if (can) { S.gems -= sk.price; S.owned.push(sk.id); S.skin = sk.id; Game.setSkin(sk.id); Sound.play("buy"); toast(sk.name + " unlocked!"); }
          else { toast("Need " + (sk.price - S.gems) + " more gems"); return; }
          save(); refreshMenu(); sheet.querySelector(".sub").innerHTML = `You have ${gemTag(S.gems)}`; draw();
        };
        grid.appendChild(card);
      });
    };
    draw(); $("#x").onclick = close;
  }
  function missions() {
    open(`<button class="x" id="x">✕</button><h2>Missions</h2><p class="sub">Finish them for gems. New ones roll in when you claim.</p><div class="mlist" id="ml"></div>`);
    renderMissions($("#ml")); $("#x").onclick = () => { close(); refreshMenu(); };
  }
  function daily() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<button class="x" id="x">✕</button><h2>Daily gift</h2><p class="sub">Come back every day — the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => {
        const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next;
        return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b><i class="gem-ico"></i>${g}</b></div>`;
      }).join("")}</div>
      <div class="stack"><button class="btn gold" id="dl" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " gems" : "Come back tomorrow"}</button></div>`);
    $("#x").onclick = close;
    $("#dl").onclick = () => {
      const g = C.daily[next - 1]; S.gems += g; S.daily = { last: day(), streak: next }; save();
      Sound.play("buy"); toast(`+${g} gems`); close(); refreshMenu();
    };
  }
  function how() {
    open(`<button class="x" id="x">✕</button><h2>How to hop</h2>
      <div class="how">
        <div><i>↔</i><span><b>Drag</b> left and right anywhere to steer. The orb bounces on its own.</span></div>
        <div><i>◆</i><span>Land on the <b>centre</b> for PERFECT. Chain them: every 5 in a row adds to your multiplier.</span></div>
        <div><i>⚡</i><span>PERFECTs fill the <b>Fever</b> meter: x2 score, wider tiles and a gem on every hop.</span></div>
        <div><i>»</i><span><b>Boost pads</b> launch you over a gap through a line of gems. Sliding and small tiles test your aim.</span></div>
        <div><i>●</i><span>Power orbs: <b>Shield</b> saves one miss, <b>Magnet</b> pulls in gems, <b>Slow-mo</b> calms things down.</span></div>
        <div><i>⌂</i><span>Pass a glowing gate to enter a new world. Each one is a little faster.</span></div>
      </div>
      <div class="stack"><button class="btn" id="hw">Got it</button></div>`);
    $("#x").onclick = close; $("#hw").onclick = close;
  }
  function pause() {
    if (Game.mode !== "play" && Game.mode !== "ready") return;
    Game.pause(true);
    open(`<h2>Paused</h2><p class="sub">Score ${Game.run.score}</p>
      <div class="stack"><button class="btn" id="ps-go">Resume</button><button class="btn ghost" id="ps-home">Quit to menu</button></div>`);
    $("#ps-go").onclick = () => { close(); Game.pause(false); };
    $("#ps-home").onclick = () => { close(); Game.pause(false); home(); };
  }

  /* ---------- flow ---------- */
  function refreshMenu() {
    document.querySelectorAll("[data-gems]").forEach(e => e.textContent = S.gems);
    $("#m-best").textContent = S.best;
    const c = claimable(); $("#b-missions").hidden = !c; $("#b-missions").textContent = c;
    $("#b-daily").hidden = !dailyReady();
    $("#m-sfx").textContent = "♪"; $("#m-sfx").classList.toggle("off", !Sound.sfx);
    $("#m-music").textContent = "♫"; $("#m-music").classList.toggle("off", !Sound.music);
  }
  function home() { document.body.dataset.at = "menu"; Game.attract(); refreshMenu(); }
  function play() {
    Sound.unlock();
    document.body.dataset.at = "play";
    Game.prepare(); refreshHud();
    $("#hint").hidden = false;
  }

  $("#tagline").textContent = C.tagline;
  Game.setSkin(S.skin);
  $("#m-play").onclick = () => { Sound.unlock(); Sound.play("tap"); play(); };
  $("#m-shop").onclick = () => { Sound.unlock(); Sound.play("tap"); shop(); };
  $("#m-missions").onclick = () => { Sound.unlock(); Sound.play("tap"); missions(); };
  $("#m-daily").onclick = () => { Sound.unlock(); Sound.play("tap"); daily(); };
  $("#m-how").onclick = () => { Sound.unlock(); Sound.play("tap"); how(); };
  $("#m-sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); refreshMenu(); };
  $("#m-music").onclick = () => { Sound.unlock(); Sound.toggleMusic(); refreshMenu(); };
  $("#h-pause").onclick = pause;
  addEventListener("keydown", e => { if (e.key === "Escape" || e.key === "p") { if (wrap.hidden) pause(); } });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Game.mode === "play") pause(); });
  refreshMenu();

  return { play, home, shop, missions, daily, how, pause, state: S, refreshHud };
})();
