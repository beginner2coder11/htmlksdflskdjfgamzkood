/* ==========================================================================
   PIN RESCUE — GAME CONFIG
   A pull-the-pin puzzle. A glass tower is split into bins by golden pins.
   Tap a pin to slide it out, and whatever sits on it falls. Get the gems
   and coins down to the explorer, but keep the lava away: water poured on
   lava turns both into stone, and lava or a falling boulder knocks out the
   grumpy monster. Levels are in js/levels.js (made by tools/gen-levels.js,
   every pin order checked through the real physics in js/physics.js).
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Pin Rescue",
  // Short line under the logo on the title screen
  tagline: "Pull the pins. Save the treasure!",
  // the logo on the title screen, one entry per line
  titleLines: ["PIN", "RESCUE"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#22304a",
    "ink-2": "#5f6f8e",
    "paper": "#fbfdff",
    "cream": "#eef6ff",
    "accent": "#ff8a2e",
    "accent-d": "#d86410",
    "green": "#34c46e",
    "green-d": "#1f9551",
    "blue": "#3d8bff",
    "blue-d": "#2363d1",
    "gold": "#ffc93d",
    "red": "#ff4d5e"
  },

  // Stars for treasure saved (share of all gems): the level is won at "need" (level data, 70%)
  stars: [0.7, 0.85, 0.95],

  // Boosters: price in coins. hint = flashes the next pin to pull
  boosters: {
    hint: { name: "Hint", price: 90, start: 3 }
  },
  coins: { win: 20, perStar: 5, perGem: 0.5 },

  // Scenery in the shop: sky gradient, far hills, glass colour, room wallpaper + floor
  themes: [
    { id: "meadow", name: "Meadow",  price: 0,    sky: ["#8fd8ff", "#dff6ff"], hills: ["#9be07a", "#6cc35a"], glass: "rgba(190,235,255,0.9)", room: "#ffe2b8", floor: "#c98a52" },
    { id: "desert", name: "Desert",  price: 300,  sky: ["#ffb98a", "#ffe9cc"], hills: ["#f0c070", "#d89a50"], glass: "rgba(255,230,200,0.9)", room: "#fff0d0", floor: "#b8763c" },
    { id: "snow",   name: "Snowy",   price: 500,  sky: ["#b8d0ff", "#f2f6ff"], hills: ["#ffffff", "#dbe6f6"], glass: "rgba(210,230,255,0.9)", room: "#e8f0ff", floor: "#8a9ab8" },
    { id: "jungle", name: "Jungle",  price: 800,  sky: ["#7fe0c0", "#d8fff0"], hills: ["#3fae6a", "#2a8a50"], glass: "rgba(200,255,230,0.9)", room: "#e0f8d8", floor: "#7a5a3a" },
    { id: "dusk",   name: "Dusk",    price: 1200, sky: ["#6a5acd", "#ffb08a"], hills: ["#4a3a8a", "#33286a"], glass: "rgba(230,210,255,0.85)", room: "#f8e0ff", floor: "#6a4a8a" },
    { id: "night",  name: "Night",   price: 1600, sky: ["#1a1a40", "#3a3a7a"], hills: ["#22224a", "#16163a"], glass: "rgba(180,200,255,0.75)", room: "#3a3a6a", floor: "#2a2a4a" }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "pr_"
};
