/* ==========================================================================
   BALL SORT — GAME CONFIG
   Two games in one: Ball Sort and Water Sort share the same 500 levels
   (js/levels.js, solver-verified). Balls, tubes, liquids and backgrounds are
   drawn in code, so the game looks finished with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Ball Sort",
  titleLines: ["BALL", "SORT"],

  // 12 puzzle colors (a–l in levels.js). Keep them far apart in hue/brightness.
  palette: [
    "#ff3d4f", // red
    "#ff9a1f", // orange
    "#ffe03a", // yellow
    "#54de4a", // green
    "#1f9a55", // dark green
    "#4fd8ff", // sky
    "#2f5bff", // blue
    "#9b4dff", // purple
    "#ff6fd2", // pink
    "#9a5a2c", // brown
    "#c7cfdb", // silver
    "#15b8a6"  // teal
  ],

  modes: {
    balls: { label: "Ball Sort",  emoji: "🔴", moveAll: false },  // moveAll: move the whole same-color run at once
    water: { label: "Water Sort", emoji: "💧" }                  // water always pours the whole run that fits
  },

  rules: {
    undoPerLevel: 5,                     // free undos per level (+5 for a rewarded ad)
    extraTubes: 1,                       // empty tubes the player may add per level
    extraTubeCost: 150,                  // coins (or watch an ad)
    hintCost: 60,
    extraTubeMaxStars: 2,                // adding a tube caps the level at 2 stars
    starSlack: 0.25                      // 3★ if moves ≤ par × (1 + slack); 2★ if ≤ par × 1.7
  },

  // Chapters on the level screen (20 levels each, names cycle).
  chapters: ["Warm Up", "Color Pop", "Bubbly", "Rainbow Road", "Brain Gym", "Tricky Tubes", "Mix Master", "Candy Lab",
             "Deep Ocean", "Night Lights", "Fizz Factory", "Crystal Cave", "Sky High", "Lava Lamp", "Puzzle Pro",
             "Neon Nights", "Big Brain", "Prism Peak", "Galaxy", "Sort Legend", "Hall of Fame", "Grandmaster", "Ultra", "Infinity", "Champion"],

  // Ball looks (js/skins.js). price 0 = owned from the start.
  ballSkins: [
    { id: "glossy",  name: "Glossy",   price: 0 },
    { id: "faces",   name: "Smiley",   price: 0 },
    { id: "candy",   name: "Candy",    price: 300 },
    { id: "pool",    name: "Pool",     price: 500 },
    { id: "symbols", name: "Shapes",   price: 600 },   // color-blind friendly
    { id: "gems",    name: "Gems",     price: 900 },
    { id: "neon",    name: "Neon",     price: 1200 },
    { id: "fruits",  name: "Fruits",   price: 1500 }
  ],
  fruitEmoji: ["🍎", "🍊", "🍋", "🍏", "🥝", "🍉", "🍇", "🍓", "🍑", "🍌", "🍒", "🍍"],   // older emoji only (render on old Android)

  tubeSkins: [
    { id: "glass",   name: "Glass",    price: 0,    stroke: "rgba(255,255,255,.85)", fill: "rgba(255,255,255,.10)", rim: "#e9f6ff", glow: null },
    { id: "frost",   name: "Frost",    price: 400,  stroke: "#9fe6ff", fill: "rgba(160,230,255,.16)", rim: "#c8f2ff", glow: "#6fd8ff" },
    { id: "candy",   name: "Candy",    price: 700,  stroke: "#ffc2e6", fill: "rgba(255,170,220,.14)", rim: "#ff6fb8", glow: null, stripes: "#ffffff" },
    { id: "gold",    name: "Gold",     price: 1000, stroke: "#ffe08a", fill: "rgba(255,220,120,.12)", rim: "#ffc93a", glow: "#ffcf33" },
    { id: "neon",    name: "Neon",     price: 1400, stroke: "#4dfff0", fill: "rgba(20,10,40,.35)",    rim: "#ff4dd8", glow: "#4dfff0" }
  ],

  // Backgrounds: gradient + soft bokeh colors.
  themes: [
    { id: "twilight", name: "Twilight", price: 0,    bg: ["#3a2a8f", "#1a1450"], bokeh: ["#7d6bff", "#ff6fd2", "#4fd8ff"] },
    { id: "ocean",    name: "Ocean",    price: 300,  bg: ["#0d6ea8", "#062a5a"], bokeh: ["#4fd8ff", "#7dffd4", "#ffffff"] },
    { id: "forest",   name: "Forest",   price: 500,  bg: ["#2f8a4a", "#0f3a26"], bokeh: ["#b6ff6b", "#ffe03a", "#7dffd4"] },
    { id: "sunset",   name: "Sunset",   price: 700,  bg: ["#ff7a59", "#7a2a7a"], bokeh: ["#ffe03a", "#ff9a1f", "#ffffff"] },
    { id: "candy",    name: "Candy",    price: 900,  bg: ["#ff9ad6", "#9b6bff"], bokeh: ["#ffffff", "#ffe03a", "#4fd8ff"] },
    { id: "space",    name: "Space",    price: 1200, bg: ["#151a3a", "#05060f"], bokeh: ["#ffffff", "#9b4dff", "#4fd8ff"] }
  ],

  missions: [
    { id: "l5",    text: "Complete 5 levels",             type: "levels",  goal: 5,   reward: 40 },
    { id: "t10",   text: "Finish 10 tubes",               type: "tubes",   goal: 10,  reward: 30 },
    { id: "w3",    text: "Complete 3 Water Sort levels",  type: "water",   goal: 3,   reward: 50 },
    { id: "s3",    text: "Earn 3 stars on 5 levels",      type: "stars3",  goal: 5,   reward: 60 },
    { id: "nu",    text: "Win 3 levels without undo",     type: "noUndo",  goal: 3,   reward: 60 },
    { id: "d1",    text: "Beat a daily challenge",        type: "daily",   goal: 1,   reward: 80 },
    { id: "h1",    text: "Beat a HARD level",             type: "hard",    goal: 1,   reward: 80 },
    { id: "m1",    text: "Beat a mystery level",          type: "mystery", goal: 1,   reward: 80 },
    { id: "l25",   text: "Complete 25 levels",            type: "levels",  goal: 25,  reward: 120 },
    { id: "t100",  text: "Finish 100 tubes",              type: "tubes",   goal: 100, reward: 120 },
    { id: "s20",   text: "Earn 3 stars on 20 levels",     type: "stars3",  goal: 20,  reward: 150 },
    { id: "d5",    text: "Beat 5 daily challenges",       type: "daily",   goal: 5,   reward: 200 },
    { id: "l100",  text: "Complete 100 levels",           type: "levels",  goal: 100, reward: 300 },
    { id: "h10",   text: "Beat 10 HARD levels",           type: "hard",    goal: 10,  reward: 300 }
  ],

  economy: {
    startCoins: 200,
    levelCoins: 10,                      // + starCoins × stars, ×2 on HARD levels
    starCoins: 5,
    chestEvery: 5,                       // a bonus chest every N levels
    chestCoins: [60, 120],               // random range
    dailyChallengeCoins: 150,
    dailyRewards: [50, 75, 100, 125, 150, 200, 400]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    coin:       { image: "assets/ui/coin.png",         emoji: "🪙" },
    star:       { image: "assets/ui/star.png",         emoji: "⭐" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    missions:   { image: "assets/ui/missions.png",     emoji: "📜" },
    shop:       { image: "assets/ui/shop.png",         emoji: "🛍️" },
    daily:      { image: "assets/ui/calendar.png",     emoji: "📅" },
    levels:     { image: "assets/ui/levels.png",       emoji: "🗺️" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    lock:       { image: "assets/ui/lock.png",         emoji: "🔒" },
    undo:       { image: "assets/ui/undo.png",         emoji: "↩️" },
    tube:       { image: "assets/ui/add_tube.png",     emoji: "🧪" },
    hint:       { image: "assets/ui/hint.png",         emoji: "💡" },
    restart:    { image: "assets/ui/restart.png",      emoji: "🔄" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryLevels: 3
  },

  sounds: {
    pick: null, drop: null, pour: null, reveal: null, tube: null, win: null, nope: null, undo: null,
    click: null, coin: null, unlock: null, star: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
