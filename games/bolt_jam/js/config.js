/* ==========================================================================
   BOLT JAM — GAME CONFIG
   A screw-sorting puzzle. Coloured screws pin glossy plates to a board.
   Tap a screw to unscrew it: it flies into the toolbox of its colour.
   A full toolbox (3 screws) closes and the next one slides in. Screws with
   no matching box wait in the spare holes; fill them all and you're out.
   A plate with one screw left swings on it, and with none it drops away.
   Every level is generated from a seed and is always solvable.
   Everything (plates, screws, boxes, sound) is made in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Bolt Jam",
  // Short line under the logo on the title screen
  tagline: "Unscrew. Sort. Drop every plate.",
  // the logo on the title screen, one entry per line
  titleLines: ["BOLT", "JAM"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2b2440",
    "ink-2": "#6a6286",
    "paper": "#fffaf2",
    "cream": "#fff1dc",
    "accent": "#ff7a3d",
    "accent-d": "#d9551c",
    "green": "#38c172",
    "green-d": "#22955a",
    "blue": "#4a8cff",
    "blue-d": "#2c66d6",
    "gold": "#ffc83d",
    "red": "#ff4d5e"
  },

  // Screw colours: a = head colour, b = shadow side. Levels use the first N (see levels.curve).
  colors: [
    { id: "red",    name: "Red",    a: "#ff5a6a", b: "#c41f36" },
    { id: "blue",   name: "Blue",   a: "#4f9bff", b: "#1f5fd0" },
    { id: "yellow", name: "Yellow", a: "#ffd23f", b: "#d39a00" },
    { id: "green",  name: "Green",  a: "#4fd67a", b: "#1f9a4a" },
    { id: "purple", name: "Purple", a: "#a77bff", b: "#6a3fd6" },
    { id: "orange", name: "Orange", a: "#ff9a3d", b: "#d2620e" },
    { id: "teal",   name: "Teal",   a: "#3fd8d0", b: "#139a94" },
    { id: "pink",   name: "Pink",   a: "#ff7ec8", b: "#d43c92" },
    { id: "white",  name: "Silver", a: "#f4f6fb", b: "#9aa3b8" }
  ],

  // Plate tints (glossy acrylic). Picked in turn so neighbouring plates differ.
  plateTints: ["#ffb26b", "#7fd3ff", "#ffe27a", "#b9f08a", "#d7b4ff", "#ff9fb6", "#8ff0d6", "#ffd0a0", "#a8c4ff"],
  plateAlpha: 0.82,                // 1 = solid, lower = see the screws underneath more clearly

  levels: {
    count: 120,                    // levels in the game (generated from seed + level number)
    seed: 4242,                    // change it to get a whole new set of levels
    hardEvery: 10,                 // every Nth level is a HARD level (more plates, tighter order, double coins)
    // difficulty steps: a level uses the first step whose upTo >= its number.
    // plates = [min, max] plates, colors = how many screw colours, mix = how much the box order differs
    // from the easy order (0..1, higher = more spare-hole juggling)
    curve: [
      { upTo: 1,   plates: [2, 2],   colors: 2, mix: 0 },
      { upTo: 3,   plates: [3, 4],   colors: 2, mix: 0.1 },
      { upTo: 8,   plates: [4, 5],   colors: 3, mix: 0.25 },
      { upTo: 20,  plates: [5, 7],   colors: 4, mix: 0.4 },
      { upTo: 40,  plates: [6, 8],   colors: 5, mix: 0.55 },
      { upTo: 70,  plates: [7, 10],  colors: 6, mix: 0.65 },
      { upTo: 100, plates: [8, 11],  colors: 7, mix: 0.75 },
      { upTo: 999, plates: [9, 12],  colors: 8, mix: 0.85 }
    ]
  },

  boxSlots: 3,                     // screws per toolbox
  activeBoxes: 2,                  // toolboxes open at the same time
  spareHoles: 5,                   // spare holes at the start of every level
  maxExtraHoles: 1,                // extra spare holes you can add per level (booster / ad)

  physics: { gravity: 2200, damping: 1.6 },   // plate swing and fall (world units per s²)

  // Boosters: price in coins. hole = one more spare hole, drill = pull out ANY screw (even a covered one)
  boosters: {
    hole:  { name: "Extra Hole", price: 120, start: 2 },
    drill: { name: "Drill",      price: 160, start: 2 }
  },

  coins: { win: 20, hard: 40, perStarScrew: 0 },

  // Board looks in the shop (bg = page gradient, board = board colours, dots = pegboard dots)
  boards: [
    { id: "workshop", name: "Workshop", price: 0,    bg: ["#ffcf9e", "#ff9f7a"], board: ["#f7e2c4", "#ecc99a"], dots: "#d9b07a", grain: true },
    { id: "mint",     name: "Mint",     price: 300,  bg: ["#b8f0d8", "#7fd6c0"], board: ["#e8fbf3", "#c9f0e2"], dots: "#9fd9c2", grain: false },
    { id: "sky",      name: "Sky",      price: 500,  bg: ["#b9d8ff", "#8fb4ff"], board: ["#eef5ff", "#d4e4ff"], dots: "#a9c3ef", grain: false },
    { id: "berry",    name: "Berry",    price: 800,  bg: ["#ffc0dc", "#d79bff"], board: ["#fff0f7", "#f6d9ec"], dots: "#e6b3d4", grain: false },
    { id: "night",    name: "Night",    price: 1200, bg: ["#2c2a5a", "#1a1838"], board: ["#3a3870", "#2f2d5e"], dots: "#4c4a8a", grain: false },
    { id: "oak",      name: "Oak",      price: 1600, bg: ["#c98a52", "#8f5a30"], board: ["#e2b07a", "#c88f58"], dots: "#a87444", grain: true }
  ],

  // Screw head styles in the shop
  heads: [
    { id: "phillips", name: "Phillips", price: 0 },
    { id: "slot",     name: "Slotted",  price: 250 },
    { id: "hex",      name: "Hex",      price: 450 },
    { id: "star",     name: "Star",     price: 700 },
    { id: "gem",      name: "Gem",      price: 1000 }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "bj_"
};
