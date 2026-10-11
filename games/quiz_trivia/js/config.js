/* ==========================================================================
   QUIZ RUSH — GAME CONFIG
   Questions live in js/questions.js (or a remote JSON via questionsUrl).
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Quiz Rush",
  titleLines: ["QUIZ", "RUSH"],

  // Optional: load questions from a URL (same array format as questions.js) so you
  // can update content without shipping a new build. Falls back to the bundled file.
  questionsUrl: null,

  categories: [
    { id: "science",   name: "Science",    emoji: "🔬", color: "#3fa6ff" },
    { id: "geography", name: "Geography",  emoji: "🌍", color: "#2ec27e" },
    { id: "animals",   name: "Animals",    emoji: "🦁", color: "#ff9a2e" },
    { id: "space",     name: "Space",      emoji: "🚀", color: "#7a5cff" },
    { id: "history",   name: "History",    emoji: "🏛️", color: "#d9763b" },
    { id: "sports",    name: "Sports",     emoji: "⚽", color: "#ff4d6d" },
    { id: "food",      name: "Food",       emoji: "🍕", color: "#ffc233" },
    { id: "tech",      name: "Technology", emoji: "💻", color: "#14b8c6" }
  ],

  modes: {
    classic:   { name: "Classic",   questions: 10, time: 15 },
    survival:  { name: "Survival",  lives: 3, time: 15 },
    lightning: { name: "Lightning", seconds: 60, bonusPerCorrect: 2 },
    daily:     { name: "Daily Challenge", questions: 10, time: 15, reward: 100 }
  },

  scoring: {
    correct: 100,
    timeBonus: 10,                       // points per second left
    streakStep: 0.25,                    // +25% per streak step…
    streakMax: 2,                        // …up to ×2
    stars: [5, 7, 9]                     // Classic: correct answers for 1 / 2 / 3 stars
  },

  lifelines: {
    fifty: { label: "50/50",  emoji: "✂️", start: 3, cost: 40 },
    time:  { label: "+Time",  emoji: "⏱️", start: 2, cost: 30, seconds: 10 },
    skip:  { label: "Skip",   emoji: "⏭️", start: 2, cost: 50 },
    poll:  { label: "Crowd",  emoji: "📊", start: 2, cost: 40 }
  },

  progression: {
    xpPerCorrect: 10,
    xpBase: 100,                         // XP for level 2…
    xpGrowth: 50                         // …and each level after needs this much more
  },

  avatars: ["🦊", "🐼", "🐯", "🐸", "🐙", "🦄", "🐧", "🦉", "🐨", "🐵", "🐶", "🐱"],

  economy: {
    startCoins: 150,
    coinsPerCorrect: 2,
    levelUpCoins: 50,
    dailyRewards: [50, 75, 100, 125, 150, 200, 400]
  },

  art: {
    logo:       { image: "assets/ui/logo.png" },
    coin:       { image: "assets/ui/coin.png",         emoji: "🪙" },
    heart:      { image: "assets/ui/heart.png",        emoji: "❤️" },
    trophy:     { image: "assets/ui/trophy.png",       emoji: "🏆" },
    gift:       { image: "assets/ui/gift.png",         emoji: "🎁" },
    chestClosed:{ image: "assets/ui/chest_closed.png", emoji: "🧰" },
    chestOpen:  { image: "assets/ui/chest_open.png",   emoji: "💰" },
    video:      { image: "assets/ui/video.png",        emoji: "🎬" },
    bolt:       { image: "assets/ui/bolt.png",         emoji: "⚡" },
    shield:     { image: "assets/ui/survival.png",     emoji: "🛡️" },
    calendar:   { image: "assets/ui/calendar.png",     emoji: "📅" },
    fire:       { image: "assets/ui/fire.png",         emoji: "🔥" },
    rays:       { image: "assets/fx/rays.png" },
    ribbon:     { image: "assets/fx/ribbon.png" }
  },

  ads: {
    enabled: true,
    simulate: true,                      // fake ad overlay when no SDK/bridge exists (turn off for release)
    interstitialEveryRounds: 2
  },

  sounds: {
    tick: null, correct: null, wrong: null, select: null, start: null, timeup: null,
    levelup: null, coin: null, click: null, streak: null, lifeline: null, whoosh: null,
    music: null                          // e.g. "assets/sfx/music_loop.mp3"
  },

  vibration: true
};
