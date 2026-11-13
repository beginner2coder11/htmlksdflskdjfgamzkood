# Hoop Swish: HTML5 swipe-basketball template

Swipe-to-shoot street basketball on a graffiti court: a brick wall with drippy spray tags, a chain-link fence,
a painted concrete floor and sticker-slap buttons. The court is a small 3D scene in metres (rim at 3.05 m) drawn
with a perspective camera. No build step, no dependencies, no image or sound files. Plays fully offline.

## Controls
Swipe up to shoot: the length sets the power, sideways drift sets the aim. Space shoots a perfect shot on desktop.

## Features
- **Real ball physics:** gravity, a torus-shaped rim, a backboard you can bank off, floor bounces and spin.
  A "perfect" swipe is solved to drop through the rim; about ±12% swipe length still scores (often off the rim
  or board).
- **Scoring:** 2 for a basket, 3 for a swish (nothing but net), **fire** after 3 in a row doubles points.
- **Street 60:** 60 seconds, swishes add 4 seconds, the hoop starts sliding once you pass 40 points.
- **Streak:** keep scoring; one miss ends the run.
- **5 balls** (Classic, Neon, Midnight, Gold, Candy) bought with coins from makes.
- **Juice:** ball trail, a net that ripples when it catches the ball, colour sparks, SWISH! callouts, a flash on
  makes, a fire glow, a ticking clock and buzzer.
- **Sound:** ball thumps, rim clanks, board bangs, net swishes and a boom-bap beat with a dusty bass line.
- **Ads:** interstitial every N games, rewarded ad for +15 seconds or one more life.

## Reskin
`js/config.js` (court geometry, swipe feel, modes, points, balls, ads), `js/game.js` → `paintWall` (tags and court
art), `css/style.css` tokens in `:root`.

## Testing hooks
`Game.start(mode, ball)`, `Game.shoot(dx, dy)` (pixels; `dy = -0.42 × screen height` is a perfect shot),
`Game.step(dt)`, `Game.render()`, `Game.ball`, `Game.made`, `UI.play(mode)`.
