/* ==========================================================================
   TURBO RIVALS — GAME CONFIG
   Arcade street racing against four rival cars. Hold to drive, slide your
   finger to steer, fill the nitro bar by drafting, overtaking and boost pads,
   then fire it. Ramps launch you over trouble, cones and oil slicks slow you.
   Finish in the top 3 to unlock the next race. Everything is drawn in code.
   ========================================================================== */
(() => {
  const venues = [
    { name: "Harbor Docks",  sky: ["#5fb8e8", "#cfeeff"], grass: ["#3f8f8a", "#38817c"], rumble: ["#ffffff", "#e8403a"], road: ["#7a8088", "#737980"], lane: "#ffffff", fog: "#bfe0ef", back: "docks",  props: ["container", "crane", "lamp", "bollard"], gantry: true },
    { name: "Canyon Run",    sky: ["#ff9f5f", "#ffe0b0"], grass: ["#e0a060", "#d89656"], rumble: ["#ffffff", "#3f7fd8"], road: ["#8a7f78", "#837870"], lane: "#ffe066", fog: "#f2d0a0", back: "mesa",   props: ["cactus", "rock", "sign", "mesa"], gantry: false },
    { name: "Neon City",     sky: ["#120a36", "#3a1a6a"], grass: ["#22183f", "#1e1538"], rumble: ["#ff3fd0", "#2fd8ff"], road: ["#3a3650", "#36324a"], lane: "#7fe8ff", fog: "#2a1a52", back: "city",   props: ["tower", "neon", "lamp", "tower"], gantry: true, night: true }
  ];
  const levels = [];
  for (let i = 0; i < 30; i++) {
    const v = Math.floor(i / 10), k = i % 10, d = i / 29;
    levels.push({
      n: i + 1, venue: v, seed: 7919 * (i + 3),
      length: 2200 + k * 120 + v * 300 + (k === 9 ? 700 : 0),   // track length in segments (200 units each)
      ai: 0.9 + d * 0.38,                                      // rival top speed vs a 210 km/h reference car (upgrade to keep up)
      curves: 0.5 + d * 0.5, hills: 0.4 + d * 0.6,             // how twisty and hilly
      hazards: 0.4 + d * 0.8,                                  // cones / oil density
      final: k === 9
    });
  }
  window.GAME_CONFIG = {
    // Game name (browser tab, app name default)
    title: "Turbo Rivals",
    // Short line under the logo on the title screen
    tagline: "Four rivals. One finish line. Hit the nitro.",
    // the logo on the title screen, one entry per line
    titleLines: ["TURBO", "RIVALS"],
    // UI colours (buttons, panels, text): CSS variables from css/style.css
    theme: {
      "ink": "#12101e",
      "glass": "rgba(18, 16, 30, 0.72)",
      "hot": "#ff6a2a",
      "hot-d": "#c84a10",
      "cyan": "#3fe0ff",
      "gold": "#ffd23f",
      "silver": "#d8dce8",
      "bronze": "#e0915a",
      "white": "#ffffff",
      "mute": "#a8a4c0"
    },
    // 3 venues: sky, grass, rumble strip, road, lane and fog colours, scenery props
    venues,
    // 30 races (10 per venue): track length, rival speed (ai), curves, hills and hazard density
    levels,
    // Rival drivers: name and car colour
    rivals: [
      { name: "BLAZE", color: "#e8403a" }, { name: "VOLT", color: "#2f8fff" },
      { name: "ONYX", color: "#2a2a33" }, { name: "MINT", color: "#3fd5a8" },
      { name: "RUBY", color: "#ff5fa2" }, { name: "SOL", color: "#ffb000" }
    ],
    // garage: top = top speed km/h, accel/grip/nitro 1..10
    cars: [
      { id: "zip",    name: "Zipper",  body: "hatch",  color: "#ffc83a", top: 210, accel: 6, grip: 7, nitro: 5, price: 0 },
      { id: "viper",  name: "Viper",   body: "sport",  color: "#e8403a", top: 225, accel: 7, grip: 6, nitro: 6, price: 1500 },
      { id: "volt",   name: "Volt GT", body: "sport",  color: "#2f8fff", top: 235, accel: 8, grip: 7, nitro: 6, price: 3500 },
      { id: "brick",  name: "Brute",   body: "muscle", color: "#3a3a44", top: 245, accel: 7, grip: 5, nitro: 8, price: 6000 },
      { id: "sakura", name: "Sakura",  body: "sport",  color: "#ff8fd0", top: 250, accel: 8, grip: 9, nitro: 7, price: 9000 },
      { id: "phantom",name: "Phantom", body: "muscle", color: "#7f4fd8", top: 265, accel: 9, grip: 8, nitro: 9, price: 14000 }
    ],
    // Paint colours in the garage
    paints: ["#ffc83a", "#e8403a", "#2f8fff", "#3fd5a8", "#ff8fd0", "#ffffff", "#2a2a33", "#ff7a2e", "#7f4fd8", "#9ae63f"],
    // Upgrade names
    upgrades: { engine: "Engine", turbo: "Turbo", tires: "Tires", nitro: "Nitro tank" },
    // Coin cost of each upgrade level
    upgradeCosts: [300, 700, 1400, 2600, 4500],
    rewards: [220, 140, 90, 40, 20],          // coins for 1st..5th
    // Coins per overtake
    overtakeBonus: 5,
    // Daily gift: coins for day 1..7 of the login streak
    daily: [100, 150, 200, 300, 400, 600, 1000],
    // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
    ads: { enabled: true, simulate: true, interstitialEvery: 3 },
    // Save-data key prefix. Give each reskin its own so saves never mix
    storagePrefix: "tr_"
  };
})();
