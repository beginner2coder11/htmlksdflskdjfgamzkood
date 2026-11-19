/* ==========================================================================
   DASH STREET — GAME CONFIG
   A timed 3-lane runner in levels. You are a courier dog racing the clock
   down the street: swipe to change lanes, jump cones, slide under barriers,
   hit dash pads, grab bones and parcels and reach the finish flag in time.
   Bumping into things doesn't end the run, it slows you down (and the clock
   keeps ticking). Every 6th level is a chase after a runaway delivery truck.
   Everything is drawn in code: no image or sound files.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Dash Street",
  // Short line under the logo on the title screen
  tagline: "Beat the clock. Deliver the goods. Good dog!",
  // the logo on the title screen, one entry per line
  titleLines: ["DASH", "STREET"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2a2340",
    "blue": "#2f8fff",
    "blue-d": "#1a5fc8",
    "yellow": "#ffd23f",
    "yellow-d": "#e0a810",
    "red": "#ff4f5e",
    "green": "#3fd58a",
    "green-d": "#1fa060",
    "paper": "#ffffff",
    "mute": "#6f6a85"
  },
  // Distance between the 3 lanes
  lane: 1.5,
  // Jump: v = take-off speed, gravity = how fast you fall
  jump: { v: 12.5, gravity: 36 },
  // Slide time in seconds
  slide: 0.62,
  dash: { boost: 1.55, time: 1.6 },        // dash pads: speed × boost for this many seconds
  stumble: { slow: 0.4, time: 1.1 },       // a bump drops you to 40% speed and you recover over 1.1 s
  // 3 streets (12 levels each). sky = top/bottom gradient, road/ground/walk = street colours, accent = UI accent
  worlds: [
    { name: "Maple Street", zone: "suburb",   sky: ["#7fcfff", "#dff4ff"], ground: "#8fd06a", groundD: "#7fc05a", road: "#6f7480", roadD: "#666b77", walk: "#d8d2c8", line: "#ffffff", accent: "#ff6f5f" },
    { name: "Harbor Road",  zone: "harbor",   sky: ["#ffb98a", "#ffe9cc"], ground: "#e8d0a0", groundD: "#dcc290", road: "#7a7066", roadD: "#70665c", walk: "#c9a87a", line: "#ffe066", accent: "#3fa8d8" },
    { name: "Downtown",     zone: "downtown", sky: ["#5f8fd8", "#c8dcff"], ground: "#a8b0bc", groundD: "#9ca4b0", road: "#4f5460", roadD: "#484d58", walk: "#c8ccd4", line: "#ffffff", accent: "#ffd23f" }
  ],
  // 36 levels. speed = run speed, length = course length (metres), time = seconds on the clock, timeLeft = seconds left needed for ★★★ (time goal).
  // boss: true = truck chase (gap = metres to catch up, truck = truck speed × player speed). goal3 = the ★★★ goal: time, clean, parcels or fast. seed = layout.
  levels: [
    {n: 1, world: 0, speed: 10, diff: 0, seed: 7063, boss: false, length: 260, time: 32, goal3: "time", timeLeft: 5},
    {n: 2, world: 0, speed: 10.2, diff: 0.029, seed: 8072, boss: false, length: 282, time: 34, goal3: "time", timeLeft: 5},
    {n: 3, world: 0, speed: 10.4, diff: 0.057, seed: 9081, boss: false, length: 304, time: 36, goal3: "parcels", timeLeft: 5},
    {n: 4, world: 0, speed: 10.6, diff: 0.086, seed: 10090, boss: false, length: 326, time: 37, goal3: "time", timeLeft: 5},
    {n: 5, world: 0, speed: 10.9, diff: 0.114, seed: 11099, boss: false, length: 348, time: 39, goal3: "clean", timeLeft: 5},
    {n: 6, world: 0, speed: 11.1, diff: 0.143, seed: 12108, boss: true, time: 40, gap: 60, truck: 0.95, goal3: "fast", fastLeft: 8},
    {n: 7, world: 0, speed: 11.3, diff: 0.171, seed: 13117, boss: false, length: 392, time: 42, goal3: "time", timeLeft: 5},
    {n: 8, world: 0, speed: 11.5, diff: 0.2, seed: 14126, boss: false, length: 414, time: 43, goal3: "clean", timeLeft: 6},
    {n: 9, world: 0, speed: 11.7, diff: 0.229, seed: 15135, boss: false, length: 436, time: 45, goal3: "parcels", timeLeft: 6},
    {n: 10, world: 0, speed: 11.9, diff: 0.257, seed: 16144, boss: false, length: 458, time: 46, goal3: "time", timeLeft: 6},
    {n: 11, world: 0, speed: 12.1, diff: 0.286, seed: 17153, boss: false, length: 480, time: 48, goal3: "clean", timeLeft: 6},
    {n: 12, world: 0, speed: 12.4, diff: 0.314, seed: 18162, boss: true, time: 40, gap: 82, truck: 0.95, goal3: "fast", fastLeft: 8},
    {n: 13, world: 1, speed: 13, diff: 0.343, seed: 19171, boss: false, length: 320, time: 30, goal3: "time", timeLeft: 4},
    {n: 14, world: 1, speed: 13.2, diff: 0.371, seed: 20180, boss: false, length: 342, time: 32, goal3: "time", timeLeft: 5},
    {n: 15, world: 1, speed: 13.4, diff: 0.4, seed: 21189, boss: false, length: 364, time: 33, goal3: "parcels", timeLeft: 5},
    {n: 16, world: 1, speed: 13.6, diff: 0.429, seed: 22198, boss: false, length: 386, time: 35, goal3: "time", timeLeft: 5},
    {n: 17, world: 1, speed: 13.8, diff: 0.457, seed: 23207, boss: false, length: 408, time: 36, goal3: "clean", timeLeft: 5},
    {n: 18, world: 1, speed: 14, diff: 0.486, seed: 24216, boss: true, time: 43, gap: 92, truck: 0.95, goal3: "fast", fastLeft: 8},
    {n: 19, world: 1, speed: 14.3, diff: 0.514, seed: 25225, boss: false, length: 452, time: 38, goal3: "time", timeLeft: 5},
    {n: 20, world: 1, speed: 14.5, diff: 0.543, seed: 26234, boss: false, length: 474, time: 40, goal3: "clean", timeLeft: 5},
    {n: 21, world: 1, speed: 14.7, diff: 0.571, seed: 27243, boss: false, length: 496, time: 41, goal3: "parcels", timeLeft: 5},
    {n: 22, world: 1, speed: 14.9, diff: 0.6, seed: 28252, boss: false, length: 518, time: 42, goal3: "time", timeLeft: 5},
    {n: 23, world: 1, speed: 15.1, diff: 0.629, seed: 29261, boss: false, length: 540, time: 43, goal3: "clean", timeLeft: 6},
    {n: 24, world: 1, speed: 15.3, diff: 0.657, seed: 30270, boss: true, time: 43, gap: 104, truck: 0.95, goal3: "fast", fastLeft: 8},
    {n: 25, world: 2, speed: 15.9, diff: 0.686, seed: 31279, boss: false, length: 380, time: 30, goal3: "time", timeLeft: 4},
    {n: 26, world: 2, speed: 16.2, diff: 0.714, seed: 32288, boss: false, length: 402, time: 31, goal3: "time", timeLeft: 4},
    {n: 27, world: 2, speed: 16.4, diff: 0.743, seed: 33297, boss: false, length: 424, time: 32, goal3: "parcels", timeLeft: 5},
    {n: 28, world: 2, speed: 16.6, diff: 0.771, seed: 34306, boss: false, length: 446, time: 33, goal3: "time", timeLeft: 5},
    {n: 29, world: 2, speed: 16.8, diff: 0.8, seed: 35315, boss: false, length: 468, time: 34, goal3: "clean", timeLeft: 5},
    {n: 30, world: 2, speed: 17, diff: 0.829, seed: 36324, boss: true, time: 46, gap: 114, truck: 0.95, goal3: "fast", fastLeft: 8},
    {n: 31, world: 2, speed: 17.2, diff: 0.857, seed: 37333, boss: false, length: 512, time: 36, goal3: "time", timeLeft: 5},
    {n: 32, world: 2, speed: 17.4, diff: 0.886, seed: 38342, boss: false, length: 534, time: 37, goal3: "clean", timeLeft: 5},
    {n: 33, world: 2, speed: 17.7, diff: 0.914, seed: 39351, boss: false, length: 556, time: 38, goal3: "parcels", timeLeft: 5},
    {n: 34, world: 2, speed: 17.9, diff: 0.943, seed: 40360, boss: false, length: 578, time: 39, goal3: "time", timeLeft: 5},
    {n: 35, world: 2, speed: 18.1, diff: 0.971, seed: 41369, boss: false, length: 600, time: 40, goal3: "clean", timeLeft: 5},
    {n: 36, world: 2, speed: 18.3, diff: 1, seed: 42378, boss: true, time: 46, gap: 126, truck: 0.95, goal3: "fast", fastLeft: 8}
  ],
  bonesTarget: 0.6,                        // ★★ = collect this share of the bones on the course
  // Courier dogs: colours, price in bones, perk (perkId: none, bones, power, tough, shield, dash)
  dogs: [
    { id: "corgi",     name: "Biscuit",  breed: "Corgi",     body: "#f2a654", belly: "#fff3e0", ear: "#e08a3a", helmet: "#ff5f6d", bag: "#4f7fd8", price: 0,    perk: "Born courier",              perkId: "none" },
    { id: "shiba",     name: "Mochi",    breed: "Shiba",     body: "#e8843c", belly: "#fff3e0", ear: "#c86a2a", helmet: "#3fb8a8", bag: "#ffd23f", price: 600,  perk: "+10% bones",                perkId: "bones" },
    { id: "dalmatian", name: "Domino",   breed: "Dalmatian", body: "#ffffff", belly: "#ffffff", ear: "#2a2340", helmet: "#ff8f2e", bag: "#e8403a", price: 1200, perk: "Power-ups last 2 s longer", perkId: "power", spots: true },
    { id: "pug",       name: "Pebble",   breed: "Pug",       body: "#e8cfa8", belly: "#f6e6cc", ear: "#4a3a3a", helmet: "#9b7bff", bag: "#5fc75a", price: 2000, perk: "Recovers from bumps faster", perkId: "tough" },
    { id: "husky",     name: "Blizzard", breed: "Husky",     body: "#8a96a8", belly: "#ffffff", ear: "#6a7688", helmet: "#2f8fff", bag: "#ff6fa8", price: 3000, perk: "Starts every level with a shield", perkId: "shield" },
    { id: "poodle",    name: "Fifi",     breed: "Poodle",    body: "#ffd6e6", belly: "#ffe9f2", ear: "#f2b8d0", helmet: "#ffd23f", bag: "#7f5fd8", price: 4500, perk: "Dash pads push harder",     perkId: "dash", fluffy: true }
  ],
  // Power-ups: name, base duration in seconds and colour
  powers: {
    magnet: { name: "Bone Magnet",  base: 8,  color: "#ff5f6d" },
    double: { name: "Double Bones", base: 10, color: "#ffd23f" },
    sprint: { name: "Turbo Paws",   base: 5,  color: "#3fd5a8" },
    shield: { name: "Bubble Shield",base: 0,  color: "#7fd6ff" }
  },
  // Bone cost of each power-up upgrade level
  upgradeCosts: [250, 600, 1200, 2400, 4800],
  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 75, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },   // interstitial every N finished levels
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "ds_"
};
