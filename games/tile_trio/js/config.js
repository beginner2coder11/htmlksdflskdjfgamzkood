/* ==========================================================================
   TILE TRIO — GAME CONFIG
   A triple-tile match puzzle. Tiles with pictures are piled in layers.
   Tap a free tile (nothing on top of it) and it drops into the tray; tiles
   with the same picture line up together, and three of a kind pop. Clear
   the whole pile. If the tray fills up (traySlots) without a match, it's
   over. Every level is generated from a seed and is always solvable.
   Tiles are drawn in code; the pictures are emoji (change the sets below).
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Tile Trio",
  // Short line under the logo on the title screen
  tagline: "Match three. Clear the pile!",
  // the logo on the title screen, one entry per line
  titleLines: ["TILE", "TRIO"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#3a2a1e",
    "ink-2": "#8a6a52",
    "paper": "#fffaf2",
    "cream": "#fff1dc",
    "accent": "#ff7a3d",
    "accent-d": "#d9551c",
    "green": "#3cc46a",
    "green-d": "#26954e",
    "blue": "#4a8cff",
    "blue-d": "#2c66d6",
    "gold": "#ffc83d",
    "red": "#ff4d5e"
  },

  // Picture sets: a level uses one set (in turn) and its first N pictures (levels.curve kinds)
  sets: [
    { id: "fruit",   name: "Fruit",   bg: ["#fff3c4", "#ffd08a"], tiles: ["🍎", "🍌", "🍇", "🍓", "🍊", "🍉", "🍒", "🍍", "🥝", "🍑", "🍋", "🥥", "🫐", "🍐"] },
    { id: "sweets",  name: "Sweets",  bg: ["#ffe1ef", "#ffb3cf"], tiles: ["🍩", "🍪", "🧁", "🍭", "🍬", "🍫", "🍰", "🍦", "🥨", "🥞", "🍮", "🍯", "🥐", "🍿"] },
    { id: "animals", name: "Animals", bg: ["#e2f6d6", "#a8e08e"], tiles: ["🐶", "🐱", "🐰", "🦊", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐷", "🐮", "🐧", "🐻"] },
    { id: "garden",  name: "Garden",  bg: ["#e6f8ee", "#9fe0c0"], tiles: ["🌻", "🌷", "🌹", "🌼", "🍄", "🌵", "🍀", "🌸", "🐝", "🐞", "🦋", "🐌", "🌱", "🪴"] },
    { id: "ocean",   name: "Ocean",   bg: ["#dff3ff", "#8fd0ff"], tiles: ["🐠", "🐙", "🦀", "🐳", "🐬", "🦑", "🐚", "🐢", "🦈", "🐡", "🦞", "🦭", "🪸", "⛵"] },
    { id: "toys",    name: "Toys",    bg: ["#ece6ff", "#c3b2ff"], tiles: ["🎈", "🎁", "🧸", "🪁", "⚽", "🏀", "🎨", "🎸", "🚀", "🚗", "🎯", "🪀", "🛼", "🏓"] }
  ],

  traySlots: 7,                    // tray size: fill it without a match and the level is lost
  shelfSlots: 3,                   // the "Pop out" booster moves this many tray tiles to a shelf

  levels: {
    count: 120,                    // levels in the game
    seed: 6151,                    // change it for a whole new set of levels
    hardEvery: 10,                 // every Nth level is HARD: more layers, tighter tray, double coins
    // difficulty steps: a level uses the first step whose upTo >= its number.
    // tiles = about how many tiles, layers = pile height, kinds = different pictures,
    // squeeze = how hard the picture order pushes the tray (0..1); the tray never needs more than cap slots
    curve: [
      { upTo: 1,   tiles: 18,  layers: 1, kinds: 4,  squeeze: 0,    cap: 3 },
      { upTo: 3,   tiles: 30,  layers: 2, kinds: 5,  squeeze: 0.1,  cap: 3 },
      { upTo: 8,   tiles: 45,  layers: 3, kinds: 6,  squeeze: 0.2,  cap: 4 },
      { upTo: 20,  tiles: 63,  layers: 3, kinds: 8,  squeeze: 0.3,  cap: 4 },
      { upTo: 40,  tiles: 78,  layers: 4, kinds: 9,  squeeze: 0.3,  cap: 5 },
      { upTo: 70,  tiles: 87,  layers: 4, kinds: 10, squeeze: 0.35, cap: 5 },
      { upTo: 100, tiles: 96,  layers: 5, kinds: 10, squeeze: 0.4,  cap: 5 },
      { upTo: 999, tiles: 105, layers: 5, kinds: 11, squeeze: 0.45, cap: 5 }
    ]  },

  // Boosters: price in coins. undo = take back the last tile, pop = move 3 tray tiles to the shelf, shuffle = mix the pile
  boosters: {
    undo:    { name: "Undo",    price: 80,  start: 3 },
    pop:     { name: "Pop out", price: 150, start: 2 },
    shuffle: { name: "Shuffle", price: 100, start: 2 }
  },
  coins: { win: 20, hard: 40, perStar: 5 },
  parSeconds: 1.6,                 // ★★★ if cleared within this many seconds per tile (★★ within 2×)

  // Tile looks in the shop (face, edge = tile side, line = outline)
  tileStyles: [
    { id: "ivory", name: "Ivory",  price: 0,    face: ["#fffdf6", "#f3e6cf"], edge: "#c8a878", line: "#a8885a" },
    { id: "mint",  name: "Mint",   price: 300,  face: ["#f6fffb", "#d6f3e6"], edge: "#7cc4a2", line: "#5a9f80" },
    { id: "rose",  name: "Rose",   price: 500,  face: ["#fff7fa", "#fbd9e6"], edge: "#e090b0", line: "#c06a8e" },
    { id: "sky",   name: "Sky",    price: 800,  face: ["#f7fbff", "#d6e8ff"], edge: "#86a8e0", line: "#5f82c0" },
    { id: "honey", name: "Honey",  price: 1200, face: ["#fffbe8", "#ffe9a8"], edge: "#d8a830", line: "#b08418" },
    { id: "night", name: "Night",  price: 1600, face: ["#4a4670", "#34315a"], edge: "#1e1c38", line: "#16142a" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "tt_"
};
