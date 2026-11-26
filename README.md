[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/indraHA01/makefun-best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/indraHA01/makefun-best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# ✈️ Skycourier — Aurora Isles

**Skycourier** is an original 3D chase-view bush-plane game built for the [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) **best-flight-game-20261126-0057** bounty ("Make the best flight game"). It plays offline in desktop Chrome from static files — no build step, no network request, no library. Every pixel is drawn in code (a true 3D projection rendered on a 2D canvas) and every sound is synthesized with WebAudio: no borrowed art, no copied levels, no commercial characters.

You are the only bush pilot in the Aurora Isles, a golden-hour archipelago under aurora bands. The mail must fly, whatever the weather — and the weather is a sunset that never quite ends.

## How to play

- **W/S or ↑/↓:** pitch the nose up / down
- **A/D or ←/→:** bank the wings (bank turns the nose)
- **Shift / Ctrl:** throttle up / down
- **F:** flaps · **G:** landing gear · **B:** drop a supply crate · **Space:** airbrake
- **Mouse:** hold the left button and steer with the cursor
- **P:** pause · **M:** mute · **R:** fly again · **1/2/3:** pick a sortie

## The three sorties

1. **Ring Training** — thread all 8 golden rings over Home Isle in order. Smooth turns beat fast ones.
2. **Island Hop** — carry the mailbag home: land at North Strip, then East Strip, then back on Home Strip. Three gentle touchdowns win the day. Ground crews refuel you between legs.
3. **Parcel Run** — three island outposts are waiting on supplies. Drop one crate on each painted circle (press **B** over the smoke column). Fuel is tight, so plan the route.

## Flying it honestly

- Speed chases the throttle; diving adds speed, climbing costs it.
- Below 19 m/s the wing stalls: the nose drops and the sink grows — push down, add power, recover.
- Landings are judged: on the strip, aligned, gear down, gentle descent. Come down too hard and the hull pays for it; ditch in the sea and the sortie is over.
- Fuel burns with the throttle. Run dry and you glide — find a strip.

## Run it locally

```sh
node serve.ts        # game/ is on http://localhost:8080
```

Screenshots are posed with `?shot=menu|flight|approach|drop` (see `shots.json`). Hand in with `MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Files

- `game/index.html` + `game/src/` — the game: `config.js` (tuning, islands, missions), `noise.js` (seeded randomness), `terrain.js` (the archipelago), `flight.js` (the flight model), `missions.js` (sorties and scoring), `render.js` (the 3D world), `plane.js` (the aircraft), `hud.js` (instruments, menus, debrief), `audio.js` (synthesized sound), `input.js` (keyboard and mouse), `shots.js` (posed screenshots), `main.js` (loop and state machine)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play-testing
- `screenshots/` — 4 real renders of the game's own code
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
