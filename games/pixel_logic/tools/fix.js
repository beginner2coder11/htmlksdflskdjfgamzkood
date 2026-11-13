/* Greedily toggles a few pixels in pictures that need guessing until each solves by line logic,
   then rewrites js/config.js. Run: node tools/fix.js */
const fs = require("fs"), path = require("path"), file = path.join(__dirname, "../js/config.js");
global.window = {}; require(file);
const src = fs.readFileSync(path.join(__dirname, "check.js"), "utf8");
const lineSolve = eval("(" + src.slice(src.indexOf("function lineSolve"), src.indexOf("let bad")).trim().replace(/^function lineSolve/, "function") + ")");
const clue = line => { const r = []; let n = 0; for (const c of line) { if (c) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
function unknowns(sol) {
  const N = sol.length, rows = sol.map(clue), cols = sol[0].map((_, c) => clue(sol.map(r => r[c]))), g = sol.map(r => r.map(() => -1)); let ch = true;
  while (ch) { ch = false; for (let r = 0; r < N; r++) { const res = lineSolve(g[r], rows[r]); if (!res) return 999; res.forEach((v, c) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; ch = true; } }); }
    for (let c = 0; c < N; c++) { const res = lineSolve(g.map(r => r[c]), cols[c]); if (!res) return 999; res.forEach((v, r) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; ch = true; } }); } }
  return g.flat().filter(v => v === -1).length;
}
let text = fs.readFileSync(file, "utf8");
for (const b of window.GAME_CONFIG.books) for (const p of b.pics) {
  let sol = p.p.map(r => [...r].map(c => c === "#" ? 1 : 0)), u = unknowns(sol), flips = 0;
  while (u > 0 && flips < 12) {
    let best = null, bu = u;
    for (let r = 0; r < sol.length; r++) for (let c = 0; c < sol.length; c++) { sol[r][c] ^= 1; const k = unknowns(sol); if (k < bu) { bu = k; best = [r, c]; } sol[r][c] ^= 1; }
    if (!best) break; sol[best[0]][best[1]] ^= 1; u = bu; flips++;
  }
  if (flips) {
    const neu = sol.map(r => r.map(v => v ? "#" : ".").join(""));
    const old = JSON.stringify(p.p).replace(/,/g, ", "), rep = JSON.stringify(neu).replace(/,/g, ", ");
    if (!text.includes(old)) { console.log("could not locate", p.n); continue; }
    text = text.replace(old, rep); console.log(`${p.n}: ${flips} pixel(s) changed, unknown now ${u}`);
  }
}
fs.writeFileSync(file, text);
