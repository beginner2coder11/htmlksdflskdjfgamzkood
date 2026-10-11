/* ==========================================================================
   STACK TOWER — GAME CONFIG
   Everything a reskin needs lives here. The tower, sky and effects are drawn
   in code, so the game looks finished with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Stack Tower",
  titleLines: ["STACK", "TOWER"],       // CSS logo used when assets/ui/logo.png is missing

  tower: {
    baseSize: 100,                      // block width/depth in world units
    layerHeight: 20,
    perfectTolerance: 4,                // drop within this many units = PERFECT
    growAfterStreak: 4,                 // perfect streak that starts growing the block back
    growAmount: 6,                      // units regained per perfect after that
    startSpeed: 120,                    // units per second
    speedPerLevel: 1.6,
    maxSpeed: 290,
    coinChance: 0.14,                   // chance a block carries a coin
    milestoneEvery: 25,
    metersPerLevel: 3                   // altitude shown in meters
  },

  // Sky keyframes by floor: [floor, topColor, bottomColor]
  sky: [
    [0,   "#ffb77a", "#ff8fa8"],          // sunset
    [18,  "#ff9fc4", "#ffcfb0"],          // pink dusk
    [38,  "#b9a2ff", "#ffc9e6"],          // lavender
    [60,  "#73bfff", "#cdeaff"],          // day sky
    [100, "#4f6dff", "#a98cff"],          // high altitude
    [140, "#2a1f7a", "#7a3fbf"],          // stratosphere
    [190, "#0a0b2e", "#24135a"],          // edge of space
    [260, "#02020c", "#0b0830"]           // deep space
  ],

  // Tower color themes, unlocked in the shop. "price: 0" = owned from the start.
  themes: [
    { id: "sunset", name: "Sunset", price: 0,    hue: 20,  hueStep: 4,   sat: 75, light: 62 },
    { id: "ocean",  name: "Ocean",  price: 250,  hue: 185, hueStep: 2.5, sat: 70, light: 58 },
    { id: "candy",  name: "Candy",  price: 400,  palette: ["#ff8fc8", "#ffd36e", "#8fe3ff", "#b79bff", "#8ff0b4"] },
    { id: "neon",   name: "Neon",   price: 700,  hue: 280, hueStep: 9,   sat: 100, light: 55, neon: true },
    { id: "gold",   name: "Gold",   price: 1200, palette: ["#ffd54a", "#ffc42e", "#ffdf73", "#f5b31c"], metal: true }
  ],

  powerups: {
    slowmo: { label: "Slow-Mo", start: 2, cost: 60, blocks: 6 },
    widen:  { label: "Widen",   start: 2, cost: 80 },
    shield: { label: "Shield",  start: 1, cost: 120 }
  },

  // Three are active at a time; finishing one rolls in the next.
  missions: [
    { id: "h10",  text: "Reach floor 10",                 type: "height",  goal: 10,  reward: 30 },
    { id: "p5",   text: "Land 5 perfects in one run",     type: "perfects", goal: 5,  reward: 30 },
    { id: "s3",   text: "Get a perfect streak of 3",      type: "streak",  goal: 3,   reward: 40 },
    { id: "c10",  text: "Collect 10 coins on the tower",  type: "coinsTotal", goal: 10, reward: 40 },
    { id: "h25",  text: "Reach floor 25",                 type: "height",  goal: 25,  reward: 60 },
    { id: "g5",   text: "Play 5 games",                   type: "games",   goal: 5,   reward: 40 },
    { id: "s6",   text: "Get a perfect streak of 6",      type: "streak",  goal: 6,   reward: 80 },
    { id: "pu3",  text: "Use 3 power-ups",                type: "powerups", goal: 3,  reward: 50 },
    { id: "h50",  text: "Reach floor 50",                 type: "height",  goal: 50,  reward: 120 },
    { id: "p25",  text: "Land 25 perfects in one run",    type: "perfects", goal: 25, reward: 120 },
    { id: "s10",  text: "Get a perfect streak of 10",     type: "streak",  goal: 10,  reward: 150 },
    { id: "h100", text: "Reach floor 100",                type: "height",  goal: 100, reward: 300 }
  ],

  economy: {
    startCoins: 100,
    coinsPerFloors: 10,                 // +1 coin per this many floors at game over
    milestoneCoins: 25,
    dailyRewards: [50, 75, 100, 125, 150, 200, 400]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    coin:       { image: "assets/ui/coin.png",         emoji: "🪙" },
    crown:      { image: "assets/ui/crown.png",        emoji: "👑" },
    star:       { image: "assets/ui/star.png",         emoji: "⭐" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    palette:    { image: "assets/ui/shop.png",         emoji: "🎨" },
    missions:   { image: "assets/ui/missions.png",     emoji: "📜" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    flag:       { image: "assets/ui/flag.png",         emoji: "🚩" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" },
    slowmo:     { image: "assets/ui/pu_slowmo.png",    emoji: "⏳" },
    widen:      { image: "assets/ui/pu_widen.png",     emoji: "↔️" },
    shield:     { image: "assets/ui/pu_shield.png",    emoji: "🛡️" }
  },

  ads: {
    enabled: true,
    simulate: true,                     // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryGames: 3
  },

  sounds: {
    place: null, chop: null, perfect: null, miss: null, coin: null, power: null,
    click: null, whoosh: null, newbest: null, unlock: null, milestone: null,
    music: null                         // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
