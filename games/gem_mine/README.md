# Gem Mine: HTML5 match-3 template

A lantern-lit match-3 set in an old mine: carved wood, hammered brass, old-print serif type and faceted gems drawn
in code. Pure HTML/CSS/JS with no build step, no dependencies and no image or sound files. It plays fully offline
and runs on the web or wrapped as an Android APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Swipe a gem toward a neighbour, or tap two neighbouring gems. Esc/P pauses.

## Features
- **50 generated levels** with rotating goals: score runs, gem hauls (collect N of a color), ice veins (break every
  ice tile, some need two hits) and deep veins (collect + ice). 7 board shapes with holes.
- **Specials:** match 4 → line gem (clears a row or column), L/T shape → blast gem (3×3), match 5 → prism
  (clears a whole color).
- **Swap combos:** line+line = cross, line+blast = 3 rows + 3 columns, blast+blast = 5×5, prism+gem = clears that
  color, prism+special = turns that color into specials and fires them, prism+prism = clears the board.
- **Cascades** with a growing multiplier and callouts, hint glow after 6 s idle, automatic shuffle when no move is left.
- **Goal finale:** every move left turns into a line gem that fires for bonus points.
- **Boosters:** Pickaxe (one gem), Shuffle and Dynamite (3×3), bought with coins.
- **Juice:** tweened swaps, falling gems with gravity and squash, gem shards, row/column beams, blast rings,
  prism rays, screen shake, flickering lanterns and floating dust.
- **Sound:** FM crystal chimes that climb with each cascade, wooden knocks, rock rumbles and a plucked dorian
  arpeggio in a cave echo. No audio files.
- **Meta:** the Shaft (level list with goal type and depth), Supplies ledger (shop), Lucky Dig (pick one of three
  rocks every 6 hours), settings, stars and coins.
- **Ads:** interstitial every N games, rewarded ads for +5 moves, double coins and free coins.

## Reskin
1. `js/config.js`: gem names/colors/cuts, board size, scoring, boosters, board shapes, number of levels, ads.
2. `css/style.css`: wood and brass tokens in `:root`.
3. `js/game.js`: `spec(n)` (level generator), `gemSprite`, `wallSprite`, `lantern`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.fast = true` skips animation waits. `Game.setup(n)`, `await Game.trySwap([r,c],[r,c])`, `Game.findMove()`,
`Game.update(dt)`, `Game.draw()`, `Game.grid`, `Game.goal`, `Game.progress`, `UI.play(n)`.
A greedy bot that picks the biggest match wins level 1–3 and 15 every time and some later levels.

## Files
```
index.html      pages
css/style.css   wood + brass UI
js/config.js    ← reskin here
js/game.js      board, matching, specials, combos, gravity, goals, drawing
js/ui.js        home, shaft, supplies, lucky dig, HUD, dialogs, saves
js/audio.js     synthesized chimes + music
js/ads.js       ad bridge
```
