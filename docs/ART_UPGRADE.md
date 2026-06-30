# Taking Rampage's Graphics to the Next Level

Right now **all art and audio are generated in code** (in `BootScene.js` and
`audio/Sound.js`) — great for prototyping with zero asset files, but it's the
main ceiling on how the game looks. The good news: the codebase is already
structured to make upgrading easy. Every sprite is referenced by a **texture
key** (`body-iron`, `runner-2`, `boss-gloop`, …). Swapping placeholder art for
real assets is mostly "load a file under the same key instead of drawing it."

Below is a prioritized plan, roughly in order of visual payoff per unit of
effort.

---

## 1. Replace placeholder shapes with real sprite assets ⭐ biggest win

The single highest-impact change. Move from `Graphics.generateTexture()` to
loading actual artwork.

- **Pick a coherent style.** For this audience (kids), a **chunky, bright,
  hand-drawn/vector look** (think *Angry Birds*, *Crossy Road*, *Rayman*) reads
  best. Pixel art is also great and cheaper to animate. Pick one and commit.
- **Where to get art (cheapest → most polished):**
  - **Free CC0 packs** — [Kenney.nl](https://kenney.nl) (vehicles, platformer
    packs, particles, UI), [itch.io](https://itch.io/game-assets/free),
    [OpenGameArt](https://opengameart.org). Often enough to reskin the whole
    game for free.
  - **AI-generated sprites** — generate consistent characters/props, then clean
    them up. Good for unique bosses.
  - **Commission an artist** — for a unified, original look (a few hundred $ for
    a cohesive set; this is what makes a game feel "real").
- **How it plugs in:** in `BootScene.preload()`, load a **texture atlas**
  (one image + JSON) and replace the `makeX()` calls with the same keys:
  ```js
  // before: this.makeBodyIron('body-iron')
  // after:  (atlas frame named 'body-iron' loaded in preload)
  this.load.atlas('game', 'assets/game.png', 'assets/game.json');
  ```
  Because the rest of the code only uses keys, **GameScene/Garage don't change.**

---

## 2. Animate everything (spritesheets)

Static sprites + tweens get us surprisingly far, but real frame animation is the
difference between "placeholder" and "alive."

- **Car:** spinning wheels, bouncing suspension, exhaust smoke, turret recoil.
- **Enemies:** walk/shamble cycles, a wind-up before a lobber throws, a flinch
  on hit, a squash on defeat.
- **Bosses:** telegraphed attack animations, phase transitions, a death sequence.
- **FX:** a proper explosion spritesheet, a scrap "sparkle/collect" anim.

Phaser: `this.anims.create({ key, frames, frameRate, repeat })` then
`sprite.play('run')`. Tools: **Aseprite** (pixel) or after-effects/spine for
vector/skeletal.

---

## 3. Particle systems for atmosphere ⭐ high ROI

We hand-roll dust/poofs today. Phaser's `add.particles()` emitter does this far
better and unlocks **per-biome weather**, which instantly sells each world:

- **Greenwood:** floating pollen/leaves, dust motes.
- **Zombie Flats:** drifting fog banks, fireflies, swamp bubbles.
- **Bandit Badlands:** blowing sand, heat shimmer, tumbleweeds.
- **Frostbite Peaks:** falling snow, breath puffs, sparkle on ice.
- **Volcano Fortress:** rising embers, smoke, ash, lava-glow flicker.

Plus better **explosions, muzzle smoke, scrap sparkles, jump dust, and a speed
trail** behind the car.

---

## 4. Post-processing & lighting (shaders)

Phaser supports post-FX pipelines and a 2D lighting system for a big "production"
jump:

- **Per-biome color grading / vignette** (warm desert, cold peaks, hellish red
  volcano) via a post-FX shader — much richer than flat tints.
- **Bloom/glow** on the sun, lava, the tank's power core, glowing eyes, and
  projectiles.
- **Light2D + normal maps** so the car/enemies are lit by the sun, lava, or
  muzzle flashes (dynamic shadows and highlights).
- **Subtle screen warp** for heat haze / explosions.

---

## 5. Layered, textured backgrounds & props

Move from 3 flat parallax bands to a richer, deeper scene:

- **More parallax layers** (4–6): distant mountains, mid hills, tree/prop line,
  near foreground occluders the car passes behind.
- **Biome props** layered in: trees, gravestones, cacti, ice spikes, lava
  geysers, fortress walls, banners — scrolling at depth-appropriate speeds.
- **Textured ground** (tiled detail, not a flat color) with foreground grass/rock
  tufts in front for depth.
- **Animated background elements**: waving grass, flickering lava, twinkling
  stars, a parallax aurora in the snow level.

---

## 6. Game-feel "juice"

Cheap to add, disproportionately fun:

- **Hit-stop / freeze-frames** (pause ~50ms on a big hit or boss kill).
- **Squash & stretch** on jump/land, and on enemies.
- **Camera punch/zoom** on boss hits and the final blow; a slow-mo final hit.
- **Floating damage numbers** and **score/combo popups** (e.g., "x5 HORDE!").
- **Controller rumble** (gamepad) on hits and explosions.

---

## 7. UI, typography & screens

- **A real display font** — a chunky rounded typeface (Google Fonts, or a
  **bitmap font** via `this.load.bitmapFont` for crisp scaling) instead of
  system-ui. This alone makes the HUD look intentional.
- **A title screen** with the logo, a big PLAY button, and the car idling.
- **Polished HUD**: framed panels, animated hearts (pulse on damage), weapon/
  turret icons, an animated scrap counter.
- **Menu/garage glow-ups**: card hover shine, buy "ka-chunk" with sparks,
  a rotating 3/4 car turntable in the preview.

---

## 8. Audio to match (materials = sound too)

- Replace the synthesized `Sound.js` with **real SFX** (Kenney/freesound) and a
  **recorded/tracked music loop per biome**.
- Add **layered music** (calm travel → intense boss), **ducking** (music dips
  when the boss roars), and **spatial panning** for off-screen enemies.

---

## Suggested pipeline / tools

- **Aseprite** (pixel) or **Affinity/Illustrator + Spine** (vector/skeletal) for art.
- **TexturePacker** (or free `free-tex-packer`) to bundle sprites into atlases
  → fewer draw calls, faster load.
- **A shared palette file** so every biome/enemy/UI stays cohesive.
- **A loading scene** with a progress bar once real assets add load time.
- Keep the **texture-key contract** — author assets to the existing key names and
  the gameplay code keeps working untouched.

---

## Recommended first three steps (most "wow" per effort)

1. **Reskin with a free Kenney/itch pack** (or a commissioned set) loaded as an
   atlas under the current keys — instant whole-game facelift.
2. **Add particle weather + better explosions/sparkles** — huge atmosphere gain.
3. **Add a bitmap display font + a title screen + per-biome color-grade shader**
   — makes it feel like a finished, shippable product.

Everything here builds on the current structure; none of it requires rewriting
the gameplay.
