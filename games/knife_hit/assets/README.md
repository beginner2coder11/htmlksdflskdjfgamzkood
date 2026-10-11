# Knife Hit: asset spec

Everything is optional. Knives, targets, apples and effects are drawn in code, and menu icons fall back to
emoji. Add a file with the exact name below and it replaces the built-in version on the next reload.
Paths can be changed in `js/config.js → art`.

**Style for every image:** bold, glossy casual-arcade style on a dark background, centered, ~8% padding,
**real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "KNIFE" in chunky white letters + "HIT" in gold with a dark outline, a knife slicing through it |
| icon.png | 1024×1024 (opaque) | App icon: a wooden log target with three knives stuck in it and a red apple, on a dark purple gradient |
| apple.png | 256×256 | Shiny red apple (the currency) |
| crown.png | 256×256 | Gold crown (best score) |
| boss.png | 256×256 | Crossed swords (boss stage marker) |
| knives.png | 256×256 | Two crossed knives (knife collection button) |
| missions.png | 256×256 | Scroll or clipboard with a checkmark |
| check.png | 256×256 | Green checkmark badge |
| lock.png | 256×256 | Padlock |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing apples |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Knives & targets
They're drawn in `js/skins.js`. For sprite knives, replace the body of `Skins.knife()` with a `drawImage` of a
vertical knife image (tip at the top, 1:5 aspect) scaled to length `L`. For sprite targets, replace
`Skins.target()` with a `drawImage` of a round 512×512 image scaled to radius `R`.

## sfx/ — optional (built-in synth used otherwise)
throw, hit, clang, apple, break, boss, win, click, unlock, coin, over (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
