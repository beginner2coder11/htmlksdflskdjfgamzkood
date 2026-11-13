# Mole Patrol: HTML5 garden logic template (minesweeper rules)

Clear the hedges without waking a mole. Numbers count the moles in the 8 squares around them. A flat gouache garden
style: chalky matte colours, soft blob shapes, leafy hedge tiles and terracotta soil. The board is a DOM grid (no
canvas). No build step, no dependencies, no image or sound files. Plays fully offline, on the web or as an APK.

## Controls
Tap to dig. Long-press (or right-click, or the 🚩 Flag switch, or F) to flag. Tap a number whose moles are all flagged
to dig around it at once (chording).

## Features
- **4 sizes** (Seedling 8×9, Garden 9×13, Orchard 10×16, Estate 12×20), sized for portrait phones; big boards scroll.
- **Daily garden:** the same seeded board for everyone today.
- **Safe first dig** that always opens a patch, flood reveal with a ripple delay, chording, mole counter, timer and
  best times.
- **Hints** (open a safe square next to the cleared area) bought with seeds; seeds are earned by winning.
- **Second chance:** a rewarded ad puts the mole you woke back to sleep and flags it.
- **Juice:** leaf bursts, dig pops, flag plant bounce, board shake, other moles peeking out on a loss, flowers
  blooming over the garden on a win.
- **Sound:** leafy rustles, soft digs, wooden flag taps, a mole squeak and a pastoral flute tune.
- **Ads:** interstitial every N games, rewarded ads for a second chance and +30 seeds.

## Reskin
`js/config.js` (sizes, daily size, long-press time, hint price, seeds, number colours, ads), `css/style.css`
(`.t` hedge, `.t.open` soil, `.m` mole, flag).

## Testing hooks
`Game.setup(size, daily)`, `Game.dig(i)`, `Game.toggleFlag(i)`, `Game.hint()`, `Game.cells`, `Game.around(i)`,
`UI.play(size)`. A simple rule-based solver clears about 4 in 5 Seedling boards.
