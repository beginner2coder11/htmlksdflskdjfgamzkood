/* ==========================================================================
   CROWD RUSH — GAME CONFIG
   A crowd runner. Your crowd of little runners charges down the track:
   drag left / right to steer through gates (+20, ×3, −10, ÷2) that grow or
   shrink the crowd, beat red enemy crowds one-for-one, dodge sweepers, saws
   and walls, then climb the multiplier stairs or take down the giant boss.
   Levels are generated from a seed; the best path is solved so enemies and
   bosses are always beatable. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Crowd Rush",
  // Short line under the logo on the title screen
  tagline: "Pick the gates. Grow the crowd. Win the rush!",
  // the logo on the title screen, one entry per line
  titleLines: ["CROWD", "RUSH"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#1f2a44",
    "ink-2": "#5a6888",
    "paper": "#fbfdff",
    "cream": "#eef5ff",
    "accent": "#ff5a4e",
    "accent-d": "#d43a2e",
    "green": "#2fc46e",
    "green-d": "#1d9452",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  speed: 15,                       // forward speed (track units per second)
  trackWidth: 10,                  // track width (units); the crowd is kept inside it
  maxShown: 180,                   // runners drawn at most (bigger crowds show this many + the number)
  enemyColor: "#ff4a4a",

  levels: {
    count: 100,                    // levels in the game
    seed: 5021,                    // change it for a whole new set of tracks
    bossEvery: 5,                  // every Nth level ends with a boss instead of the multiplier stairs
    // difficulty steps: a level uses the first step whose upTo >= its number.
    // events = gates / enemies / obstacles on the track, enemy = enemy crowd size vs the best possible crowd,
    // boss = boss strength vs the best possible crowd at the end, obstacles = share of events that are obstacles
    curve: [
      { upTo: 1,   events: 4,  enemy: 0,    boss: 0.4,  obstacles: 0,    trap: 0.2 },
      { upTo: 5,   events: 6,  enemy: 0.25, boss: 0.5,  obstacles: 0.1,  trap: 0.3 },
      { upTo: 15,  events: 8,  enemy: 0.32, boss: 0.58, obstacles: 0.18, trap: 0.4 },
      { upTo: 35,  events: 10, enemy: 0.38, boss: 0.64, obstacles: 0.22, trap: 0.5 },
      { upTo: 60,  events: 12, enemy: 0.42, boss: 0.7,  obstacles: 0.25, trap: 0.55 },
      { upTo: 999, events: 14, enemy: 0.46, boss: 0.75, obstacles: 0.28, trap: 0.6 }
    ]
  },

  // the finale: each stair step uses share × (the best crowd possible on this level) runners, at least cost; multipliers on the steps
  stairs: { cost: 3, share: 0.085, steps: [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5] },
  coins: { base: 10, perRunner: 0.25 },

  // Permanent upgrades bought with coins: start = runners you start with, income = coin bonus per level of upgrade
  upgrades: {
    start:  { name: "Starting crowd", per: 1,    max: 30, cost: [60, 1.18] },     // cost = base × growth^level
    income: { name: "Income",         per: 0.1,  max: 30, cost: [80, 1.2] }
  },

  // Crowd colours in the shop (body, shade, hat)
  skins: [
    { id: "blue",   name: "Blue Team",   price: 0,    body: "#3d8bff", shade: "#2157c4", hat: null },
    { id: "green",  name: "Green Team",  price: 300,  body: "#2fc46e", shade: "#1d8a4c", hat: null },
    { id: "purple", name: "Purple Caps", price: 600,  body: "#9b6bff", shade: "#6a3fd6", hat: "#ffd23f" },
    { id: "orange", name: "Orange Caps", price: 900,  body: "#ff9a3d", shade: "#d2620e", hat: "#3d8bff" },
    { id: "pink",   name: "Pink Party",  price: 1300, body: "#ff7ec8", shade: "#d43c92", hat: "#ffffff" },
    { id: "gold",   name: "Gold Squad",  price: 2000, body: "#ffc93d", shade: "#c88a00", hat: "#ff4d5e" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "cr_"
};
