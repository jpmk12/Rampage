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

The **authoritative list lives in `src/data/assetManifest.js`** (97 keys). A
generated snapshot is in [`asset-manifest.json`](./asset-manifest.json), and you
can print a checklist any time with `node scripts/asset-manifest.mjs`. Summary:

| Key(s) | Size (px) | Anchor | What it is |
|--------|-----------|--------|------------|
| `body-cardboard/wood/iron/armored/tank` | 124×92 | bottom | the 5 car bodies (wheels on bottom, face **right**) |
| `wpn-bow/crossbow/catapult/cannon/rocket` | ~40×32 | left-center | weapon on the car (pivots at its left edge) |
| `shot-bow/crossbow/catapult/cannon/rocket` | 18–28 wide | center | player projectiles |
| `runner-1…5` | 64×66 | bottom | small quick enemy — **also the Charger & split Runts** |
| `brute-1…5` | 96×96 | bottom | big tanky enemy — **also the Shield enemy, mega & minis 2–5** |
| `lobber-1…5` | 62×74 | bottom | throws rocks — **also the Splitter** |
| `flyer-1…5` | 74×52 | center | winged flyer — **also the Diver** |
| `drummer` 96×104 · `gloop` 168×132 · `boss-moldy` 150×150 · `boss-snaketail` 160×140 · `boss-yeti` 150×140 · `boss-krang` 160×140 | — | bottom | the bosses (face **left**) |
| `sky-1…5` | 960×540 | top-left | full-screen biome sky |
| `mtns-1…5` | 480×200 | top-left · **tiles** | distant hazy mountains (furthest layer) |
| `hills-far-1…5` / `hills-near-1…5` | 360×150 / 300×210 | top-left · **tiles** | parallax hills |
| `ground-1…5` | 256×90 | top-left · **tiles** | road/ground strip |
| `prop-1…5` | 64×96 | bottom | scenery that rolls past (tree/dead tree/cactus/pine/rock) |
| `proj-1…5` 30×30 · `cabbage` 32×32 · `enemy-rock` 22×22 · `hazard-1…5` 76×56 | — | center/bottom | enemy projectiles & (unused) hazard art |
| `scrap` 26×26 · `heart`/`heart-empty` 30×30 · `crate`\* 30×30 · `flag` 76×190 · `axle` 56×32 | — | center/bottom | pickups & UI |
| `turret` 52×30 · `wheel-spin`\*\* 36×36 · `shield-plate`\* 26×54 · `bolt` 86×76 | — | — | roof turret · spinning wheel · shield plate · garage dog |
| `cloud`\* 150×64 · `sun`\* 150×150 · `puff`\* 24×24 · `flake`\* 10×10 | — | center | sky & particle FX |

\* **Tinted in code** (recoloured per biome/pickup) — supply a **white/greyscale**
image so the tint still reads. \*\* `wheel-spin` **rotates**, so keep it round and
centered.

The **1–5 suffix is the biome:** 1 Greenwood, 2 Zombie Flats, 3 Bandit Badlands,
4 Frostbite Peaks, 5 Volcano Fortress. You can reuse one image across biomes
(e.g. one goblin for all `runner-N`) or make each unique. Because the new enemy
**behaviours reuse existing art** (charger=runner, shield=brute, splitter=lobber,
diver=flyer), you do **not** need separate sprites for them.

## Pipeline tools

- **`src/data/assetManifest.js`** — the source of truth (key, size, anchor,
  facing, tiling, tinted, description). Edit here if art specs change.
- **`node scripts/asset-manifest.mjs`** — regenerates `docs/asset-manifest.json`
  and prints a per-group checklist.
- **Size check** — when you drop a PNG in and register it, the loader logs a
  console warning if the file is an unknown key or the wrong size.
- **`__ASSETS__()`** — run in the browser console to audit every sprite: expected
  vs actual size and whether a custom file is in use
  (`console.table(__ASSETS__())`, or `__ASSETS__().filter(a => a.custom)`).

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
