[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kiroroai/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kiroroai/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Night Archive — a stealth game

You are **Wren**, a night courier. Slip through a sleeping archive house, fetch
the wax seal, and leave by the green door — unseen.

[Play it on make.fun](https://make.fun/c/best-stealth-game-20261121-1759)

## How to play

Serve `game/` with any static server and open `index.html` in desktop Chrome
— no build step, no network, no files outside `game/`:

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

- **WASD / arrow keys** — move. **Shift** — run (fast, but loud: running
  footsteps carry and guards come to investigate the noise).
- **Click** a floor tile to walk there. **M** — mute. **R** — restart.
- **Crates** block a guard's sight. **Dark shadow patches** hide you unless a
  guard is right on top of you.
- A guard's **vision cone** fills its detection ring as it spots you:
  amber means suspicious (it turns to look), red means alarm (it chases).
  Break line of sight and the meter cools down — patience is a route.
- Grab the **wax seal** first: the exit door stays locked without it.

Two levels: **The Quiet Stacks** (three patrolling guards, winding corridors)
and **The Vault Floor** (a wide hall, three guards, nowhere to hide for long).

## Sounds

All sound is synthesized live with WebAudio — footsteps, guard steps that get
louder as a guard nears, the alert sting, pickup chimes. No audio files.

## Screenshots

The four images in `screenshots/` are real renders of this game's own code in
headless Chrome (staged with the game's own `?shot=` mode):

1. `1-start.png` — level 1 at the start, cover shot
2. `2-cone.png` — Wren hidden in shadow as a guard's cone sweeps past
3. `3-exit.png` — seal in hand, slipping out the green door
4. `4-level2.png` — the open Vault Floor, cone crossing the player

## Layout

- `game/index.html` — the page; `game/src/main.js` runs the game loop
- `game/src/config.js` — every tunable number in one place
- `game/src/levels.js` — the two levels (tile maps + guard patrols)
- `game/src/world.js` — map parsing, collision, line of sight
- `game/src/guards.js` — patrol AI, vision cones, detection meter
- `game/src/player.js` — Wren: movement, noise, pickups
- `game/src/audio.js` — WebAudio footsteps, stings and chimes
- `game/src/render.js` — canvas drawing, raycast vision cones, HUD
- `game/src/input.js` — keyboard and mouse
- `main.ts` — the make.fun entrypoint: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`

Original game: own idea, art, sounds and names. MIT licensed.
