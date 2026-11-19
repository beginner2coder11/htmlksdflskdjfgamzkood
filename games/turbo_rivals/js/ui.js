/* TURBO RIVALS — title, race select, HUD, results podium, garage (cars, paint, upgrades), daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, P = C.storagePrefix, $ = q => document.querySelector(q);
  const fresh = () => ({ coins: 0, best: {}, owned: ["zip"], car: "zip", paint: {}, up: {}, daily: { last: "", streak: 0 }, races: 0, hinted: false });
  let S = fresh();
  try { const r = localStorage.getItem(P + "save"); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
  const save = () => { try { localStorage.setItem(P + "save", JSON.stringify(S)); } catch (e) {} };
  const coinTag = n => `<i class="coin"></i>${Math.floor(n).toLocaleString()}`;
  const at = s => document.body.dataset.at = s;
  const ord = n => ["", "1ST", "2ND", "3RD", "4TH", "5TH"][n];
  const upOf = id => S.up[id] || (S.up[id] = { engine: 0, turbo: 0, tires: 0, nitro: 0 });
  const isOpen = i => i === 0 || (S.best[i - 1] && S.best[i - 1] <= 3);
  const wins = () => Object.values(S.best).filter(p => p === 1).length;
  function applyCar() { Game.setCar(S.car, S.paint[S.car], upOf(S.car)); }

  /* ---------- HUD ---------- */
  let dotsBuilt = 0;
  function hud() {
    if (document.body.dataset.at === "play") {
      const h = Game.hud(), pe = $("#h-pos");
      pe.textContent = ord(h.rank); pe.className = h.rank === 1 ? "gold" : h.rank === 2 ? "silver" : h.rank === 3 ? "bronze" : "";
      $("#h-kmh").textContent = h.kmh;
      const tr = $("#h-track");
      if (dotsBuilt !== h.rivals.length + 1) { tr.querySelectorAll(".dot").forEach(d => d.remove()); h.rivals.forEach(r => { const d = document.createElement("i"); d.className = "dot"; d.style.background = r.c; tr.appendChild(d); }); const me = document.createElement("i"); me.className = "dot me"; tr.appendChild(me); dotsBuilt = h.rivals.length + 1; }
      const ds = tr.querySelectorAll(".dot"); h.rivals.forEach((r, i) => ds[i].style.left = (r.p * 100).toFixed(1) + "%"); ds[ds.length - 1].style.left = (h.progress * 100).toFixed(1) + "%";
      const n = $("#h-nitro"), f = h.nitroOn ? 1 : h.nitro;
      $("#h-nfill").style.strokeDashoffset = (276.5 * (1 - f)).toFixed(1);
      n.classList.toggle("ready", h.nitro >= 0.999 && !h.nitroOn); n.classList.toggle("on", h.nitroOn);
      if (h.progress > 0.04) $("#hint").hidden = true;
    }
    requestAnimationFrame(hud);
  }
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  function open(html, x = true) { sheet.innerHTML = (x ? `<button class="x" data-close>✕</button>` : "") + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; refresh(); }
  function carCanvas(car, color, w = 120, h = 74) { const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1); c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px"; const g = c.getContext("2d"); g.scale(dpr, dpr); g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(w / 2, h - 6, w * 0.4, 6, 0, 0, Math.PI * 2); g.fill(); Game.carArt(g, w / 2, h - 6, w * 0.78, color, { body: car.body }); return c; }

  /* ---------- race flow ---------- */
  function race(i) {
    close(); Sound.unlock(); at("play"); applyCar(); dotsBuilt = 0;
    Game.start(i);
    $("#h-lvl").textContent = (C.levels[i].final ? "FINAL · " : "LEVEL ") + (i + 1);
    $("#hint").hidden = S.hinted && S.races > 1;
  }
  Game.on.finish = r => {
    Sound.engineOff();
    const i = r.level.n - 1, prev = S.best[i];
    if (!prev || r.place < prev) S.best[i] = r.place;
    const coins = C.rewards[r.place - 1] + r.overtakes * C.overtakeBonus + (r.level.final && r.place === 1 ? 300 : 0);
    S.coins += coins; S.races++; S.hinted = true; save();
    const next = i + 1 < C.levels.length && isOpen(i + 1);
    let doubled = false;
    open(`<h2>${r.place === 1 ? "VICTORY!" : r.place <= 3 ? "PODIUM!" : "SO CLOSE"}</h2>
      <p class="bigplace" style="color:${r.place === 1 ? "#ffd23f" : r.place === 2 ? "#d8dce8" : r.place === 3 ? "#e0915a" : "#fff"}">${ord(r.place)}</p>
      <p class="sub">${r.overtakes} overtake${r.overtakes === 1 ? "" : "s"} · ${r.time.toFixed(1)} s ${r.place > 3 ? "· finish in the top 3 to unlock the next race" : ""}</p>
      <div class="podium" id="pod"><div class="p2">2</div><div class="p1">1</div><div class="p3">3</div></div>
      <p class="reward">+${coinTag(coins)}</p>
      <div class="stack"><button class="btn cyan" id="r-dbl">Double coins <span class="ad">AD</span></button>
        <div class="row2"><button class="btn dark" id="r-retry">Retry</button>${next ? `<button class="btn" id="r-next">Next race ›</button>` : `<button class="btn" id="r-list">Races</button>`}</div></div>`, false);
    if (r.place <= 3) { const p = sheet.querySelector("#pod .p" + r.place); if (p) { p.classList.add("you"); p.innerHTML += "<small>YOU</small>"; p.appendChild(carCanvas(C.cars.find(c => c.id === S.car), S.paint[S.car] || C.cars.find(c => c.id === S.car).color, 70, 44)); } }
    const d = $("#r-dbl"); d.onclick = async () => { if (doubled) return; d.disabled = true; const ok = await Ads.showRewarded(); if (ok) { doubled = true; S.coins += coins; save(); Sound.play("buy"); toast(`+${coins} coins`); } else d.disabled = false; };
    const ad = () => C.ads.interstitialEvery > 0 && S.races % C.ads.interstitialEvery === 0 ? Ads.showInterstitial() : Promise.resolve();
    $("#r-retry").onclick = async () => { close(); await ad(); race(i); };
    const n = $("#r-next"); if (n) n.onclick = async () => { close(); await ad(); race(i + 1); };
    const l = $("#r-list"); if (l) l.onclick = async () => { close(); await ad(); levels(); };
  };
  function pause() {
    if (Game.mode !== "race" && Game.mode !== "countdown") return;
    Game.pause(true);
    open(`<h2>PAUSED</h2><div class="stack"><button class="btn" id="p-go">Resume</button><div class="row2"><button class="btn dark" id="p-re">Restart</button><button class="btn dark" id="p-q">Quit</button></div></div>`, false);
    $("#p-go").onclick = () => { close(); at("play"); Game.pause(false); };
    $("#p-re").onclick = () => { const i = Game.level.n - 1; Game.pause(false); race(i); };
    $("#p-q").onclick = () => { Game.pause(false); Sound.engineOff(); Game.attract(); levels(); };
  }

  /* ---------- race select ---------- */
  function levels() {
    close(); at("levels"); if (Game.mode !== "attract") { Sound.engineOff(); Game.attract(); } refresh();
    const box = $("#venues"); box.innerHTML = "";
    const firstNew = C.levels.findIndex((_, i) => isOpen(i) && !S.best[i]);
    C.venues.forEach((v, vi) => {
      const el = document.createElement("div"); el.className = "venue";
      el.style.background = `linear-gradient(150deg, ${v.sky[0]}, ${v.grass[0]})`;
      const podiums = C.levels.filter(l => l.venue === vi && S.best[l.n - 1] && S.best[l.n - 1] <= 3).length;
      el.innerHTML = `<h3>${v.name}<small>🏁 ${podiums}/10</small></h3><div class="lgrid"></div>`;
      const g = el.querySelector(".lgrid");
      C.levels.filter(l => l.venue === vi).forEach(L => {
        const i = L.n - 1, ok = isOpen(i), b = S.best[i], btn = document.createElement("button");
        btn.className = "lb" + (ok ? "" : " lock") + (b && b <= 3 ? " p" + b : "") + (i === firstNew ? " next" : "") + (L.final ? " final" : "");
        btn.innerHTML = ok ? `${L.final ? "🏆" : L.n}<small>${b ? ord(b) : ""}</small>` : "🔒";
        if (ok) btn.onclick = () => { Sound.unlock(); Sound.play("tap"); race(i); };
        g.appendChild(btn);
      });
      box.appendChild(el);
    });
  }

  /* ---------- garage ---------- */
  function garage(tab = "cars") {
    const car = C.cars.find(c => c.id === S.car);
    open(`<h2>GARAGE</h2><p class="sub">You have ${coinTag(S.coins)}</p>
      <div class="tabs"><button class="tab ${tab === "cars" ? "on" : ""}" data-t="cars">Cars</button><button class="tab ${tab === "tune" ? "on" : ""}" data-t="tune">Tune ${car.name}</button></div><div id="gb"></div>`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { Sound.play("tap"); garage(b.dataset.t); });
    const gb = $("#gb");
    if (tab === "cars") {
      gb.className = "cars";
      C.cars.forEach(c => {
        const own = S.owned.includes(c.id), on = S.car === c.id, el = document.createElement("div"); el.className = "carc" + (on ? " on" : "");
        el.appendChild(carCanvas(c, S.paint[c.id] || c.color, 110, 70));
        el.insertAdjacentHTML("beforeend", `<div class="meta"><b>${c.name}</b><div class="stats"><span>TOP ${c.top}</span><i><em style="width:${(c.top - 180) / 1}%"></em></i><span>ACCEL</span><i><em style="width:${c.accel * 10}%"></em></i><span>GRIP</span><i><em style="width:${c.grip * 10}%"></em></i><span>NITRO</span><i><em style="width:${c.nitro * 10}%"></em></i></div></div>
          ${on ? `<b style="font-style:italic;color:#ff6a2a">IN USE</b>` : own ? `<button class="btn small" data-use="${c.id}">Use</button>` : `<button class="btn small ${S.coins >= c.price ? "" : "dark"}" data-buy="${c.id}">${coinTag(c.price)}</button>`}`);
        gb.appendChild(el);
      });
      gb.querySelectorAll("[data-use]").forEach(b => b.onclick = () => { S.car = b.dataset.use; save(); applyCar(); Sound.play("tap"); garage("cars"); });
      gb.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const c = C.cars.find(x => x.id === b.dataset.buy); if (S.coins < c.price) { toast(`You need ${(c.price - S.coins).toLocaleString()} more coins`); return; } S.coins -= c.price; S.owned.push(c.id); S.car = c.id; save(); applyCar(); Sound.play("buy"); toast(c.name + " is yours!"); garage("cars"); });
    } else {
      const u = upOf(car.id);
      gb.innerHTML = `<div id="prev"></div><div class="paints">${C.paints.map(p => `<button style="background:${p}" class="${(S.paint[car.id] || car.color) === p ? "on" : ""}" data-p="${p}"></button>`).join("")}</div><div class="ups" id="ups"></div>`;
      $("#prev").appendChild(carCanvas(car, S.paint[car.id] || car.color, 220, 130));
      gb.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { S.paint[car.id] = b.dataset.p; save(); applyCar(); Sound.play("tap"); garage("tune"); });
      Object.entries(C.upgrades).forEach(([k, name]) => {
        const lv = u[k], price = C.upgradeCosts[lv], el = document.createElement("div"); el.className = "up";
        const what = { engine: `Top speed ${Math.round(car.top * (1 + lv * 0.04))} km/h`, turbo: `Acceleration ${car.accel + lv}`, tires: `Grip ${car.grip + lv}`, nitro: `Nitro ${car.nitro + lv}` }[k];
        el.innerHTML = `<div class="meta"><b>${name}</b><br><small style="font-family:system-ui;color:#a8a4c0;font-size:12px">${what}</small><div class="dots">${C.upgradeCosts.map((_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</div></div>${price != null ? `<button class="btn small ${S.coins >= price ? "" : "dark"}" data-u="${k}">${coinTag(price)}</button>` : `<b>MAX</b>`}`;
        $("#ups").appendChild(el);
      });
      gb.querySelectorAll("[data-u]").forEach(b => b.onclick = () => { const k = b.dataset.u, price = C.upgradeCosts[u[k]]; if (S.coins < price) { toast(`You need ${(price - S.coins).toLocaleString()} more coins`); return; } S.coins -= price; u[k]++; save(); applyCar(); Sound.play("buy"); garage("tune"); });
    }
  }
  const day = (o = 0) => { const d = new Date(Date.now() + o * 864e5); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const dailyReady = () => S.daily.last !== day();
  function gift() {
    const ready = dailyReady(), cont = S.daily.last === day(-1), next = ready ? (cont ? S.daily.streak % 7 + 1 : 1) : S.daily.streak;
    open(`<h2>DAILY GIFT</h2><p class="sub">Come back every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b>${coinTag(g)}</b></div>`; }).join("")}</div>
      <button class="btn" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " coins" : "Come back tomorrow"}</button>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S.coins += g; S.daily = { last: day(), streak: next }; save(); Sound.play("buy"); toast(`+${g} coins`); gift(); };
  }
  function sound() {
    open(`<h2>SOUND</h2><div class="stack"><button class="btn dark" id="s1">Sound effects: ${Sound.sfx ? "On" : "Off"}</button><button class="btn dark" id="s2">Music: ${Sound.music ? "On" : "Off"}</button></div>`);
    $("#s1").onclick = () => { Sound.unlock(); Sound.toggleSfx(); sound(); };
    $("#s2").onclick = () => { Sound.unlock(); Sound.toggleMusic(); sound(); };
  }

  /* ---------- title ---------- */
  function refresh() { document.querySelectorAll("[data-coins]").forEach(e => e.textContent = Math.floor(S.coins).toLocaleString()); $("#t-wins").textContent = wins(); $("#b-gift").hidden = !dailyReady(); }
  function home() { close(); at("title"); if (Game.mode !== "attract") { Sound.engineOff(); Game.attract(); } refresh(); }
  $("#tagline").textContent = C.tagline;
  $("#t-race").onclick = () => { Sound.unlock(); Sound.play("tap"); if (!S.races) race(0); else levels(); };
  $("#t-garage").onclick = () => { Sound.unlock(); Sound.play("tap"); garage(); };
  $("#t-gift").onclick = () => { Sound.unlock(); Sound.play("tap"); gift(); };
  $("#t-sound").onclick = () => { Sound.unlock(); Sound.play("tap"); sound(); };
  $("#lv-back").onclick = () => { Sound.play("tap"); home(); };
  $("#h-pause").onclick = pause;
  $("#h-nitro").addEventListener("pointerdown", e => { e.stopPropagation(); Game.fireNitro(); });
  addEventListener("keydown", e => { if ((e.key === "Escape" || e.key === "p") && wrap.hidden) pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  applyCar(); refresh(); hud();
  return { race, levels, home, garage, gift, pause, state: S, close };
})();
