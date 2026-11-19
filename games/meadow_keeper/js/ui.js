/* MEADOW KEEPER — HUD, Grow shop, placing, journal, photos, tasks, brambles, offline nectar, daily gift */
window.UI = (() => {
  const C = window.GAME_CONFIG, St = window.Store, A = window.Art, $ = q => document.querySelector(q);
  const S = () => St.S, IT = C.items;
  const drop = n => `<i class="i-drop"></i>${n}`, seed = n => `<i class="i-seed"></i>${n}`;
  const at = s => document.body.dataset.at = s;

  /* ---------- HUD ---------- */
  let lastN = null, lastSeeds = null;
  function hud() {
    const s = S();
    const n = Math.floor(s.nectar), e = $("#h-nectar");
    if (lastN !== null && n > lastN) { e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }
    lastN = n; e.textContent = n.toLocaleString();
    const sd = $("#h-seeds"); if (lastSeeds !== null && s.seeds > lastSeeds) { sd.classList.remove("bump"); void sd.offsetWidth; sd.classList.add("bump"); } lastSeeds = s.seeds; sd.textContent = s.seeds;
    $("#h-lv").textContent = St.level(); $("#h-xp").style.width = (St.levelProgress() * 100).toFixed(0) + "%";
    const r = Game.readyCount(); $("#gather").hidden = r < 3; $("#g-n").textContent = r;
    const claim = s.tasks.filter(i => C.tasks[i] && St.stat(C.tasks[i].stat) >= C.tasks[i].goal).length;
    $("#b-tasks").hidden = !claim; $("#b-tasks").textContent = claim;
    $("#b-more").hidden = !dailyReady();
    $("#b-journal").hidden = !newInJournal; $("#b-journal").textContent = "!";
  }
  setInterval(hud, 250);
  let newInJournal = false;
  let toastT = 0;
  function toast(m) { const t = $("#toast"); t.hidden = false; t.textContent = m; t.style.animation = "none"; void t.offsetWidth; t.style.animation = ""; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  /* ---------- game hooks ---------- */
  Game.on.collect = () => hud();
  Game.on.arrive = sp => {
    const el = $("#arrive"), isNew = !S().journal[sp.id];
    el.innerHTML = ""; el.appendChild(A.critterCanvas(sp.id, 34));
    el.insertAdjacentHTML("beforeend", `<span>${isNew ? "Someone new is visiting! Tap to photograph" : sp.name + " is visiting"}</span>`);
    el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 3200);
    Sound.play("arrive");
  };
  let polT = 0;
  Game.on.photo = (sp, first, reward, lvUp) => {
    const el = $("#polaroid"); el.innerHTML = `<div class="pic" id="pp">${first ? `<span class="new">NEW!</span>` : ""}</div><b>${sp.name}</b><small>${sp.note}</small>
      ${reward.seeds ? `<span class="rw">+${seed(reward.seeds)}</span>` : reward.nectar ? `<span class="rw">+${drop(reward.nectar)}</span>` : `<small>Already photographed this visit</small>`}`;
    $("#pp").appendChild(A.critterCanvas(sp.id, 140));
    el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(polT); polT = setTimeout(() => el.hidden = true, first ? 3200 : 1800);
    if (first) { newInJournal = true; setTimeout(() => Sound.play("newSpecies"), 250); }
    if (lvUp) setTimeout(levelUp, first ? 1200 : 400);
    hud();
  };
  $("#polaroid").onclick = () => { $("#polaroid").hidden = true; };
  function levelUp() {
    Sound.play("level");
    const l = St.level(), unlocked = Object.entries(IT).filter(([, it]) => it.lvl === l).map(([, it]) => it.name);
    open(`<h2>Garden level ${l}!</h2><p class="sub">${unlocked.length ? "New to grow: " + unlocked.join(", ") : "Your meadow is growing."}</p><div class="grid" id="lu"></div><div style="margin-top:14px"><button class="btn" data-close>Lovely</button></div>`, true);
    Object.entries(IT).filter(([, it]) => it.lvl === l).forEach(([id, it]) => { const c = document.createElement("div"); c.className = "card"; c.appendChild(A.itemCanvas(id, 64)); c.insertAdjacentHTML("beforeend", `<b>${it.name}</b>`); $("#lu").appendChild(c); });
  }
  Game.on.placing = ok => { $("#p-yes").disabled = !ok; };
  Game.on.itemTap = it => itemInfo(it);
  Game.on.bramble = (key, adj) => bramble(key, adj);
  Game.on.cottage = () => journal();

  /* ---------- sheets ---------- */
  const wrap = $("#wrap"), sheet = $("#sheet");
  function open(html, center = false) { sheet.className = "sheet" + (center ? " center" : ""); sheet.innerHTML = `<button class="x" data-close>✕</button>` + html; wrap.hidden = false; sheet.querySelectorAll("[data-close]").forEach(b => b.onclick = close); sheet.scrollTop = 0; }
  function close() { wrap.hidden = true; sheet.innerHTML = ""; hud(); }
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap) close(); });
  const lovers = id => C.visitors.filter(v => IT[id].tags.some(t => v.needs[t]));

  /* ---------- Grow shop ---------- */
  let shopTab = "flowers";
  function shop(tab = shopTab) {
    shopTab = tab;
    const lv = St.level();
    open(`<h2>Grow</h2><p class="sub">You have ${drop(Math.floor(S().nectar))} nectar · garden level ${lv}</p>
      <div class="tabs">${Object.entries(C.cats).map(([k, v]) => `<button class="tab ${k === tab ? "on" : ""}" data-t="${k}">${v}</button>`).join("")}</div><div class="grid" id="sg"></div>`);
    sheet.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { Sound.play("tap"); shop(b.dataset.t); });
    Object.entries(IT).filter(([, it]) => it.cat === tab).forEach(([id, it]) => {
      const lock = it.lvl > lv, can = S().nectar >= it.cost, c = document.createElement("button");
      c.className = "card" + (lock ? " lock" : "") + (!can && !lock ? " cant" : "");
      c.appendChild(A.itemCanvas(id, 70));
      const lv2 = lovers(id).slice(0, 4);
      c.insertAdjacentHTML("beforeend", `<b>${it.name}</b>${it.drop ? `<small>${it.drop} nectar a drop</small>` : `<small>${it.size === 2 ? "Big · 2×2" : "&nbsp;"}</small>`}<div class="ic" data-ic></div><span class="cost">${lock ? "🔒 Level " + it.lvl : drop(it.cost)}</span>`);
      const ic = c.querySelector("[data-ic]"); lv2.forEach(v => ic.appendChild(A.critterCanvas(v.id, 22, !S().journal[v.id])));
      c.onclick = () => {
        if (lock) { toast(`Reach garden level ${it.lvl} to grow this`); Sound.play("no"); return; }
        if (!can) { toast(`You need ${it.cost - Math.floor(S().nectar)} more nectar`); Sound.play("no"); return; }
        close(); beginPlace(id);
      };
      $("#sg").appendChild(c);
    });
  }
  let placeCost = 0, placingMove = null;
  function beginPlace(id, moving) {
    placeCost = moving ? 0 : IT[id].cost; placingMove = moving || null;
    Game.startPlacing(id, moving);
    document.body.classList.add("placing"); $("#placebar").hidden = false;
    $("#p-name").textContent = (moving ? "Move " : "") + IT[id].name + (moving ? "" : ` · ${IT[id].cost}`);
    $("#p-hint").textContent = "Drag it or tap a spot";
  }
  function endPlace() { document.body.classList.remove("placing"); $("#placebar").hidden = true; }
  $("#p-yes").onclick = () => {
    const id = Game.placing && Game.placing.id;
    if (!id) return;
    if (!placingMove && S().nectar < placeCost) { toast("Not enough nectar"); return; }
    if (Game.confirmPlace()) {
      if (!placingMove) { S().nectar -= placeCost; const up = St.addXp(Math.max(2, Math.round(placeCost / 5))); if (up) setTimeout(levelUp, 300); }
      St.save(); endPlace(); hud();
      if (!placingMove && S().nectar >= IT[id].cost && IT[id].cat === "flowers") toast("Planted! Tap Grow for more.");
    }
  };
  $("#p-no").onclick = () => { Game.cancelPlace(); endPlace(); };

  /* ---------- item info ---------- */
  function itemInfo(it) {
    const def = IT[it.id], lv = lovers(it.id);
    open(`<div class="li" style="background:none;padding:0"><span id="ii"></span><div class="meta"><h2>${def.name}</h2><small>${def.drop ? `Drops ${def.drop} nectar every half minute or so` : "Makes the meadow homelier"}</small></div></div>
      <p class="sub" style="margin-top:10px">${lv.length ? "Loved by:" : ""}</p><div class="list" id="il"></div>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn paper" id="i-move">Move</button><button class="btn paper" id="i-store">Pick up (+${Math.floor(def.cost / 2)})</button></div>`, true);
    $("#ii").appendChild(A.itemCanvas(it.id, 80));
    lv.forEach(v => { const known = !!S().journal[v.id], row = document.createElement("div"); row.className = "li"; row.appendChild(A.critterCanvas(v.id, 36, !known)); row.insertAdjacentHTML("beforeend", `<div class="meta"><b>${known ? v.name : "???"}</b><small>${needsText(v)}</small></div>`); $("#il").appendChild(row); });
    $("#i-move").onclick = () => { close(); beginPlace(it.id, it); };
    $("#i-store").onclick = () => { Game.removeItem(it); S().nectar += Math.floor(def.cost / 2); St.save(); close(); Sound.play("rustle"); };
  }
  const tagName = { flower: "flowers", white: "white flowers", yellow: "yellow flowers", red: "red flowers", purple: "purple flowers", blue: "blue flowers", clover: "clover", rocks: "rock pile", damp: "damp spots", pond: "pond", lily: "lily pond", beehotel: "bee hotel", nestbox: "nest box", feeder: "seed feeder", tree: "trees", birdbath: "bird bath", logs: "log pile", hoghouse: "hedgehog house", berries: "berry bushes", oak: "old oak", light: "lantern" };
  function needsText(v) { const t = St.tagCount(); return Object.entries(v.needs).map(([k, n]) => `${(t[k] || 0) >= n ? "✓" : "·"} ${n} ${tagName[k] || k}`).join("  ") + (v.time === "night" ? " · night" : ""); }

  /* ---------- brambles ---------- */
  function bramble(key, adj) {
    const cost = St.clearCost(), can = S().seeds >= cost;
    if (!adj) { open(`<h2>Wild brambles</h2><p class="sub">Clear the patches next to your meadow first, then work your way out.</p><button class="btn paper" data-close>OK</button>`, true); return; }
    open(`<h2>Clear the brambles?</h2><p class="sub">More room to grow, and new visitors may follow.</p>
      <div style="display:grid;gap:10px;margin-top:6px"><button class="btn" id="b-go" ${can ? "" : "disabled"}>Clear for ${seed(cost)}</button>
      ${can ? "" : `<p class="sub">Seeds come from photographing new visitors and finishing tasks.</p>`}<button class="btn paper" data-close>Not now</button></div>`, true);
    const b = $("#b-go"); if (b) b.onclick = async () => {
      S().seeds -= cost; Game.clearChunk(key); const up = St.addXp(20); St.save(); close();
      if (up) setTimeout(levelUp, 600);
      if (C.ads.interstitialEvery > 0 && S().clears % C.ads.interstitialEvery === 0) { await new Promise(r => setTimeout(r, 900)); await Ads.showInterstitial(); }
    };
  }

  /* ---------- journal ---------- */
  function journal() {
    newInJournal = false;
    const n = St.species();
    open(`<h2>Field journal</h2><p class="sub">${n} of ${C.visitors.length} visitors photographed. Tap visitors in the meadow to photograph them.</p><div class="jgrid" id="jg"></div>`);
    const t = St.tagCount();
    C.visitors.forEach(v => {
      const got = S().journal[v.id], c = document.createElement("div"); c.className = "jc" + (got ? " got" : "");
      c.appendChild(A.critterCanvas(v.id, 70, !got));
      c.insertAdjacentHTML("beforeend", `<b>${got ? v.name : "???"}</b><small class="n">${got ? got + " photo" + (got > 1 ? "s" : "") : ["", "Common", "Uncommon", "Rare", "Very rare"][v.rarity]}${v.time === "night" ? " · 🌙" : ""}</small>
        <div class="needs">${Object.entries(v.needs).map(([k, need]) => `<span class="${(t[k] || 0) >= need ? "ok" : ""}">${need} ${tagName[k] || k}</span>`).join("")}</div>`);
      $("#jg").appendChild(c);
    });
    hud();
  }

  /* ---------- tasks ---------- */
  function tasks() {
    const rows = S().tasks.map((ti, k) => {
      const tk = C.tasks[ti]; if (!tk) return "";
      const v = Math.min(tk.goal, St.stat(tk.stat)), done = v >= tk.goal;
      return `<div class="li ${done ? "done" : ""}"><div class="meta"><b>${tk.text}</b><div class="bar"><i style="width:${(v / tk.goal * 100).toFixed(0)}%"></i></div><small>${v.toLocaleString()} / ${tk.goal.toLocaleString()} · reward ${tk.seeds ? seed(tk.seeds) + " " : ""}${tk.nectar ? drop(tk.nectar) : ""}</small></div>${done ? `<button class="btn small honey" data-k="${k}">Claim</button>` : ""}</div>`;
    }).join("") || `<p class="sub">You've finished every task. Wonderful meadow!</p>`;
    open(`<h2>Garden tasks</h2><p class="sub">Little goals with seed rewards.</p><div class="list">${rows}</div>`);
    sheet.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const k = +b.dataset.k, tk = C.tasks[S().tasks[k]];
      S().seeds += tk.seeds; S().nectar += tk.nectar; const up = St.addXp(10);
      S().tasks[k] = S().taskPtr < C.tasks.length ? S().taskPtr++ : -1; S().tasks = S().tasks.filter(x => x >= 0);
      St.save(); Sound.play("buy"); tasks(); if (up) setTimeout(levelUp, 300);
    });
  }

  /* ---------- daily gift, settings ---------- */
  const dailyReady = () => S().daily.last !== St.day();
  function more() {
    const ready = dailyReady(), cont = S().daily.last === St.day(-1), next = ready ? (cont ? S().daily.streak % 7 + 1 : 1) : S().daily.streak;
    open(`<h2>Daily gift</h2><p class="sub">Visit every day: the gift grows for 7 days.</p>
      <div class="days">${C.daily.map((g, i) => { const n = i + 1, got = ready ? n < next : n <= next, now = ready && n === next; return `<div class="day ${got ? "got" : ""} ${now ? "now" : ""} ${n === 7 ? "d7" : ""}">Day ${n}<b>${drop(g)}</b></div>`; }).join("")}</div>
      <button class="btn honey" id="dl" style="width:100%" ${ready ? "" : "disabled"}>${ready ? "Claim " + C.daily[next - 1] + " nectar" : "Come back tomorrow"}</button>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn small paper" id="m-sfx">Sound: ${Sound.sfx ? "On" : "Off"}</button><button class="btn small paper" id="m-mus">Music: ${Sound.music ? "On" : "Off"}</button><button class="btn small paper" id="m-how">How to play</button><button class="btn small paper" id="m-reset">Start over</button></div>`);
    $("#dl").onclick = () => { const g = C.daily[next - 1]; S().nectar += g; S().daily = { last: St.day(), streak: next }; St.save(); Sound.play("buy"); toast(`+${g} nectar`); more(); };
    $("#m-sfx").onclick = () => { Sound.unlock(); Sound.toggleSfx(); more(); };
    $("#m-mus").onclick = () => { Sound.unlock(); Sound.toggleMusic(); more(); };
    $("#m-how").onclick = how;
    $("#m-reset").onclick = () => { const b = $("#m-reset"); if (b.dataset.sure) { St.reset(); location.reload(); return; } b.dataset.sure = 1; b.textContent = "Tap again to erase everything"; };
  }
  function how() {
    open(`<h2>How to keep a meadow</h2><div class="list" style="margin-top:10px">
      <div class="li"><div class="meta"><b>Grow</b><small>Buy flowers and habitats with nectar, then drag them into place and tap ✓.</small></div></div>
      <div class="li"><div class="meta"><b>Nectar</b><small>Flowers drop nectar now and then. Tap the golden drops. Flowers keep working while you're away.</small></div></div>
      <div class="li"><div class="meta"><b>Visitors</b><small>Each visitor comes when its needs are in your meadow. The journal shows what each one wants.</small></div></div>
      <div class="li"><div class="meta"><b>Photos</b><small>Tap a visitor to photograph it. New visitors give seeds.</small></div></div>
      <div class="li"><div class="meta"><b>Brambles</b><small>Tap the brambles next to your meadow and spend seeds to clear them.</small></div></div>
      <div class="li"><div class="meta"><b>Night</b><small>Some visitors only come out after dark.</small></div></div>
      <div class="li"><div class="meta"><b>Move around</b><small>Drag to look around, pinch or use + and − to zoom. Tap an item to move or pick it up.</small></div></div>
    </div><button class="btn" data-close style="width:100%;margin-top:14px">Got it</button>`);
  }

  /* ---------- start ---------- */
  function start() {
    Sound.unlock(); at("play"); hud();
    const off = Game.offlineEarnings();
    if (off.nectar > 0) {
      const h = Math.floor(off.away / 3600), m = Math.floor(off.away % 3600 / 60);
      open(`<h2>Welcome back!</h2><p class="sub">While you were away (${h ? h + " h " : ""}${m} min) your flowers made</p><p style="font-size:34px;font-weight:700;margin:6px 0">${drop(off.nectar)}</p>
        <div style="display:grid;gap:10px"><button class="btn sky" id="o-dbl">Double it <span class="ad">AD</span></button><button class="btn" id="o-ok">Collect</button></div>`, true);
      $("#o-ok").onclick = () => { S().nectar += off.nectar; St.save(); close(); };
      $("#o-dbl").onclick = async () => { const ok = await Ads.showRewarded(); S().nectar += off.nectar * (ok ? 2 : 1); St.save(); close(); };
    } else if (!S().intro) {
      S().intro = true; St.save();
      open(`<h2>Welcome, keeper!</h2><p class="sub">This little meadow is yours. Plant flowers and build habitats, and wildlife will come to visit. Photograph everyone who drops by.</p>
        <div class="list"><div class="li"><div class="meta"><b>1. Tap the golden drops</b><small>Your flowers make nectar.</small></div></div><div class="li"><div class="meta"><b>2. Tap Grow</b><small>Plant more flowers. Three flowers bring the first bees!</small></div></div><div class="li"><div class="meta"><b>3. Photograph visitors</b><small>Tap them to fill your journal.</small></div></div></div>
        <button class="btn" data-close style="width:100%;margin-top:12px">Let's grow</button>`, true);
    }
  }
  $("#tagline").textContent = C.tagline;
  $("#t-play").onclick = () => { Sound.play("tap"); start(); };
  $("#d-build").onclick = () => { Sound.unlock(); Sound.play("tap"); shop(); };
  $("#d-journal").onclick = () => { Sound.unlock(); Sound.play("tap"); journal(); };
  $("#d-tasks").onclick = () => { Sound.unlock(); Sound.play("tap"); tasks(); };
  $("#d-more").onclick = () => { Sound.unlock(); Sound.play("tap"); more(); };
  $("#h-level").onclick = () => { Sound.play("tap"); tasks(); };
  $("#z-in").onclick = () => Game.zoom(1.25);
  $("#z-out").onclick = () => Game.zoom(0.8);
  $("#gather").onclick = () => { const n = Game.collectAll(); if (n) toast(`Collected from ${n} flowers`); };
  hud();
  return { shop, journal, tasks, more, how, start, close, toast, beginPlace };
})();
