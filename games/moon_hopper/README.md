# Moon Hopper: HTML5 lunar lander template

Land a lunar module on glowing vector terrain in a 1960s mission-control style: phosphor-green CRT lines with glow,
scanlines, amber warning readouts, chunky grey console keys and typewriter-style telemetry. No build step, no
dependencies, no image or sound files. Plays fully offline.

## Controls
Hold ⟲ / ⟳ to rotate and THRUST to fire the engine (multi-touch). Keyboard: ← → rotate, ↑ / W / Space thrust.

## Features
- **16 missions** across the Moon, Phobos, Europa, Titan, Mars, Io, Callisto and Mercury, each with its own gravity,
  wind, fuel, terrain roughness and pad multipliers (×2 to ×5, narrower pads pay more).
- **Safe landing rules:** under 4.2 m/s down, 3 m/s sideways and nearly level, on a pad. Crashes say why.
- **Free flight:** endless terrain; every new pad refuels you, so how many hops can you chain?
- **Camera** follows the craft and zooms in near the ground; live ALT / VSPD / HSPD / ANGLE / FUEL readouts turn red
  when you would crash, plus a GO FOR LANDING call-out.
- **Stars** for landing, a ×4+ pad and 25% fuel left.
- **Juice:** flickering engine flame, blinking pad lights, crash debris that tumbles and bounces.
- **Sound:** an engine rumble that follows the throttle, a master-alarm on low fuel, landing chimes and a slow
  space drone.
- **Ads:** interstitial every N flights, rewarded ad for +40% fuel once per flight (from the HOLD screen).

## Reskin
`js/config.js` (craft, landing limits, missions, free flight, ads), `js/game.js` → `render` (colours `PH`, `AMB`),
`css/style.css` tokens in `:root`.

## Testing hooks
`Game.start(mode, i)`, `Game.key("left"|"right"|"thrust", on)`, `Game.step(dt)`, `Game.render()`, `Game.ship`,
`Game.pads`, `Game.groundAt(x)`, `UI.fly(mode, i)`. A simple autopilot lands about half the missions.
