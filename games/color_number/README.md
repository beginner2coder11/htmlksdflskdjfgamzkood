# Color by Number: pixel-art colouring template

Pick a picture, pick a colour and tap or drag over the cells with its number. Pinch or scroll to zoom. When the
last cell is filled, the picture replays as a time-lapse in the order you painted it. 42 original pictures in 5
categories, a picture of the day, boosters and a gallery of finished work. Everything (pictures, palette, sound) is
made in code, with no build step, no dependencies and no image or sound files. It plays fully offline.

## Controls
Tap a colour, then tap or drag over its cells. Pinch (touch) or scroll (mouse) to zoom. Zoomed out, drag moves the
picture and a tap zooms in there. Right / middle mouse button drags too. + / − / ⤢ buttons zoom and fit.

## Features
- **42 pictures drawn in code (js/pictures.js):** Animals, Food, Nature, Things and Seasons (cat, puppy, fox, owl,
  penguin, frog, fish, whale, turtle, ladybug, butterfly, panda, bunny, chick, ice cream, cupcake, donut,
  watermelon, pizza, strawberry, apple, burger, bubble tea, sunny day, rainbow, apple tree, tulips, toadstool,
  cactus, mountain sunset, palm island, house, rocket, sailboat, hot-air balloon, lighthouse, car, gift box,
  snowman, pumpkin, heart balloons, kite). Each is drawn from shapes on a 100 × 100 sheet with its own palette,
  then turned into a 32–44 cell grid (4× supersampled, every cell takes its most common palette colour).
- **Painting:** the selected colour's cells light up; drag-painting fills in cells skipped by a fast swipe; a
  wrong colour leaves a see-through mark (`allowWrong`); painted cells pop; the palette chips show progress rings,
  tick off when done and the next colour is picked for you.
- **Fast drawing:** the picture is a tiny image scaled up without smoothing, and numbers are drawn only for
  visible cells, so big pictures stay smooth.
- **Boosters:** Bucket (fill a whole patch), Blast (paint a 7 × 7 area), Find (jump to a cell still to paint). Buy
  with coins or get one for an ad.
- **Time-lapse** replay of every finished picture, "Save picture" (PNG download), My Works tab, paint again.
- **Picture of the day** (free even if locked, bonus coins), the first 14 pictures free and the rest unlocked with
  coins or an ad, a 7-day daily gift, double coins for an ad and an interstitial every 2 finished pictures
  (`js/ads.js` uses the `GameAdsBridge` contract). Progress is saved per picture.
- **Sound (js/audio.js):** soft pops that climb a scale while you paint, a chime when a colour is done, a whoosh
  for boosters, a replay jingle and a calm pad loop.

## Reskin
- **Name, logo and UI colours:** `title`, `titleLines` (one entry per logo line) and `theme` (the CSS variables
  from `css/style.css`) in `js/config.js`. `js/skin.js` applies them when the game starts.
- `js/config.js` also holds the free picture count, unlock price, coin rewards, booster counts / prices, wrong
  colour marks, the daily gift, ads and the storage prefix (`cbn_`).
- **Pictures:** add or edit entries in `js/pictures.js` (id, name, category, grid size `n`, palette, and a `draw`
  function using `bg / rect / rr / circ / ell / poly / line / arc / half / star / heart / clip`).

## Testing hooks
`Pictures.build(def)`; in the page: `UI.paintPic(Pictures.byId("cat"))`, `Game.select(c)`, `Game.cellXY(i)`,
`Game.view`, `Game.find()`, `Game.debug.paintCell(i)`, `Game.png(def)`, `UI.state`, `UI.home()`.
