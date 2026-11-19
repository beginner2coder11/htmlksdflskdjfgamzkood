/* PIN RESCUE — level generator. Run: node tools/gen-levels.js [count] [seed]
   Builds glass towers (2 columns × 1–3 tiers, one pin under every bin), fills the bins with gems, lava,
   water, rocks or a monster, then plays EVERY pin order through the real physics (js/physics.js) and keeps
   a level only if some orders win and enough orders lose (the share of winning orders sets difficulty).
   Writes js/levels.js with the levels and one winning order each (used by the Hint and the tests). */
const fs = require("fs"), path = require("path");
const Phys = require("../js/physics.js");
const COUNT = +process.argv[2] || 60, SEED = +process.argv[3] || 777;
// optional: --from A --to B --part file.json  → build only levels A..B into a part file (run several in parallel,
// then: node tools/gen-levels.js --merge part1.json part2.json …)
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (process.argv.includes("--merge")) {
  const files = process.argv.slice(process.argv.indexOf("--merge") + 1), all = [];
  for (const f of files) all.push(...JSON.parse(fs.readFileSync(f, "utf8")));
  all.sort((a, b) => a.n - b.n); all.forEach(l => delete l.n);
  fs.writeFileSync(path.join(__dirname, "../js/levels.js"), "/* PIN RESCUE — levels made by tools/gen-levels.js (every pin order checked through js/physics.js). */\nwindow.LEVELS = " + JSON.stringify(all) + ";\n");
  console.log("merged", all.length, "levels"); process.exit(0);
}
const FROM = +(arg("--from") || 1), TO = +(arg("--to") || COUNT), PART = arg("--part");

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// fixed frame of the tower (world is 360 × 640)
const X0 = 26, X1 = 334, MID = 180, TOP = 54, FLOOR = 332;
function frame() {
  return [
    [X0, 34, X0, FLOOR], [X1, 34, X1, FLOOR], [MID, TOP - 6, MID, FLOOR + 4],         // tower sides + divider
    [X0, FLOOR, 150, 412], [X1, FLOOR, 210, 412],                                      // funnel
    [150, 412, 150, 448], [210, 412, 210, 448],                                        // neck
    [50, 448, 150, 448], [210, 448, 310, 448],                                         // room roof
    [50, 448, 50, 612], [310, 448, 310, 612], [50, 612, 310, 612]                      // room
  ];
}
const HERO = [72, 560, 40, 52], GOAL = [55, 452, 250, 158];

function build(R, tiersL, tiersR, kinds) {
  const walls = frame(), pins = [], fills = [], bins = [];
  for (const [side, tiers] of [["L", tiersL], ["R", tiersR]]) {
    const cx0 = side === "L" ? X0 : MID, cx1 = side === "L" ? MID : X1, out = side === "L" ? -1 : 1;
    const bounds = []; for (let k = 0; k <= tiers; k++) bounds.push(Math.round(TOP + (FLOOR - TOP) * k / tiers));
    for (let k = 0; k < tiers; k++) {
      const yb = bounds[k + 1], floor = k === tiers - 1;
      // the pin under this bin: pokes out through the tower side so it can slide out
      const tilt = floor ? 7 : 0, inner = side === "L" ? MID - 2 : MID + 2, outer = side === "L" ? X0 - 26 : X1 + 26;
      const yIn = yb + tilt, yOut = yb - (floor ? 4 : 0);
      pins.push({ x1: outer, y1: yOut, x2: inner, y2: yIn, dir: [out, 0], side, tier: k, floor });
      bins.push({ side, tier: k, rect: [cx0 + 8, bounds[k] + 8, cx1 - cx0 - 16, yb - bounds[k] - 14] });
    }
  }
  bins.forEach((b, i) => {
    const kind = kinds[i];
    if (kind === "empty") return;
    const [x, y, w, h] = b.rect, fh = kind === "monster" || kind === "rock" ? Math.min(h, 40) : Math.min(h - 4, kind === "gem" ? 34 : 28);
    fills.push({ t: kind, rect: [x, y + h - fh, w, fh] });
    if (kind === "monster" && R() < 0.5) fills.push({ t: "gem", rect: [x, y + h - fh - 14, w, 12] });
  });
  return { walls, pins, fills, hero: HERO, goal: GOAL, need: 0.7, bins: bins.map((b, i) => ({ ...b, kind: kinds[i] })) };
}

