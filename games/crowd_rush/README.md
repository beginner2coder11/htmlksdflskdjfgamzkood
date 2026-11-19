# Crowd Rush: gates-and-crowd runner template

Your crowd of little runners charges down a track over the water. Drag left and right to steer through gates
(+20, ×3, −10, ÷2) that grow or shrink the crowd, beat red enemy crowds one-for-one, get past sweepers, saws
and walls, then climb the multiplier stairs or take down the giant boss. Everything (track, runners, gates,
boss, sound) is made in code, with no build step, no dependencies and no image or sound files. It plays fully
offline.

## Controls
Drag anywhere (relative steering), or ← / → on a keyboard. P or Esc pauses.

## Features
- **Pseudo-3D chase camera** over a striped track with edge rails and a thick side over the water, clouds and
  hills. Runners use 4 pre-drawn run frames, so crowds of 180 stay smooth; a count bubble floats over each
  crowd.
- **Crowd formation:** a sunflower pattern that packs tighter as the crowd grows (never wider than ~60% of the
  track, so it can always pick a side). New runners pop in; lost ones burst.
- **Events:** glowing gate pairs (blue + / ×, red − / ÷), enemy crowds (exact one-for-one battles with the two
  crowds leaning into the clash), a sweeper bar (track edges are safe), a saw on a rail and brick walls with a
  gap. A saw or sweeper takes at most 22% of the crowd that meets it (less if you steer well).
- **Finales:** multiplier stairs (×1 … ×5; each step costs a share of the level's best possible crowd, so the
  top takes a near-perfect run) or, every 5th level, a giant boss with an HP bar who swats runners.
- **100 levels (js/levels.js):** gates, enemies and obstacles from a seed. The solver tries every combination
  of gate choices to find the best crowd a smart player can have; enemies and the boss are sized from it.
- **Upgrades** on the title screen (starting crowd, income), 6 crowd colours in the shop, a 7-day daily gift,
  ×3 coins for an ad on a win, "+15 runners" revive and an interstitial every 3 wins (`js/ads.js` uses the
  `GameAdsBridge` contract).
- **Sound (js/audio.js):** gate whooshes and buzzes, battle pops, obstacle hits, rising stair chimes, boss
  punches and smashes and a driving loop.

## Balance audit
- The built-in bot (follows the solved gate choices, dodges obstacles; it also plays behind the title screen)
  clears all 100 levels in the real game, starting with 1 runner and no upgrades.
- A casual player who takes the worse-looking gate 30% of the time clears about 70% of levels 1–10, 53% of
  11–60 and 38% of 61–100 (before upgrades and revives).

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds speed, track width, max runners drawn, the enemy colour, the level count, seed and
  difficulty curve, the stairs, coins, upgrades, crowd colours, the daily gift, ads and the storage prefix
  (`cr_`).
- `js/game.js` → `bakeRunner` draws a runner, `drawEvent` the gates and obstacles, `drawFinale` the stairs and
  the boss.

## Testing hooks
`Levels.get(n)` (with `best`, `choice` — the solved gate choices as bits — and `trace`), `Levels.solve(events,
start)`; in the page: `Game.start(n, startRunners)`, `Game.setBot(true)`, `Game.step(dt, n)`, `Game.crowd`,
`Game.finale`, `Game.progress`, `Game.revive(k)`, `UI.levels()`, `UI.shop()`, `UI.gift()` and `UI.state`.
