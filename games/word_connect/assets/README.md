# Word Connect — asset spec

Everything is optional. Landscapes, letter tiles, the wheel, logo, ribbon and rays are drawn in code,
and icons fall back to emoji. Add a file with the exact name below and it replaces the built-in version
on the next reload. Paths can be changed in `js/config.js → art`.

**Style for every image:** soft, friendly 3D casual style with warm light from top-left, centered,
~8% padding, **real transparent PNG**, no text.

## ui/ — transparent PNG
| File | Size | Content |
|---|---|---|
| logo.png | 1200×600 | "WORD" on four round cream letter tiles + "CONNECT" in bold white letters with an orange outline |
| icon.png | 1024×1024 (opaque) | App icon: a letter wheel with 3 tiles joined by an orange swipe line, on a warm gradient |
| coin.png | 256×256 | Gold coin |
| hint.png | 256×256 | Glowing yellow lightbulb |
| target.png | 256×256 | Red-and-white target / dart |
| shuffle.png | 256×256 | Two crossing curved arrows |
| jar.png | 256×256 | Glass jar with a cork, a few letter tiles inside |
| trophy.png | 256×256 | Gold trophy |
| calendar.png | 256×256 | Calendar page (daily puzzle) |
| chapters.png | 256×256 | Open book (chapters) |
| gift.png | 256×256 | Gift box |
| chest_closed.png / chest_open.png | 256×256 | Treasure chest closed / open with glowing coins |
| video.png | 256×256 | Play/film icon in a green circle (watch an ad) |
| lock.png | 256×256 | Padlock |
| hand.png | 256×256 | Cartoon pointing hand, fingertip at top-left (tutorial) |

## fx/ — transparent PNG
| File | Size | Content |
|---|---|---|
| rays.png | 1024×1024 | Gold sunburst rays, soft edges |
| ribbon.png | 1200×300 | Blank purple 3D ribbon banner, no text |

## Chapter backgrounds
The landscapes are generated from `config.chapters` (scene type + colors). To use your own art instead,
replace `Scenery.dataUrl` in `js/scenery.js` with your image URLs (1080×1920 JPG, low detail in the
middle where the grid sits).

## sfx/ — optional (built-in synth used otherwise)
select, found, wrong, repeat, bonus, coin, hint, shuffle, complete, click, unlock, flip (.mp3/.ogg) + music_loop.
Set the paths in `config.js → sounds`.
