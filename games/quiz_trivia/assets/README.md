# Quiz Rush — asset spec

Everything is optional. The logo, background, timer, cards and ribbons are drawn in code, and icons
fall back to emoji. Add a file with the exact name below and it replaces the built-in version on the
next reload. Paths can be changed in `js/config.js → art`.

**Style for every image:** bright game-show 3D style on a purple background, soft light from top-left,
centered, ~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "QUIZ" white with a pink outline + "RUSH" yellow with an orange outline, a green "?" badge, slightly tilted |
| icon.png | 1024×1024 (opaque) | App icon: a big white "?" in a speech bubble with a lightning bolt, on a purple gradient |
| coin.png | 256×256 | Gold coin |
| heart.png | 256×256 | Glossy red heart (Survival lives) |
| bolt.png | 256×256 | Yellow lightning bolt (Lightning mode) |
| calendar.png | 256×256 | Calendar page (Daily Challenge) |
| fire.png | 256×256 | Flame (answer streak) |
| trophy.png | 256×256 | Gold trophy |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

Topic icons and lifeline icons are emoji set in `config.js`. You can replace them with any emoji, or extend
`categories[].emoji` to an `<img>` if you prefer artwork.

## sfx/ — optional (built-in synth used otherwise)
tick, correct, wrong, select, start, timeup, levelup, coin, click, streak, lifeline, whoosh (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
