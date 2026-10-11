/* ==========================================================================
   KNIFE HIT — GAME CONFIG
   Targets, knives, apples and effects are drawn in code, so the game looks
   finished with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Knife Hit",
  titleLines: ["KNIFE", "HIT"],

  play: {
    throwSpeed: 3000,                    // px/s at scale 1 (screen ≈ 400×720)
    throwCooldown: 0.09,                 // seconds between throws
    hitWidth: 15,                        // px at scale 1: blade/handle half-widths combined — closer = clang!
    stagesPerBoss: 5,                    // every 5th stage is a boss
    appleChance: 0.65,                   // chance a stage has apples
    applesPerSlice: 1,
    reviveRestartsStage: true
  },

  // Rotation patterns (game.js): const, wobble, reverse, stopgo, surge
  // Normal stages get harder per "tier" (each group of 5 stages).
  difficulty: {
    baseSpeed: 1.7,                      // rad/s
    speedPerTier: 0.14,
    maxSpeed: 3.4,
    knivesBase: 5,
    knivesMax: 12,
    preplacedMax: 4
  },

  // Normal stages use wood logs; bosses cycle through these.
  woods: [
    { ring: "#d9a066", mid: "#b97a3e", bark: "#6b3f1d", chip: "#d9a066" },
    { ring: "#ead7b4", mid: "#cdb184", bark: "#5c4a35", chip: "#ead7b4" },   // birch
    { ring: "#c56f4a", mid: "#9d4c2c", bark: "#4e2414", chip: "#c56f4a" },   // cherry
    { ring: "#a7a08a", mid: "#7f7a66", bark: "#3c3a31", chip: "#a7a08a" }    // driftwood
  ],
  bosses: [
    { id: "cheese",     name: "Cheese Wheel", pattern: "reverse", speed: 2.4, knives: 9,  reward: "dagger",  chip: "#ffd34d" },
    { id: "tire",       name: "Monster Tire", pattern: "surge",   speed: 2.6, knives: 9,  reward: "kunai",   chip: "#3a3a44" },
    { id: "orange",     name: "Big Orange",   pattern: "wobble",  speed: 3.0, knives: 10, reward: "carrot",  chip: "#ff9a1f" },
    { id: "donut",      name: "Donut King",   pattern: "stopgo",  speed: 2.8, knives: 10, reward: "candy",   chip: "#ff7ab8" },
    { id: "pizza",      name: "Pizza Pie",    pattern: "reverse", speed: 3.2, knives: 11, reward: "pencil",  chip: "#ffcf5a" },
    { id: "cookie",     name: "Choco Cookie", pattern: "surge",   speed: 3.2, knives: 11, reward: "fork",    chip: "#c98a4a" },
    { id: "watermelon", name: "Watermelon",   pattern: "wobble",  speed: 3.4, knives: 12, reward: "ice",     chip: "#ff4d6d" },
    { id: "shield",     name: "Iron Shield",  pattern: "stopgo",  speed: 3.4, knives: 12, reward: "lava",    chip: "#b9c2cf" }
  ],

  // Knives (js/skins.js draws them). unlock: price (apples) | boss id | stage reached.
  knives: [
    { id: "classic", name: "Classic",   shape: "knife",   blade: ["#f4f7fb", "#9aa6b8"], handle: "#7a4a24", guard: "#3a3a44", price: 0 },
    { id: "chef",    name: "Chef",      shape: "chef",    blade: ["#ffffff", "#aab4c4"], handle: "#22232b", guard: "#c7cfdb", price: 150 },
    { id: "butter",  name: "Butter",    shape: "butter",  blade: ["#ffffff", "#c7cfdb"], handle: "#c7cfdb", guard: "#c7cfdb", price: 250 },
    { id: "cleaver", name: "Cleaver",   shape: "cleaver", blade: ["#eef2f7", "#8c97a8"], handle: "#5a3418", guard: "#2a2a30", price: 400 },
    { id: "dagger",  name: "Dagger",    shape: "dagger",  blade: ["#f6f8ff", "#a4afc4"], handle: "#b3202f", guard: "#ffcf33", boss: "cheese" },
    { id: "kunai",   name: "Kunai",     shape: "kunai",   blade: ["#5a6070", "#23262e"], handle: "#c42a3a", guard: "#23262e", boss: "tire" },
    { id: "carrot",  name: "Carrot",    shape: "carrot",  blade: ["#ffae3d", "#e8661a"], handle: "#3fbf4a", guard: "#3fbf4a", boss: "orange" },
    { id: "candy",   name: "Candy Cane",shape: "candy",   blade: ["#ffffff", "#ff3d4f"], handle: "#ff3d4f", guard: "#ffffff", boss: "donut" },
    { id: "pencil",  name: "Pencil",    shape: "pencil",  blade: ["#ffd23a", "#f2b200"], handle: "#ff8fb0", guard: "#c7cfdb", boss: "pizza" },
    { id: "fork",    name: "Fork",      shape: "fork",    blade: ["#f4f7fb", "#9aa6b8"], handle: "#9aa6b8", guard: "#9aa6b8", boss: "cookie" },
    { id: "ice",     name: "Ice",       shape: "dagger",  blade: ["#e6fbff", "#6fd8ff"], handle: "#2f7dd0", guard: "#bff3ff", boss: "watermelon", glow: "#6fd8ff" },
    { id: "lava",    name: "Lava",      shape: "knife",   blade: ["#ffe03a", "#ff3d1f"], handle: "#2a1208", guard: "#ff6a1f", boss: "shield", glow: "#ff5a1f" },
    { id: "neon",    name: "Neon",      shape: "kunai",   blade: ["#d9fffb", "#22e6d8"], handle: "#ff3dd8", guard: "#22e6d8", price: 800, glow: "#22e6d8" },
    { id: "gold",    name: "Golden",    shape: "chef",    blade: ["#fff3b0", "#d9a514"], handle: "#6b3f1d", guard: "#ffcf33", price: 1200, glow: "#ffcf33" },
    { id: "diamond", name: "Diamond",   shape: "dagger",  blade: ["#ffffff", "#7fe8ff"], handle: "#8a5cff", guard: "#e6faff", stage: 50, glow: "#bff3ff" },
    { id: "rainbow", name: "Rainbow",   shape: "knife",   blade: ["#ff3d4f", "#ffd23a", "#3fd84a", "#3fa6ff", "#9b4dff"], handle: "#ffffff", guard: "#ff6fd2", stage: 100 }
  ],

  missions: [
    { id: "s5",   text: "Reach stage 5",                  type: "stage",   goal: 5,   reward: 30 },
    { id: "a10",  text: "Slice 10 apples",                type: "apples",  goal: 10,  reward: 30 },
    { id: "b1",   text: "Defeat a boss",                  type: "bosses",  goal: 1,   reward: 50 },
    { id: "sc50", text: "Score 50 in one game",           type: "score",   goal: 50,  reward: 50, max: true },
    { id: "g10",  text: "Play 10 games",                  type: "games",   goal: 10,  reward: 40 },
    { id: "s15",  text: "Reach stage 15",                 type: "stage",   goal: 15,  reward: 80 },
    { id: "k500", text: "Throw 500 knives",               type: "knives",  goal: 500, reward: 80 },
    { id: "b5",   text: "Defeat 5 bosses",                type: "bosses",  goal: 5,   reward: 120 },
    { id: "a100", text: "Slice 100 apples",               type: "apples",  goal: 100, reward: 120 },
    { id: "s30",  text: "Reach stage 30",                 type: "stage",   goal: 30,  reward: 200 },
    { id: "sc200",text: "Score 200 in one game",          type: "score",   goal: 200, reward: 200, max: true },
    { id: "b20",  text: "Defeat 20 bosses",               type: "bosses",  goal: 20,  reward: 300 }
  ],

  economy: {
    startApples: 50,
    bossApples: 10,                      // bonus apples for each boss
    dailyRewards: [20, 30, 40, 50, 60, 80, 150]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    apple:      { image: "assets/ui/apple.png",        emoji: "🍎" },
    crown:      { image: "assets/ui/crown.png",        emoji: "👑" },
    boss:       { image: "assets/ui/boss.png",         emoji: "⚔️" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    missions:   { image: "assets/ui/missions.png",     emoji: "📜" },
    knives:     { image: "assets/ui/knives.png",       emoji: "🔪" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    lock:       { image: "assets/ui/lock.png",         emoji: "🔒" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryGames: 2
  },

  sounds: {
    throw: null, hit: null, clang: null, apple: null, break: null, boss: null, win: null,
    click: null, unlock: null, coin: null, over: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
