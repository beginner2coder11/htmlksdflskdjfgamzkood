# Hex Stacks: hexa-sort puzzle template

Drag a stack of coloured hex tiles from the tray onto the honeycomb. Next to a stack with the same top
colour, the tiles flip across one by one and merge. A run of 10 tiles of one colour on top of a stack pops for
points, and the colours it uncovers can merge again for chain combos. Reach the level's target before the
board fills up; locked hexes open as your score grows. Everything (tiles, board, sound) is made in code, with
no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Drag a stack from the tray onto an empty hex, or tap a stack and then tap a hex. P or Esc pauses.

## Features
- **3D hex stacks:** every tile is a bevelled hex prism, so a stack shows its colour bands down the side. Stacks
  are drawn back to front on a tilted honeycomb, tall single-colour tops show a counter, and tiles flip across in
  an arc when they merge.
- **Merge rule (js/rules.js):** when a stack's top colour matches its neighbours, every stack in the group sends
  its top run to the one with the longest run, then every stack that changed is checked again, which gives
  chain reactions. A top run of `clearAt` (10) pops; each pop in a chain counts towards a combo.
- **120 levels:** hexagon boards of radius 2 and 3 with mirrored holes, locked hexes that open at score
  thresholds, 3 to 8 colours, more colour bands per stack, and rising targets. Every 10th level is HARD.
- **Juice:** stacks drop in with a bounce, tiles clack in a rising scale as they flip across, pops burst into
  stars, "+10" and "COMBO ×3" pop-ups, lock-opening sparkles, a goal bar that fills and shines, and confetti.
- **Boosters:** Hammer (smash any stack) and Swap (new tray). When the board fills, a rewarded ad (or coins)
  clears the 4 messiest stacks so you can keep going.
- **6 board themes** in the shop (Candy, Mint, Peach, Ocean, Night, Forest), a 7-day daily gift, double coins
  on a win and an interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge` contract).
- **Sound (js/audio.js):** tile clacks, bubbly pops, combo and unlock chimes, a hammer smash and a dreamy
  bell-and-pad loop, with separate sound and music toggles.

## Balance audit
Two bots play every level (the smart one also plays behind the title screen):
- **Smart bot** (tries every tray stack on every free hex and scores the result) clears 97–100% of levels in
  every band, so every level is winnable.
- **Casual bot** (drops a stack next to a matching colour if it can, otherwise anywhere) clears about 98% of
  levels 1–10, 70% of levels 31–60 and 15% of levels 91–120.

```js
const st = Rules.newState(Rules.level(n), seed);
let res; do { const mv = Rules.bestMove(st); res = Rules.place(st, mv.i, mv.k); } while (!res.won && !res.lost);
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the tile colours, `clearAt`, tray size and stack sizes, the level count, seed and
  difficulty curve (board radius, holes, locks, colours, colour bands, target), booster prices, coins, the
  board themes, the daily gift, ads and the storage prefix (`hx_`).
- `js/game.js` → `bakeTile` draws a tile, `bake` draws the background and honeycomb.

## Testing hooks
`Rules.level(n)`, `Rules.newState(level, seed)`, `Rules.place(state, trayIndex, cell)` (returns the merge / pop
events), `Rules.bestMove(state)`; in the page: `Game.start(n, seed)`, `Game.place(i, cell)`, `Game.step(dt, n)`,
`Game.busy()`, `Game.bestMove()`, `Game.state`, `Game.trayXY(i)`, `Game.cellXY(cell)`, `UI.levels()`,
`UI.shop(tab)`, `UI.gift()` and `UI.state` (the save).
