# Prism Hop: HTML5 tile-hopping template

A bouncy orb with a face hops along floating glass tiles through five glowing worlds. Drag left and right to
steer it onto the next tile. Landing dead centre scores a PERFECT, and a chain of PERFECTs fills the Fever
meter. The pace is set by distance, not music, so this is a steering and aim game, not a rhythm game. There is
no build step, no dependencies and no image or sound files, and it plays fully offline.

## Controls
Hold and drag anywhere to steer. The orb bounces on its own. On desktop, use ←/→ (or A/D) and Space to start.
P or Esc pauses.

## Features
- **Pseudo-3D engine on Canvas 2D:** a chase camera with perspective projection. Glass slab tiles have neon
  rims, a moving shine and mirror reflections on a glossy "light lake" floor that has a scrolling grid.
  Side scenery is drawn per world, with parallax silhouettes, a sun or moon, light shafts and ambient particles.
- **Five worlds**, one every 45 rows, entered through a glowing gate: Aurora Lake (crystals and aurora), Ember Dunes
  (pyramids and a banded sunset), Coral Deep (coral and caustics), Candy Clouds and Neon Metro (a skyline with lit windows).
  Colours cross-fade at each gate and the hops get faster. After Neon Metro the worlds loop.
- **Judging:** PERFECT, GREAT, GOOD or CLOSE!, with callouts that pop, a chain counter (x12) and a score
  multiplier (+1 for every 5 PERFECTs in a row, up to x4).
- **Fever:** PERFECTs fill the meter. When it is full you get x2 score, 30% wider tiles, rainbow tiles and trail,
  and a gem on every hop.
- **Special tiles:** sliding, small, twin (pick a side, and one side has a gem stack) and boost pads, which launch
  a long arc through a line of gems.
- **Power orbs:** Shield (saves one miss), Gem Magnet and Slow-mo.
- **The orb:** squash and stretch, a world-space trail, a rim light from the world, and eyes that follow your
  steering, blink, smile on PERFECT and turn to X when it falls. There are 10 skins (stripes, dots, a ring, swirl
  and split looks, and rainbow trails) to buy with gems.
- **Retention:** 3 rolling missions out of a pool of 15, a 7-day daily gift streak, best score, and the menu
  playing a live autoplay run behind it.
- **Ads (js/ads.js):** revive with a rewarded ad (or 60 gems), double the run's gems with a rewarded ad, and an
  interstitial every N runs. Uses the same `GameAdsBridge` contract as the other templates.
- **Sound (js/audio.js):** synthesized glass plinks that climb a pentatonic scale while you chain PERFECTs, gem
  sparkles, a boost whoosh, a Fever riser, gate chords and a soft background pad that changes key per world.
  Sound effects and music each have their own toggle.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: lane size, hop speed curve, judging windows, points, Fever, stage length, special-tile
  chances, the worlds (sky, floor, tile, glow and accent colours, plus the prop, air and sun style), skins,
  missions, daily gifts, revive price, ads and the storage prefix (`ph_`).
- `css/style.css`: UI tokens in `:root`.
- `js/game.js`: `drawProp`, `drawSilhouette` and `drawSky` draw each world's art, and `drawOrb` draws the orb.

## Testing hooks
`Game.prepare(seed)`, `Game.begin()`, `Game.autoSteer(true)` (the bot steers for you), `Game.step(dt, n)`,
`Game.setTarget(x)`, `Game.revive()`, `Game.run`, `Game.ball`, `Game.rows`, `UI.play()`, `UI.shop()`,
`UI.missions()`, `UI.daily()`, `UI.state`. For example, fast-forward to the second world with
`UI.play(); Game.autoSteer(true); Game.begin(); while (Game.ball.row < 46) Game.step(1/60, 5);`
