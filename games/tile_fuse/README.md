# Tile Fuse: HTML5 number-fusing slider template

Slide the whole board; two equal tiles fuse into the next number (1+1 → 2, 2+2 → 3 …). A Swiss/brutalist design:
one paper color, black rules, monospace labels, giant grotesk numerals and a single signal-orange accent.
The board is plain HTML (no canvas): tiles are `<div>`s placed with CSS variables and animated with CSS
transitions. No build step, no dependencies, no image or sound files. Plays fully offline, on the web or as an APK.

## Run
Serve the folder with any static server (`python3 -m http.server`) or drop it into an HTML-to-APK converter.

## Controls
Swipe on the board, or arrow keys / WASD. U = undo, Esc/P = pause.

## Features
- **5 modes:** Classic 4×4 (reach 11), Grand 5×5 (reach 12), Tight 3×3 (reach 8), Rush (120 s clock; big fuses add
  seconds) and Daily (the same seeded board for everyone today, with a daily best).
- **Wild tiles ✱** fuse with anything and add one to it.
- **Combos:** several fuses in one slide add a score bonus and a stamp callout. Score for making tile v is 2^v.
- **Tools:** 2 free undos per game (more for tokens), Smash (remove any tile, costs tokens), Reset.
- **Juice:** CSS slide transitions, stamp pop on every fuse, board jolt on big fuses, nudge when a slide is
  blocked, smash spin-out, floating +points, a value ramp from paper to black to signal orange, and a ticker.
- **Sound:** dry mechanical clicks, typewriter thunks, fuse pitch rising with value and a minimal four-on-the-floor
  pulse. Synthesized, no files.
- **Meta:** best per mode, best tile, games played, tokens earned per game, settings.
- **Ads:** interstitial every N games, rewarded ads to clear 3 tiles and continue, and for +20 tokens.

## Reskin
1. `js/config.js`: modes (size, goal, clock), spawn odds, combo bonus, tool prices, ads.
2. `css/style.css`: the value ramp `.v1` … `.v16`, `.wild`, tokens in `:root`.

## Ads
All ad calls go through `js/ads.js` (Android `window.GameAdsBridge` or a web SDK; set `ads.simulate: false` for release).

## Testing hooks
`Game.newGame(mode)`, `Game.move("left")`, `Game.load([[1,1,0,0],…])` (use `"*"` for a wild tile), `Game.grid`,
`Game.undo()`, `Game.canMove()`, `UI.start(mode)`. Verified rows: `[1,1,1,1]`←`[2,2,0,0]`, `[2,1,1,0]`←`[2,2,0,0]`,
`[✱,3]`←`[4]`, `[3,3,3,0]`→`[0,0,3,4]`.

## Files
```
index.html      menu + game
css/style.css   brutalist UI and the tile ramp
js/config.js    ← reskin here
js/game.js      board, slide/fuse rules, undo, wild, smash, Rush clock, Daily seed
js/ui.js        menu, HUD, tools, overlays, saves
js/audio.js     synthesized clicks + pulse
js/ads.js       ad bridge
```