const fact = n => n <= 1 ? 1 : n * fact(n - 1);
// explore all pin orders; returns { leaves, wins, sol }
function explore(L) {
  let leaves = 0, wins = 0, sol = null;
  const n = L.pins.length;
  (function dfs(W, left, path) {
    for (const i of left) {
      const W2 = Phys.clone(W), r = Phys.play(W2, i), rest = left.filter(x => x !== i), weight = fact(rest.length);
      if (r.lost) { leaves += weight; continue; }
      if (r.won) { leaves += weight; wins += weight; if (!sol || path.length + 1 < sol.length) sol = [...path, i]; continue; }
      if (!rest.length) { leaves += 1; continue; }
      dfs(W2, rest, [...path, i]);
    }
  })(Phys.create(L, 1), [...Array(n).keys()], []);
  return { leaves, wins, sol };
}

function plan(n) {             // pins, accepted share of winning orders
  if (n <= 2) return { tiers: [[1, 1]], lo: 0.2, hi: 0.6 };
  if (n <= 8) return { tiers: [[2, 1], [1, 2]], lo: 0.12, hi: 0.5 };
  if (n <= 22) return { tiers: [[2, 1], [1, 2], [2, 2]], lo: 0.08, hi: 0.4 };
  if (n <= 40) return { tiers: [[2, 2], [3, 1], [1, 3]], lo: 0.04, hi: 0.3 };
  return { tiers: [[2, 2], [3, 2], [2, 3]], lo: 0.02, hi: 0.22 };
}
const KINDS = ["gem", "lava", "water", "rock", "monster", "empty"];

const out = [], t0 = Date.now();
for (let n = FROM; n <= TO; n++) {
  const pl = plan(n), R = rng(SEED * 7919 + n * 104729); let got = null, tries = 0;
  while (!got && tries < 400) {
    tries++;
    const [tl, tr] = pl.tiers[Math.floor(R() * pl.tiers.length)], nb = tl + tr;
    const kinds = Array.from({ length: nb }, () => KINDS[Math.floor(R() * KINDS.length)]);
    // sanity: gems somewhere, a hazard somewhere, at most one monster, water only with lava
    if (!kinds.includes("gem") || !(kinds.includes("lava") || kinds.includes("monster"))) continue;
    if (kinds.filter(k => k === "monster").length > 1 || kinds.filter(k => k === "gem").length > 2) continue;
    if (kinds.includes("water") && !kinds.includes("lava")) continue;
    if (n <= 2 && kinds.includes("monster")) continue;
    const L = build(R, tl, tr, kinds);
    const ex = explore(L), share = ex.wins / ex.leaves;
    if (!ex.sol || share < pl.lo || share > pl.hi || ex.sol.length < (n <= 2 ? 1 : 2)) continue;
    got = { ...L, sol: ex.sol, share: +share.toFixed(3) };
  }
  if (!got) { console.error("no level for", n); process.exit(1); }
  delete got.bins;
  out.push(PART ? { n, ...got } : got);
  if (PART) fs.writeFileSync(PART, JSON.stringify(out));
  console.log(`level ${n}: ${got.pins.length} pins, ${got.fills.map(f => f.t).join("+")}, win share ${got.share}, sol ${got.sol.join(">")} (${tries} tries, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
if (!PART) { fs.writeFileSync(path.join(__dirname, "../js/levels.js"), "/* PIN RESCUE — levels made by tools/gen-levels.js (every pin order checked through js/physics.js). */\nwindow.LEVELS = " + JSON.stringify(out) + ";\n"); console.log("wrote", out.length, "levels"); }
else console.log("part done", FROM, TO);
