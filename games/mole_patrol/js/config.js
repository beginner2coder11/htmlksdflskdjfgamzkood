/* ==========================================================================
   MOLE PATROL — GAME CONFIG
   A garden logic game (minesweeper rules): clear the hedges without waking a
   mole. Numbers count moles in the 8 squares around. Gouache-painted DOM
   tiles, no images needed.
   ========================================================================== */
window.GAME_CONFIG = {
  title: "Mole Patrol",
  tagline: "Clear the garden. Don't wake the moles.",

  sizes: [
    { id: "seedling", name: "Seedling", cols: 8,  rows: 9,  moles: 10 },
    { id: "garden",   name: "Garden",   cols: 9,  rows: 13, moles: 20 },
    { id: "orchard",  name: "Orchard",  cols: 10, rows: 16, moles: 32 },
    { id: "estate",   name: "Estate",   cols: 12, rows: 20, moles: 52 }
  ],
  daily: { cols: 9, rows: 13, moles: 22 },

  longPress: 350,            // ms to plant a flag with a long press
  hintPrice: 15,             // seeds per hint
  seedsPerWin: { seedling: 5, garden: 10, orchard: 16, estate: 25, daily: 15 },

  // gouache colours for the numbers 1–8
  numberColors: ["#2f6db5", "#2f8f4f", "#c8453a", "#6a3fa0", "#a8572a", "#1f8a8a", "#333333", "#888888"],

  ads: { enabled: true, simulate: true, interstitialEvery: 3 },
  storagePrefix: "mp_"
};
