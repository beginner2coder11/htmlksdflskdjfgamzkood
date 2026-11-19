/* ==========================================================================
   BREEZY ISLE — GAME CONFIG
   A cozy side-view island adventure. Tap to walk, tap things to use them:
   shake fruit trees, dig up shells, net butterflies, go fishing, help your
   animal friends with their requests, decorate your camp and open new beaches.
   Everything is drawn in code: no image or sound files.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Breezy Isle",
  // Short line under the logo on the title screen
  tagline: "Pick, dig, fish and make friends on your own little island.",
  // the logo on the title screen, one entry per line
  titleLines: ["Breezy", "Isle"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#3b2a4a",
    "ink-2": "#6b5a7a",
    "paper": "#fff8ec",
    "paper-2": "#ffefd6",
    "line": "#f0dcc0",
    "coral": "#ff7a5c",
    "coral-d": "#d8553a",
    "mint": "#3fc79a",
    "mint-d": "#23966f",
    "sky": "#4fb8f0",
    "sky-d": "#2a84c0",
    "sun": "#ffc83a",
    "sun-d": "#d89a10",
    "pink": "#ff8fb1"
  },

  walkSpeed: 230,          // world units per second (the screen is 760 units tall)
  dayLength: 480,          // seconds for a full day and night
  // Shells (coins) a new player starts with
  startCoins: 40,
  bag: [30, 50, 80, 120],  // bag size for each basket level
  regrow: { tree: 45, dig: 35, bug: 20 },   // seconds before a tree, dig spot or butterfly comes back

  // value = coins when sold at the truck. rarity: 1 common … 4 legendary. time: "day" | "night" | "any"
  items: {
    // fruit
    coconut:    { name: "Coconut",      kind: "fruit", value: 8,  draw: { shape: "coconut", a: "#8a5a3c", b: "#5e3a24" } },
    banana:     { name: "Banana",       kind: "fruit", value: 10, draw: { shape: "banana", a: "#ffe066", b: "#e0b21e" } },
    mango:      { name: "Mango",        kind: "fruit", value: 14, draw: { shape: "round", a: "#ffb347", b: "#ff6f3c", leaf: true } },
    starfruit:  { name: "Starfruit",    kind: "fruit", value: 18, draw: { shape: "star", a: "#fff27a", b: "#d8c21e" } },
    dragonfruit:{ name: "Dragon Fruit", kind: "fruit", value: 24, draw: { shape: "dragon", a: "#ff5fa2", b: "#c8246a" } },
    berry:      { name: "Sun Berries",  kind: "fruit", value: 20, draw: { shape: "berries", a: "#7a5cff", b: "#4b2fc8" } },
    // shells & finds
    scallop:    { name: "Scallop",      kind: "shell", value: 6,  rarity: 1, draw: { shape: "scallop", a: "#ffd6c2", b: "#f2a383" } },
    spiral:     { name: "Spiral Shell", kind: "shell", value: 9,  rarity: 1, draw: { shape: "spiral", a: "#fff1d6", b: "#d9a86c" } },
    starfish:   { name: "Starfish",     kind: "shell", value: 14, rarity: 2, draw: { shape: "starfish", a: "#ff8a5c", b: "#e0562a" } },
    sanddollar: { name: "Sand Dollar",  kind: "shell", value: 16, rarity: 2, draw: { shape: "sanddollar", a: "#f6ead2", b: "#cdb48a" } },
    conch:      { name: "Pink Conch",   kind: "shell", value: 26, rarity: 3, draw: { shape: "conch", a: "#ffc2d6", b: "#ff7aa8" } },
    seaglass:   { name: "Sea Glass",    kind: "shell", value: 22, rarity: 3, draw: { shape: "glass", a: "#8ff0d8", b: "#3fbf9f" } },
    pearl:      { name: "Pearl",        kind: "shell", value: 60, rarity: 4, draw: { shape: "pearl", a: "#ffffff", b: "#d9d2ff" } },
    bottle:     { name: "Bottle Note",  kind: "shell", value: 45, rarity: 4, draw: { shape: "bottle", a: "#9fe3ff", b: "#4aa6d8" } },
    // fish (difficulty 1 easy … 5 wild)
    minnow:     { name: "Sand Minnow",  kind: "fish", value: 8,  difficulty: 1, time: "any",   draw: { shape: "fish", a: "#c9d6e0", b: "#8aa2b8", size: 0.7 } },
    sunfin:     { name: "Sunfin",       kind: "fish", value: 14, difficulty: 2, time: "day",   draw: { shape: "fish", a: "#ffd23f", b: "#ff8f1f", stripe: "#ffffff" } },
    bluetang:   { name: "Blue Tang",    kind: "fish", value: 20, difficulty: 2, time: "day",   draw: { shape: "fish", a: "#3d8bff", b: "#1f4fc8", fin: "#ffd23f" } },
    puffer:     { name: "Bubble Puffer",kind: "fish", value: 26, difficulty: 3, time: "any",   draw: { shape: "puffer", a: "#ffe9a8", b: "#d8b25a" } },
    stripy:     { name: "Coral Stripe", kind: "fish", value: 24, difficulty: 3, time: "day",   draw: { shape: "fish", a: "#ff7a3c", b: "#ff4f1f", stripe: "#ffffff" } },
    lantern:    { name: "Lantern Fish", kind: "fish", value: 34, difficulty: 3, time: "night", draw: { shape: "fish", a: "#3a2f7a", b: "#1d164a", glow: "#9cf7ff" } },
    mooneel:    { name: "Moon Eel",     kind: "fish", value: 48, difficulty: 4, time: "night", draw: { shape: "eel", a: "#c8c2ff", b: "#6f63d8" } },
    rainbow:    { name: "Rainbow Wrasse", kind: "fish", value: 42, difficulty: 4, time: "day", draw: { shape: "fish", a: "#62e8ff", b: "#ff5fd2", stripe: "#fff27a" } },
    ray:        { name: "Sky Ray",      kind: "fish", value: 55, difficulty: 4, time: "any",   draw: { shape: "ray", a: "#7fb8ff", b: "#3f6fd8" } },
    goldkoi:    { name: "Golden Koi",   kind: "fish", value: 120, difficulty: 5, time: "any",  draw: { shape: "fish", a: "#ffe066", b: "#ffb000", stripe: "#ffffff", size: 1.2 } },
    // bugs
    bluewing:   { name: "Sky Butterfly",   kind: "bug", value: 10, time: "day",   speed: 1,   draw: { shape: "butterfly", a: "#7fd0ff", b: "#2f8fe0" } },
    petalwing:  { name: "Petal Butterfly", kind: "bug", value: 14, time: "day",   speed: 1.2, draw: { shape: "butterfly", a: "#ffb3d9", b: "#ff6fb0" } },
    glider:     { name: "Sunset Glider",   kind: "bug", value: 20, time: "day",   speed: 1.4, draw: { shape: "butterfly", a: "#ffb347", b: "#e05a1e", dots: true } },
    emerald:    { name: "Emerald Wing",    kind: "bug", value: 30, time: "day",   speed: 1.7, draw: { shape: "butterfly", a: "#7dffb2", b: "#16a35e", dots: true } },
    dragonfly:  { name: "Dragonfly",       kind: "bug", value: 26, time: "day",   speed: 1.9, draw: { shape: "dragonfly", a: "#62e8ff", b: "#2a7fd8" } },
    glowbug:    { name: "Glowbug",         kind: "bug", value: 22, time: "night", speed: 1.2, draw: { shape: "glowbug", a: "#fff27a", b: "#7a6a2a" } },
    moth:       { name: "Moon Moth",       kind: "bug", value: 40, time: "night", speed: 1.5, draw: { shape: "butterfly", a: "#d8f7ff", b: "#8fb8d8", dots: true } }
  },

  // beaches, left to right on the map. Each one has its own art and what you can find there.
  areas: [
    { id: "palm",   name: "Palm Beach",    width: 2600, unlock: 0,
      sky: ["#7fd6ff", "#c8f0ff"], sea: "#38c6d8", sand: "#ffe8b0", grass: "#5fd38a", grass2: "#38b06a", hills: "#4fbf8f", tree: "palm",
      fruit: ["coconut", "banana"], shells: ["scallop", "spiral", "starfish", "sanddollar", "pearl"],
      fish: ["minnow", "sunfin", "bluetang", "puffer", "lantern", "goldkoi"], bugs: ["bluewing", "petalwing", "glowbug"],
      friends: ["miso", "tofu", "pebble"] },
    { id: "cove",   name: "Coral Cove",    width: 2600, unlock: 250,
      sky: ["#ffb3c7", "#ffe3c2"], sea: "#2fb8c8", sand: "#ffd9c2", grass: "#6fdcb0", grass2: "#3fb89a", hills: "#ff9fb8", tree: "coral",
      fruit: ["mango", "coconut"], shells: ["scallop", "conch", "seaglass", "starfish", "pearl", "bottle"],
      fish: ["minnow", "stripy", "puffer", "rainbow", "lantern", "goldkoi"], bugs: ["petalwing", "glider", "glowbug"],
      friends: ["kiwi", "nori"] },
    { id: "cliffs", name: "Sunset Cliffs", width: 2800, unlock: 800,
      sky: ["#ff8f6b", "#ffd08a"], sea: "#3a8fd8", sand: "#f2c89a", grass: "#a6d65f", grass2: "#7fb83f", hills: "#d87a5c", tree: "pine",
      fruit: ["starfruit", "dragonfruit"], shells: ["spiral", "sanddollar", "conch", "seaglass", "bottle", "pearl"],
      fish: ["sunfin", "ray", "rainbow", "mooneel", "lantern", "goldkoi"], bugs: ["glider", "dragonfly", "moth"],
      friends: ["mochi", "juniper"] },
    { id: "jungle", name: "Mango Jungle",  width: 2800, unlock: 2000,
      sky: ["#8fe0c8", "#e6ffd8"], sea: "#25b89a", sand: "#e8e0a8", grass: "#3fc76f", grass2: "#239a52", hills: "#2f9f6a", tree: "jungle",
      fruit: ["mango", "berry", "banana"], shells: ["seaglass", "conch", "bottle", "pearl", "starfish"],
      fish: ["stripy", "bluetang", "ray", "mooneel", "rainbow", "goldkoi"], bugs: ["emerald", "dragonfly", "moth", "glowbug"],
      friends: ["pudding", "sunny"] }
  ],

  // animal friends: body colour, ear style and a little personality line
  friends: {
    miso:    { name: "Miso",    animal: "cat",    body: "#ffb36b", belly: "#fff1dc", ears: "pointy", hi: "Oh! A new face on the beach!" },
    tofu:    { name: "Tofu",    animal: "bunny",  body: "#ffffff", belly: "#ffe1ea", ears: "long",   hi: "I'm saving snacks for a picnic." },
    pebble:  { name: "Pebble",  animal: "turtle", body: "#7fd08a", belly: "#e8ffd0", ears: "none",   shell: "#4f9f5a", hi: "Slow and steady fills the basket." },
    kiwi:    { name: "Kiwi",    animal: "bird",   body: "#9b6b4a", belly: "#e8c9a0", ears: "none",   beak: "#ffb347", hi: "Tweet! Have you seen any shiny shells?" },
    nori:    { name: "Nori",    animal: "frog",   body: "#6fdc5f", belly: "#e8ffb0", ears: "none",   hi: "Ribbit. I collect bugs. Professionally." },
    mochi:   { name: "Mochi",   animal: "bear",   body: "#c99a7a", belly: "#f6e1cf", ears: "round",  hi: "The sunsets here are the best." },
    juniper: { name: "Juniper", animal: "duck",   body: "#fff27a", belly: "#ffffff", ears: "none",   beak: "#ff9a3c", hi: "Quack! Fishing tips? Patience." },
    pudding:    { name: "Pudding", animal: "pig",    body: "#ffb3c7", belly: "#ffe1ea", ears: "round",  hi: "Everything in this jungle is tasty." },
    sunny:   { name: "Sunny",   animal: "fox",    body: "#ff8f4f", belly: "#fff1dc", ears: "pointy", hi: "I'm mapping every butterfly here." }
  },
  hearts: [3, 8, 15],      // friendship levels: each level gives a gift from `gifts`
  // Decor ids friends give you when their hearts are full (see decor)
  gifts: ["lantern", "flowers", "flamingo"],

  // camp decor: comfort adds to your sell bonus (1% per point, up to 50%)
  decor: [
    { id: "tent",     name: "Cozy Tent",       price: 0,   comfort: 4 },
    { id: "fire",     name: "Campfire",        price: 60,  comfort: 5 },
    { id: "hammock",  name: "Hammock",         price: 120, comfort: 6 },
    { id: "umbrella", name: "Beach Umbrella",  price: 90,  comfort: 4 },
    { id: "lights",   name: "String Lights",   price: 160, comfort: 7 },
    { id: "surf",     name: "Surfboard",       price: 140, comfort: 5 },
    { id: "castle",   name: "Sandcastle",      price: 80,  comfort: 4 },
    { id: "lantern",  name: "Paper Lantern",   price: 200, comfort: 6 },
    { id: "flowers",  name: "Flower Pots",     price: 110, comfort: 5 },
    { id: "flamingo", name: "Flamingo Float",  price: 260, comfort: 8 },
    { id: "chair",    name: "Deck Chair",      price: 180, comfort: 6 },
    { id: "mailbox",  name: "Mailbox",         price: 70,  comfort: 3 }
  ],
  // How many decorations fit in your camp
  campSlots: 6,

  // tools: price for each next level
  tools: {
    basket: { name: "Basket",  prices: [120, 400, 1100], what: "Holds more items" },
    rod:    { name: "Rod",     prices: [150, 500, 1400], what: "Bigger catch zone" },
    net:    { name: "Net",     prices: [100, 350, 1000], what: "Catch fast bugs easier" },
    shovel: { name: "Shovel",  prices: [100, 380, 1200], what: "Rarer finds when digging" }
  },

  journalRewards: [[10, 100], [20, 250], [30, 600]],   // [entries found, coins]
  // Daily gift: coins for day 1..7 of the login streak
  daily: [30, 40, 60, 80, 100, 140, 200],

  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 4 },   // interstitial every N beach trips
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "bz_"
};
