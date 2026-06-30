# Rampage — AI Art Prompt Pack

Prompts to generate a cohesive family of sprites for the game with an AI image
tool. Every asset here maps to a texture key the game already uses
(see [ASSETS.md](./ASSETS.md)), so once you generate, clean up, and drop the
files in, the game uses them automatically.

---

## Which AI tool?

There's no single "best," but for a **consistent pack of game sprites with
transparent backgrounds**, here's how the main options stack up:

| Tool | Why pick it | Watch out for |
|------|-------------|---------------|
| **Scenario.gg** ⭐ best for *game packs* | Built for game studios: train a custom model on ONE style, then crank out a whole consistent set; native transparent PNG; asset-focused workflow. | Subscription; small learning curve to train a model. |
| **Leonardo.ai** ⭐ easiest with transparency | Game-art focused, **transparent PNG** generation, "Image Guidance" to lock a look, generous free tier. | Consistency across many images takes effort (use one trained Element/style). |
| **Midjourney (v6.1/v7)** ⭐ best looks | The most attractive, cohesive cartoon art; **`--sref`** locks a style across every prompt and **`--cref`** keeps a character consistent. | **No transparent output** — you must remove backgrounds afterward; not sprite-specific. |
| **OpenAI GPT-Image (ChatGPT / API)** | Excellent prompt-following, **native transparent backgrounds**, easy to iterate conversationally and keep a series consistent. | Style is a touch more "illustration"; fewer art-specific knobs. |
| **Stable Diffusion + LoRA (ComfyUI)** | Ultimate control and consistency (train a style LoRA, "Layer Diffusion" for transparency). | Technical setup. |

**My recommendation:**
- Want the **easiest path with transparency built in** → **Leonardo.ai** (or
  **GPT-Image** in ChatGPT).
- Want the **most consistent large pack** → **Scenario.gg** (train one style).
- Want the **best-looking art** and don't mind removing backgrounds →
  **Midjourney** with a single `--sref` style code on every prompt.

Whatever you pick, **the #1 rule for a cohesive game is: lock ONE style and
reuse it for every asset** (a trained model, a saved style, or the same
`--sref` code). Mixing styles looks worse than uniform placeholders.

---

## How to use this file

1. Pick a tool and **generate one "hero" image first** (try a car or the main
   goblin). Once you love the style, **lock it** (save the style / grab the
   `--sref` code / train the model) and use it for everything below.
2. For each asset, paste **`STYLE` + the asset's prompt + `PARAMS`**.
3. Clean up each result (see the **Export checklist** at the bottom): remove
   background, trim, resize, name it to its **key**, drop in
   `public/assets/sprites/`, and register it in `src/data/assets.js`.

### STYLE (paste this at the start of every prompt)

```
2D side-scroller mobile game sprite, chunky cartoon style, bold flat colors with
soft cel shading, thick dark outline, rounded friendly shapes, big expressive
eyes, playful and kid-friendly (silly, NOT scary), clean and high-contrast, full
body, centered, isolated on a plain flat white background, no text, no drop
shadow
```

### PARAMS

- **Midjourney:** add `--style raw --ar 1:1 --v 6.1` and your locked
  `--sref <code>` (and `--cref <url>` for variants of the same character).
- **Leonardo / GPT-Image:** set **Transparent PNG / transparent background ON**,
  square (1:1), and reuse your saved style / model each time.
- **Facing:** **cars face RIGHT**; **enemies and bosses face LEFT** (they charge
  the car).

---

## 1) Cars  (face RIGHT, side view, wheels on the ground, NO weapon/turret — those are separate sprites)

- **`body-cardboard`** — a rickety toy car made from a cardboard box on two
  little wooden wheels, a tiny hand-drawn triangle flag on a stick, wobbly and
  cute, empty flat top (room to bolt a weapon on), side view, facing right.
- **`body-wood`** — a sturdier wooden wagon car built from planks and rope with
  a small flag, slightly bigger wheels, side view, facing right.
- **`body-iron`** — a riveted iron go-kart buggy with a small metal cab/
  windshield and a flag, tougher looking, side view, facing right.
- **`body-armored`** — a heavy armored pickup truck with bolted metal plates,
  bull bars at the front, chunky tires, a flag, side view, facing right.
- **`body-tank`** — a friendly cartoon battle tank with caterpillar treads, a
  rounded turret base, and a little flag on an antenna, side view, facing right.

> Keep the 5 cars clearly in the **same family**, each one a visible "glow-up"
> of the last (cardboard → wood → iron → armored → tank).

## 2) Enemies  (face LEFT, full body standing/flying, one per biome × 4 roles)

Keep the **same 4 body shapes across all biomes**, just re-skin the creature so
each world feels different. Roles:
- **runner** = small, quick, holding a little club.
- **brute** = big and bulky, with tusks, looks tough.
- **lobber** = mid-size, holding a rock/object overhead to throw.
- **flyer** = small with wings, flying.

**Biome 1 — Goblin Greenwood (keys `*-1`):** green goblins, big goofy eyes,
pointy ears.
- `runner-1` small green goblin with a club · `brute-1` huge bulky green goblin
  ogre with tusks · `lobber-1` green goblin holding a boulder overhead ·
  `flyer-1` little green winged goblin imp, flying.

**Biome 2 — Zombie Flats (keys `*-2`):** silly cartoon zombies, sickly
green-grey skin, stitches, yellow eyes — goofy not gross.
- `runner-2` small shambling zombie · `brute-2` big bloated zombie brute ·
  `lobber-2` zombie holding a tombstone chunk overhead · `flyer-2` little winged
  zombie bat-imp.

