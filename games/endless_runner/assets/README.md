# Dash Runner — asset spec

Everything is optional. Heroes, worlds, hazards, coins and effects are drawn in code, and menu icons
fall back to emoji. Add a file with the exact name below and it replaces the built-in version on the
next reload. Paths can be changed in `js/config.js → art`.

**Style for every image:** bright cartoon 3D style with soft light from top-left, centered,
~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "DASH" yellow + "RUNNER" white with a red outline, slanted forward with speed lines |
| icon.png | 1024×1024 (opaque) | App icon: a round green hero mid-jump over a spike, with a coin, on a sky-blue gradient |
| coin.png | 256×256 | Gold coin |
| crown.png | 256×256 | Gold crown (best distance) |
| characters.png | 256×256 | Plush toy / hero silhouette (Heroes button) |
| upgrades.png | 256×256 | Up arrow with sparkles |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Heroes and worlds
Heroes are drawn in `js/characters.js` and worlds from `config.biomes` colors. To use sprite art instead,
replace `Characters.draw` with `ctx.drawImage` calls (keep the feet at the origin) and swap `drawDeco`
in `js/runner.js` for your scenery images.

## sfx/ — optional (built-in synth used otherwise)
jump, djump, land, coin, stomp, hit, slide, power, shield, rocket, click, whoosh, newbest, milestone, unlock
(.mp3/.ogg) + music_loop. Set the paths in `config.js → sounds`.
