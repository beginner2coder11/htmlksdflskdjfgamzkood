# Flow Works: HTML5 pipe-rotation puzzle template

Rotate pipe tiles until every pipe joins one network fed by the pump, with no open ends. Drawn as an engineering
blueprint in SVG: cyanotype blue, fine white grid, grid references, a dimension line, a title block and a red
APPROVED stamp. No canvas, no build step, no dependencies, no image or sound files. Plays fully offline.

## Controls
Tap a tile to rotate it clockwise. Hold (or right-click) to lock a tile you are sure about. H = hint, Esc = pause.

## Features
- **60 sheets** from a seeded random spanning tree, so every board has a solution. Sizes grow from 4×4 to 9×9;
  from sheet 37 the edges **wrap around** like a torus.
- **Exact minimum turns** is counted for every board; stars compare your turns to it.
- **Live flow:** water runs (animated dashes) through every tile connected to the pump; outlets light up; a
  flow % meter in the bar.
- **Locks** (hatched tiles that ignore taps) and **hints** (sets one wrong tile next to the wet network and locks
  it). Hints are earned with stars or a rewarded ad.
- **Finish:** a staged flood from the pump outward, then the APPROVED stamp.
- **Sound:** ratchet clicks, valve clunks, rising tones as the network grows, rushing water and a machine-room
  pulse.
- **Ads:** interstitial every N sheets, rewarded ad for +2 hints.

## Reskin
`js/config.js` (levels, sizes, wrap level, cross chance, hints, star rules, ads), `css/style.css` (blueprint
colours and the SVG piece classes `.wall`, `.chan`, `.outlet`, `.pump`).

## Testing hooks
`Game.generate(n)`, `Game.turn(i)`, `Game.hint()`, `Game.solved()`, `Game.tiles` (each has `m` solution mask and
`rot`), `Game.rotMask(m, r)`, `UI.play(n)`. Verified: all 60 sheets are solvable and finishing one in the minimum
turns wins.
