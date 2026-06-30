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
car you steer up/down, and a working fire button. All art is generated in code,
so there are no binary assets yet.

Next up — **Milestone 1:** goblin enemies, shooting destroys them, Scrap drops
and auto-collects, and a finish flag. See the roadmap in `GAME_DESIGN.md`.

## Tech

- [Phaser 3](https://phaser.io/) — HTML5 2D game framework
- [Vite](https://vitejs.dev/) — dev server & bundler
- Plain JavaScript (ES modules)
