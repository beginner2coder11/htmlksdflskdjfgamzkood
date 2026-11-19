/* ==========================================================================
   MEADOW KEEPER — GAME CONFIG
   A top-down wildlife garden. Plant flowers, dig ponds, put up nest boxes,
   bee hotels and feeders. Each wild visitor arrives when the things it
   needs are in your meadow. Flowers make nectar (even while you're away),
   photos of new visitors earn seeds, and seeds clear the brambles so the
   meadow can grow. Everything is drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Meadow Keeper",
  // Short line under the logo on the title screen
  tagline: "Grow a wild meadow and meet everyone who visits.",
  // the logo on the title screen, one entry per line
  titleLines: ["Meadow", "Keeper"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#2f3a2a",
    "mute": "#6f7a62",
    "paper": "#fbf7ec",
    "paper-2": "#f2ead6",
    "kraft": "#d8b98a",
    "leaf": "#4fae5a",
    "leaf-d": "#2f8a42",
    "honey": "#ffb000",
    "honey-d": "#d88a00",
    "berry": "#e8506a",
    "sky": "#5fa8e8"
  },

  grid: { cols: 15, rows: 18, tile: 56, chunk: 3 },   // brambles clear in 3×3 chunks
  startChunks: [[1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3]],   // [chunkCol, chunkRow] already clear
  cottage: { c: 7, r: 8 },                            // 2×2 cottage, top-left tile
  // Nectar cost to clear each new patch of land, in order
  clearCost: [6, 9, 13, 18, 24, 31, 40, 50, 62, 76, 92, 110, 130, 155, 180, 210, 240, 280, 320, 360, 400, 450, 500, 560],
  // New garden: starting nectar, seeds and items [id, column, row]
  start: { nectar: 40, seeds: 0, items: [["daisy", 5, 8], ["daisy", 9, 9], ["buttercup", 6, 10]] },
  dayLength: 360,                                     // seconds for a full day + night
  offlineCapHours: 3, offlineRate: 0.5,              // share of normal nectar earned while away
  bubbleEvery: [18, 30],                              // seconds between nectar drops on a flower
  levels: [0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2400, 3200, 4200],   // xp for each garden level

  // items: size in tiles, cost in nectar, nectar per drop (flowers), tags count towards visitors' needs
  items: {
    daisy:     { name: "Daisy",        cat: "flowers", size: 1, cost: 10,  lvl: 1, drop: 2, tags: ["flower", "white"],  color: "#ffffff", eye: "#ffd23f" },
    buttercup: { name: "Buttercup",    cat: "flowers", size: 1, cost: 14,  lvl: 1, drop: 3, tags: ["flower", "yellow"], color: "#ffd23f", eye: "#ffb000" },
    poppy:     { name: "Poppy",        cat: "flowers", size: 1, cost: 18,  lvl: 2, drop: 3, tags: ["flower", "red"],    color: "#ff4f4f", eye: "#2a2340" },
    lavender:  { name: "Lavender",     cat: "flowers", size: 1, cost: 22,  lvl: 2, drop: 4, tags: ["flower", "purple"], color: "#a77cff", eye: "#7a50d8" },
    bluebell:  { name: "Bluebell",     cat: "flowers", size: 1, cost: 26,  lvl: 3, drop: 4, tags: ["flower", "blue"],   color: "#5f8fff", eye: "#3a5fd8" },
    sunflower: { name: "Sunflower",    cat: "flowers", size: 1, cost: 36,  lvl: 4, drop: 6, tags: ["flower", "yellow", "seedhead"], color: "#ffcc22", eye: "#7a4a1a" },
    foxglove:  { name: "Foxglove",     cat: "flowers", size: 1, cost: 44,  lvl: 5, drop: 7, tags: ["flower", "purple", "pink"], color: "#ff8fd0", eye: "#c8247a" },
    clover:    { name: "Clover Patch", cat: "ground",  size: 1, cost: 12,  lvl: 1, drop: 1, tags: ["clover"], color: "#7fd65f" },
    rocks:     { name: "Rock Pile",    cat: "ground",  size: 1, cost: 20,  lvl: 2, tags: ["rocks", "damp"] },
    stones:    { name: "Stepping Stones", cat: "ground", size: 1, cost: 6, lvl: 1, tags: ["path"] },
    puddle:    { name: "Puddle",       cat: "water",   size: 1, cost: 25,  lvl: 2, tags: ["damp", "drink"] },
    pond:      { name: "Pond",         cat: "water",   size: 2, cost: 80,  lvl: 3, tags: ["pond", "drink", "damp"] },
    birdbath:  { name: "Bird Bath",    cat: "water",   size: 1, cost: 45,  lvl: 4, tags: ["birdbath", "drink"] },
    lilypond:  { name: "Lily Pond",    cat: "water",   size: 2, cost: 160, lvl: 6, tags: ["pond", "lily", "drink"] },
    logs:      { name: "Log Pile",     cat: "shelter", size: 1, cost: 30,  lvl: 3, tags: ["logs", "damp"] },
    beehotel:  { name: "Bee Hotel",    cat: "shelter", size: 1, cost: 50,  lvl: 3, tags: ["beehotel"] },
    nestbox:   { name: "Nest Box",     cat: "shelter", size: 1, cost: 60,  lvl: 4, tags: ["nestbox"] },
    hoghouse:  { name: "Hedgehog House", cat: "shelter", size: 1, cost: 90, lvl: 5, tags: ["hoghouse"] },
    berries:   { name: "Berry Bush",   cat: "food",    size: 1, cost: 40,  lvl: 4, drop: 2, tags: ["berries"] },
    feeder:    { name: "Seed Feeder",  cat: "food",    size: 1, cost: 55,  lvl: 4, tags: ["feeder"] },
    fruittree: { name: "Apple Tree",   cat: "food",    size: 2, cost: 120, lvl: 5, drop: 5, tags: ["tree", "fruit"] },
    oak:       { name: "Old Oak",      cat: "food",    size: 2, cost: 200, lvl: 7, tags: ["tree", "oak"] },
    lantern:   { name: "Glow Lantern", cat: "decor",   size: 1, cost: 35,  lvl: 6, tags: ["light"] },
    bench:     { name: "Bench",        cat: "decor",   size: 1, cost: 30,  lvl: 2, tags: ["bench"] },
    toadstools:{ name: "Toadstools",   cat: "decor",   size: 1, cost: 25,  lvl: 3, tags: ["damp", "toadstool"] }
  },
  // Shop tab names
  cats: { flowers: "Flowers", ground: "Ground", water: "Water", shelter: "Shelters", food: "Food", decor: "Decor" },

  // visitors: needs = tag counts anywhere in the meadow. kind sets how they move. rarity 1..4
  visitors: [
    { id: "honeybee", name: "Honeybee",          kind: "flyer",  needs: { flower: 3 },                    time: "day",   rarity: 1, seeds: 5,  home: "flower",   note: "Busy with any flowers. Makes nearby flowers drop more nectar." },
    { id: "ladybug",  name: "Ladybird",          kind: "crawler",needs: { flower: 2, clover: 1 },         time: "day",   rarity: 1, seeds: 5,  home: "clover",   note: "Loves clover with flowers close by." },
    { id: "white",    name: "Cabbage White",     kind: "flyer",  needs: { white: 2, yellow: 2 },          time: "day",   rarity: 1, seeds: 6,  home: "flower",   note: "Drawn to white and yellow flowers." },
    { id: "peacock",  name: "Peacock Butterfly", kind: "flyer",  needs: { red: 2, purple: 2 },            time: "day",   rarity: 2, seeds: 9,  home: "flower",   note: "Wants red poppies and purple flowers." },
    { id: "bumble",   name: "Bumblebee",         kind: "flyer",  needs: { purple: 3, beehotel: 1 },       time: "day",   rarity: 2, seeds: 9,  home: "purple",   note: "Lavender lover. Needs a bee hotel to stay." },
    { id: "blue",     name: "Common Blue",       kind: "flyer",  needs: { blue: 3, clover: 2 },           time: "day",   rarity: 2, seeds: 10, home: "blue",     note: "Bluebells and clover patches." },
    { id: "snail",    name: "Garden Snail",      kind: "crawler",needs: { rocks: 1, damp: 3 },            time: "any",   rarity: 1, seeds: 6,  home: "damp",     note: "Likes damp, rocky corners." },
    { id: "frog",     name: "Frog",              kind: "hopper", needs: { pond: 1 },                      time: "any",   rarity: 2, seeds: 10, home: "pond",     note: "Any pond will do." },
    { id: "dragonfly",name: "Dragonfly",         kind: "flyer",  needs: { pond: 1, flower: 5 },           time: "day",   rarity: 2, seeds: 11, home: "pond",     note: "Hunts over ponds in flowery meadows." },
    { id: "robin",    name: "Robin",             kind: "bird",   needs: { nestbox: 1, feeder: 1 },        time: "day",   rarity: 2, seeds: 12, home: "feeder",   note: "A nest box and a seed feeder." },
    { id: "bluetit",  name: "Blue Tit",          kind: "bird",   needs: { nestbox: 1, tree: 1, birdbath: 1 }, time: "day", rarity: 3, seeds: 16, home: "birdbath", note: "Nest box, a tree and a bird bath." },
    { id: "duck",     name: "Duckling",          kind: "swimmer",needs: { lily: 1 },                      time: "day",   rarity: 3, seeds: 18, home: "lily",     note: "Paddles only on a lily pond." },
    { id: "squirrel", name: "Red Squirrel",      kind: "walker", needs: { tree: 1, feeder: 1, logs: 1 },  time: "day",   rarity: 3, seeds: 18, home: "tree",     note: "Trees, logs and a feeder to raid." },
    { id: "hedgehog", name: "Hedgehog",          kind: "walker", needs: { hoghouse: 1, logs: 1 },         time: "night", rarity: 3, seeds: 18, home: "hoghouse", note: "Night visitor. Needs a house and a log pile." },
    { id: "firefly",  name: "Fireflies",         kind: "flyer",  needs: { pond: 1, flower: 6 },           time: "night", rarity: 2, seeds: 12, home: "pond",     note: "Glow over ponds on flowery nights." },
    { id: "moth",     name: "Moon Moth",         kind: "flyer",  needs: { light: 1, white: 3 },           time: "night", rarity: 3, seeds: 16, home: "light",    note: "Follows lanterns to white flowers at night." },
    { id: "owl",      name: "Little Owl",        kind: "bird",   needs: { oak: 1, nestbox: 1 },           time: "night", rarity: 4, seeds: 30, home: "oak",      note: "Rare. Roosts in an old oak at night." },
    { id: "fox",      name: "Fox Cub",           kind: "walker", needs: { tree: 2, logs: 1, berries: 2 }, time: "night", rarity: 4, seeds: 30, home: "berries",  note: "Rare. Sneaks in for berries after dark." }
  ],
  spawnChance: [0, 0.3, 0.16, 0.09, 0.05],   // per check (every 4 s) by rarity
  stay: [35, 70],                            // seconds a visitor stays

  // garden tasks, shown three at a time, in order
  tasks: [
    { text: "Plant 3 more flowers",        stat: "planted",   goal: 3,  seeds: 4,  nectar: 20 },
    { text: "Photograph a visitor",        stat: "photos",    goal: 1,  seeds: 4,  nectar: 20 },
    { text: "Collect 100 nectar",          stat: "collected", goal: 100, seeds: 5, nectar: 0 },
    { text: "Clear a bramble patch",       stat: "cleared",   goal: 1,  seeds: 0,  nectar: 60 },
    { text: "Place a clover patch",        stat: "tag:clover",goal: 1,  seeds: 4,  nectar: 20 },
    { text: "Meet 3 different visitors",   stat: "species",   goal: 3,  seeds: 8,  nectar: 40 },
    { text: "Reach garden level 3",        stat: "level",     goal: 3,  seeds: 6,  nectar: 60 },
    { text: "Dig a pond",                  stat: "tag:pond",  goal: 1,  seeds: 6,  nectar: 50 },
    { text: "Grow 12 flowers",             stat: "tag:flower",goal: 12, seeds: 8,  nectar: 60 },
    { text: "Photograph a frog",           stat: "sp:frog",   goal: 1,  seeds: 8,  nectar: 80 },
    { text: "Clear 3 bramble patches",     stat: "cleared",   goal: 3,  seeds: 0,  nectar: 150 },
    { text: "Meet 6 different visitors",   stat: "species",   goal: 6,  seeds: 12, nectar: 100 },
    { text: "Put up a nest box",           stat: "tag:nestbox", goal: 1, seeds: 8, nectar: 80 },
    { text: "Reach garden level 5",        stat: "level",     goal: 5,  seeds: 10, nectar: 150 },
    { text: "Take 25 photos",              stat: "photos",    goal: 25, seeds: 12, nectar: 120 },
    { text: "Meet a night visitor",        stat: "night",     goal: 1,  seeds: 12, nectar: 150 },
    { text: "Meet 10 different visitors",  stat: "species",   goal: 10, seeds: 20, nectar: 250 },
    { text: "Collect 3,000 nectar",        stat: "collected", goal: 3000, seeds: 20, nectar: 0 },
    { text: "Clear 8 bramble patches",     stat: "cleared",   goal: 8,  seeds: 0,  nectar: 500 },
    { text: "Meet all 18 visitors",        stat: "species",   goal: 18, seeds: 60, nectar: 1000 }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [30, 45, 60, 80, 100, 130, 200],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished rounds (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },   // interstitial after every N bramble clears
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "mk_"
};
