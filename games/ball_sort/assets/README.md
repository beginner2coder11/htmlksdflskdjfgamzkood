# Ball Sort: asset spec

Everything is optional. Balls, liquids, tubes, corks and backgrounds are drawn in code, and menu icons fall back
to emoji. Add a file with the exact name below and it replaces the built-in version on the next reload.
Paths can be changed in `js/config.js → art`.

**Style for every image:** glossy, bright casual-puzzle 3D style, centered, ~8% padding,
**real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "BALL" as four glossy colored balls with white letters + "SORT" in chunky white letters with a purple outline |
| icon.png | 1024×1024 (opaque) | App icon: three glass test tubes with stacked red/yellow/blue balls on a purple gradient |
| coin.png | 256×256 | Gold coin |
| star.png | 256×256 | Gold star |
| shop.png | 256×256 | Shopping bag |
| levels.png | 256×256 | Folded map |
| calendar.png | 256×256 | Calendar page (daily challenge) |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| lock.png | 256×256 | Padlock |
| undo.png | 256×256 | Curved back arrow |
| add_tube.png | 256×256 | Test tube with a green plus |
| hint.png | 256×256 | Glowing light bulb |
| restart.png | 256×256 | Circular arrows |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Balls & tubes
Skins are drawn in `js/skins.js`. For sprite balls, replace the body of `Skins.ball()` with
`drawImage(img[ci], cx - r, cy - r, r * 2, r * 2)` using one 256×256 image per palette color.

## sfx/ — optional (built-in synth used otherwise)
pick, drop, pour, tube, win, nope, undo, click, coin, unlock, star (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
