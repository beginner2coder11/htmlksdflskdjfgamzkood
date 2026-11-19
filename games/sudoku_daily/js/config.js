/* ==========================================================================
   SUDOKU DAILY — GAME CONFIG
   Classic 9×9 sudoku. A new Daily Challenge every day (the same puzzle for every
   player, made from the date) with a monthly calendar and trophies, a 150-level
   Journey and endless games in 4 difficulties. Notes, smart hints that explain
   the logic, undo, 3 mistakes. Every puzzle has one solution and needs no
   guessing. Drawn in code.
   ========================================================================== */
window.GAME_CONFIG = {
  // Game name (browser tab, app name default)
  title: "Sudoku Daily",
  // Short line under the logo on the title screen
  tagline: "A fresh puzzle every day",
  // the logo on the title screen, one entry per line
  titleLines: ["SUDOKU", "DAILY"],
  // UI colours (buttons, panels, text): CSS variables from css/style.css
  theme: {
    "ink": "#1d2a4a",
    "ink-2": "#66749a",
    "paper": "#ffffff",
    "cream": "#f2f5ff",
    "accent": "#4b6bff",
    "accent-d": "#3049d6",
    "green": "#2fc46e",
    "green-d": "#1d9452",
    "blue": "#4b6bff",
    "blue-d": "#3049d6",
    "gold": "#ffc93d",
    "red": "#ff5468"
  },

  // Difficulties. clues = givens to aim for, tech = hardest logic allowed (1 naked single, 2 hidden single,
  // 3 locked candidates, 4 naked pair, 5 hidden pair, 6 naked triple, 7 X-wing), need = the puzzle must need at least this
  difficulties: {
    easy:   { name: "Easy",   clues: 40, tech: 2,         coins: 20, color: "#2fc46e" },
    medium: { name: "Medium", clues: 31, tech: 2,         coins: 35, color: "#4b9bff" },
    hard:   { name: "Hard",   clues: 26, tech: 5, need: 3, coins: 60, color: "#ff9a3d" },
    expert: { name: "Expert", clues: 22, tech: 7, need: 4, coins: 100, color: "#ff5468" }
  },
  // Daily Challenge difficulty by weekday (Sunday first)
  dailyByWeekday: ["medium", "easy", "medium", "medium", "hard", "hard", "expert"],
  dailyBonus: 40,                  // extra coins for finishing the Daily Challenge
  monthTrophy: 500,                // coins for finishing every daily puzzle of a month

  // Journey: level count and the difficulty each level range uses
  journey: { count: 150, bands: [[1, "easy"], [26, "medium"], [71, "hard"], [121, "expert"]], seed: 4242 },

  mistakes: 3,                     // mistakes allowed (0 = unlimited)
  hints: 3,                        // free hints per puzzle (more for an ad)

  // Board themes in the shop
  themes: [
    { id: "classic", name: "Classic", price: 0,    bg: "#eef2ff", board: "#ffffff", line: "#c9d2ea", bold: "#1d2a4a", given: "#1d2a4a", user: "#4b6bff", sel: "#4b6bff", area: "#e6ecff", same: "#c9d6ff", note: "#66749a" },
    { id: "paper",   name: "Paper",   price: 300,  bg: "#f3ead8", board: "#fffaf0", line: "#e0d2b6", bold: "#5a4630", given: "#3e2f1e", user: "#c0562f", sel: "#c0562f", area: "#f6ead2", same: "#f0d4b8", note: "#8c7556" },
    { id: "mint",    name: "Mint",    price: 500,  bg: "#e3f7ee", board: "#ffffff", line: "#bfe6d2", bold: "#1f5a44", given: "#1f4a3a", user: "#16a36b", sel: "#16a36b", area: "#e2f6ec", same: "#bdebd5", note: "#5f8c79" },
    { id: "rose",    name: "Rose",    price: 700,  bg: "#fdeaf0", board: "#ffffff", line: "#f2cbd8", bold: "#6a2840", given: "#4a1e2e", user: "#e0457a", sel: "#e0457a", area: "#fdebf1", same: "#f8cadb", note: "#a06a80" },
    { id: "night",   name: "Night",   price: 1000, bg: "#121a30", board: "#1d2742", line: "#33405f", bold: "#8fa2d8", given: "#e8eeff", user: "#7fb2ff", sel: "#7fb2ff", area: "#26334f", same: "#33507e", note: "#8f9cc0", dark: true },
    { id: "ocean",   name: "Ocean",   price: 1500, bg: "#0d2c3f", board: "#123a52", line: "#24536e", bold: "#7fd3e8", given: "#eafaff", user: "#5fe0c8", sel: "#5fe0c8", area: "#1a4a66", same: "#21627e", note: "#8cbccc", dark: true }
  ],

  // Daily gift: coins for day 1..7 of the login streak
  daily: [50, 80, 100, 150, 200, 300, 500],
  // Ads: enabled = show ads, simulate = fake ads in the browser (the APK uses real AdMob), interstitialEvery = an interstitial every N finished puzzles (0 = off)
  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  // Save-data key prefix. Give each reskin its own so saves never mix
  storagePrefix: "sd_"
};
