/* ==========================================================================
   LOT ESCAPE — GAME CONFIG
   A parking-jam puzzle. Cars are packed into a parking lot. Tap a car to
   drive it forward, or swipe it to choose forward / reverse. A car with a
   clear lane drives out onto the ring road and leaves through the gate.
   A blocked car drives up to whatever is in the way, crashes, honks and backs
   into its spot again — and every crash costs a heart. Empty the lot!
   Levels come from a seed and are always solvable. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Lot Escape",
  // Short line under the logo on the title screen
  tagline: "Tap. Swipe. Clear the lot!",
  // the logo on the title screen, one entry per line
  titleLines: ["LOT", "ESCAPE"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#22283a",
    "ink-2": "#5f6782",
    "paper": "#fbfdff",
    "cream": "#eef4ff",
    "accent": "#ff6b3d",
    "accent-d": "#d84a1c",
    "green": "#34c46e",
    "green-d": "#1f9551",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  // Car paint colours (a = body, b = shade)
  paints: [
    { a: "#ff4d5e", b: "#c4223a" }, { a: "#3d8bff", b: "#2157c4" }, { a: "#ffd23f", b: "#d39a00" },
    { a: "#36c46e", b: "#1f8f4c" }, { a: "#f4f6fb", b: "#aeb6c8" }, { a: "#3b3f52", b: "#1f2230" },
    { a: "#ff8f3d", b: "#d2620e" }, { a: "#a77bff", b: "#6a3fd6" }, { a: "#3fd8d0", b: "#139a94" },
    { a: "#ff7ec8", b: "#d43c92" }
  ],
  // Car models (len = how many parking spaces long). "taxi" is always yellow.
  models: [
    { id: "sedan", len: 2 }, { id: "hatch", len: 2 }, { id: "sport", len: 2 }, { id: "pickup", len: 2 },
    { id: "van", len: 2 }, { id: "taxi", len: 2 }, { id: "bus", len: 3 }, { id: "truck", len: 3 }
  ],

  levels: {
    count: 120,                    // levels in the game (generated from seed + level number)
    seed: 9157,                    // change it for a whole new set of levels
    hardEvery: 10,                 // every Nth level is HARD: bigger lot, deeper jam, 2 hearts, double coins
    // difficulty steps: a level uses the first step whose upTo >= its number.
    // size = [columns, rows], fill = share of spaces taken by cars, depth = how many "waves" of cars
    // must leave before the last one can (the generator aims for it), long = chance of a bus/truck,
    // cones = traffic cones, fences = fence pieces along the lot edge, trap = chance a car faces the blocked way
    curve: [
      { upTo: 1,   size: [4, 5],  fill: 0.45, depth: 2, long: 0,    cones: 0, fences: 0, trap: 0 },
      { upTo: 3,   size: [5, 6],  fill: 0.6,  depth: 3, long: 0,    cones: 0, fences: 0, trap: 0.25 },
      { upTo: 8,   size: [5, 7],  fill: 0.7,  depth: 4, long: 0.1,  cones: 0, fences: 0, trap: 0.4 },
      { upTo: 20,  size: [6, 8],  fill: 0.75, depth: 5, long: 0.15, cones: 1, fences: 2, trap: 0.5 },
      { upTo: 40,  size: [7, 9],  fill: 0.78, depth: 6, long: 0.18, cones: 2, fences: 3, trap: 0.55 },
      { upTo: 70,  size: [7, 10], fill: 0.8,  depth: 7, long: 0.2,  cones: 2, fences: 4, trap: 0.6 },
      { upTo: 100, size: [8, 10], fill: 0.82, depth: 8, long: 0.22, cones: 3, fences: 5, trap: 0.6 },
      { upTo: 999, size: [8, 11], fill: 0.84, depth: 9, long: 0.25, cones: 3, fences: 6, trap: 0.65 }
    ]
  },

  hearts: 3,                       // crashes allowed per level (HARD levels get one less)
  speed: { lot: 9, road: 11, back: 6 },   // driving speeds in parking spaces per second

  // Boosters: price in coins. hint = shows a car that can leave and which way, crane = lifts any car out
  boosters: {
    hint:  { name: "Hint",  price: 90,  start: 3 },
    crane: { name: "Crane", price: 160, start: 2 }
  },
  coins: { win: 20, hard: 40, perStar: 5 },

  // Lot looks in the shop: grass, road, lot asphalt, line paint, tree leaves, night = headlights + lamps
  themes: [
    { id: "day",    name: "Sunny Day", price: 0,    grass: ["#8fdc6a", "#7acb58"], road: "#5b6170", lot: "#6f7585", line: "#ffffff", leaf: ["#4fb64a", "#3a9a3c"], night: false },
    { id: "autumn", name: "Autumn",    price: 300,  grass: ["#d8c070", "#c9ad5a"], road: "#5e5a5c", lot: "#77716f", line: "#fff2d6", leaf: ["#ff9a3d", "#e0602a"], night: false },
    { id: "snow",   name: "Snowy",     price: 500,  grass: ["#f2f7ff", "#dde8f6"], road: "#5d6577", lot: "#7d8598", line: "#ffffff", leaf: ["#3f8f6a", "#2f7356"], night: false },
    { id: "beach",  name: "Beach",     price: 800,  grass: ["#ffe2a3", "#f4cf86"], road: "#666a73", lot: "#80848e", line: "#ffffff", leaf: ["#3fbf6a", "#2a9a52"], night: false },
    { id: "night",  name: "City Night",price: 1200, grass: ["#2b4a3a", "#223d30"], road: "#2c3040", lot: "#3a3f52", line: "#e8ecff", leaf: ["#24543a", "#1b4430"], night: true },
    { id: "neon",   name: "Neon",      price: 1600, grass: ["#1c1840", "#151232"], road: "#22203a", lot: "#2c2950", line: "#7fe8ff", leaf: ["#8a3fd6", "#6a2fb8"], night: true }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "le_"
};
