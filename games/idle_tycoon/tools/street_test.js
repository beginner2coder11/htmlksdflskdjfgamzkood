/* Headless check of the street traffic: a player who taps every shop every
   0.2 s should serve every customer, and no car should get stuck.
   Usage: node tools/street_test.js [seconds=600] [tapEvery=0.2] */
const fs = require("fs"), path = require("path"), vm = require("vm");
const box = { console, Math }; box.window = box; vm.createContext(box);
for (const f of ["config.js", "econ.js", "street.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f), "utf8").replace("typeof module !== \"undefined\" && module.exports", "false"), box);
const C = box.GAME_CONFIG, econ = box.Econ.create(C);
const secs = +(process.argv[2] || 600), tapEvery = +(process.argv[3] || 0.2);
for (let i = 0; i < 6; i++) econ.S.biz[i].n = 12;
let angry = [0, 0, 0, 0, 0, 0], sales = [0, 0, 0, 0, 0, 0];
const st = box.Street.create(econ, { sale: (i) => sales[i]++, angry: (i, c) => { angry[i]++; } });
let t = 0, nextTap = 0, stuckMax = 0, stuckInfo = "";
const still = new Map();
while (t < secs) {
  const dt = 1 / 30; t += dt;
  st.update(dt);
  if (t >= nextTap) { nextTap = t + tapEvery; for (let i = 0; i < 6; i++) st.serve(i); }
  for (let r = 0; r < 2; r++) for (const c of st.cars(r)) {
    const parked = c.state === "wait" || c.state === "queued";
    if (c.v < 0.01 && !parked) { const v = (still.get(c) || 0) + dt; still.set(c, v); if (v > stuckMax) { stuckMax = v; stuckInfo = `road ${r} state=${c.state} target=${c.target} x=${c.x.toFixed(3)} lane=${c.lane.toFixed(2)}`; } }
    else still.set(c, 0);
  }
}
const expected = [0, 1, 2, 3, 4, 5].map(i => +(secs / st.interval(i)).toFixed(0));
console.log("served  ", sales.join(" "), "\nexpected", expected.join(" "), "\nangry   ", angry.join(" "));
console.log("longest standstill outside a parking spot:", stuckMax.toFixed(1) + "s", stuckInfo);
