/* Checks that every picture in js/config.js can be solved by line logic alone (no guessing),
   which also proves the answer is unique. Run: node tools/check.js */
global.window = {}; require("../js/config.js");
const clue = line => { const r = []; let n = 0; for (const c of line) { if (c) n++; else if (n) { r.push(n); n = 0; } } if (n) r.push(n); return r.length ? r : [0]; };
// all placements of runs in a line consistent with known cells (-1 unknown, 0 empty, 1 filled)
function lineSolve(cells, runs) {
  const L = cells.length, can1 = new Array(L).fill(false), can0 = new Array(L).fill(false); let any = false;
  if (runs.length === 1 && runs[0] === 0) { if (cells.some(c => c === 1)) return null; return cells.map(() => 0); }
  const place = (ri, pos, acc) => {
    if (ri === runs.length) { for (let i = pos; i < L; i++) if (cells[i] === 1) return; const full = acc.concat(new Array(L - acc.length).fill(0)); any = true; full.forEach((v, i) => v ? can1[i] = true : can0[i] = true); return; }
    const len = runs[ri], rest = runs.slice(ri + 1).reduce((s, x) => s + x + 1, 0);
    for (let s = pos; s + len + rest <= L; s++) {
      let ok = true; for (let i = pos; i < s; i++) if (cells[i] === 1) { ok = false; break; } if (!ok) break;
      for (let i = s; i < s + len; i++) if (cells[i] === 0) { ok = false; break; }
      if (ok && s + len < L && cells[s + len] === 1) ok = false;
      if (ok) place(ri + 1, s + len + 1, acc.concat(new Array(s - acc.length).fill(0), new Array(len).fill(1), s + len < L ? [0] : []));
    }
  };
  place(0, 0, []);
  if (!any) return null;
  return cells.map((c, i) => can1[i] && !can0[i] ? 1 : can0[i] && !can1[i] ? 0 : -1);
}
let bad = 0;
for (const b of window.GAME_CONFIG.books) for (const p of b.pics) {
  const N = p.p.length, sol = p.p.map(r => [...r].map(c => c === "#" ? 1 : 0));
  const rows = sol.map(clue), cols = sol[0].map((_, c) => clue(sol.map(r => r[c])));
  const g = sol.map(r => r.map(() => -1)); let changed = true;
  while (changed) { changed = false;
    for (let r = 0; r < N; r++) { const res = lineSolve(g[r], rows[r]); res.forEach((v, c) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; changed = true; } }); }
    for (let c = 0; c < N; c++) { const res = lineSolve(g.map(r => r[c]), cols[c]); res.forEach((v, r) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; changed = true; } }); } }
  const unknown = g.flat().filter(v => v === -1).length;
  if (unknown) { bad++; console.log(`NOT LINE-SOLVABLE: ${p.n} (${unknown} cells unknown)`); }
}
console.log(bad ? `${bad} picture(s) need fixing` : "all pictures solve by logic alone");
