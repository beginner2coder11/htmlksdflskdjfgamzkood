/* ==========================================================================
   MERGE FRUITS — GAME CONFIG
   Everything a reskin needs lives here: names, art, colors, economy, ads.
   Any image that fails to load falls back to its emoji, so the game always
   runs even with an empty assets/ folder.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Merge Fruits",
  titleLines: ["MERGE", "FRUITS"],      // used by the CSS logo when assets/ui/logo.png is missing

  gridSize: 4,                          // 4 = classic, 5 = easier/longer games
  spawnTier2Chance: 0.1,                // chance a new tile spawns as tier 2 instead of tier 1
  showTierNumbers: false,               // show 2/4/8… badge on tiles
  undoHistory: 5,                       // how many moves undo can step back

  // Merge order, smallest → biggest. Add/remove entries freely (min 4).
  // color = tile background. Keep neighbouring tiers clearly different.
  tiers: [
    { name: "Cherry",     image: "assets/tiers/tier01.png", emoji: "🍒", color: "#f94d6a" },
    { name: "Strawberry", image: "assets/tiers/tier02.png", emoji: "🍓", color: "#ff8fbf" },
    { name: "Grapes",     image: "assets/tiers/tier03.png", emoji: "🍇", color: "#9d6bff" },
    { name: "Lemon",      image: "assets/tiers/tier04.png", emoji: "🍋", color: "#ffd447" },
    { name: "Orange",     image: "assets/tiers/tier05.png", emoji: "🍊", color: "#ff9330" },
    { name: "Apple",      image: "assets/tiers/tier06.png", emoji: "🍎", color: "#e53935" },
    { name: "Pear",       image: "assets/tiers/tier07.png", emoji: "🍐", color: "#9ad94a" },
    { name: "Peach",      image: "assets/tiers/tier08.png", emoji: "🍑", color: "#ffab7a" },
    { name: "Pineapple",  image: "assets/tiers/tier09.png", emoji: "🍍", color: "#20c4a0" },
    { name: "Melon",      image: "assets/tiers/tier10.png", emoji: "🍈", color: "#3a9dff" },
    { name: "Watermelon", image: "assets/tiers/tier11.png", emoji: "🍉", color: "#1fae58" },
    { name: "Golden Melon", image: "assets/tiers/tier12.png", emoji: "👑", color: "#ffc21a", legendary: true }
  ],

  // UI art. image is optional; emoji is the fallback.
  art: {
    logo:         { image: "assets/ui/logo.png" },
    background:   { image: "assets/bg/bg_portrait.jpg" },
    backgroundWide: { image: "assets/bg/bg_landscape.jpg" },
    coin:         { image: "assets/ui/coin.png",         emoji: "🪙" },
    trophy:       { image: "assets/ui/trophy.png",       emoji: "🏆" },
    gift:         { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:  { image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:    { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:        { image: "assets/ui/video.png",        emoji: "🎬" },
    star:         { image: "assets/ui/star.png",         emoji: "⭐" },
    rays:         { image: "assets/fx/rays.png" },
    ribbon:       { image: "assets/fx/ribbon.png" },
    undo:         { image: "assets/ui/pu_undo.png",      emoji: "↩️" },
    hammer:       { image: "assets/ui/pu_hammer.png",    emoji: "🔨" },
    shuffle:      { image: "assets/ui/pu_shuffle.png",   emoji: "🔀" },
    swap:         { image: "assets/ui/pu_swap.png",      emoji: "🔁" }
  },

  powerups: {
    undo:    { label: "Undo",    start: 3, cost: 50 },
    hammer:  { label: "Smash",   start: 2, cost: 80 },
    swap:    { label: "Swap",    start: 2, cost: 80 },
    shuffle: { label: "Shuffle", start: 1, cost: 120 }
  },

  economy: {
    startCoins: 100,
    coinsFromTier: 6,                   // merges that create this tier or higher pay coins
    unlockReward: 5,                    // coins × tier number for discovering a new fruit
    dailyRewards: [50, 75, 100, 125, 150, 200, 400],
    reviveRemoves: 4                    // revive clears this many of the smallest tiles
  },

  // Shown when one swipe makes 2, 3, 4+ merges.
  combos: { 2: "Juicy!", 3: "Fruity!", 4: "Smoothie!", 5: "FRUIT FRENZY!" },

  ads: {
    enabled: true,
    simulate: true,                     // fake ad overlay when no SDK/bridge is present (turn off for release)
    interstitialEveryGames: 2           // show an interstitial every N game-overs
  },

  // Optional audio files. null = built-in synthesized sound.
  sounds: {
    swipe: null, merge: null, spawn: null, combo: null, coin: null,
    click: null, gameover: null, newbest: null, unlock: null,
    music: null                         // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
