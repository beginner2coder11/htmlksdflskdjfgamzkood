# Block Burst — asset spec

Everything is optional. Blocks, gems, logo, ribbon and rays are drawn in code, and icons fall back to emoji.
Add a file with the exact name below and it replaces the built-in version on the next reload.
Paths can be changed in `js/config.js → art`.

**Style for every image:** glossy 3D casual-arcade style, vibrant on a dark-purple night theme,
soft light from top-left, centered, ~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "BLOCK BURST": chunky letters, "BLOCK" on colored cube tiles, "BURST" gold-orange with dark outline |
| icon.png | 1024×1024 (opaque) | App icon: 3–4 glossy colored blocks bursting with sparkles on a purple gradient |
| gem.png | 256×256 | Cyan/blue diamond with white facets (sits on top of a block) |
| coin.png | 256×256 | Gold coin |
| crown.png | 256×256 | Gold crown (best score) |
| trophy.png | 256×256 | Gold trophy |
| star.png | 256×256 | Gold star |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |
| shop.png | 256×256 | Paint palette (skins shop) |
| map.png | 256×256 | Treasure map |
| lock.png | 256×256 | Padlock |
| hand.png | 256×256 | Cartoon pointing hand, fingertip at top-left (tutorial) |
| pu_rotate.png | 256×256 | Circular rotate arrows |
| pu_bomb.png | 256×256 | Cartoon bomb with lit fuse |
| pu_refresh.png | 256×256 | Dice or shuffle (new pieces) |
| pu_undo.png | 256×256 | Curved back arrow |

## bg/ — JPG, opaque
| File | Size | Content |
|---|---|---|
| bg_portrait.jpg | 1080×1920 | Dark purple/indigo arcade night, soft glowing shapes, low detail in the center |
| bg_landscape.jpg | 1920×1080 | Same, wide |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## blocks/ — optional custom block skin
To ship image blocks, add one 256×256 transparent PNG per color (block1.png … block8.png, in the
order of `config.colors`) and list them in `config.blockImages`. A "Custom" skin then appears in the shop.

## sfx/ — optional (built-in synth used otherwise)
pick, place, invalid, clear, praise, gem, star, win, gameover, bomb, rotate, coin, click, whoosh,
newbest, unlock (.mp3/.ogg) + music_loop. Set the paths in `config.js → sounds`.
