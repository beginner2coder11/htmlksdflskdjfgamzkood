# Ten Pin Town: HTML5 bowling template

Ten-pin bowling in a 1950s atomic-age alley: cream, teal, coral and mustard, starbursts and boomerangs, a
Googie roadside sign for a title screen and ticket-stub dialogs. The lane is simulated top-down in metres
(regulation sizes) and drawn through a camera that follows the ball. No build step, no dependencies, no image
or sound files. Plays fully offline.

## Controls
Swipe up from where you want the ball to start: the flick speed sets the ball speed, the swipe direction sets
the aim, and curving the end of the swipe puts hook on the ball. Drag sideways first to slide the ball along the
foul line. Desktop: ←/→ move the ball, Space rolls it straight.

## Features
- **Lane physics:** ball and pins are circles with real mass. The ball hooks once it leaves the oil (first 12 m),
  pins topple when hit hard enough and keep sliding into their neighbours, and side kickbacks throw them back
  into play. Each throw is seeded, so the same throw always plays out the same.
- **Open Play:** 10 frames with full scoring (strikes, spares, the 10th-frame bonus balls), a scorecard and a
  standing-pins map in the HUD.
- **Spare Shots:** 24 pin set-ups to clear with one roll, from single pins to baby splits, unlocked in order.
  Every one is checked to be clearable (see Testing).
- **Ball shop:** 5 balls with their own hook and weight, bought with coins from strikes, spares and scores.
- **Juice:** a follow camera, pin clatter with sparks and screen shake, STRIKE!/SPARE! callouts, a rolling rumble,
  a strike bell and a vibraphone lounge loop.
- **Ads:** interstitial every N games, rewarded ad to double the coins from a game.

## Reskin
`js/config.js` (lane size, physics feel, swipe sensitivity, coins, Spare Shots list, balls, ads),
`css/style.css` tokens in `:root`, `js/game.js` → `drawWall` / `drawLane` (alley art and the sign above the pins).

## Testing hooks
`Game.start({ kind: "open" } | { kind: "spare", level }, ball)`, `Game.roll({ x, angle, speed, spin })`,
`Game.simulate(throw, pins)` → `{ down, left, gutter }` without drawing, `Game.step(dt)`, `Game.totals(frames)`,
`Game.frames`, `Game.standing`, `UI.play(mode)`, `UI.locker`.
