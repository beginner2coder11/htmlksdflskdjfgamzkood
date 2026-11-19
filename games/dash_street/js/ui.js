/* DASH STREET — title, route map, level intro & results with stars, HUD, pause, dogs, upgrades, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, $ = q => document.querySelector(q);
  const fresh = () => ({ bones: 0, stars: {}, owned: ["corgi"], dog: "corgi", upg: { magnet: 0, double: 0, sprint: 0 }, daily: { last: "", streak: 0 }, played: 0, hinted: false });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  const boneTag = n => `<i class="bone"></i>${Math.floor(n).toLocaleString()}`;
  const at = s => document.body.dataset.at = s;
  const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
  const open_ = i => i === 0 || (S.stars[i - 1] || 0) > 0;
  const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + String(s).padStart(2, "0"); };
  function goalsOf(L, run) {
    const g = [{ k: 1, text: L.boss ? "Catch the runaway truck" : "Reach the finish in time", ok: run ? run.won : null }];
    g.push({ k: 2, text: `Collect ${run ? run.target : "most of the"} bones`, ok: run ? run.won && run.s2 : null });
    const t3 = L.boss ? `Catch it with ${L.fastLeft}+ s to spare` : L.goal3 === "time" ? `Finish with ${L.timeLeft}+ s to spare` : L.goal3 === "clean" ? "Don't bump into anything" : "Grab all 3 golden parcels";
    g.push({ k: 3, text: t3, ok: run ? run.won && run.s3 : null });
    return g;
  }

  /* ---------- HUD ---------- */
  function hudLoop() {
    const r = Game.run, L = Game.level;
    if (r && document.body.dataset.at === "play") {
      $("#h-time").textContent = fmt(r.timeLeft); $("#h-clock").classList.toggle("low", r.timeLeft < 6 && Game.mode === "play");
      $("#h-bones").textContent = Math.floor(r.bones); $("#h-target").textContent = "/" + r.target;
      const p = Game.progress(); $("#h-prog").style.width = (p * 100).toFixed(1) + "%"; $("#h-pin").style.left = (p * 100).toFixed(1) + "%";
      $("#h-end").textContent = L.boss ? "🚚" : "🏁";
      const g3 = L.boss ? `⏱ ${L.fastLeft}s left` : L.goal3 === "time" ? `⏱ ${L.timeLeft}s left` : L.goal3 === "clean" ? `no bumps (${r.bumps})` : `parcels ${r.parcels}/3`;
      const ok3 = L.goal3 === "clean" ? (r.bumps === 0 ? "" : "bad") : L.goal3 === "parcels" ? (r.parcels >= 3 ? "ok" : "") : "";
      const tr = L.boss && Game.truck ? `<span>🚚 ${Math.max(0, Math.round(Game.truck.gap - 3))} m away</span>` : "";
      const html = tr + `<span class="${r.bones >= r.target ? "ok" : ""}">★★ ${Math.floor(r.bones)}/${r.target} bones</span><span class="${ok3}">★★★ ${g3}</span>`;
      if ($("#h-goals").innerHTML !== html) $("#h-goals").innerHTML = html;
      const items = ["magnet", "double", "sprint"].filter(k => r[k] > 0); if (r.shield > 0) items.push("shield");
      const pw = $("#h-powers"), key = items.join(",");
      if (pw.dataset.k !== key) { pw.dataset.k = key; pw.innerHTML = ""; items.forEach(k => { const d = document.createElement("div"); d.className = "pw"; d.style.setProperty("--c", C.powers[k].color); d.appendChild(iconCanvas(k, 32)); if (k !== "shield") d.insertAdjacentHTML("beforeend", `<div class="bar"><i data-k="${k}"></i></div>`); pw.appendChild(d); }); }
      pw.querySelectorAll("[data-k]").forEach(i => { const k = i.dataset.k; i.style.width = (r[k] / Game.durOf(k) * 100).toFixed(0) + "%"; });
    }
    requestAnimationFrame(hudLoop);
  }
  function iconCanvas(k, px) { const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); c.width = c.height = px * dpr; c.style.width = c.style.height = px + "px"; const g = c.getContext("2d"); g.scale(dpr, dpr); const r = px * 0.42; g.fillStyle = C.powers[k].color; g.strokeStyle = "#2a2340"; g.lineWidth = 2.5; g.beginPath(); g.arc(px / 2, px / 2, r, 0, Math.PI * 2); g.fill(); g.stroke(); Game.powerIcon(g, k, px / 2, px / 2, r); return c; }
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close>✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; refresh(); }

  /* ---------- flow ---------- */
  function intro(i) {
    const L = C.levels[i], best = S.stars[i] || 0;
    open(`<h2>${L.boss ? "Truck chase!" : "Level " + L.n}</h2><p class="sub">${C.worlds[L.world].name} · ${L.boss ? "catch the runaway delivery truck" : L.length + " m"} · ${fmt(L.time)} on the clock</p>
      <div class="glist">${goalsOf(L).map((g, k) => `<div class="${best > k ? "ok" : ""}"><b>${"★".repeat(g.k)}</b>${g.text}</div>`).join("")}</div>
      ${L.boss ? `<p class="sub" style="margin-top:10px">Dash pads close the gap. Every bump lets the truck pull away. Hop over the boxes it throws!</p>` : ""}
      <div class="stack"><button class="btn" id="go">GO!</button></div>`);
    $("#go").onclick = () => play(i);
  }
  function play(i) {
    close(); Sound.unlock(); at("play");
    Game.setDog(S.dog); Game.setUpgrades(S.upg); Game.start(i);
    if (!S.hinted) toast("Swipe ← → to change lanes · ↑ jump · ↓ slide");
  }
  Game.on.finish = (run, L) => {
    const i = L.n - 1, old = S.stars[i] || 0, stars = run.won ? run.stars : 0;
    const bones = Math.floor(run.bones), bonus = Math.max(0, stars - old) * 20;
    if (stars > old) S.stars[i] = stars;
    S.bones += bones + bonus; S.played++; S.hinted = true; save();
    let doubled = false;
    const next = i + 1 < C.levels.length && open_(i + 1);
    open(`<h2>${run.won ? (L.boss ? "Caught it!" : "Delivered!") : "Time's up!"}</h2>
      <div class="bigstars"><i></i><i></i><i></i></div>
      <div class="glist">${goalsOf(L, run).map(g => `<div class="${g.ok ? "ok" : "no"}"><b>${"★".repeat(g.k)}</b>${g.ok ? "✓ " : ""}${g.text}</div>`).join("")}</div>
      <p class="sub" style="margin-top:10px">${run.won ? `${fmt(run.timeLeft)} left · ` : ""}${run.bumps} bump${run.bumps === 1 ? "" : "s"}</p>
      <p style="font-size:24px;margin:6px 0;display:flex;justify-content:center;align-items:center;gap:6px">+${boneTag(bones + bonus)}</p>
      <div class="stack">${bones > 0 ? `<button class="btn blue" id="r-dbl">Double bones <span class="ad">AD</span></button>` : ""}
        <div class="row2"><button class="btn white" id="r-retry">Retry</button>${run.won && next ? `<button class="btn" id="r-next">Next ›</button>` : `<button class="btn" id="r-map">Route</button>`}</div></div>`, false);
    sheet.querySelectorAll(".bigstars i").forEach((s, k) => setTimeout(() => { s.classList.add("pop"); if (k < stars) { s.classList.add("on"); Sound.play("coin"); } }, 300 + k * 300));
    const d = $("#r-dbl"); if (d) d.onclick = async () => { if (doubled) return; d.disabled = true; const ok = await Ads.showRewarded(); if (ok) { doubled = true; S.bones += bones; save(); Sound.play("buy"); toast(`+${bones} bones`); } else d.disabled = false; };
    const ad = () => C.ads.interstitialEvery > 0 && S.played % C.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve();
    $("#r-retry").onclick = async () => { close(); await ad(); play(i); };
    const n = $("#r-next"); if (n) n.onclick = async () => { close(); await ad(); intro(i + 1); };
    const m = $("#r-map"); if (m) m.onclick = async () => { close(); await ad(); map(); };
  };
  function pause() {
    if (Game.mode !== "play" && Game.mode !== "countdown") return;
    Game.pause(true);
    open(`<h2>Paused</h2><p class="sub">Level ${Game.level.n} · ${fmt(Game.run.timeLeft)} left</p><div class="stack"><button class="btn" id="p-go">Resume</button><div class="row2"><button class="btn white" id="p-retry">Restart</button><button class="btn white" id="p-map">Route</button></div></div>`, false);
    $("#p-go").onclick = () => { close(); at("play"); Game.pause(false); };
    $("#p-retry").onclick = () => { const i = Game.level.n - 1; Game.pause(false); play(i); };
    $("#p-map").onclick = () => { Game.pause(false); Game.attract(); map(); };
  }

  /* ---------- route map ---------- */
  function map() {
    close(); at("map"); if (Game.mode !== "attract") Game.attract(); refresh();
    const box = $("#streets"); box.innerHTML = "";
    const firstNew = C.levels.findIndex((_, i) => open_(i) && !S.stars[i]);
    C.worlds.forEach((w, wi) => {
      const el = document.createElement("div"); el.className = "street";
      el.style.background = `linear-gradient(160deg, ${w.sky[0]}, ${w.ground})`;
      const got = C.levels.filter(l => l.world === wi).reduce((a, l) => a + (S.stars[l.n - 1] || 0), 0);
      el.innerHTML = `<div class="road"></div><h3>${w.name}<small>★ ${got}/36</small></h3><div class="nodes"></div>`;
      const g = el.querySelector(".nodes");
      C.levels.filter(l => l.world === wi).forEach(L => {
        const i = L.n - 1, ok = open_(i), st = S.stars[i] || 0, b = document.createElement("button");
        b.className = "node" + (ok ? "" : " lock") + (L.boss ? " boss" : "") + (i === firstNew ? " next" : "");
        b.innerHTML = ok ? `${L.boss ? "🚚" : L.n}<small>${"★".repeat(st)}${"☆".repeat(3 - st)}</small>` : "🔒";
        if (ok) b.onclick = () => { Sound.unlock(); Sound.play("tap"); intro(i); };
        g.appendChild(b);
      });
      box.appendChild(el);
    });
    const nx = box.querySelector(".next"); if (nx) setTimeout(() => nx.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  }

  /* ---------- shop ---------- */
  function dogs() {
    open(`<h2>Dogs</h2><p class="sub">You have ${boneTag(S.bones)}</p><div class="dogs" id="dg"></div>`);
    C.dogs.forEach(d => {
      const own = S.owned.includes(d.id), on = S.dog === d.id, c = document.createElement("button");
      c.className = "palc" + (on ? " on" : "");
      const cv = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); cv.width = 78 * dpr; cv.height = 92 * dpr;
      const g = cv.getContext("2d"); g.scale(dpr, dpr); g.translate(39, 88); g.scale(0.62, 0.62); Game.dogArt(g, d, { run: 0.25, t: 0 });
      c.appendChild(cv);
      c.insertAdjacentHTML("beforeend", `<b>${d.name}</b><small>${d.breed} · ${d.perk}</small><span class="price">${on ? "On duty" : own ? "Choose" : boneTag(d.price)}</span>`);
      c.onclick = () => {
        if (!own) { if (S.bones < d.price) { toast(`You need ${(d.price - S.bones).toLocaleString()} more bones`); return; } S.bones -= d.price; S.owned.push(d.id); Sound.play("buy"); }
        else Sound.play("tap");
        S.dog = d.id; Game.setDog(d.id); save(); dogs();
      };
      $("#dg").appendChild(c);
    });
  }
  function upgrades() {
    open(`<h2>Upgrades</h2><p class="sub">You have ${boneTag(S.bones)} · each level adds 1 second</p><div class="list" id="ul"></div>`);
    ["magnet", "double", "sprint"].forEach(k => {
      const lv = S.upg[k], price = C.upgradeCosts[lv], el = document.createElement("div"); el.className = "li";
      el.appendChild(iconCanvas(k, 40));
      el.insertAdjacentHTML("beforeend", `<div class="meta"><b>${C.powers[k].name}</b><small>${C.powers[k].base + lv} s now</small><div class="dots">${C.upgradeCosts.map((_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div></div>
        ${price != null ? `<button class="btn small ${S.bones >= price ? "" : "white"}" data-k="${k}">${boneTag(price)}</button>` : `<b>MAX</b>`}`);
      $("#ul").appendChild(el);
    });
    sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k, price = C.upgradeCosts[S.upg[k]]; if (S.bones < price) { toast(`You need ${(price - S.bones).toLocaleString()} more bones`); return; } S.bones -= price; S.upg[k]++; save(); Game.setUpgrades(S.upg); Sound.play("buy"); upgrades(); });
  }
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function gift() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<h2>Daily gift</h2><p class="sub">Come back every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b>${boneTag(g)}</b></div>`; }).join("")}</div>
      <button class="btn yellow" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " bones" : "Come back tomorrow"}</button>
      <div class="row2" style="margin-top:12px"><button class="btn small white" id="sfx">Sound: ${Sound.sfx ? "On" : "Off"}</button><button class="btn small white" id="mus">Music: ${Sound.music ? "On" : "Off"}</button></div>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S.bones += g; S.daily = { last: day(), streak: next }; save(); Sound.play("buy"); toast(`+${g} bones`); gift(); };
    $("#sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); gift(); };
    $("#mus").onclick = () => { Sound.unlock(); Sound.toggleMusic(); gift(); };
  }

  /* ---------- title ---------- */
  function refresh() { document.querySelectorAll("[data-bones]").forEach(e => e.textContent = Math.floor(S.bones).toLocaleString()); $("#t-stars").textContent = totalStars(); $("#b-gift").hidden = !dailyReady(); }
  function home() { close(); at("title"); if (Game.mode !== "attract") Game.attract(); refresh(); }
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.unlock(); Sound.play("tap"); if (!totalStars()) intro(0); else map(); };
  $("#t-dogs").onclick = () => { Sound.unlock(); Sound.play("tap"); dogs(); };
  $("#t-up").onclick = () => { Sound.unlock(); Sound.play("tap"); upgrades(); };
  $("#t-gift").onclick = () => { Sound.unlock(); Sound.play("tap"); gift(); };
  $("#m-back").onclick = () => { Sound.play("tap"); home(); };
  $("#h-pause").onclick = pause;
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  Game.setDog(S.dog); Game.setUpgrades(S.upg);
  refresh(); hudLoop();
  return { map, intro, play, home, dogs, upgrades, gift, pause, state: S, close };
})();
