/* ==========================================================================
   ECON — the whole idle economy as plain logic (no DOM). Runs in the browser
   and in Node (tools/simulate.js balances it).

   const e = Econ.create(GAME_CONFIG, savedState?)
   e.tick(dt, nowMs) → events · e.buy(i, k) · e.start(i) · e.hire(i)
   e.buyUpgrade(id) · e.prestige() · e.offline(seconds) · e.save()
   ========================================================================== */
(function (root) {
  function create(C, saved) {
    const B = C.businesses, N = B.length;

    // ---------- upgrades (generated) -------------------------------------------
    const U = C.upgrades, upgrades = [];
    for (let t = 0; t < U.tiers; t++) {
      B.forEach((b, i) => upgrades.push({ id: `u${t}_${i}`, biz: i, tier: t, mult: U.multiplier, cost: b.cost * U.firstCostFactor * Math.pow(U.tierFactor, t) * Math.pow(1.6, i) }));
      const top = upgrades[upgrades.length - 1].cost;
      upgrades.push({ id: `u${t}_all`, biz: -1, tier: t, mult: U.multiplier, cost: top * 10 });
    }
    upgrades.sort((a, b) => a.cost - b.cost);

    // ---------- state ------------------------------------------------------------
    const fresh = () => ({
      cash: C.economy.startCash, earnedRun: 0, earnedAll: 0,
      biz: B.map((b, i) => ({ n: i === 0 ? 1 : 0, prog: 0, run: false })),
      managers: [], upgrades: [],
      stars: 0, starsBank: 0, gems: C.economy.startGems, gemX2: 0, boostUntil: 0, prestiges: 0, taps: 0
    });
    const S = Object.assign(fresh(), saved || {});
    S.biz = B.map((b, i) => Object.assign({ n: i === 0 ? 1 : 0, prog: 0, run: false }, (saved && saved.biz && saved.biz[i]) || {}));

    // ---------- multipliers ---------------------------------------------------------
    const owned = i => S.biz[i].n;
    const hasMgr = i => S.managers.includes(i);
    function speedMult(i) { return Math.pow(2, C.speedMilestones.filter(m => owned(i) >= m).length); }
    function globalMult() { const lo = Math.min(...S.biz.map(b => b.n)); return Math.pow(2, C.globalMilestones.filter(m => lo >= m).length); }
    function upgradeMult(i) { return S.upgrades.reduce((m, id) => { const u = upgrades.find(x => x.id === id); return u && (u.biz === i || u.biz === -1) ? m * u.mult : m; }, 1); }
    function boostMult(now) { return S.boostUntil > now ? C.boost.multiplier : 1; }
    function starMult() { return 1 + S.stars * C.prestige.bonusPerStar; }
    function profitMult(i, now = Date.now()) {
      return Math.pow(2, C.profitMilestones.filter(m => owned(i) >= m).length) * upgradeMult(i) * globalMult() * starMult() * Math.pow(2, S.gemX2) * boostMult(now);
    }
    const cycleTime = i => B[i].time / speedMult(i);
    const revenue = (i, now) => B[i].revenue * owned(i) * profitMult(i, now);
    const perSec = (i, now) => owned(i) ? revenue(i, now) / cycleTime(i) : 0;
    const totalPerSec = (now, managedOnly = false) => B.reduce((s, b, i) => s + (!managedOnly || hasMgr(i) ? perSec(i, now) : 0), 0);

    // ---------- buying ------------------------------------------------------------------
    function cost(i, k = 1) { const b = B[i], r = b.growth; return b.cost * Math.pow(r, owned(i)) * (Math.pow(r, k) - 1) / (r - 1); }
    function maxBuy(i) {
      const b = B[i], r = b.growth, first = b.cost * Math.pow(r, owned(i));
      if (S.cash < first) return 0;
      return Math.max(0, Math.floor(Math.log(S.cash * (r - 1) / first + 1) / Math.log(r)));
    }
    function buy(i, k) {
      if (k <= 0) return false;
      const c = cost(i, k);
      if (S.cash < c * (1 - 1e-12)) return false;
      const before = S.biz[i].n;
      S.cash -= c; S.biz[i].n += k;
      const ms = [...C.speedMilestones, ...C.profitMilestones].filter(m => before < m && S.biz[i].n >= m);
      const gl = C.globalMilestones.filter(m => Math.min(...S.biz.map((b, j) => j === i ? before : b.n)) < m && Math.min(...S.biz.map(b => b.n)) >= m);
      return { milestones: ms, global: gl };
    }
    function nextMilestone(i) {
      const n = owned(i), sp = C.speedMilestones.find(m => m > n), pr = C.profitMilestones.find(m => m > n);
      if (sp) return { at: sp, kind: "speed", prev: [0, ...C.speedMilestones].filter(m => m <= n).pop() };
      if (pr) return { at: pr, kind: "profit", prev: [...C.speedMilestones, ...C.profitMilestones].filter(m => m <= n).pop() };
      return null;
    }

    // ---------- managers / upgrades / prestige -----------------------------------------
    function hire(i) {
      const c = B[i].manager.cost;
      if (hasMgr(i) || S.cash < c || !owned(i)) return false;
      S.cash -= c; S.managers.push(i);
      return true;
    }
    function availableUpgrades(limit = 8) { return upgrades.filter(u => !S.upgrades.includes(u.id)).slice(0, limit); }
    function buyUpgrade(id) {
      const u = upgrades.find(x => x.id === id);
      if (!u || S.upgrades.includes(id) || S.cash < u.cost) return false;
      S.cash -= u.cost; S.upgrades.push(id);
      return true;
    }
    // stars are earned on lifetime money; you collect the new ones by selling the empire
    const starsTotal = () => Math.floor(Math.sqrt(S.earnedAll / C.prestige.divisor));
    const starsPending = () => Math.max(0, starsTotal() - S.stars);
    function prestige() {
      const add = starsPending();
      if (add <= 0) return 0;
      const keep = { stars: S.stars + add, earnedAll: S.earnedAll, gems: S.gems, gemX2: S.gemX2, boostUntil: S.boostUntil, prestiges: S.prestiges + 1, taps: S.taps };
      Object.assign(S, fresh(), keep);
      return add;
    }

    // ---------- time ------------------------------------------------------------------------
    function earn(v) { S.cash += v; S.earnedRun += v; S.earnedAll += v; }
    function start(i) {
      const b = S.biz[i];
      if (!b.n || b.run || hasMgr(i)) return false;
      b.run = true; S.taps++;
      return true;
    }
    function tick(dt, now = Date.now()) {
      const events = [];
      for (let i = 0; i < N; i++) {
        const b = S.biz[i];
        if (!b.n) continue;
        const auto = hasMgr(i);
        if (!auto && !b.run) continue;
        b.prog += dt / cycleTime(i);
        if (b.prog >= 1) {
          let cycles = auto ? Math.floor(b.prog) : 1;
          b.prog = auto ? b.prog - cycles : 0;
          if (!auto) b.run = false;
          const v = revenue(i, now) * cycles;
          earn(v);
          events.push({ type: "payout", i, amount: v, cycles });
        }
      }
      return events;
    }
    // money earned in `seconds` by managed businesses (welcome-back / time warp)
    function offline(seconds, now = Date.now()) {
      let v = 0;
      for (let i = 0; i < N; i++) if (hasMgr(i) && owned(i)) v += perSec(i, now) / boostMult(now) * seconds;
      return v * C.offline.rate;
    }

    return {
      S, upgrades, cost, maxBuy, buy, nextMilestone, hire, hasMgr, availableUpgrades, buyUpgrade,
      starsTotal, starsPending, prestige, start, tick, offline, earn,
      cycleTime, revenue, perSec, totalPerSec, profitMult, speedMult, globalMult, starMult, boostMult,
      save: () => JSON.parse(JSON.stringify(S))
    };
  }

  // ---------- number formatting -------------------------------------------------------
  const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const NAMES = ["", "Thousand", "Million", "Billion", "Trillion", "Quadrillion", "Quintillion", "Sextillion", "Septillion", "Octillion", "Nonillion", "Decillion"];
  function suffix(e, long) {
    if (e < SUF.length) return long ? NAMES[e] : SUF[e];
    const k = e - SUF.length, a = String.fromCharCode(97 + Math.floor(k / 26) % 26), b = String.fromCharCode(97 + k % 26);
    return a + b;
  }
  function fmt(n, long = false) {
    if (!isFinite(n)) return "∞";
    if (n < 0) return "-" + fmt(-n, long);
    if (n < 1000) return n < 100 && n % 1 ? n.toFixed(2).replace(/\.?0+$/, "") : Math.floor(n).toString();
    if (n < 1e6) return Math.floor(n).toLocaleString("en-US");
    const e = Math.floor(Math.log10(n) / 3), v = n / Math.pow(10, e * 3);
    return v.toFixed(v < 10 ? 3 : v < 100 ? 2 : 1).replace(/\.?0+$/, "") + (long ? " " : "") + suffix(e, long);
  }
  function fmtTime(s) {
    if (s < 1) return s.toFixed(1) + "s";
    s = Math.ceil(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
  }

  const api = { create, fmt, fmtTime };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Econ = api;
})(typeof window !== "undefined" ? window : globalThis);
