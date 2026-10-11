/* ==========================================================================
   IDLE TYCOON — GAME CONFIG
   Everything that defines the economy lives here: businesses, milestones,
   managers, upgrades, prestige and the shop. Art is emoji + code-drawn shops and cartoon cars,
   so the game looks finished with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Idle Tycoon",
  titleLines: ["IDLE", "TYCOON"],
  currency: "$",

  // cost: first unit · growth: cost × growth per unit owned · time: seconds per cycle · revenue: per unit per cycle
  businesses: [
    { id: "lemon",   name: "Lemonade Stand",   emoji: "🍋", color: "#ffd23a", cost: 4,        growth: 1.07, time: 0.6,   revenue: 1,
      manager: { name: "Lemon Lou",    emoji: "🦊", cost: 1000 } },
    { id: "donut",   name: "Donut Shop",       emoji: "🍩", color: "#ff7ab8", cost: 60,       growth: 1.15, time: 3,     revenue: 60,
      manager: { name: "Donna Dough",  emoji: "🐼", cost: 15000 } },
    { id: "pizza",   name: "Pizza Place",      emoji: "🍕", color: "#ff7a3d", cost: 720,      growth: 1.14, time: 6,     revenue: 540,
      manager: { name: "Pepper Pete",  emoji: "🐯", cost: 100000 } },
    { id: "burger",  name: "Burger Joint",     emoji: "🍔", color: "#c98a4a", cost: 8640,     growth: 1.13, time: 12,    revenue: 4320,
      manager: { name: "Bun Boss",     emoji: "🐻", cost: 500000 } },
    { id: "icecream",name: "Ice Cream Truck",  emoji: "🍦", color: "#7fd8ff", cost: 103680,   growth: 1.12, time: 24,    revenue: 51840,
      manager: { name: "Scoop Sally",  emoji: "🐧", cost: 1.2e6 } },
    { id: "sushi",   name: "Sushi Bar",        emoji: "🍣", color: "#ff5a6b", cost: 1.24416e6,growth: 1.11, time: 96,    revenue: 622080,
      manager: { name: "Rollo",        emoji: "🐨", cost: 10e6 } },
    { id: "coffee",  name: "Coffee Chain",     emoji: "☕", color: "#9a5a2c", cost: 14.93e6,  growth: 1.10, time: 384,   revenue: 7.46e6,
      manager: { name: "Bean Queen",   emoji: "🦉", cost: 111.1e6 } },
    { id: "candy",   name: "Candy Factory",    emoji: "🍬", color: "#b07dff", cost: 179.16e6, growth: 1.09, time: 1536,  revenue: 89.6e6,
      manager: { name: "Sugar Sam",    emoji: "🐵", cost: 555.5e6 } },
    { id: "movie",   name: "Movie Studio",     emoji: "🎬", color: "#4f7dff", cost: 2.15e9,   growth: 1.08, time: 6144,  revenue: 1.07e9,
      manager: { name: "Reel Rita",    emoji: "🦁", cost: 10e9 } },
    { id: "park",    name: "Theme Park",       emoji: "🎡", color: "#3fd84a", cost: 25.8e9,   growth: 1.07, time: 36864, revenue: 29.7e9,
      manager: { name: "Captain Coaster", emoji: "🐸", cost: 100e9 } }
  ],

  // Three shops share each road (in the order above); roads are named here.
  roadNames: ["Main Street", "Market Road", "Sunset Boulevard", "Harbor Avenue"],

  // Owning this many of one business doubles its speed (cycle time halves)…
  speedMilestones: [25, 50, 100, 200, 300, 400],
  // …and these double its profit.
  profitMilestones: [500, 600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000],
  // When EVERY business reaches this many, all profits double.
  globalMilestones: [25, 50, 100, 200, 300, 400, 500],

  // Upgrades are generated: per tier, every business gets a ×3, then an "everything ×3".
  upgrades: {
    tiers: 10,
    firstCostFactor: 1e4,                // business upgrade #1 costs (business base cost × this)
    tierFactor: 1e5,                     // each tier costs this much more
    multiplier: 3
  },

  prestige: {
    name: "Stars",
    emoji: "⭐",
    divisor: 1e6,                        // total stars = floor(sqrt(lifetime earnings / divisor))
    bonusPerStar: 0.02                   // +2% profit per star
  },

  // Customers: cars drive up to each shop and order; tap the car to serve.
  // A customer pays (income/sec × seconds between customers × items / avgOrder),
  // so serving everyone earns the shop's full income; tips and combos add more.
  street: {
    minInterval: 2.5, maxInterval: 9,    // seconds between customers per shop (clamped)
    intervalPerCycle: 2.2,               // interval = business cycle time × this
    avgOrder: 2.15,                      // average items per order (orders are 1–4)
    patience: [9, 13],                   // seconds a customer waits at the window
    tipAbove: 0.65,                      // serve while patience is above this → tip
    tip: 0.25,                           // +25% tip
    comboStep: 0.02, comboMax: 0.5,      // +2% per happy customer in a row, up to +50%
    managerDelay: 0.6                    // managers serve after this many seconds
  },

  offline: { capHours: 8, rate: 1 },     // managed businesses keep earning while away
  boost: { hoursPerAd: 4, maxHours: 24, multiplier: 2 },
  lucky: { everySeconds: [90, 200], incomeSeconds: 120, adMultiplier: 5 },   // floating gift balloon

  // Gem shop (gems come from missions, the daily gift and the lucky balloon)
  shop: [
    { id: "warp1",  name: "Time Warp 1h",   emoji: "⏩", gems: 20,  warp: 3600 },
    { id: "warp24", name: "Time Warp 24h",  emoji: "⏭️", gems: 150, warp: 86400 },
    { id: "x2",     name: "Permanent ×2",   emoji: "💎", gems: 300, mult: 2, max: 5 }
  ],

  missions: [
    { id: "c10",  text: "Serve 10 customers",      type: "served",   goal: 10,   gems: 5 },
    { id: "l25",  text: "Own 25 Lemonade Stands",  type: "own",      biz: 0, goal: 25,   gems: 5 },
    { id: "m1",   text: "Hire your first manager", type: "managers", goal: 1,    gems: 5 },
    { id: "d10",  text: "Own 10 Donut Shops",      type: "own",      biz: 1, goal: 10,   gems: 5 },
    { id: "e1m",  text: "Earn $1 Million",         type: "earned",   goal: 1e6,  gems: 10 },
    { id: "cb10", text: "Reach a 10× serving combo", type: "combo",  goal: 10,   gems: 10 },
    { id: "u3",   text: "Buy 3 upgrades",          type: "upgrades", goal: 3,    gems: 10 },
    { id: "p25",  text: "Own 25 Pizza Places",     type: "own",      biz: 2, goal: 25,   gems: 10 },
    { id: "m5",   text: "Hire 5 managers",         type: "managers", goal: 5,    gems: 15 },
    { id: "e1b",  text: "Earn $1 Billion",         type: "earned",   goal: 1e9,  gems: 20 },
    { id: "s1",   text: "Collect your first Stars",type: "prestige", goal: 1,    gems: 30 },
    { id: "c500", text: "Serve 500 customers",     type: "served",   goal: 500,  gems: 30 },
    { id: "cb30", text: "Reach a 30× serving combo", type: "combo",  goal: 30,   gems: 40 },
    { id: "all25",text: "Own 25 of every business",type: "ownAll",   goal: 25,   gems: 30 },
    { id: "e1t",  text: "Earn $1 Trillion",        type: "earned",   goal: 1e12, gems: 40 },
    { id: "m10",  text: "Hire all 10 managers",    type: "managers", goal: 10,   gems: 50 },
    { id: "all100",text:"Own 100 of every business",type: "ownAll",  goal: 100,  gems: 80 },
    { id: "e1qa", text: "Earn $1 Quadrillion",     type: "earned",   goal: 1e15, gems: 100 }
  ],

  economy: {
    startCash: 0,
    startGems: 10,
    dailyGems: [5, 5, 10, 10, 15, 20, 50]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    gem:        { image: "assets/ui/gem.png",          emoji: "💎" },
    star:       { image: "assets/ui/star.png",         emoji: "⭐" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    missions:   { image: "assets/ui/missions.png",     emoji: "📜" },
    check:      { image: "assets/ui/check.png",        emoji: "✅" },
    boost:      { image: "assets/ui/boost.png",        emoji: "🚀" },
    balloon:    { image: "assets/ui/balloon.png",      emoji: "🎈" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialAfterAwayMinutes: 30     // an interstitial after the welcome-back screen (0 = never)
  },

  sounds: {
    tap: null, cash: null, buy: null, honk: null, angry: null, tip: null, milestone: null, manager: null, upgrade: null, prestige: null,
    click: null, unlock: null, coin: null, gem: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
