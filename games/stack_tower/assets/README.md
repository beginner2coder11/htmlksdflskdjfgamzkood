# Stack Tower — asset spec

Everything is optional. The tower, sky, coins, logo, ribbon and rays are drawn in code, and icons fall back to emoji.
Add a file with the exact name below and it replaces the built-in version on the next reload.
Paths can be changed in `js/config.js → art`.

**Style for every image:** clean, glossy 3D casual style with soft light from top-left, centered,
~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "STACK TOWER" on two chunky tilted slabs (orange "STACK", pink "TOWER"), white letters |
| icon.png | 1024×1024 (opaque) | App icon: an isometric rainbow block tower on a sunset gradient, no text |
| coin.png | 256×256 | Gold coin |
| crown.png | 256×256 | Gold crown (best score) |
| star.png | 256×256 | Gold star |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |
| shop.png | 256×256 | Paint palette (themes shop) |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| flag.png | 256×256 | Small red flag |
| pu_slowmo.png | 256×256 | Hourglass with blue glow |
| pu_widen.png | 256×256 | Two arrows pointing outward over a block |
| pu_shield.png | 256×256 | Glossy blue shield |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## sfx/ — optional (built-in synth used otherwise)
place, chop, perfect, miss, coin, power, click, whoosh, newbest, unlock, milestone (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
