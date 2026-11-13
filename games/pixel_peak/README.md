# Pixel Peak: HTML5 8-bit platformer template

An 8-bit platformer presented inside a retro handheld console: cream plastic shell, recessed screen, rubber d-pad
and A/B buttons. The game renders at 256×224 and is scaled up with crisp pixels. All sprites, tiles and the 3×5
pixel font are defined in code, and the music is chiptune. No build step, no dependencies, no image or sound files.

## Controls
- **On screen:** d-pad to move, A to jump (hold for higher), START to pause, tap the screen on menus.
- **Keyboard:** ← → / A D move, Z or Space jump, Enter/Esc start, Shift select.

## Features
- **24 levels in 3 worlds** (Meadow, Cavern, Summit), each stitched from hand-made 12×14 chunks (easy / mid / hard
  pools) by a seeded generator, so every level is playable and you can add chunks to make more.
- **Tight controls:** acceleration and friction, coyote time, jump buffering, variable jump height.
- **Things in the world:** coins, spikes, walkers that turn at ledges, bats that swoop toward you, springs, moving
  platforms, checkpoints and a goal flag.
- **3 hearts**, knockback and blinking invulnerability, pits cost a heart and send you to the last checkpoint.
- **Stars:** finish, collect 80% of the coins, finish without a hit.
- **In-screen menus** drawn with the pixel font: title, world map with level nodes and stars, pause, clear and
  game-over screens.
- **Chiptune:** one song per world on square/triangle/noise channels, plus jump, coin, stomp and spring effects.
- **Handheld touches:** pressed-button states, low-health LED, shake on hits, sound/music toggles.
- **Ads:** interstitial every N levels, rewarded ad to continue after game over.

## Reskin
`js/config.js` (physics, hearts, level count, world palettes, the chunk library), sprites in `js/game.js` (`SPR`,
string pixel maps with the `PAL` palette), the console shell in `css/style.css`.

## Testing hooks
`Game.startLevel(n)`, `Game.press(button, down)`, `Game.update(dt)`, `Game.render()`, `Game.player`, `Game.map`,
`Game.ents`. A simple run-right-and-jump bot clears most levels without help.
