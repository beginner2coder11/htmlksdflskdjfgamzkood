# Merge Fruits — asset spec

Drop files here with these exact names. Any missing file falls back to an emoji, so add them in any order.
Paths and names can be changed in `js/config.js`.

**Style for every image:** cute casual mobile-game asset, glossy 3D cartoon, soft light from top-left,
thick clean silhouette, vibrant colors, centered, ~8% padding, **real transparent PNG**, no text.

## tiers/ — 512×512 transparent PNG (fruit only; the game draws the colored tile behind it)
| File | Fruit | Tile color behind it |
|---|---|---|
| tier01.png | Cherry pair | red-pink |
| tier02.png | Strawberry | light pink |
| tier03.png | Grape bunch | purple |
| tier04.png | Lemon | yellow |
| tier05.png | Orange | orange |
| tier06.png | Red apple | red |
| tier07.png | Pear | lime |
| tier08.png | Peach | peach |
| tier09.png | Pineapple | teal |
| tier10.png | Melon (cantaloupe) | blue |
| tier11.png | Watermelon | green |
| tier12.png | Golden crowned watermelon (sparkly) | gold |

All with faces or all without, not mixed. Each must be recognizable at 64px.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "MERGE FRUITS" chunky 3D bubble letters, white outline, fruits peeking |
| icon.png | 1024×1024 (opaque) | App icon: watermelon + cherry on bright gradient, no text |
| coin.png | 256×256 | Gold coin with a fruit emblem |
| trophy.png | 256×256 | Gold trophy |
| gift.png | 256×256 | Red gift box |
| chest_closed.png | 256×256 | Wooden treasure chest, closed |
| chest_open.png | 256×256 | Same chest, open, glowing coins |
| video.png | 256×256 | Play/film icon in green circle (watch-ad) |
| star.png | 256×256 | Gold star |
| pu_undo.png | 256×256 | Curved back arrow, glossy blue |
| pu_hammer.png | 256×256 | Cartoon wooden mallet |
| pu_swap.png | 256×256 | Two tiles with swap arrows, green |
| pu_shuffle.png | 256×256 | Crossing arrows, purple |

## bg/ — JPG, opaque
| File | Size | Content |
|---|---|---|
| bg_portrait.jpg | 1080×1920 | Soft blurred pastel orchard/picnic, low detail in center |
| bg_landscape.jpg | 1920×1080 | Same scene, wide (desktop) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | White-gold sunburst rays, soft edges (spins behind rewards) |
| ribbon.png | 1200×300 | Blank red 3D ribbon banner — no text, game writes on it |

## sfx/ — optional (built-in synth used otherwise)
swipe, merge, spawn, combo, coin, click, gameover, newbest, unlock (.mp3/.ogg, < 1s),
music_loop (60–90s loop). Set the paths in `config.js → sounds`.
