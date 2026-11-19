/* SANDSTORM SURVIVORS — title (hero + stage pick), HUD, level-up cards, chests, revive, results, upgrades shop, gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, X = window.Pix, $ = q => document.querySelector(q);
  const fresh = () => ({ coins: 0, meta: {}, heroes: ["rookie"], hero: "rookie", stage: 0, cleared: 0, best: {}, daily: { last: "", streak: 0 }, runs: 0 });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  const at = s => document.body.dataset.at = s;
  const fmt = t => { t = Math.max(0, Math.floor(t)); return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
  const iconOf = o => o.kind === "weapon" ? o.id : o.kind === "passive" ? C.passives[o.id].icon : o.kind === "heal" ? "cross" : "ring";

  /* ---------- HUD ---------- */
  let gearKey = "";
  function hud() {
    if (document.body.dataset.at === "play" && Game.hero) {
      const h = Game.hero;
      $("#h-xp").style.width = `calc(${Math.min(100, h.xp / h.next * 100).toFixed(1)}% - 4px)`; $("#h-lv").textContent = "LV " + h.level;
      $("#h-time").textContent = fmt(Game.time); $("#h-kills").textContent = Game.kills; $("#h-coins").textContent = Game.coins;
      const b = Game.boss; $("#h-boss").hidden = !b; if (b) { $("#h-bname").textContent = b.name.toUpperCase(); $("#h-bhp").style.width = Math.max(0, b.hp / b.max * 100) + "%"; }
      const key = JSON.stringify([Game.weapons, Game.passives]);
      if (key !== gearKey) { gearKey = key; const box = $("#h-gear"); box.innerHTML = ""; for (const [k, lv] of Object.entries(Game.weapons)) { const d = document.createElement("div"); d.appendChild(X.iconCanvas(k, 22)); d.insertAdjacentHTML("beforeend", `<b>${lv}</b>`); box.appendChild(d); } for (const [k, lv] of Object.entries(Game.passives)) { const d = document.createElement("div"); d.appendChild(X.iconCanvas(C.passives[k].icon, 22)); d.insertAdjacentHTML("beforeend", `<b>${lv}</b>`); box.appendChild(d); } }
      if (Game.time > 6) $("#hint").hidden = true;
    }
    requestAnimationFrame(hud);
  }
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
  Game.on.banner = txt => { const b = $("#banner"); b.hidden = false; b.textContent = txt; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; clearTimeout(b._t); b._t = setTimeout(() => b.hidden = true, 2200); };
  Game.on.joy = (onn, x, y, dx, dy) => { const j = $("#joy"); if (!onn || document.body.dataset.at !== "play") { j.hidden = true; return; } j.hidden = false; j.style.left = x + "px"; j.style.top = y + "px"; $("#knob").style.transform = `translate(${dx}px,${dy}px)`; };

  /* ---------- panels ---------- */
  const wrap = $("#wrap"), panel = $("#panel");
  function open(html, x = true) { panel.innerHTML = (x ? `<button class="x" data-close>✕</button>` : "") + html; wrap.hidden = false; panel.querySelectorAll("[data-close]").forEach(b => b.onclick = close); }
  function close() { wrap.hidden = true; panel.innerHTML = ""; refresh(); }
  function describe(o) {
    if (o.kind === "heal") return { name: "Full Heal", desc: "Restore all health.", tag: "" };
    if (o.kind === "gold") return { name: "Coin Pouch", desc: "+25 coins.", tag: "" };
    if (o.kind === "passive") { const p = C.passives[o.id]; return { name: p.name, desc: p.desc, tag: o.lv === 1 ? "NEW" : "LV " + o.lv }; }
    const w = C.weapons[o.id]; if (o.lv === 1) return { name: w.name, desc: w.desc, tag: "NEW" };
    const diff = [];
    for (const f of ["dmg", "count", "chain", "radius", "range"]) if (w[f] && w[f][o.lv - 1] !== w[f][o.lv - 2]) diff.push({ dmg: "damage", count: "count", chain: "chain", radius: "area", range: "range" }[f] + " " + w[f][o.lv - 2] + "→" + w[f][o.lv - 1]);
    if (w.cd && w.cd[o.lv - 1] !== w.cd[o.lv - 2]) diff.push("faster");
    if (w.pierce && w.pierce[o.lv - 1] > w.pierce[o.lv - 2]) diff.push("pierces");
    return { name: w.name, desc: diff.join(", "), tag: "LV " + o.lv };
  }
  function cards(opts, onPick) {
    const box = document.createElement("div"); box.className = "cards";
    opts.forEach(o => { const d = describe(o), c = document.createElement("button"); c.className = "card"; c.appendChild(X.iconCanvas(iconOf(o), 48)); c.insertAdjacentHTML("beforeend", `<div class="meta"><b>${d.name}${d.tag ? `<span class="tag2 ${d.tag === "NEW" ? "" : "lv"}">${d.tag}</span>` : ""}</b><small>${d.desc}</small></div>`); c.onclick = () => onPick(o); box.appendChild(c); });
    return box;
  }
  let rerolled = false;
  Game.on.levelup = opts => {
    open(`<h2>LEVEL UP!</h2><p class="sub">Pick one</p><div id="lc"></div><button class="px-btn blue" id="rr" style="margin-top:12px" ${rerolled ? "disabled" : ""}>REROLL<span class="ad">AD</span></button>`, false);
    $("#lc").appendChild(cards(opts, o => { Sound.play("pick"); close(); at("play"); Game.choose(o); }));
    $("#rr").onclick = async () => { const ok = await Ads.showRewarded(); if (ok) { rerolled = true; Game.on.levelup(Game.reroll ? Game.reroll() : opts); } };
  };
  Game.on.chest = got => {
    if (!got.length) return;
    toast("CHEST: " + got.map(o => describe(o).name + (o.lv ? " " + o.lv : "")).join(" + "));
  };
  Game.on.dead = (r, o) => {
    const canMeta = S.meta.revive && o.canRevive, canAd = o.canRevive;
    if (canMeta || canAd) {
      open(`<h2>YOU FELL!</h2><p class="sub">${fmt(r.time)} survived · get back up?</p>
        <div style="display:grid">${canMeta ? `<button class="px-btn go" id="rv-m">SECOND WIND</button>` : `<button class="px-btn blue" id="rv-a">REVIVE<span class="ad">AD</span></button>`}<button class="px-btn" id="rv-no">GIVE UP</button></div>`, false);
      const m = $("#rv-m"); if (m) m.onclick = () => { close(); at("play"); Game.revive(); };
      const a = $("#rv-a"); if (a) a.onclick = async () => { const ok = await Ads.showRewarded(); if (ok) { close(); at("play"); Game.revive(); } else results(r); };
      $("#rv-no").onclick = () => results(r);
    } else results(r);
  };
  Game.on.end = r => setTimeout(() => results(r), 900);
  function results(r) {
    const bonus = Math.floor(r.time / 10) + r.kills / 20 | 0, win = r.won ? 300 : 0;
    const earned = Math.round((r.coins + bonus + win) * (1 + (S.meta.greed || 0) * 0.1));
    S.coins += earned; S.runs++;
    const prev = S.best[r.stage] || 0; if (r.time > prev) S.best[r.stage] = Math.floor(r.time);
    let unlocked = false; if (r.won && r.stage >= S.cleared) { S.cleared = r.stage + 1; unlocked = r.stage + 1 < C.stages.length; }
    save();
    let doubled = false;
    open(`<h2>${r.won ? "DAWN BREAKS!" : "RUN OVER"}</h2><p class="sub">${C.stages[r.stage].name}${r.won ? " cleared" : ""}${unlocked ? " · new stage unlocked!" : ""}</p>
      <div class="statgrid"><div><b>${fmt(r.time)}</b><small>SURVIVED</small></div><div><b>${r.kills}</b><small>KOs</small></div><div><b>${r.level}</b><small>LEVEL</small></div></div>
      <p style="font-size:22px;margin:4px 0" class="gold">+$ ${earned}</p>
      <div style="display:grid"><button class="px-btn blue" id="r-d">DOUBLE COINS<span class="ad">AD</span></button><div class="row2"><button class="px-btn" id="r-h">MENU</button><button class="px-btn go" id="r-a">AGAIN</button></div></div>`, false);
    $("#r-d").onclick = async () => { if (doubled) return; $("#r-d").disabled = true; const ok = await Ads.showRewarded(); if (ok) { doubled = true; S.coins += earned; save(); Sound.play("coin"); toast("+$ " + earned); } else $("#r-d").disabled = false; };
    const ad = () => C.ads.interstitialEvery > 0 && S.runs % C.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve();
    $("#r-h").onclick = async () => { close(); await ad(); home(); };
    $("#r-a").onclick = async () => { close(); await ad(); go(); };
  }
  function pause() {
    if (Game.mode !== "play") return;
    Game.pause(true);
    open(`<h2>PAUSED</h2><p class="sub">${fmt(Game.time)} · ${Game.kills} KOs</p><div style="display:grid"><button class="px-btn go" id="p-go">RESUME</button><button class="px-btn" id="p-q">QUIT RUN</button></div>`, false);
    $("#p-go").onclick = () => { close(); at("play"); Game.pause(false); };
    $("#p-q").onclick = () => { close(); Game.pause(false); Game.attract(); home(); };
  }

  /* ---------- run ---------- */
  function go() {
    close(); Sound.unlock(); at("play"); rerolled = false; gearKey = "";
    Game.start(S.stage, S.hero, S.meta);
    $("#hint").hidden = S.runs > 1;
  }

  /* ---------- title pickers ---------- */
  // hero card: side view holding its gun, drawn at 1× and scaled up 2× by CSS
  function heroCanvas(h) {
    const c = document.createElement("canvas"); c.width = 24; c.height = 21; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.drawImage(X.get("heroSide", 0, { pal: X.heroPal(h), key: h.id }), 1, 6);
    const G = X.gun(h.gun), px = 12, py = 15; g.drawImage(G.img, px - G.px, py - G.py);
    g.fillStyle = X.K; g.fillRect(px - 2, py - 1, 3, 3); g.fillStyle = h.skin; g.fillRect(px - 1, py, 2, 2);
    return c;
  }
  function buildPickers() {
    const hb = $("#heroes"); hb.innerHTML = "";
    C.heroes.forEach(h => {
      const own = S.heroes.includes(h.id), b = document.createElement("button"); b.className = "hb" + (S.hero === h.id ? " on" : "") + (own ? "" : " lock");
      b.appendChild(heroCanvas(h)); b.insertAdjacentHTML("beforeend", `${h.name.toUpperCase()}${own ? "" : `<small>$${h.price}</small>`}`);
      b.onclick = () => {
        Sound.unlock(); Sound.play("tap");
        if (!own) { if (S.coins < h.price) { toast(`NEED $${h.price - S.coins} MORE`); return; } S.coins -= h.price; S.heroes.push(h.id); toast(h.name.toUpperCase() + " JOINS! " + h.note); }
        S.hero = h.id; save(); refresh();
      };
      hb.appendChild(b);
    });
    const sb = $("#stages"); sb.innerHTML = "";
    C.stages.forEach((s, i) => {
      const ok = i <= S.cleared, b = document.createElement("button"); b.className = "sb" + (S.stage === i ? " on" : "") + (ok ? "" : " lock");
      b.innerHTML = `${s.name.toUpperCase()}<small>${ok ? (S.best[i] ? "BEST " + fmt(S.best[i]) : "NEW") : "🔒 CLEAR " + C.stages[i - 1].name.toUpperCase()}</small>`;
      b.onclick = () => { Sound.play("tap"); if (!ok) { toast("SURVIVE 10:00 ON " + C.stages[i - 1].name.toUpperCase()); return; } S.stage = i; save(); refresh(); };
      sb.appendChild(b);
    });
  }
  function shop() {
    open(`<h2>UPGRADES</h2><p class="sub">Permanent boosts · you have <span class="gold">$ ${S.coins}</span></p><div class="list" id="ml"></div>`);
    const icons = { power: "fist", health: "heart", swift: "boot", reach: "magnet", greed: "ring", revive: "cross" };
    Object.entries(C.meta).forEach(([k, m]) => {
      const lv = S.meta[k] || 0, price = m.cost[lv], el = document.createElement("div"); el.className = "li";
      el.appendChild(X.iconCanvas(icons[k], 32));
      el.insertAdjacentHTML("beforeend", `<div class="meta"><b>${m.name.toUpperCase()}</b><small>${m.desc}</small><div class="pips">${m.cost.map((_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div></div>${price != null ? `<button class="px-btn gold" data-k="${k}" style="min-height:36px;font-size:13px">$${price}</button>` : `<b>MAX</b>`}`);
      $("#ml").appendChild(el);
    });
    panel.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k, price = C.meta[k].cost[S.meta[k] || 0]; if (S.coins < price) { toast(`NEED $${price - S.coins} MORE`); return; } S.coins -= price; S.meta[k] = (S.meta[k] || 0) + 1; save(); Sound.play("pick"); shop(); });
  }
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function gift() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<h2>DAILY GIFT</h2><p class="sub">The gift grows for 7 days in a row.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">DAY ${n}<b>$${g}</b></div>`; }).join("")}</div>
      <button class="px-btn gold" id="dl" style="width:calc(100% - 8px)" ${ready ? "" : "disabled"}>${ready ? "CLAIM $" + C.daily[next - 1] : "COME BACK TOMORROW"}</button>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S.coins += g; S.daily = { last: day(), streak: next }; save(); Sound.play("coin"); toast("+$ " + g); gift(); };
  }
  function sound() {
    open(`<h2>SOUND</h2><div style="display:grid;margin-top:10px"><button class="px-btn" id="s1">EFFECTS: ${Sound.sfx ? "ON" : "OFF"}</button><button class="px-btn" id="s2">MUSIC: ${Sound.music ? "ON" : "OFF"}</button></div>`);
    $("#s1").onclick = () => { Sound.unlock(); Sound.toggleSfx(); sound(); };
    $("#s2").onclick = () => { Sound.unlock(); Sound.toggleMusic(); sound(); };
  }

  /* ---------- title ---------- */
  function refresh() { document.querySelectorAll("[data-coins]").forEach(e => e.textContent = S.coins); $("#b-gift").hidden = !dailyReady(); buildPickers(); }
  function home() { close(); at("title"); if (Game.mode !== "attract") Game.attract(); refresh(); }
  $("#tagline").textContent = C.tagline;
  $("#t-go").onclick = () => { Sound.play("tap"); go(); };
  $("#t-shop").onclick = () => { Sound.unlock(); Sound.play("tap"); shop(); };
  $("#t-gift").onclick = () => { Sound.unlock(); Sound.play("tap"); gift(); };
  $("#t-sound").onclick = () => { Sound.unlock(); Sound.play("tap"); sound(); };
  $("#h-pause").onclick = pause;
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  refresh(); hud();
  return { go, home, shop, gift, pause, state: S, close };
})();
