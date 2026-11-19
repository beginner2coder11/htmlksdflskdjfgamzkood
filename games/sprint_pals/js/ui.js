/* SPRINT PALS — title, HUD, missions & multiplier, revive, results, pals, upgrades, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, $ = q => document.querySelector(q);
  const fresh = () => ({ coins: 0, best: 0, owned: ["bolt"], pal: "bolt", upg: { magnet: 0, double: 0, sneaker: 0, balloon: 0 }, mis: { set: [0, 1, 2], done: [false, false, false], ptr: 3, level: 0 }, daily: { last: "", streak: 0 }, runs: 0, hinted: false });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  const coinTag = n => `<i class="coin"></i>${n.toLocaleString()}`;
  const at = s => document.body.dataset.at = s;
  const mult = () => Math.min(C.maxMultiplier, 1 + S.mis.level);

  /* ---------- missions ---------- */
  const statOf = (st, r) => !r ? 0 : ({ runCoins: r.coins, runDist: r.dist, runJumps: r.jumps, runSlides: r.slides, runPowers: r.powers, runRoof: r.roof, runZone: r.zone, runDry: r.maxDry, runBalloons: r.balloons, runScore: r.score, runClose: r.close })[st] || 0;
  function checkMissions(r, live) {
    let changed = false;
    S.mis.set.forEach((mi, k) => {
      if (S.mis.done[k]) return;
      const m = C.missions[mi % C.missions.length];
      if (statOf(m.stat, r) >= m.goal) { S.mis.done[k] = true; changed = true; if (live) { toast("Mission done: " + m.text); Sound.play("mission"); } }
    });
    if (changed) save();
  }
  function rollSetIfDone() {
    if (!S.mis.done.every(Boolean)) return false;
    S.mis.level++; S.coins += 300;
    S.mis.set = [S.mis.ptr, S.mis.ptr + 1, S.mis.ptr + 2].map(i => i % C.missions.length); S.mis.ptr += 3; S.mis.done = [false, false, false];
    save(); return true;
  }
  function missionRows(r) {
    return S.mis.set.map((mi, k) => {
      const m = C.missions[mi % C.missions.length], v = S.mis.done[k] ? m.goal : Math.min(m.goal, Math.floor(statOf(m.stat, r)));
      return `<div class="li ${S.mis.done[k] ? "done" : ""}"><div class="meta"><b>${S.mis.done[k] ? "✓ " : ""}${m.text}</b><div class="bar"><i style="width:${(v / m.goal * 100).toFixed(0)}%"></i></div></div><small>${v.toLocaleString()}/${m.goal.toLocaleString()}</small></div>`;
    }).join("");
  }

  /* ---------- HUD ---------- */
  const hud = { score: $("#h-score"), coins: $("#h-coins"), dist: $("#h-dist"), mult: $("#h-mult"), pw: $("#h-powers") };
  const pwIcons = {};
  function hudLoop() {
    const r = Game.run;
    if (r && document.body.dataset.at === "play") {
      hud.score.textContent = Math.floor(r.score).toLocaleString(); hud.coins.textContent = Math.floor(r.coins); hud.dist.textContent = Math.floor(r.dist) + " m"; hud.mult.textContent = "x" + r.mult;
      const items = ["magnet", "double", "sneaker", "balloon"].filter(k => r[k] > 0);
      if (r.shield > 0) items.push("shield");
      const key = items.join(",");
      if (hud.pw.dataset.k !== key) {
        hud.pw.dataset.k = key; hud.pw.innerHTML = "";
        items.forEach(k => { const d = document.createElement("div"); d.className = "pw"; d.style.setProperty("--c", C.powers[k].color); d.appendChild(iconCanvas(k, 34)); if (k !== "shield") d.insertAdjacentHTML("beforeend", `<div class="bar"><i data-k="${k}"></i></div>`); hud.pw.appendChild(d); });
      }
      hud.pw.querySelectorAll("[data-k]").forEach(i => { const k = i.dataset.k; i.style.width = (r[k] / Game.durOf(k) * 100).toFixed(0) + "%"; });
      if (r.dist > 60 && !$("#swipehint").hidden) $("#swipehint").hidden = true;
      if (Math.random() < 0.05) checkMissions(r, true);
    }
    requestAnimationFrame(hudLoop);
  }
  function iconCanvas(k, px) {
    const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d"); g.scale(dpr, dpr); const r = px * 0.42;
    g.fillStyle = C.powers[k].color; g.strokeStyle = "#2a2340"; g.lineWidth = 2.5; g.beginPath(); g.arc(px / 2, px / 2, r, 0, Math.PI * 2); g.fill(); g.stroke();
    Game.powerIcon(g, k, px / 2, px / 2, r); return c;
  }
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  let timer = 0;
  function open(html, x = true) { clearInterval(timer); sheet.innerHTML = (x ? `<button class="x" data-close>✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); }
  function close() { clearInterval(timer); wrap.hidden = true; sheet.innerHTML = ""; refreshTitle(); }

  /* ---------- run flow ---------- */
  function play() {
    close(); Sound.unlock(); at("play");
    Game.setPal(S.pal); Game.setUpgrades(S.upg);
    Game.start({ mult: mult() });
    if (!S.hinted || S.runs < 2) $("#swipehint").hidden = false;
  }
  Game.on.crash = r => {
    checkMissions(r, false);
    const n = r.revives, cost = C.revive.coins[n];
    if (cost == null) return results(r);
    let left = 5;
    open(`<h2>Keep running?</h2><p class="sub">${Math.floor(r.dist)} m · score ${Math.floor(r.score).toLocaleString()}</p>
      <div class="ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="rg" cx="60" cy="60" r="52" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><b id="rn">5</b></div>
      <div class="stack">${n === 0 ? `<button class="btn blue" id="rv-ad">Revive <span class="ad">AD</span></button>` : ""}
        <button class="btn yellow" id="rv-c" ${S.coins >= cost ? "" : "disabled"}>Revive · ${coinTag(cost)}</button>
        <button class="btn white" id="rv-no">No thanks</button></div>`, false);
    timer = setInterval(() => { left -= 0.1; const fg = $("#rg"); if (!fg) return; fg.style.strokeDashoffset = (326.7 * (1 - left / 5)).toFixed(1); $("#rn").textContent = Math.max(0, Math.ceil(left)); if (left <= 0) { clearInterval(timer); results(r); } }, 100);
    const ad = $("#rv-ad"); if (ad) ad.onclick = async () => { clearInterval(timer); const ok = await Ads.showRewarded(); if (ok) { close(); at("play"); Game.revive(); } else results(r); };
    $("#rv-c").onclick = () => { clearInterval(timer); S.coins -= cost; save(); close(); at("play"); Game.revive(); };
    $("#rv-no").onclick = () => { clearInterval(timer); results(r); };
  };
  function results(r) {
    checkMissions(r, false);
    const coins = Math.floor(r.coins), score = Math.floor(r.score), nb = score > S.best;
    if (nb) S.best = score;
    S.coins += coins; S.runs++; S.hinted = true; save();
    const leveled = rollSetIfDone();
    let doubled = false;
    open(`<h2>${nb ? "New best!" : "Nice run!"}</h2>
      <p class="bigscore">${score.toLocaleString()}</p>${nb ? `<span class="newbest">NEW BEST</span>` : `<p class="sub">Best ${S.best.toLocaleString()}</p>`}
      <div class="stats"><div><b>${Math.floor(r.dist)} m</b><small>DISTANCE</small></div><div><b id="r-c">${coins}</b><small>COINS</small></div><div><b>x${r.mult}</b><small>MULTIPLIER</small></div></div>
      ${leveled ? `<p class="sub" style="color:#1fa060">All 3 missions done! Multiplier is now x${mult()} and +300 coins.</p>` : ""}
      <div class="list" style="margin-top:8px">${missionRows(r)}</div>
      <div class="stack">${coins > 0 ? `<button class="btn blue" id="r-dbl">Double coins <span class="ad">AD</span></button>` : ""}
        <div class="row2"><button class="btn white" id="r-home">Home</button><button class="btn" id="r-again">Run again</button></div></div>`, false);
    const d = $("#r-dbl"); if (d) d.onclick = async () => { if (doubled) return; d.disabled = true; const ok = await Ads.showRewarded(); if (ok) { doubled = true; S.coins += coins; save(); $("#r-c").textContent = coins * 2; Sound.play("buy"); } else d.disabled = false; };
    $("#r-again").onclick = async () => { close(); if (S.runs % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); play(); };
    $("#r-home").onclick = async () => { close(); if (S.runs % C.ads.interstitialEvery === 0) await Ads.showInterstitial(); home(); };
  }
  function pause() {
    if (Game.mode !== "play") return;
    Game.pause(true);
    open(`<h2>Paused</h2><p class="sub">${Math.floor(Game.run.dist)} m · ${Math.floor(Game.run.coins)} coins</p><div class="list">${missionRows(Game.run)}</div>
      <div class="stack"><button class="btn" id="p-go">Resume</button><button class="btn white" id="p-quit">Quit run</button></div>`, false);
    $("#p-go").onclick = () => { close(); at("play"); Game.pause(false); };
    $("#p-quit").onclick = () => { close(); Game.pause(false); Game.attract(); home(); };
  }
  function home() { close(); at("title"); if (Game.mode !== "attract") Game.attract(); refreshTitle(); }

  /* ---------- shop: pals ---------- */
  function pals() {
    open(`<h2>Pals</h2><p class="sub">You have ${coinTag(S.coins)}</p><div class="pals" id="pg"></div>`);
    C.pals.forEach(p => {
      const own = S.owned.includes(p.id), on = S.pal === p.id, c = document.createElement("button");
      c.className = "palc" + (on ? " on" : "");
      const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); cv.width = 78 * dpr; cv.height = 92 * dpr;
      const g = cv.getContext("2d"); g.scale(dpr, dpr); g.translate(39, 88); g.scale(0.44, 0.44); Game.palArt(g, p, { run: 0.3, t: 0 });
      c.appendChild(cv);
      c.insertAdjacentHTML("beforeend", `<b>${p.name}</b><small>${p.animal} · ${p.perk}</small><span class="price">${on ? "Running" : own ? "Choose" : coinTag(p.price)}</span>`);
      c.onclick = () => {
        if (!own) { if (S.coins < p.price) { toast(`You need ${(p.price - S.coins).toLocaleString()} more coins`); return; } S.coins -= p.price; S.owned.push(p.id); Sound.play("buy"); }
        else Sound.play("tap");
        S.pal = p.id; Game.setPal(p.id); save(); pals();
      };
      $("#pg").appendChild(c);
    });
  }
  /* ---------- shop: upgrades ---------- */
  function upgrades() {
    open(`<h2>Upgrades</h2><p class="sub">You have ${coinTag(S.coins)} · each level adds 1 second</p><div class="list" id="ul"></div>`);
    ["magnet", "double", "sneaker", "balloon"].forEach(k => {
      const lv = S.upg[k], price = C.upgradeCosts[lv], el = document.createElement("div"); el.className = "li";
      el.appendChild(iconCanvas(k, 40));
      el.insertAdjacentHTML("beforeend", `<div class="meta"><b>${C.powers[k].name}</b><small>${C.powers[k].base + lv} s now</small><div class="dots">${C.upgradeCosts.map((_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div></div>
        ${price != null ? `<button class="btn small ${S.coins >= price ? "" : "white"}" data-k="${k}">${coinTag(price)}</button>` : `<b>MAX</b>`}`);
      $("#ul").appendChild(el);
    });
    sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const k = b.dataset.k, price = C.upgradeCosts[S.upg[k]];
      if (S.coins < price) { toast(`You need ${(price - S.coins).toLocaleString()} more coins`); return; }
      S.coins -= price; S.upg[k]++; save(); Game.setUpgrades(S.upg); Sound.play("buy"); upgrades();
    });
  }
  function missions() {
    open(`<h2>Missions</h2><p class="sub">Finish all three to raise your score multiplier (now x${mult()}) and earn 300 coins.</p><div class="list">${missionRows(null)}</div>`);
  }
  /* ---------- daily gift & settings ---------- */
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function gift() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<h2>Daily gift</h2><p class="sub">Come back every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b>${coinTag(g)}</b></div>`; }).join("")}</div>
      <button class="btn yellow" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " coins" : "Come back tomorrow"}</button>
      <div class="row2" style="margin-top:12px"><button class="btn small white" id="sfx">Sound: ${Sound.sfx ? "On" : "Off"}</button><button class="btn small white" id="mus">Music: ${Sound.music ? "On" : "Off"}</button></div>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S.coins += g; S.daily = { last: day(), streak: next }; save(); Sound.play("buy"); toast(`+${g} coins`); gift(); };
    $("#sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); gift(); };
    $("#mus").onclick = () => { Sound.unlock(); Sound.toggleMusic(); gift(); };
  }

  /* ---------- title ---------- */
  function refreshTitle() {
    document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins.toLocaleString());
    $("#t-best").textContent = S.best.toLocaleString();
    $("#mis-strip").innerHTML = S.mis.set.map((mi, k) => { const m = C.missions[mi % C.missions.length]; return `<div class="${S.mis.done[k] ? "done" : ""}">${S.mis.done[k] ? "✓" : "▸"} ${m.text}<b>x${mult()}</b></div>`; }).join("");
    $("#b-gift").hidden = !dailyReady();
    const done = S.mis.done.filter(Boolean).length; $("#b-mis").hidden = !done; $("#b-mis").textContent = done + "/3";
  }
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.play("tap"); play(); };
  $("#t-pals").onclick = () => { Sound.unlock(); Sound.play("tap"); pals(); };
  $("#t-shop").onclick = () => { Sound.unlock(); Sound.play("tap"); upgrades(); };
  $("#t-missions").onclick = () => { Sound.unlock(); Sound.play("tap"); missions(); };
  $("#t-gift").onclick = () => { Sound.unlock(); Sound.play("tap"); gift(); };
  $("#h-pause").onclick = pause;
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); if (e.key === "Enter" && document.body.dataset.at === "title" && wrap.hidden) play(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  Game.setPal(S.pal); Game.setUpgrades(S.upg);
  refreshTitle(); hudLoop();
  return { play, home, pals, upgrades, missions, gift, pause, state: S, close };
})();