**Biome 3 — Bandit Badlands (keys `*-3`):** desert critter-bandits, tan/brown
fur, bandanas and little cowboy hats.
- `runner-3` small scrappy critter bandit with a club · `brute-3` big bruiser
  bandit · `lobber-3` bandit holding a stick of dynamite overhead · `flyer-3`
  little vulture-imp, flying.

**Biome 4 — Frostbite Peaks (keys `*-4`):** blue snow imps and mini-yetis,
fluffy, frosty.
- `runner-4` small blue snow imp with an icicle club · `brute-4` chunky white-
  blue mini-yeti with tusks · `lobber-4` snow imp holding a snowball overhead ·
  `flyer-4` little winged ice sprite, flying.

**Biome 5 — Volcano Fortress (keys `*-5`):** grey mecha-goblins, riveted metal
bodies, glowing red eyes.
- `runner-5` small mecha-goblin with a metal club · `brute-5` big armored mecha-
  goblin brute · `lobber-5` mecha-goblin holding a bomb overhead · `flyer-5`
  little jet-pack mecha-imp, flying.

## 3) Bosses  (face LEFT, big, comical-menacing, kid-friendly)

- **`gloop`** — "Big Chief Gloop": a fat jolly goblin chief sitting in a wooden
  wheelbarrow, feathered chief headdress, holding a cabbage to throw, big belly,
  side view, facing left.
- **`drummer`** — "Goblin Drummer": a goblin banging a big round war drum with
  two sticks, rallying pose, side view, facing left.
- **`boss-moldy`** — "Mayor Moldy": a tall lanky cartoon zombie mayor in a black
  top hat and a red mayoral sash, stitched grin, goofy not scary, side view,
  facing left.
- **`boss-snaketail`** — "Sheriff Snaketail": a critter-bandit sheriff in a
  cowboy hat riding on the back of a giant cartoon scorpion with a curled
  stinger tail, side view, facing left.
- **`boss-yeti`** — "Frost King Yeti": a big fluffy white-and-blue yeti wearing a
  jagged ice crown, tough but friendly, side view, facing left.
- **`boss-krang`** — "King Krang": the final boss, a goblin warlord piloting a
  hulking riveted mecha war-machine with horns, shoulder cannons, and glowing
  red eyes; imposing but still cartoony, side view, facing left.

## 4) Backgrounds  (no characters; landscape/scenery only)

For each biome (N = 1..5), generate three layers. Hills and ground must
**tile seamlessly left-to-right** (ask for "seamless horizontally tileable,
edges match"). I can help fix any seams.

- **`sky-N`** — a simple flat cartoon gradient sky, no characters, 16:9.
  - 1 bright blue sunny day · 2 purple dusk with a pale moon · 3 warm
    orange desert sky · 4 pale icy blue sky · 5 dark smoky red volcano sky.
- **`hills-far-N`** / **`hills-near-N`** — a seamless, horizontally tileable
  layer of rounded rolling hills (silhouette), flat cartoon colors, side-
  scroller parallax background, transparent or sky-matching top.
  - 1 green grassy hills · 2 murky swamp mounds · 3 sandy desert dunes ·
    4 snowy hills · 5 dark charred volcanic mountains.
- **`ground-N`** — a seamless, horizontally tileable ground strip with a road,
  top-edge visible, flat cartoon colors.
  - 1 dirt road with grass edge · 2 swamp mud · 3 desert sand track ·
    4 snowy road · 5 cracked dark lava-rock road.

## 5) Pickups, UI & FX  (small, clean, transparent)

- **`scrap`** — a shiny gold nut/bolt (or gold coin) collectible, glossy
  highlight, simple, icon-like.
- **`heart`** — a glossy cartoon red heart UI icon. **`heart-empty`** — the same
  heart as an empty dark-grey outline.
- **`flag`** — a black-and-white checkered finish flag on a tall pole, planted in
  a little mound at the base.
- **`turret`** — a small chunky cartoon gun turret (a domed base with a short
  barrel pointing right) designed to bolt onto a car roof, side view.
- **`bolt`** — a cute friendly little robot dog mascot (the garage mechanic),
  warm yellow metal, antenna ear, screen eyes, side view.
- **`cloud`** — a single fluffy flat cartoon cloud. **`sun`** — a simple soft
  round cartoon sun with a gentle glow.
- **`cabbage`** — a round leafy green cabbage (boss throws these).

---

## Consistency tips

- **Lock the style once** and reuse it everywhere (trained model / saved style /
  same `--sref`). This matters more than any single prompt.
- For the **enemy biome variants**, keep the *same pose and body shape* and only
  change the creature/skin/colors — generate the Greenwood set first, then say
  "same character, but a zombie / bandit / snow imp / mecha version."
- Generate a few options per asset and keep the one whose **proportions and
  outline weight** match the rest.
- Keep all characters at a **similar size within the frame** so they feel like
  one set.

## Export checklist (per file)

1. **Remove the background** if it isn't already transparent (Photoshop,
   Photopea (free), remove.bg, or Leonardo/GPT transparent output).
2. **Trim** empty space; for characters, sit them on the **bottom edge** of the
   canvas (cars: wheels at the bottom; enemies: feet at the bottom).
3. **Resize** to the size in [ASSETS.md](./ASSETS.md) (or close — I can adjust
   offsets if needed).
4. **Name** the file after its key (e.g. `body-tank.png`, `runner-1.png`,
   `boss-krang.png`) and put it in `public/assets/sprites/`.
5. **Register** it in `src/data/assets.js` (uncomment its line), or just send me
   the filenames and I'll wire and fine-tune them.
