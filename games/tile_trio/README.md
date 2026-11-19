# Tile Trio: triple-tile match template

Picture tiles are piled in layers. Tap a free tile (nothing on top of it) and it flies into the tray; tiles
with the same picture line up together, and three of a kind pop. Clear the whole pile. If the tray fills up
(7 tiles) without a match, the level is lost. Tiles, tray and effects are drawn in code and the pictures are
emoji, with no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Tap a tile. A covered tile (dimmed) shakes. P or Esc pauses.

## Features
- **120 levels** in 6 picture sets (fruit, sweets, animals, garden, ocean, toys), built from 6 shapes
  (rectangle, diamond, circle, heart, cross, ring) with up to 6 layers and 13 kinds of picture. Every 10th
  level is HARD. Piles are mirrored left/right so they look balanced.
- **Always solvable:** a legal pick order is played out, pictures are dealt in threes along it, and then a
  smart-player simulation is run while pictures are swapped so it has to fill the tray more, but only while it
  still clears the level without ever holding more than the level's cap (always below 7). Its winning order is
  kept as the level's solution, and the test below replays it.
- **Look and feel:** chunky 3D tiles with bevelled faces and edges, stacked with a layer offset; covered tiles
  are dimmed; tiles fly into the tray on an arc, the tray shuffles to keep matches together, triples squash and
  burst into stars, NICE!/GREAT! combos, a red pulse when the tray is nearly full, and confetti.
- **Boosters:** Undo (take back the last tile), Pop out (move 3 tray tiles up to a shelf, where they can be
  tapped again) and Shuffle (mix the pile). "Pop out 3" is also the rewarded revive when the tray fills.
- **Stars by time** (★★★ within `parSeconds` per tile), a tiles-left bar and a clock.
- **6 tile styles** in the shop (Ivory, Mint, Rose, Sky, Honey, Night), a 7-day daily gift, double coins on a
  win and an interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge` contract).
- **Sound (js/audio.js):** wooden tile clicks, sparkly match chimes that rise with combos, pop-out and shuffle
  swishes and a gentle bell-and-pad loop, with separate sound and music toggles.

## Balance audit
For all 120 levels (js/rules.js, run in Node):
- The stored solution replays to a win on every level, and the smart bot clears 100%.
- A casual player who slips 30% of the time but uses the starting boosters clears about 88% of levels 1–10,
  68% of 11–30, 35% of 31–60, 25% of 61–90 and 13% of 91–120.

```js
const st = Rules.newState(Rules.level(n));
for (const id of Rules.level(n).order) Rules.take(st, id);   // ends with { won: true }
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- **Pictures:** `sets` in `js/config.js` — any emoji (or single characters) work; each set has its own
  background colours. Tile looks are `tileStyles`.
- `js/config.js` also holds the tray and shelf sizes, the level count, seed and difficulty curve (tiles, layers,
  kinds, squeeze, cap), booster prices, coins, par time, the daily gift, ads and the storage prefix (`tt_`).

## Testing hooks
`Rules.level(n)` (with `order`, the stored solution), `Rules.newState(level)`, `Rules.take(state, id)`,
`Rules.undo/pop/shuffle(state)`, `Rules.botPick(state)`, `Rules.isFree(state, id)`; in the page:
`Game.start(n)`, `Game.take(id)`, `Game.undo()`, `Game.popOut()`, `Game.shuffle()`, `Game.step(dt, n)`,
`Game.busy()`, `Game.botPick()`, `Game.tileXY(id)`, `Game.state`, `UI.levels()`, `UI.shop(tab)`, `UI.gift()` and
`UI.state` (the save).
