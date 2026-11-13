# Crate Escape: HTML5 sliding-block puzzle template

Slide the wooden blocks so the red crate can leave through the gate. A handmade wooden-toy look: wood grain, painted
blocks with brass pegs, bevels and a linen backdrop. Blocks are DOM elements. No build step, no dependencies, no
image or sound files. Plays fully offline, on the web or as an APK.

## Controls
Drag a block along its length; it stops at its neighbours and snaps to the grid. U = undo, Esc = pause.

## Features
- **60 puzzles in 5 packs** (Beginner to Expert, 3 to 35 moves). Every puzzle was made by `tools/gen.js` and solved
  by breadth-first search, so the **minimum move count is exact** and shown as "Best".
- **Stars:** match the minimum for 3, within +4 for 2.
- **Hints** run the solver from your current position and nudge the best next block (about 0.1 s on the hardest
  puzzle). Hints are earned with stars or a rewarded ad.
- **Undo, reset**, crate slide-out exit, lift-and-drop shadows, bump feedback at the walls.
- **3 woods** (Pine, Walnut, Birch) unlocked by stars.
- **Sound:** wooden slides, knocks and drops, a gate creak and a xylophone + upright-bass lullaby.
- **Ads:** interstitial every N puzzles, rewarded ad for +2 hints.

## More puzzles
`node tools/gen.js 120` writes a new `js/levels.js` (it buckets puzzles by difficulty; harder ones take longer to
find). Block 0 is always the crate on row 3.

## Reskin
`js/config.js` (star rules, hints, paint colours, woods, ads), `css/style.css` (`.blk`, `.crate`, `.frame`, `.box`).

## Testing hooks
`Game.load(i)`, `Game.solve()` (returns the move list), `Game.commit(block, steps)`, `Game.hint()`, `Game.undo()`,
`UI.play(i)`. Verified: applying the solver's path wins puzzles 1, 11, 26, 41 and 60 in exactly the minimum moves.
