# Meadow Keeper: cozy wildlife garden template

A top-down wildlife garden around an acorn-shaped cottage. You plant flowers, dig ponds and put up bee hotels,
nest boxes, feeders, log piles and trees. Every wild visitor arrives once the things it needs are in your
meadow. Flowers drop nectar (even while you're away), photographs of new visitors earn seeds, and seeds clear
the brambles so the meadow can grow. Everything is drawn in code, with no build step, no dependencies and no
image or sound files, and it plays fully offline.

## Controls
- **Look around:** drag to pan, pinch or mouse-wheel to zoom, or use the + and − buttons.
- **Collect nectar:** tap the golden drops, or use the gather button once 3 or more are ready.
- **Photograph:** tap a visitor.
- **Grow:** choose an item, drag it into place (or tap a spot), then tap ✓.
- **Manage items:** tap an item to see who loves it, or to move it or pick it up.
- **Clear brambles:** tap a bramble patch next to your meadow.

## Features
- **25 items in 6 groups:** flowers (with colours that matter), ground, water (puddle, pond, bird bath, lily
  pond), shelters (log pile, bee hotel, nest box, hedgehog house), food (berry bush, feeder, apple tree, old
  oak) and decor (lantern, bench, toadstools). Items unlock by garden level.
- **18 visitors with habitat needs,** such as "2 red + 2 purple flowers" or "nest box + feeder". Each type
  moves its own way: bees and butterflies flutter from flower to flower, birds hop and fly in, frogs hop around
  the pond, ducklings paddle, hedgehogs and foxes walk, and snails creep. Night brings hedgehogs, fireflies,
  moths, the owl and the fox. Honeybees make flowers drop 50% more nectar.
- **Field journal:** silhouettes until photographed, each visitor's needs shown as chips that turn green when
  met, plus rarity and photo counts. Every photo slides in as a polaroid.
- **Growth:** clear the 3×3 bramble patches with seeds. Garden level comes from planting, photos, clearing and
  tasks. There are 20 garden tasks shown three at a time.
- **Nectar while you're away:** up to 3 hours at half rate, with a rewarded ad to double it. There's also a
  7-day daily gift and an interstitial after every 3 bramble clears (`js/ads.js` uses the `GameAdsBridge`
  contract).
- **Atmosphere:** a day and night cycle with glowing cottage windows, lanterns and fireflies, swaying flowers,
  pond ripples, chimney smoke, leaf bursts, a music-box loop, birdsong by day and crickets at night.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: grid size, starting area, clear costs, items (cost, level, nectar, tags), visitors (needs,
  time, rarity, seeds), tasks, levels, daily gift, ads and the storage prefix (`mk_`).
- `js/art.js`: draws the items, the cottage and every visitor.

## Testing hooks
`Game.spawn(id)`, `Game.step(dt, n)`, `Game.setClock(0..1)` (0.85 is night), `Game.tapAt(x, y)`,
`Game.offlineEarnings()`, `Game.needsMet(id)`, `Store.S` (the save), `UI.shop()`, `UI.journal()`,
`UI.tasks()` and `UI.beginPlace(id)`.
