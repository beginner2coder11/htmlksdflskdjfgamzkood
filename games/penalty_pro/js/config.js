/* ==========================================================================
   PENALTY PRO — GAME CONFIG
   A football penalty shootout. Take turns: swipe from the ball to shoot (where
   the swipe ends is where you aim, bend it to curl it, too fast and it flies
   over), then tap where to dive to save the rival's kick. Five kicks each,
   then sudden death. Win matches to go through the cups: Round of 16,
   Quarter-final, Semi-final, Final. All teams are made up. Drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Penalty Pro",
  // Short line under the logo on the title screen
  tagline: "Swipe to shoot. Tap to save. Win the cup!",
  // the logo on the title screen, one entry per line
  titleLines: ["PENALTY", "PRO"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#13213a",
    "ink-2": "#56688a",
    "paper": "#fbfdff",
    "cream": "#eef5ff",
    "accent": "#2fc46e",
    "accent-d": "#1d9452",
    "green": "#2fc46e",
    "green-d": "#1d9452",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  kicks: 5,                        // kicks each before sudden death
  keeper: { speed: 7.5, reach: 0.95 },   // YOUR keeper: dive speed (m/s) and arm reach (m)
  // Rival teams (made up). shirt / shorts / keeper = keeper shirt
  teams: [
    { name: "Red Lions",      short: "RDL", shirt: "#e8323e", shorts: "#ffffff", keeper: "#2fc46e" },
    { name: "Blue Sharks",    short: "BSH", shirt: "#2f7de1", shorts: "#13213a", keeper: "#ffc93d" },
    { name: "Golden Eagles",  short: "GEA", shirt: "#ffc93d", shorts: "#13213a", keeper: "#7b5cff" },
    { name: "Green Vipers",   short: "GVP", shirt: "#2fae5a", shorts: "#ffffff", keeper: "#ff7a3d" },
    { name: "Purple Storm",   short: "PST", shirt: "#7b4fd6", shorts: "#ffffff", keeper: "#3fd8d0" },
    { name: "Orange Tigers",  short: "OTG", shirt: "#ff7a2e", shorts: "#13213a", keeper: "#3d8bff" },
    { name: "Silver Wolves",  short: "SWO", shirt: "#c9d0de", shorts: "#3a4058", keeper: "#ff4d5e" },
    { name: "Night Panthers", short: "NPA", shirt: "#2a2e3e", shorts: "#ffc93d", keeper: "#ff7ec8" },
    { name: "Sky Hawks",      short: "SKH", shirt: "#5fc8ff", shorts: "#ffffff", keeper: "#ff7a2e" },
    { name: "Coral Crabs",    short: "CRC", shirt: "#ff6f6f", shorts: "#2a2e3e", keeper: "#2fc46e" },
    { name: "Teal Dolphins",  short: "TDO", shirt: "#1fb0a8", shorts: "#ffffff", keeper: "#ffc93d" },
    { name: "Iron Bulls",     short: "IRB", shirt: "#8a3a2a", shorts: "#ffc93d", keeper: "#3d8bff" }
  ],
  cups: ["Bronze Cup", "Silver Cup", "Gold Cup", "Diamond Cup", "Champions Cup"],
  rounds: ["Round of 16", "Quarter-final", "Semi-final", "Final"],

  levels: {
    count: 60,                     // matches in the game (4 per cup)
    // difficulty from the first match (0) to the last (1), blended linearly:
    // keeper: read = chance to guess your side, react = s before diving, reach = arm reach (m), speed = dive speed (m/s)
    // shooter: time = ball flight time (s), corner = how close to the posts (0..1), miss = chance to miss the target
    easy: { read: 0.12, react: 0.3,  reach: 0.62, speed: 6.5, time: 0.66, corner: 0.62, miss: 0.12 },
    hard: { read: 0.45, react: 0.15, reach: 0.85, speed: 8.6, time: 0.58, corner: 0.84, miss: 0.07 }
  },

  coins: { win: 30, final: 120, perGoal: 4, perSave: 6 },

  // Your kits in the shop (shirt, shorts, keeper shirt)
  kits: [
    { id: "home",    name: "Home",    price: 0,    shirt: "#ffffff", shorts: "#13213a", keeper: "#ff7a2e", trim: "#2fc46e" },
    { id: "away",    name: "Away",    price: 300,  shirt: "#13213a", shorts: "#13213a", keeper: "#ffc93d", trim: "#5fc8ff" },
    { id: "lime",    name: "Lime",    price: 600,  shirt: "#b8f03f", shorts: "#13213a", keeper: "#7b5cff", trim: "#13213a" },
    { id: "stripes", name: "Stripes", price: 900,  shirt: "#e8323e", shorts: "#ffffff", keeper: "#2fc46e", trim: "#ffffff", stripes: true },
    { id: "royal",   name: "Royal",   price: 1300, shirt: "#5537d6", shorts: "#ffc93d", keeper: "#2fc46e", trim: "#ffc93d" },
    { id: "gold",    name: "Golden",  price: 2000, shirt: "#ffc93d", shorts: "#ffffff", keeper: "#13213a", trim: "#13213a" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "pp_"
};
