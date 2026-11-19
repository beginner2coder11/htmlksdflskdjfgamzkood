# Sudoku Daily: sudoku template with a Daily Challenge

Classic 9×9 sudoku. Every day brings a new Daily Challenge (the same puzzle for every player, made from the
date) with a monthly calendar, a streak and a trophy for each month you complete. There is also a 150-level
Journey and endless games in Easy, Medium, Hard and Expert. Everything (puzzles, board, sound) is made in code,
with no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Tap a cell, then a number (or type 1–9; arrows move; Backspace erases; N toggles notes; Ctrl/Cmd+Z undoes).
Esc pauses.

## Features
- **A real puzzle maker (js/sudoku.js):** every puzzle has exactly one solution and can be solved by logic alone
  (no guessing). Difficulty is set by the logic it needs: Easy and Medium use singles, Hard needs locked
  candidates or pairs, Expert needs pairs, triples or X-wings, with fewer givens each step (~40 → ~24). A puzzle
  takes a few milliseconds to make, and the seed makes the same puzzle on every device.
- **Smart hints** that fill a cell and say why ("In this row, 7 can only go in this cell"); a wrong number is
  pointed out first. Three free hints per puzzle, one more for each rewarded ad.
- **Notes** (pencil marks), **Fill notes** (every candidate at once), **auto-remove notes** when you place a
  number, undo, erase, matching-number highlights, row / column / box highlights and clash marks.
- **3 mistakes** (can be switched off) with a second chance for an ad. The board hides while paused.
- **Juicy board:** numbers pop in, a wave of light runs along every finished row, column and box, a rainbow
  cascade when you win, a shake on mistakes; the number pad counts down what's left.
- **Daily Challenge:** difficulty by weekday, calendar of the last 12 months (play any missed day), streak and best
  streak, a trophy + coins for each fully solved month.
- **Journey:** 150 levels (Easy → Medium → Hard → Expert) with stars (3 = no mistakes and no hints).
- **Stats** per difficulty (won / played, best and average time), 6 board themes in the shop (2 dark), a 7-day
  daily gift, double coins for an ad and an interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge`
  contract). The game in progress is saved and can be continued.
- **Sound (js/audio.js):** soft plucks that rise with the digit, ticks for notes, a gentle buzz for mistakes,
  sparkles for finished rows and boxes and a calm pad loop.

## Puzzle check
1,000 seeds (250 per difficulty) were made and checked in Node: every puzzle has a unique solution, matches its
stored solution and is solved by the logic solver using only the techniques allowed for its difficulty. Every
Hard puzzle needs locked candidates or pairs, and every Expert puzzle needs pairs or harder. Average time to make
a puzzle: Easy/Medium ~1 ms, Hard ~9 ms, Expert ~34 ms (slowest 0.15 s).

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the difficulties (givens, logic allowed, coins, colour), the Daily Challenge difficulty
  by weekday and its bonus, the month trophy, the Journey length / bands / seed, mistakes and hints, board themes
  (every colour on the board), the daily gift, ads and the storage prefix (`sd_`).

## Testing hooks
`Sudoku.make(seed, difficulty)`, `Sudoku.countSolutions(grid)`, `Sudoku.logicSolve(grid, tech)`; in the page:
`UI.playDaily("2026-11-19")`, `UI.playJourney(n)`, `UI.playClassic("hard")`, `Game.select(i)`, `Game.input(d)`,
`Game.hint()`, `Game.state`, `Game.cellXY(i)`, `UI.calendar()`, `UI.journey()`, `UI.shop()`, `UI.stats()`.
