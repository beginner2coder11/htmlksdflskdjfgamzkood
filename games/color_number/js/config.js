/* ==========================================================================
   COLOR BY NUMBER — GAME CONFIG
   Relaxing pixel-art colouring. Pick a picture, pick a colour and tap or drag
   over the cells with its number. Pinch (or scroll) to zoom. Finish a picture
   to watch it replay as a time-lapse. 42 original pictures, all drawn in code
   (js/pictures.js). A new picture of the day, boosters, coins and a gallery
   of finished work.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Color by Number",
  // Short line under the logo on the title screen
  tagline: "Relax and paint pixel art",
  // the logo on the title screen, one entry per line
  titleLines: ["COLOR", "BY NUMBER"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2b2546",
    "ink-2": "#7a7396",
    "paper": "#ffffff",
    "cream": "#f7f3ff",
    "accent": "#8b5cf6",
    "accent-d": "#6d3fd6",
    "green": "#2fc46e",
    "green-d": "#1d9452",
    "blue": "#4b8bff",
    "blue-d": "#2f68d6",
    "gold": "#ffc93d",
    "red": "#ff5468"
  },

  freePictures: 14,                // the first N pictures are free; the rest unlock with coins or an ad
  unlockPrice: 150,
  coins: { perCell: 0.04, min: 30, daily: 60 },   // reward = max(min, cells × perCell); daily = bonus for the picture of the day
  // Boosters: start count and price in coins
  boosters: {
    bucket: { name: "Bucket", start: 3, price: 60, about: "Tap a cell to fill its whole patch" },
    blast:  { name: "Blast",  start: 3, price: 80, about: "Tap to paint a 7 × 7 area" },
    find:   { name: "Find",   start: 5, price: 30, about: "Jump to a cell still to paint" }
  },
  // painting with a wrong colour leaves a see-through mark (false = wrong colours are ignored)
  allowWrong: true,

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished pictures (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 2 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "cbn_"
};
