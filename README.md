# Rampage 🚗💥

A kid-friendly side-scrolling car combat & upgrade game. Drive a junky
cardboard car across five wild lands, smash silly monsters, collect supplies,
and upgrade your way to a rocket-firing battle tank.

See **[GAME_DESIGN.md](./GAME_DESIGN.md)** for the full design plan (cars,
weapons, enemies, all five levels, and the build roadmap).

## Run it

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install     # one-time
npm run dev      # start the dev server, then open the printed URL
```

Build a shareable static version:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move up / down | ↑ / ↓ or W / S | Drag finger |
| Fire | Space (hold to autofire) | Tap / hold |

## Status

**Milestone 0 — Skeleton (done):** auto-scrolling parallax world, a cardboard
car you steer up/down, and a working fire button.

**Milestone 1 — Core loop (done):** goblins run in from the right, your shots
destroy them with a cartoony poof, defeated goblins drop Scrap that auto-homes
into a counter, a progress bar tracks your run, and a checkered finish flag
rolls in to end the level.

**Milestone 2 — The Garage (done):** finishing a level rolls you into Bolt the
robot dog's Garage. Spend Scrap on a new **car body** (Cardboard Cart → Wooden
Wagon → Iron Buggy) or **weapon** (Bow → Crossbow → Catapult) — the car preview
and your real in-game stats (fire rate, projectile, damage) change with each
pick. Affordable items glow, owned ones can be re-equipped for free, and
everything saves to `localStorage`, so progress survives a refresh. Hit
**ROLL OUT!** to start the next level with your upgraded ride. Art is still all
generated in code — no binary assets yet.

Next up — **Milestone 3:** enemy variety (lobbers, brutes, flyers), jumping,
and a terrain hazard, building toward the full Level 1 boss fight.
See the roadmap in `GAME_DESIGN.md`.

## Tech

- [Phaser 3](https://phaser.io/) — HTML5 2D game framework
- [Vite](https://vitejs.dev/) — dev server & bundler
- Plain JavaScript (ES modules)
