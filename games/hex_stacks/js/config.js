/* ==========================================================================
   HEX STACKS — GAME CONFIG
   A hexa-sort puzzle. Drag a stack of coloured hex tiles from the tray onto
   the honeycomb. Next to a stack with the same top colour, the tiles flip
   across and merge. Any run of 10 (clearAt) of one colour pops for points,
   and the stacks it uncovers can set off chain reactions. Reach the level's
   target before the board fills up. Locked cells open as your score grows.
   Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Hex Stacks",
  // Short line under the logo on the title screen
  tagline: "Stack. Sort. Pop the colours!",
  // the logo on the title screen, one entry per line
  titleLines: ["HEX", "STACKS"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2a2350",
    "ink-2": "#6c6596",
    "paper": "#fdfbff",
    "cream": "#f2edff",
    "accent": "#ff6fa8",
    "accent-d": "#d43c80",
    "green": "#2fc77a",
    "green-d": "#1e9458",
    "blue": "#4d8dff",
    "blue-d": "#2b62d4",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  // Tile colours (a = top face, b = side). Levels use the first N (levels.curve colors).
  colors: [
    { a: "#ff5a6e", b: "#c42840" }, { a: "#4d9bff", b: "#245fcf" }, { a: "#ffcf3d", b: "#d29a00" }, { a: "#46d47e", b: "#1f9a52" },
    { a: "#a77bff", b: "#6c3fd8" }, { a: "#ff9640", b: "#d2620f" }, { a: "#3fd8d2", b: "#169a95" }, { a: "#ff7ec8", b: "#d33c92" }
  ],

  clearAt: 10,                     // tiles of one colour on top of a stack that pop
  trayStacks: 3,                   // stacks offered at a time (a new set comes when all are placed)
  stackSize: [2, 6],               // tiles in a new stack (min, max)

  levels: {
    count: 120,                    // levels in the game
    seed: 3301,                    // change it for a whole new set of boards
    hardEvery: 10,                 // every Nth level is HARD: higher target, one more colour, double coins
    // difficulty steps: a level uses the first step whose upTo >= its number.
    // radius = board size (hexagon radius), holes = missing cells, locks = locked cells that open as you score,
    // colors = tile colours in play, mix = how many colour bands a new stack has (1..3), target = tiles to clear
    curve: [
      { upTo: 1,   radius: 2, holes: 0, locks: 0, colors: 3, mix: 1.2, target: 30 },
      { upTo: 3,   radius: 2, holes: 0, locks: 0, colors: 3, mix: 1.6, target: 50 },
      { upTo: 8,   radius: 3, holes: 6, locks: 2, colors: 4, mix: 2.0, target: 90 },
      { upTo: 20,  radius: 3, holes: 6, locks: 3, colors: 5, mix: 2.3, target: 140 },
      { upTo: 40,  radius: 3, holes: 4, locks: 4, colors: 5, mix: 2.5, target: 190 },
      { upTo: 70,  radius: 3, holes: 4, locks: 5, colors: 6, mix: 2.6, target: 240 },
      { upTo: 100, radius: 3, holes: 2, locks: 5, colors: 7, mix: 2.7, target: 290 },
      { upTo: 999, radius: 3, holes: 2, locks: 6, colors: 7, mix: 2.8, target: 340 }
    ]  },

  // Boosters: price in coins. hammer = smash one stack, swap = new set of tray stacks
  boosters: {
    hammer: { name: "Hammer", price: 150, start: 2 },
    swap:   { name: "Swap",   price: 100, start: 2 }
  },
  coins: { win: 20, hard: 40 },

  // Board looks in the shop (bg = page gradient, board = tray of the honeycomb, slot = empty cells)
  boards: [
    { id: "candy",  name: "Candy",   price: 0,    bg: ["#ffd6ec", "#c9b6ff"], board: "#ffffff", slot: "#e9e2ff" },
    { id: "mint",   name: "Mint",    price: 300,  bg: ["#c6f6e4", "#8fd8f0"], board: "#ffffff", slot: "#dcf3ee" },
    { id: "peach",  name: "Peach",   price: 500,  bg: ["#ffe2c4", "#ffb39a"], board: "#fffaf4", slot: "#fbe6d6" },
    { id: "ocean",  name: "Ocean",   price: 800,  bg: ["#9fd4ff", "#5b7bff"], board: "#f2f8ff", slot: "#d8e7ff" },
    { id: "night",  name: "Night",   price: 1200, bg: ["#2c2a5a", "#151432"], board: "#3a3870", slot: "#2b2958" },
    { id: "forest", name: "Forest",  price: 1600, bg: ["#bfe8a8", "#5fae7a"], board: "#f7fff2", slot: "#dcefd2" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "hx_"
};
