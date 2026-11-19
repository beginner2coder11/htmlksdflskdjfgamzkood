# Slice Rush: fruit slicing template

Fruit flies up from the bottom of the screen. Swipe through it to slice it in two, with a splash of juice. Slice
three or more in one swipe for a combo, and keep away from the bombs. Three modes, blades and backgrounds to
unlock and a chain of goals. Everything (fruit, bombs, backgrounds, sound) is made in code, with no build step, no
dependencies and no image or sound files. It plays fully offline.

## Controls
Swipe (touch or mouse drag) across the fruit. P or Esc pauses.

## Features
- **10 fruits drawn in code:** apple, orange, lemon, lime, watermelon, kiwi, peach, plum, coconut, strawberry.
  Each has its own skin and its own cut face (citrus segments, melon seeds and rind, kiwi seed ring, peach pit...).
  Sliced fruit splits along your swipe: the two halves fly apart and spin, juice drops spray and a splat stays on
  the board for a moment.
- **Modes:** Classic (3 lives, a dropped fruit costs one, a bomb ends the game, it speeds up as you go; one
  continue for an ad), Arcade (60 s, bombs cost 10 points, glowing power fruit: Freeze slows time, Frenzy pours
  fruit in from the sides, Double doubles points), Zen (90 s, no bombs).
- **Combos:** 3+ fruits in one swipe give a bonus equal to the fruits sliced.
- **20 goals** cleared one after another for coins (scores, combos, fruits in one swipe, total fruit, power
  fruit, plays).
- **Shop:** 6 blades (swipe trails, including rainbow) and 5 backgrounds (chopping board, picnic, beach, night
  market, bamboo grove).
- A 7-day daily gift, double coins for an ad and an interstitial every 3 runs (`js/ads.js` uses the
  `GameAdsBridge` contract). Best score per mode.
- **Sound (js/audio.js):** blade swishes, juicy squishes (deeper for big fruit), rising combo dings, a bomb boom, a
  thud for a dropped fruit, power-fruit chimes and a bouncy loop. The title-screen demo is silent.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the fruits (colours, size, points, which drawing to use), power fruit, modes (lives,
  times, bomb penalty), combo size, coins, blades, backgrounds, goals, the daily gift, ads and the storage prefix
  (`slr_`).
- `js/game.js` → `drawWhole` / `drawInner` draw each fruit and its cut face; `bg()` draws the backgrounds.

## Testing hooks
In the page: `UI.play("classic" | "arcade" | "zen")`, `Game.setBot(true)` (auto-slicer, also used behind the title),
`Game.update(dt, n)`, `Game.objs`, `Game.run`, `Game.slice(obj, angle)`, `Game.fx`, `UI.shop()`, `UI.goals()`,
`UI.state`.
