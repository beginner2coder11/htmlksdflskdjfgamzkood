# Pin Rescue: pull-the-pin puzzle template

A glass tower is split into bins by golden pins. Tap a pin to slide it out, and whatever sits on it falls.
Get the gems and coins down to the explorer's room, but keep the lava away: water poured on lava turns both
into stone, and lava or a falling boulder knocks out the grumpy monster before it can drop in. Everything
(physics, tower, treasure, characters, sound) is made in code, with no build step, no dependencies and no
image or sound files. It plays fully offline.

## Controls
Tap a pin (the rod or its ring). P or Esc pauses.

## Features
- **Real physics (js/physics.js):** gems, coins, lava, water, stones, boulders and the monster are all balls
  that roll, pile up and pour through funnels, with a fixed time step so a pin order always plays out the same
  way. Water meeting lava turns both into stone (with steam). Two lava touches or a falling boulder knocks the
  monster out (with a poof).
- **60 levels, every pin order checked:** `tools/gen-levels.js` builds towers (2 columns × 1–3 tiers, 2–5
  pins), fills the bins, then plays EVERY pin order through the same physics. A level is kept only if some
  orders win and enough orders lose; later levels have fewer winning orders. Each level stores a winning
  order, used by the Hint and by the tests.
- **Win:** at least 70% of the treasure in the explorer's room, no lava in the room and no monster getting in.
  Stars for 70% / 85% / 95% of the treasure.
- **Look and feel:** thick glass tubes with highlights, golden pins with ring handles that slide out, glowing
  lava with bloom, blobby water, coins and cut gems, a treasure chest that opens as treasure arrives, an
  explorer who cheers, panics as lava gets close, or ends up singed, an animated monster, steam puffs, poofs
  and confetti.
- **Hint** (coins or a rewarded ad: flashes the next pin of the stored solution), restart, 6 scenery themes in
  the shop, a 7-day daily gift, double coins on a win and an interstitial every 3 wins (`js/ads.js` uses the
  `GameAdsBridge` contract).
- **Sound (js/audio.js):** pin scrapes, rising coin dings, steam hiss, monster growl and poof, a lava whoosh
  and an adventurous loop, with separate sound and music toggles.

## Level audit
- 60 levels: 2 with 2 pins, 17 with 3, 22 with 4 and 19 with 5. The share of pin orders that win drops from
  about 37% (levels 1–10) to 28% (11–30), 21% (31–45) and 17% (46–60).
- Every stored solution wins when replayed through the game's own loop (60 / 60). Pulling the pins in plain
  reverse order loses on 35 of 59 levels; the others have more than one winning order.

## Making more levels
```
node tools/gen-levels.js 60 777      # count, seed → rewrites js/levels.js (one process)
# faster: build ranges in parallel, then merge
node tools/gen-levels.js 60 777 --from 41 --to 43 --part p41.json   # …one per range
node tools/gen-levels.js --merge p01.json p41.json …
```
The difficulty plan (pins per level and the accepted share of winning orders) is `plan()` in the tool.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the star thresholds, hint price, coins, the scenery themes, the daily gift, ads and
  the storage prefix (`pr_`). Ball sizes and physics constants are at the top of `js/physics.js`.
- `js/game.js` draws everything: `bake` (balls), `bakeBg` (scenery and tower), `drawPin`, `drawHero`,
  `drawMonster` and `drawChest`.

## Testing hooks
`Phys.create(level)`, `Phys.play(world, pin)` (pulls a pin and runs until things settle), `Phys.result(world)`;
in the page: `Game.start(n)`, `Game.pullPin(i)`, `Game.hint()`, `Game.step(dt, n)`, `Game.world`, `Game.level`
(with `sol`), `Game.pinXY(i)`, `UI.levels()`, `UI.shop(tab)`, `UI.gift()` and `UI.state` (the save).
