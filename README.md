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

## Play online (GitHub Pages)

The game is a built site — you can't point GitHub Pages at the raw source
(`index.html` imports Phaser as a module the browser can't resolve, so you'd
get a blank screen). The included workflow handles the build for you:

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or this branch) — the
   [`Deploy to GitHub Pages`](.github/workflows/deploy.yml) workflow builds the
   game and publishes it. Watch progress in the **Actions** tab.
4. When it finishes, your game is live at
   `https://<your-username>.github.io/<repo-name>/`.

Re-running happens automatically on every push.

## Controls

The car drives itself and **auto-fires**. You aim and jump.

| Action | Keyboard | Touch |
|--------|----------|-------|
| Aim up / down | ↑ / ↓ | Drag on the right half |
| Jump | Space or W | Tap the left half |

Aim up to shoot flyers, leap short goblins, and shoot lobbers' rocks out of the
air (or just jump them). Jump-over ground hazards are currently disabled.

**Mega enemies & turrets:** every now and then a big, tough **mega enemy** rolls
in with its own health bar. Defeat one and it bolts an extra **gun turret** onto
the roof of your car (up to three) — each fires straight ahead for extra
firepower, and they stick with you for the rest of the run.

**End-of-level horde:** when you reach the end of a level, a **horde** of enemies
swarms in all at once before the boss. Clear them for **bonus scrap** — with an
extra reward for a perfect clear (defeating every last one).

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

**Milestone 3 — Variety & combat (done):** the car now drives on the ground and
**jumps** (no more floating), and ↑/↓ **aim the weapon** instead of moving the
car. Four enemy types — **Runner**, **Brute** (big, tanky), **Lobber** (throws
arcing rocks you can shoot down or jump), and **Flyer** (winged, aim up to hit)
— plus a spiky **ground hazard** to jump. A **hearts** health system with
invulnerability blink, and a **Game Over → retry** screen (you keep your scrap).

**Milestone 4 — Boss & audio (done):** Level 1 now has a climax. At the end of
the run the **Goblin Drummer** mini-boss rolls in (summoning goblins), and
beating it brings out **Big Chief Gloop** — a wheelbarrow chief with a health
bar who hurls arcing cabbages (jump them or shoot them down) and goes enraged
below half health. Beating Gloop drops the **Sturdy Axle**, which unlocks the
Wooden Wagon in the Garage. Plus the first **audio**: a synthesized chiptune
loop and sound effects (shoot, jump, pickup, hits, explosions, win/lose
jingles) — all generated in code, no audio files — with a 🔊 **mute toggle**.

**Milestone 5 — The full adventure (done):** all **five levels** are in, each a
distinct biome (data-driven from `src/data/levels.js`) with recoloured enemies,
its own hazard, a mini-boss, and a boss:

| Level | Biome | Boss | Unlocks |
|-------|-------|------|---------|
| 1 | Goblin Greenwood 🌳 | Big Chief Gloop | Wooden Wagon |
| 2 | Zombie Flats 🧟 | Mayor Moldy | Iron Buggy |
| 3 | Bandit Badlands 🏜️ | Sheriff Snaketail | Armored Truck |
| 4 | Frostbite Peaks ❄️ | Frost King Yeti | Battle Tank |
| 5 | Volcano Fortress 🌋 | King Krang | 🏆 Champion! |

The upgrade tree is complete: **5 car bodies** (Cardboard Cart → Wooden Wagon →
Iron Buggy → Armored Truck → Battle Tank, each gated behind a boss drop) and
**5 weapons** (Bow → Crossbow → Catapult → Cannon → Rocket). Beating the final
boss rolls the victory/Champion ending. It's a complete game — all art and
audio still generated in code, no binary assets.

Possible next steps: cosmetic sticker shop, a Little-Kid (no-death) mode toggle,
real sprite/audio assets, and a title screen. See `GAME_DESIGN.md`.

## Tech

- [Phaser 3](https://phaser.io/) — HTML5 2D game framework
- [Vite](https://vitejs.dev/) — dev server & bundler
- Plain JavaScript (ES modules)
