/* Balancing sim: a greedy "active player" taps manual businesses every second
   and buys whatever pays back fastest (units, managers, upgrades). Prints a
   progression timeline. Usage: node tools/simulate.js [hours=8] [tapEvery=1] */
const fs = require("fs"), path = require("path"), vm = require("vm");
const box = { window: {} }; box.window = box; vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/config.js"), "utf8"), box);
const C = box.GAME_CONFIG, Econ = require("../js/econ.js");
const hours = +(process.argv[2] || 8), tapEvery = +(process.argv[3] || 1);
let e = Econ.create(C), t = 0, nextTap = 0;
const NOW = 0;                                     // no ad boost in the sim
const log = [], seen = new Set();
const mark = (key, msg) => { if (!seen.has(key)) { seen.add(key); log.push(`${fmtT(t)}  ${msg}`); } };
const fmtT = s => `${String(Math.floor(s / 3600)).padStart(2)}h${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}m`;
// effective income/sec: manual businesses earn only as fast as the player taps
function income() {
  return C.businesses.reduce((s, b, i) => {
    if (!e.S.biz[i].n) return s;
    const ct = e.cycleTime(i), r = e.revenue(i, NOW);
    return s + (e.hasMgr(i) ? r / ct : r / Math.max(ct, tapEvery));
  }, 0);
}
function bestAction() {
  const base = income(); let best = null;
  const consider = (kind, id, cost, apply) => {
    if (cost > e.S.cash * 50) return;            // ignore far-off goals
    const snap = JSON.stringify(e.S); apply(); const gain = income() - base; Object.assign(e.S, JSON.parse(snap));
    // the economy object keeps references to S.biz etc. — restore deep
    if (gain <= 0) return;
    const score = cost / gain + Math.max(0, cost - e.S.cash) / Math.max(base, 1e-9);
    if (!best || score < best.score) best = { kind, id, cost, score };
  };
  C.businesses.forEach((b, i) => {
    const c = e.cost(i, 1); consider("biz", i, c, () => { e.S.biz[i].n++; });
    if (!e.hasMgr(i) && e.S.biz[i].n) consider("mgr", i, b.manager.cost, () => { e.S.managers.push(i); });
  });
  e.availableUpgrades(4).forEach(u => consider("upg", u.id, u.cost, () => { e.S.upgrades.push(u.id); }));
  return best;
}
let stepT = 0;
while (t < hours * 3600) {
  const dt = t < 1800 ? 0.25 : 1;
  t += dt;
  if (t >= nextTap) { nextTap = t + tapEvery; C.businesses.forEach((b, i) => e.start(i)); }
  e.tick(dt, NOW);
  // spend
  for (let guard = 0; guard < 30; guard++) {
    const a = bestAction();
    if (!a || a.cost > e.S.cash) break;
    if (a.kind === "biz") { const r = e.buy(a.id, 1); if (!r) break; if (e.S.biz[a.id].n === 1) mark("b" + a.id + "p" + e.S.prestiges, `unlock ${C.businesses[a.id].name}`); r.milestones.forEach(m => mark(`ms${a.id}_${m}_${e.S.prestiges}`, `  ${C.businesses[a.id].name} ×${m}`)); r.global.forEach(m => mark(`g${m}_${e.S.prestiges}`, `  ALL ≥ ${m} → profits ×2`)); }
    else if (a.kind === "mgr") { if (!e.hire(a.id)) break; mark("m" + a.id + "p" + e.S.prestiges, `manager ${C.businesses[a.id].manager.name}`); }
    else { if (!e.buyUpgrade(a.id)) break; mark("u" + a.id + "p" + e.S.prestiges, `upgrade ${a.id}`); }
  }
  // prestige once it at least doubles the stars (and is worth ≥ 10)
  const p = e.starsPending();
  if (p >= 10 && p >= e.S.stars) { mark("pr" + e.S.prestiges, `PRESTIGE +${p} stars (had ${e.S.stars}) — run earned $${Econ.fmt(e.S.earnedRun)}`); const S2 = e.save(); e.prestige(); }
  if (t % 3600 === 0) log.push(`${fmtT(t)}  -- cash $${Econ.fmt(e.S.cash)}  income $${Econ.fmt(income())}/s  stars ${e.S.stars} (+${e.starsPending()} pending)  owned [${e.S.biz.map(b => b.n).join(",")}]`);
}
console.log(log.filter(l => !/×\d|upgrade u[1-9]/.test(l) || /×(25|100|400)\b/.test(l)).join("\n"));
