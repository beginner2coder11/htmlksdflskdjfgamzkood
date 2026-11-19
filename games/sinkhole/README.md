# Sinkhole: hole .io template

Steer your hole around a busy city with the joystick and swallow anything that fits: people and cones first,
then benches, trees, cars, buses, houses and finally towers. Every bite makes the hole bigger. In battle levels
you out-eat rival holes before the clock runs out (a bigger hole can swallow a smaller one); every third level
is a solo challenge to eat a share of the city. Everything (city, objects, holes, sound) is made in code, with
no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Drag anywhere for a floating joystick, or WASD / arrow keys. P or Esc pauses.

## Features
- **A living city (js/city.js):** a 64 × 64 map of blocks between roads — parks with ponds and paths, house
  rows, shops with kiosks, a glass tower, plazas with fountains and parking lots — plus lamps, bins, hydrants,
  cones, ~130 walking people and cars and buses driving along every road in both directions.
- **13 kinds of object, each a little 3D model** in a tilted top-down view: people, cones, hydrants, bins,
  lamps, benches, trees, cars, kiosks with striped awnings, buses, houses with pitched roofs, a shop and a
  window-lined tower. Things too big for your hole wobble when you pass under them.
- **Holes:** depth-shaded with a coloured rim; swallowed things slide to the centre, shrink and sink inside the
  hole. The camera zooms out as you grow.
- **Rival holes** with names and a live leaderboard: they head for the best food nearby, chase smaller holes and
  flee bigger ones; their speed and judgement improve with the level. A swallowed hole respawns after 3 s.
- **60 levels** (`levels.curve`): 3 → 7 rivals, rising skill, 100–120 s rounds; every 3rd level is solo (eat
  20% → 46% of the city). Stars for winning margin / time left.
- **6 hole colours** in the shop, a 7-day daily gift, double coins for an ad, +20 s for an ad on solo levels and
  an interstitial every 3 wins (`js/ads.js` uses the `GameAdsBridge` contract).
- **Sound (js/audio.js):** gulps that get deeper for bigger things, rising grow ticks, a chomp when you swallow a
  rival, a sad drop when you're swallowed, and a bouncy city loop.

## Balance check
An auto-player using the same brain as the rivals (it also plays behind the title screen) wins every sampled
solo level and the early battles (levels 1–5); later battles are a real contest (about half won). A human who
plans a route usually does better than the bot.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds every object's size and value, hole growth / speed / hole-eating ratio, the level
  count, seed and curve, rival names and colours, coins, hole colours, the daily gift, ads and the storage
  prefix (`sk_`).
- `js/city.js` lays out the city; `js/game.js` → `bakeGround` (roads, blocks) and `drawObj` (every model).

## Testing hooks
`City.make(seed)`; in the page: `Game.start(n)`, `Game.setBot(true)`, `Game.step(dt, n)`, `Game.holes`,
`Game.me`, `Game.timeLeft`, `Game.pct`, `Game.extraTime(s)`, `UI.levels()`, `UI.shop()`, `UI.gift()` and
`UI.state`.
