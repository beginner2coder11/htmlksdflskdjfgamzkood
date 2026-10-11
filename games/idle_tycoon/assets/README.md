# Idle Tycoon: asset spec

Everything is optional. Business icons and manager mascots are emoji (set in `config.js`), the shop street scenes are drawn in
code, and menu icons fall back to emoji. Add a file with the exact name below and it replaces the built-in
version on the next reload. Paths can be changed in `js/config.js → art`.

**Style for every image:** glossy, bright casual-tycoon style, centered, ~8% padding, **real transparent PNG**,
no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "IDLE" in chunky white letters + "TYCOON" in gold with a dark outline, a lemonade stand and coins |
| icon.png | 1024×1024 (opaque) | App icon: a cheerful lemonade stand with a stack of gold coins, on a purple gradient |
| gem.png | 256×256 | Blue diamond gem |
| star.png | 256×256 | Gold star (prestige currency) |
| boost.png | 256×256 | Rocket |
| balloon.png | 256×256 | Red party balloon (the lucky delivery) |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with coins (welcome back) |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Business icons
To use images instead of emoji, put 256×256 PNGs in `assets/ui/` and swap the `emoji` span in `buildBiz()`
(`js/ui.js`) for an `<img>`. The shop signs and order bubbles read `emoji` too (`js/street.js`).

## sfx/ — optional (built-in synth used otherwise)
honk, angry, tip, cash, buy, milestone, manager, upgrade, prestige, click, unlock, coin, gem (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
