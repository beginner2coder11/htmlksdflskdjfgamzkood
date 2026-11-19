/* ==========================================================================
   PRISM HOP — GAME CONFIG
   A bouncy orb hops along floating glass tiles through five glowing worlds.
   Drag left/right to steer it onto the next tile. Land dead centre for a
   PERFECT, chain perfects to fill the Fever meter, grab gems, ride boost pads.
   Everything is drawn in code: no image or sound files needed.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Prism Hop",
  // Short line under the logo on the title screen
  tagline: "Steer the orb. Nail the centre. Keep the glow alive.",
  // the logo on the title screen, one entry per line
  titleLines: ["PRISM", "HOP"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#0a061e",
    "glass": "rgba(255, 255, 255, 0.12)",
    "glass-2": "rgba(255, 255, 255, 0.2)",
    "edge": "rgba(255, 255, 255, 0.35)",
    "text": "#ffffff",
    "muted": "rgba(255, 255, 255, 0.72)",
    "pink": "#ff5ad8",
    "cyan": "#4ff2ff",
    "violet": "#9b7bff",
    "gold": "#ffe36b",
    "mint": "#5ff7d2"
  },

  // world units: the lane is about 5 wide, rows are `rowGap` apart
  lane: { half: 2.0, rowGap: 4.2, tile: 1.7, small: 1.05, ballR: 0.42, depthTile: 1.7 },

  // hop time in seconds at the start and the fastest it ever gets
  speed: { hopStart: 0.66, hopMin: 0.4, perStage: 0.045, hopHeight: 1.7, boostHeight: 4.2 },

  // landing judgement: share of the tile half-width from its centre
  judge: { perfect: 0.28, great: 0.62 },
  // Score per landing: perfect, great, good, and per gem
  points: { perfect: 3, great: 2, good: 1, gem: 5 },

  // drag sensitivity: dragging the full screen width moves the orb this many units
  steer: { span: 6.4, keySpeed: 7.5 },

  // Fever: every PERFECT adds 1, GREAT adds 0.4, GOOD drains 2. Full meter = Fever.
  fever: { need: 12, hops: 14, scoreMult: 2 },

  // one stage = this many hops, then the world changes and the pace picks up
  stageHops: 45,

  // special tiles: chance per row once that stage is reached (stage index starts at 0)
  specials: {
    slide: { from: 1, chance: 0.16 },
    small: { from: 1, chance: 0.12 },
    boost: { from: 0, chance: 0.05 },
    twin:  { from: 2, chance: 0.1 },
    power: { from: 0, chance: 0.035 }
  },
  // Chance a tile carries a gem (0..1)
  gemChance: 0.22,

  // Power-ups: shield hits, magnet and slow-motion length in hops, slow factor
  power: { shield: 1, magnetHops: 16, slowHops: 10, slowFactor: 1.45 },

  // worlds cycle in order. sky = top → horizon, floor = horizon → bottom
  worlds: [
    { name: "Aurora Lake",  sky: ["#050a24", "#0d2a52", "#1d6f86"], floor: ["#06283a", "#031420"], tile: "#5ff7d2", glow: "#3cf0c0", accent: "#9b7bff", prop: "crystal", air: "stars",   sun: "#d8fff4" },
    { name: "Ember Dunes",  sky: ["#1b0630", "#7a1f5c", "#ff8a3d"], floor: ["#3a0f2c", "#14041a"], tile: "#ffc56b", glow: "#ff9a3c", accent: "#ff4f8b", prop: "pyramid", air: "embers",  sun: "#ffe08a" },
    { name: "Coral Deep",   sky: ["#021b2e", "#05476a", "#0b8fa8"], floor: ["#043049", "#011423"], tile: "#ff8fb1", glow: "#ff6f9f", accent: "#4ff2ff", prop: "coral",   air: "bubbles", sun: "#bff8ff" },
    { name: "Candy Clouds", sky: ["#3b2a8f", "#c06bd8", "#ffc4e1"], floor: ["#5a3a9e", "#2a1660"], tile: "#ffffff", glow: "#ffb3f0", accent: "#7cf3ff", prop: "cloud",   air: "petals",  sun: "#fff4fb" },
    { name: "Neon Metro",   sky: ["#05010f", "#1d0640", "#4a0f7a"], floor: ["#12062a", "#04010c"], tile: "#62e8ff", glow: "#2fd8ff", accent: "#ff3fd0", prop: "tower",   air: "rain",    sun: "#ff7ae6" }
  ],

  // orb skins. look: plain | stripes | ring | dots | swirl | split. face: show the eyes
  skins: [
    { id: "pip",    name: "Pip",        a: "#7dffcf", b: "#13b886", trail: "#5ff7d2", look: "plain",   face: true,  price: 0 },
    { id: "mango",  name: "Mango",      a: "#ffd36b", b: "#ff7a2e", trail: "#ffb347", look: "stripes", face: true,  price: 150 },
    { id: "berry",  name: "Berry",      a: "#ff8fd0", b: "#c8247a", trail: "#ff6fbf", look: "dots",    face: true,  price: 250 },
    { id: "saturn", name: "Saturn",     a: "#ffe6a8", b: "#d08a3a", trail: "#ffd28a", look: "ring",    face: false, price: 400 },
    { id: "melon",  name: "Melon",      a: "#9dff7a", b: "#1f8a3a", trail: "#ff5f6d", look: "stripes", face: true,  price: 500 },
    { id: "nova",   name: "Nova",       a: "#b9a6ff", b: "#3b1fa8", trail: "#9b7bff", look: "swirl",   face: false, price: 700 },
    { id: "frost",  name: "Frost",      a: "#ffffff", b: "#7fd6ff", trail: "#bff4ff", look: "split",   face: true,  price: 900 },
    { id: "lava",   name: "Lava",       a: "#ffb15c", b: "#b3121f", trail: "#ff4a2e", look: "swirl",   face: false, price: 1200 },
    { id: "disco",  name: "Disco",      a: "#f2f2ff", b: "#8a8ab8", trail: "rainbow", look: "dots",    face: false, price: 1600 },
    { id: "prism",  name: "Prism",      a: "#ffffff", b: "#ff6fd8", trail: "rainbow", look: "split",   face: true,  price: 2400 }
  ],

  // missions: three are active at a time, each pays gems when done
  missions: [
    { id: "perf10",  text: "Land 10 PERFECTs in one run",  stat: "runPerfect", goal: 10, reward: 40 },
    { id: "perf25",  text: "Land 25 PERFECTs in one run",  stat: "runPerfect", goal: 25, reward: 80 },
    { id: "streak8", text: "Chain 8 PERFECTs in a row",    stat: "runStreak",  goal: 8,  reward: 60 },
    { id: "streak15",text: "Chain 15 PERFECTs in a row",   stat: "runStreak",  goal: 15, reward: 120 },
    { id: "gems30",  text: "Collect 30 gems",              stat: "totalGems",  goal: 30, reward: 50 },
    { id: "gems100", text: "Collect 100 gems",             stat: "totalGems",  goal: 100, reward: 120 },
    { id: "stage2",  text: "Reach Ember Dunes",            stat: "runStage",   goal: 2,  reward: 60 },
    { id: "stage3",  text: "Reach Coral Deep",             stat: "runStage",   goal: 3,  reward: 120 },
    { id: "fever1",  text: "Trigger Fever",                stat: "runFever",   goal: 1,  reward: 50 },
    { id: "fever3",  text: "Trigger Fever 3 times in one run", stat: "runFever", goal: 3, reward: 140 },
    { id: "boost5",  text: "Ride 5 boost pads",            stat: "totalBoost", goal: 5,  reward: 40 },
    { id: "score300",text: "Score 300 in one run",         stat: "runScore",   goal: 300, reward: 60 },
    { id: "score900",text: "Score 900 in one run",         stat: "runScore",   goal: 900, reward: 150 },
    { id: "runs5",   text: "Play 5 runs",                  stat: "totalRuns",  goal: 5,  reward: 40 },
    { id: "power3",  text: "Pick up 3 power-ups",          stat: "totalPower", goal: 3,  reward: 50 }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [20, 30, 40, 60, 80, 100, 150],   // gift for day 1..7 of a login streak
  // Gem price of a revive
  revive: { gems: 60 },

  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "ph_"
};
