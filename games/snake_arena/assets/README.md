# Snake Arena — asset spec

Everything is optional. Snakes, food, the arena and effects are drawn in code, and menu icons fall back
to emoji. Add a file with the exact name below and it replaces the built-in version on the next reload.
Paths can be changed in `js/config.js → art`.

**Style for every image:** glossy neon-arcade 3D style on a dark purple background, centered,
~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "SNAKE" in wavy green letters + "ARENA" white with a glowing pink outline, a cute snake head peeking |
| icon.png | 1024×1024 (opaque) | App icon: a coiled green snake with big eyes surrounded by glowing pellets, on a dark purple gradient |
| coin.png | 256×256 | Gold coin |
| crown.png | 256×256 | Gold crown (best length) |
| skins.png | 256×256 | Paint palette |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| trap.png | 256×256 | Small burst / pow star (kill feed) |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Snakes
Skins are drawn from `config.skins` (colors + pattern). For sprite-based skins, replace `Skins.segment`
and `Skins.head` in `js/skins.js` with `drawImage` calls (one segment image, one head image per skin).

## sfx/ — optional (built-in synth used otherwise)
eat, bigEat, boost, kill, death, power, click, whoosh, newbest, unlock, rankUp (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
