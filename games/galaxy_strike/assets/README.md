# Optional assets

The game is complete without any files here: ships, enemies, bosses and effects are drawn in code, the icons fall
back to emoji, and every sound is synthesized. Add files only to replace something.

## Images (`assets/ui/`)
Use transparent PNGs, square unless noted.

| File | Size | Replaces |
|---|---|---|
| `logo.png` | ~800×400 | the drawn "GALAXY STRIKE" title |
| `icon.png` | 512×512 | the browser tab icon |
| `coin.png` | 128×128 | 🪙 in the menus |
| `hangar.png`, `upgrades.png`, `missions.png`, `gift.png` | 128×128 | the home tile icons |
| `bomb.png` | 128×128 | 💥 on the bomb button |
| `video.png`, `lock.png`, `trophy.png` | 128×128 | small icons |

Paths are set in `js/config.js → art`.

## Sounds (`assets/sfx/`)
Set a path in `js/config.js → sounds` (for example `laser: "assets/sfx/laser.mp3"`) to replace a synthesized
effect. `music` replaces the whole soundtrack with a looping file (the boss track then stays the same file).

Names: `laser`, `hit`, `explode`, `bigExplode`, `powerup`, `coin`, `shield`, `bomb`, `warning`, `hurt`,
`click`, `unlock`, `win`, `over`, `music`.

Keep `laser` very short (under 0.1 s): it plays up to 14 times a second.
