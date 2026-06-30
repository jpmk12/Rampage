# Adding Real Art to Rampage

The game ships with art drawn in code, but you can replace any piece with a real
sprite and the game picks it up automatically — no gameplay code changes.

## How to add a sprite (3 steps)

1. Put a **PNG with a transparent background** in `public/assets/sprites/`.
2. Open `src/data/assets.js` and **uncomment (or add) the line** for that piece.
   The key on the left must match exactly.
3. Reload. That's it — anything you haven't replaced keeps its placeholder, so
   you can do it a few at a time.

> Prefer to hand me the files? Drop them in `public/assets/sprites/`, push, and
> tell me the names — I'll register and fine-tune them.

## Format rules (important for it to line up)

- **PNG, transparent background.**
- **Enemies and bosses face LEFT** (they charge the car). **Cars face RIGHT.**
- **Stand the character on the bottom edge** of the image (trim empty space
  below the feet/wheels) so it sits on the ground without code tweaks.
- Match the **size** below where you can. A different size still works — I can
  nudge offsets — but matching avoids that.

## The art list (keys, sizes, what it is)

| Key(s) | Size (px) | What it is |
|--------|-----------|------------|
| `body-cardboard`, `body-wood`, `body-iron`, `body-armored`, `body-tank` | 124×92 | the 5 car bodies (wheels on bottom, facing right) |
| `runner-1`…`runner-5` | ~64×66 | small charging enemy, recolored per biome |
| `brute-1`…`brute-5` | ~96×96 | big tanky enemy |
| `lobber-1`…`lobber-5` | ~62×74 | enemy that throws |
| `flyer-1`…`flyer-5` | ~74×52 | winged enemy |
| `drummer`, `gloop`, `boss-moldy`, `boss-snaketail`, `boss-yeti`, `boss-krang` | ~150×140 | the bosses |
| `sky-1`…`sky-5` | 960×540 | full-screen biome sky |
| `hills-far-1`…`-5`, `hills-near-1`…`-5` | 360×150 / 300×210 | parallax hills (should tile horizontally) |
| `ground-1`…`ground-5` | 256×90 | road strip (tiles horizontally) |
| `wpn-bow/crossbow/catapult/cannon/rocket` | ~40×32 | weapon on the car (mounts by its left-center) |
| `shot-bow/crossbow/catapult/cannon/rocket` | small | projectiles |
| `scrap` 26×26 · `heart`/`heart-empty` 30×30 · `flag` 76×190 · `cloud` · `sun` · `turret` · `bolt` (garage dog) · `axle` | — | pickups / UI / fx |

The 1–5 suffix is the biome: 1 Greenwood, 2 Zombie Flats, 3 Bandit Badlands,
4 Frostbite Peaks, 5 Volcano Fortress. You can reuse one image across biomes
(e.g. one goblin for all `runner-N`) or make each unique.

## Where to get matching art (free)

**Pick ONE source/style for a cohesive look** — mixing styles tends to look
worse than the uniform placeholders.

- **Kenney.nl** — *the best starting point.* Hundreds of packs, all **CC0 (public
  domain, no attribution needed)**. Useful packs:
  - Cars: *Racing Pack*, *Car Kit*, *Pixel Vehicle Pack*
  - Enemies: *Monster Builder Pack*, *Toon Characters*, *Tiny Dungeon*
  - Backgrounds: *Background Elements*, *Nature Pack*, *Pixel Platformer*
  - FX/UI: *Particle Pack*, *UI Pack*, *Game Icons*
- **itch.io → Game assets** (filter **Free**, check each pack's license) —
  huge variety of cartoon monster/vehicle/background packs. Search e.g.
  "free monster sprites", "free side-view car", "free parallax background".
- **OpenGameArt.org** — lots of **CC0 / CC-BY** sprites and tilesets.
- **Game-icons.net** — 4,000+ clean icons (**CC-BY 3.0**), great for hearts,
  coins, gears, UI.
- **CraftPix.net** (free section) — high quality, but **read the license**
  (many free packs require attribution and forbid redistribution).
- **AI image tools** (for unique bosses) — generate with a consistent prompt,
  e.g. *"side-view cartoon goblin boss, facing left, flat colors, thick
  outline, transparent background"*, then remove the background.

When you use CC-BY or Apache assets, keep the credits — add them to the
**Credits** section of the main `README.md` (we already credit the fonts there).

## Suggested order (most visual impact first)

1. **Car bodies** (you stare at these the whole game) and the **5 enemies**.
2. **Backgrounds** (sky + hills + ground) — instantly changes each biome's feel.
3. **Bosses**.
4. UI/pickups (hearts, coin, flag) and weapons/projectiles.

Replace the 5 bodies + 4 base enemies + 5 skies first and the game will already
look dramatically more "finished."
