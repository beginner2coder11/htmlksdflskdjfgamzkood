# Hook & Reel: HTML5 fishing game template

Drop your hook as deep as the line allows (dodging fish on the way down), then reel up and snag every fish you can.
A woodblock-print look: indigo inks on cream paper, scalloped wave bands, bold carved outlines, a vermilion sun and
seal-stamp buttons. No build step, no dependencies, no image or sound files. Plays fully offline.

## Controls
Drag left/right (or ← →) to steer the hook. Touching a fish on the way down starts the reel early.

## Features
- **Three phases per trip:** drop (dodge), reel (snag up to your hook size, jellyfish knock 2 fish off), haul
  (fish fly into the air and are sold).
- **8 species** by depth zone, from Minnows to Ribbon Eels, plus a rare Golden Koi; deeper fish are worth more.
- **Upgrades:** line length (+30 m each), hook size, reel gear and a shiny lure for rarer fish.
- **Fish log** of species you've caught, deepest dive record.
- **Juice:** swaying fish and jellyfish, rising bubbles, seaweed, a carved depth ruler, a red end-of-line marker,
  catch popups and a pink sting flash.
- **Sound:** splashes, a reel ratchet, catch bloops, jellyfish zaps, coin counting and a breathy flute over a soft
  bass.
- **Ads:** interstitial every N trips, rewarded ads for double coins and +40 free coins.

## Reskin
`js/config.js` (speeds, species, jellyfish share, upgrades, ads), `js/game.js` → `drawFish`, `drawJelly`, `render`,
`css/style.css` tokens in `:root`.

## Testing hooks
`Game.cast(upgrades)`, `Game.steer(x)` (0–10 m), `Game.step(dt)`, `Game.render()`, `Game.creatures`, `Game.caught`,
`UI.cast()`.
