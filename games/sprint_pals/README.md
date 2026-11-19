# Sprint Pals: 3-lane endless runner template

You run as a cartoon animal pal along a 3-lane track, seen from behind. Swipe left or right to change lanes,
up to jump and down to slide. You dodge hurdles, "DUCK!" signs, crates and carts rolling towards you, jump
over gaps, run up ramps onto striped market-stall roofs, and grab coins and power-ups through four zones.
Everything is drawn in code on Canvas 2D with a perspective chase camera. There is no build step, no
dependencies and no image or sound files, and it plays fully offline.

## Controls
- Swipe ← → to change lanes, ↑ to jump (a quick tap also jumps) and ↓ to slide.
- Swiping down in the air drops you fast and goes straight into a slide.
- Keyboard: arrows or WASD, Space to jump, P/Esc to pause.
- Bumping the side of an obstacle knocks you back. Two bumps in quick succession end the run.

## Features
- **Four zones** of 600 m each, with their own sky, horizon, road and roadside scenery, then they loop:
  Seaside Boardwalk (sea, umbrellas, beach huts, palms), Red Rock Canyon (mesas, cacti), Lantern Market (night,
  lit windows, lantern strings over the road) and Snowy Village (snowy peaks, pines, houses).
- **Obstacles:** hurdles (jump), signs (slide), crates (dodge), carts that roll towards you once you're close
  (dodge), gaps (jump), and market stalls with or without ramps (run along the roof for the coin line on top).
- **Power-ups:** Coin Magnet, Double Coins, Spring Shoes (higher jumps), Balloon Ride (float above everything
  through a trail of coins) and Bubble Shield (absorbs one crash). You can upgrade the four timed ones five
  levels each.
- **6 pals with perks:** Bolt (red panda), Kiki (bunny: higher jumps), Tuk (penguin: longer power-ups), Rio
  (fox: wider magnet), Mango (monkey: +10% coins) and Zuri (koala: starts with a shield).
- **Missions:** 3 at a time from a pool of 15. Finishing a set raises the permanent score multiplier (up to
  x15) and pays 300 coins. There are also "Close!" bonuses for last-second dodges.
- **Monetisation and retention:** revive (an ad first, then 250, 500 or 1000 coins), double coins on the
  results screen, an interstitial every 3 runs (`js/ads.js` uses the `GameAdsBridge` contract), and a 7-day
  daily gift.
- **Juice:** speed lines, FOV kick, screen shake, dust, coin sparkles with rising-pitch coin blips, zone
  banners and flashes, and music that speeds up as you run faster.

## Fairness audit
The generator always leaves a way through. To check it, the built-in bot (which also plays behind the title
screen) ran 40 seeded runs of 4,000 m each, past top speed, with **0 crashes**:
```js
window.__audit = []; Game.start({ bot: true, seed: 12345 });
while (!Game.player.crash && Game.run.dist < 4000) Game.simulate(1/60, 1);
window.__audit   // empty = no crashes; otherwise why/where
```

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js`: lane width, speed curve, jump, slide, zone length, zones (colours plus side/horizon style),
  pals, power-up durations, upgrade prices, missions, revive prices, daily gift, ads and the storage prefix
  (`sp_`).
- `js/game.js`: `prop()` and `horizon()` draw the scenery, `palArt()` the characters and `drawObs()` the
  obstacles.
