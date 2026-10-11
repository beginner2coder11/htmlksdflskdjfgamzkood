/* ==========================================================================
   BLOCK BURST — GAME CONFIG
   Everything a reskin needs lives here. Blocks are drawn in code (4 skins),
   so the game looks finished with an empty assets/ folder; any image you add
   replaces its built-in version.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Block Burst",
  titleLines: ["BLOCK", "BURST"],       // CSS logo used when assets/ui/logo.png is missing

  gridSize: 8,

  // Block colors (one per piece). Add or remove freely.
  colors: ["#ff4757", "#ffa502", "#ffd32a", "#2ed573", "#1ec8ff", "#3a6bff", "#a55eea", "#ff6bcb"],

  // Optional per-color block images (assets/blocks/block1.png …). Leave [] to use the code-drawn skins.
  // When set, the image skin is added to the shop as "Custom".
  blockImages: [],

  // Block skins, unlocked in the shop. "price: 0" = owned from the start.
  skins: [
    { id: "classic", name: "Classic", price: 0 },
    { id: "jelly",   name: "Jelly",   price: 300 },
    { id: "gem",     name: "Gem",     price: 600 },
    { id: "neon",    name: "Neon",    price: 900 }
  ],

  scoring: {
    perCell: 1,                         // points per block placed
    perLine: 10,                        // × lines² × combo
    allClear: 300,
    comboKeep: 3                        // combo survives this many placements without a clear
  },

  // Praise shown for clearing N lines at once (or for long combos).
  praise: { 1: "Good!", 2: "Great!", 3: "Excellent!", 4: "Amazing!", 5: "Unbelievable!" },

  adventure: {
    levels: 100,
    starCoins: [10, 20, 40]             // coins for 1 / 2 / 3 stars
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    background: { image: "assets/bg/bg_portrait.jpg" },
    backgroundWide: { image: "assets/bg/bg_landscape.jpg" },
    gem:        { image: "assets/ui/gem.png",          emoji: "💎" },
    coin:       { image: "assets/ui/coin.png",         emoji: "🪙" },
    trophy:     { image: "assets/ui/trophy.png",       emoji: "🏆" },
    crown:      { image: "assets/ui/crown.png",        emoji: "👑" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    star:       { image: "assets/ui/star.png",         emoji: "⭐" },
    palette:    { image: "assets/ui/shop.png",         emoji: "🎨" },
    map:        { image: "assets/ui/map.png",          emoji: "🗺️" },
    hand:       { image: "assets/ui/hand.png",         emoji: "👆" },
    lock:       { image: "assets/ui/lock.png",         emoji: "🔒" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" },
    rotate:     { image: "assets/ui/pu_rotate.png",    emoji: "🔄" },
    bomb:       { image: "assets/ui/pu_bomb.png",      emoji: "💣" },
    refresh:    { image: "assets/ui/pu_refresh.png",   emoji: "🎲" },
    undo:       { image: "assets/ui/pu_undo.png",      emoji: "↩️" }
  },

  powerups: {
    rotate:  { label: "Rotate",  start: 3, cost: 40 },
    bomb:    { label: "Bomb",    start: 2, cost: 100 },
    refresh: { label: "New",     start: 2, cost: 60 },
    undo:    { label: "Undo",    start: 2, cost: 60 }
  },

  economy: {
    startCoins: 150,
    coinsPerLines: 1,                   // coins per line cleared in Classic
    dailyRewards: [50, 75, 100, 125, 150, 200, 400]
  },

  ads: {
    enabled: true,
    simulate: true,                     // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryGames: 2
  },

  sounds: {
    pick: null, place: null, invalid: null, clear: null, praise: null, gem: null,
    star: null, win: null, gameover: null, bomb: null, rotate: null, coin: null,
    click: null, whoosh: null, newbest: null, unlock: null,
    music: null                         // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
