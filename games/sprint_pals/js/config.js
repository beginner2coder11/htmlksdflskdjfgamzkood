/* ==========================================================================
   SPRINT PALS — GAME CONFIG
   A 3-lane endless runner. Swipe left/right to change lanes, up to jump,
   down to slide. Grab coins, dodge hurdles, signs, crates and rolling carts,
   run on rooftops of market stalls, and pick up power-ups.
   Everything is drawn in code: no image or sound files.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Sprint Pals",
  // Short line under the logo on the title screen
  tagline: "Swipe, jump, slide. How far can your pal run?",
  // the logo on the title screen, one entry per line
  titleLines: ["SPRINT", "PALS"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2a2340",
    "blue": "#2f8fff",
    "blue-d": "#1a5fc8",
    "yellow": "#ffd23f",
    "yellow-d": "#e0a810",
    "red": "#ff4f5e",
    "green": "#3fd58a",
    "green-d": "#1fa060",
    "paper": "#ffffff",
    "mute": "#6f6a85"
  },

  lane: 1.5,                        // distance between lanes (world units = metres)
  speed: { start: 10, max: 24, rampPerKm: 4.5 },   // metres per second; speeds up by rampPerKm every 1000 m
  jump: { v: 12.5, gravity: 36 },   // about 2.2 m high
  slide: 0.62,                      // seconds
  zoneEvery: 600,                   // metres per zone

  // Zones the run passes through: sky, ground, road and accent colours, scenery
  zones: [
    { name: "Seaside Boardwalk", sky: ["#6fd0ff", "#d6f4ff"], ground: "#ffe3a8", groundD: "#f2c97c", road: "#c9925c", roadD: "#b07a48", line: "#fff3d6", side: "boardwalk", horizon: "sea", sun: "#fff6c8", accent: "#ff6f6f" },
    { name: "Red Rock Canyon",   sky: ["#ffb36b", "#ffe2b8"], ground: "#e8946a", groundD: "#cf7a52", road: "#a8a29e", roadD: "#8f8985", line: "#ffffff", side: "canyon",    horizon: "mesa", sun: "#fff1a8", accent: "#3fb8a8" },
    { name: "Lantern Market",    sky: ["#231a52", "#5a2f7a"], ground: "#3a2f5a", groundD: "#2c2348", road: "#5a5470", roadD: "#4a4460", line: "#ffd86b", side: "market",    horizon: "city", sun: "#ffe8a8", accent: "#ff5fa2", night: true },
    { name: "Snowy Village",     sky: ["#9fd8f0", "#eef9ff"], ground: "#f4f8ff", groundD: "#d8e6f6", road: "#b8c6d8", roadD: "#a2b2c8", line: "#ffffff", side: "village",   horizon: "peaks", sun: "#ffffff", accent: "#ff7a5c" }
  ],

  // pals: a perk each. ears: round | pointy | long | none. tail: fluffy | thin | bob | none
  pals: [
    { id: "bolt",  name: "Bolt",  animal: "Red Panda", body: "#e8743c", belly: "#fff1dc", ears: "round",  tail: "ringed", shoe: "#4f9fe8", pack: "#ffd23f", price: 0,    perk: "All-rounder",           perkId: "none" },
    { id: "kiki",  name: "Kiki",  animal: "Bunny",     body: "#ffffff", belly: "#ffe1ea", ears: "long",   tail: "bob",    shoe: "#ff6fa8", pack: "#7fd6ff", price: 800,  perk: "Jumps 15% higher",      perkId: "jump" },
    { id: "tuk",   name: "Tuk",   animal: "Penguin",   body: "#2e3448", belly: "#ffffff", ears: "none",   tail: "none",   shoe: "#ffb347", pack: "#ff5f6d", price: 1500, perk: "Power-ups last 2 s longer", perkId: "power" },
    { id: "rio",   name: "Rio",   animal: "Fox",       body: "#ff8f3c", belly: "#ffffff", ears: "pointy", tail: "fluffy", shoe: "#3b3355", pack: "#5fc7a8", price: 2500, perk: "Magnet pulls from further", perkId: "magnet" },
    { id: "mango", name: "Mango", animal: "Monkey",    body: "#9a6a48", belly: "#f2d2b0", ears: "round",  tail: "thin",   shoe: "#ffd23f", pack: "#ff7a5c", price: 4000, perk: "+10% coins",            perkId: "coins" },
    { id: "zuri",  name: "Zuri",  animal: "Koala",     body: "#a8b0bc", belly: "#e8ecf2", ears: "round",  tail: "none",   shoe: "#7fd65f", pack: "#b38cff", price: 6000, perk: "Starts every run with a shield", perkId: "shield" }
  ],

  // power-ups: base seconds, +1 s per upgrade level
  powers: {
    magnet:  { name: "Coin Magnet",  base: 8,  color: "#ff5f6d" },
    double:  { name: "Double Coins", base: 10, color: "#ffd23f" },
    sneaker: { name: "Spring Shoes", base: 9,  color: "#5fc7a8" },
    balloon: { name: "Balloon Ride", base: 6,  color: "#ff8fd0" },
    shield:  { name: "Bubble Shield",base: 0,  color: "#7fd6ff" }
  },
  upgradeCosts: [300, 700, 1500, 3000, 6000],   // five levels for each timed power-up

  // missions: three at a time; each set of three completed raises the score multiplier by 1
  missions: [
    { id: "c200",   text: "Collect 200 coins in one run",   stat: "runCoins", goal: 200 },
    { id: "c500",   text: "Collect 500 coins in one run",   stat: "runCoins", goal: 500 },
    { id: "d1000",  text: "Run 1000 m in one run",          stat: "runDist",  goal: 1000 },
    { id: "d2500",  text: "Run 2500 m in one run",          stat: "runDist",  goal: 2500 },
    { id: "j30",    text: "Jump 30 times in one run",       stat: "runJumps", goal: 30 },
    { id: "s25",    text: "Slide 25 times in one run",      stat: "runSlides",goal: 25 },
    { id: "p3",     text: "Pick up 3 power-ups in one run", stat: "runPowers",goal: 3 },
    { id: "roof",   text: "Run 150 m on rooftops",          stat: "runRoof",  goal: 150 },
    { id: "zone2",  text: "Reach Red Rock Canyon",          stat: "runZone",  goal: 2 },
    { id: "zone3",  text: "Reach the Lantern Market",       stat: "runZone",  goal: 3 },
    { id: "nocoin", text: "Run 500 m without a coin",       stat: "runDry",   goal: 500 },
    { id: "b2",     text: "Ride 2 balloons in one run",     stat: "runBalloons", goal: 2 },
    { id: "score5", text: "Score 5,000 in one run",         stat: "runScore", goal: 5000 },
    { id: "score15",text: "Score 15,000 in one run",        stat: "runScore", goal: 15000 },
    { id: "close",  text: "Dodge 20 obstacles at the last second", stat: "runClose", goal: 20 }
  ],
  // Highest score multiplier (raised by missions)
  maxMultiplier: 15,

  revive: { coins: [250, 500, 1000] },   // cost of the 1st, 2nd and 3rd coin revive in a run (the first can be an ad)
  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 75, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "sp_"
};
