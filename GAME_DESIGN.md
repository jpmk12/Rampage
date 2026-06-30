# RAMPAGE — Game Design Plan

> A kid-friendly side-scrolling car combat & upgrade game.
> You drive across the land in a rickety little car, smash goblins and
> zombie-ish baddies, scoop up the supplies they drop, and bolt on bigger
> cars and better weapons until you're rolling a rocket-firing tank.

---

## 1. The One-Sentence Pitch

*"Build a junky cardboard car into an unstoppable war machine by defeating
waves of silly monsters across five wild lands."*

Target players: kids (roughly ages 5–11) and the grown-ups playing with them.
Tone: cartoony, goofy, adventurous. Bad guys are clearly "bad guys" but
never gory or genuinely scary — think Saturday-morning cartoon, not horror.

---

## 2. Core Gameplay Loop

```
   DRIVE  ─►  FIGHT  ─►  COLLECT  ─►  REACH BASE  ─►  UPGRADE  ─►  next level
   (auto-     (shoot     (grab the    (end-of-       (spend
    scroll)    enemies)   supplies     level         supplies on
                          they drop)   garage)        car + weapons)
```

1. **Drive** — The car auto-moves to the right (kids don't have to manage a
   gas pedal). The player controls vertical position / lane, jumping, and
   aiming/firing the weapon.
2. **Fight** — Enemies approach from the right (and occasionally from above or
   behind). The player shoots them with the current weapon.
3. **Collect** — Defeated enemies and broken crates drop **Scrap** (the
   currency) and occasional **special parts**. Collecting is automatic when
   you drive over a pickup, so little hands don't have to be precise.
4. **Reach the Base** — Each level ends at a friendly **Garage / Pit Stop**.
5. **Upgrade** — At the garage, spend Scrap to upgrade the car body and swap or
   improve weapons, then roll into the next level.

A level takes roughly **3–5 minutes** so a full play session (all 5 levels) is
about **20–30 minutes** — a good "one sitting" length for kids.

---

## 3. Controls (simple by design)

| Action            | Keyboard           | Gamepad        | Touch                 |
|-------------------|--------------------|----------------|-----------------------|
| Move up / down    | ↑ / ↓ (or W / S)   | Left stick     | Drag finger up/down   |
| Fire weapon       | Space (hold to autofire) | A / RT   | Tap / hold right side |
| Jump / hop        | ↑↑ or Z            | B              | Swipe up              |
| Special / Horn    | X                  | Y              | Two-finger tap        |
| Pause             | Esc / P            | Start          | Pause button          |

Design rules:
- **No fail-by-confusion.** One main "shoot" button does 90% of the game.
- **Hold-to-autofire** so kids aren't mashing.
- **Generous hitboxes** on enemies, **forgiving hitbox** on the player car.
- Optional **"Little Kid Mode"** toggle: the car can't be destroyed, it just
  gets briefly stunned, so younger players never see a hard "Game Over."

---

## 4. Progression & Economy

### Currency: **Scrap**
- Earned by defeating enemies, smashing crates/barrels, and finishing a level.
- Spent at the end-of-level **Garage** on car bodies, weapons, and power-ups.

### Special Parts (rarer, themed drops)
- Found from **mini-bosses** and hidden crates.
- Used to unlock the *next car tier* or a *signature weapon* (so progress feels
  earned, not just grindy). Example: beating Level 1's boss drops the
  **"Sturdy Axle"** that lets you build the wooden car.

### The Upgrade Tree (high level)

```
CAR BODY (defense + health + slots)      WEAPON (offense)         UTILITY (power-ups)
  Cardboard Cart ─► Wooden Wagon ─►        Bow & Arrow ─►            Speed Boost
  Iron Buggy ─► Armored Truck ─►           Catapult ─►               Extra Health
  Battle Tank                              Crossbow Turret ─►        Shield Bubble
                                           Cannon / Gun ─►           Magnet (auto-collect)
                                           Rocket Launcher           Auto-Repair
```

Each car body has **weapon slots** and **utility slots** that increase as you
upgrade — so a better car literally lets you carry more firepower and gadgets.

### Difficulty Curve
- Enemies get tougher and more numerous each level, but the player's power
  grows faster *if* they collect well — rewarding engagement without punishing
  little kids who just want to drive and shoot.
- **Catch-up help:** if a player loses a life, the next garage gives a small
  free Scrap bonus so they're never permanently stuck.

---

## 5. The Cars (Vehicle Progression)

| Tier | Car              | Look / Feel                              | Health | Weapon Slots | Utility Slots | Special                          |
|------|------------------|------------------------------------------|--------|--------------|---------------|----------------------------------|
| 1    | **Cardboard Cart** | Wobbly box on wheels, crayon-drawn details | Low (3) | 1 | 0 | Cheap, floaty hop                |
| 2    | **Wooden Wagon**   | Planks & rope, little flag                | 5      | 1 | 1 | Sturdier, can shrug off 1 hit    |
| 3    | **Iron Buggy**     | Riveted metal go-kart                     | 8      | 2 | 1 | Faster, can ram weak enemies     |
| 4    | **Armored Truck**  | Big plated pickup, bull bars              | 12     | 2 | 2 | Ram damage, knockback            |
| 5    | **Battle Tank**    | Treads, turret, antenna with a kid's flag | 18     | 3 | 3 | Heavy ram, brief invulnerable dash |

Notes:
- Each tier is a clear **visual glow-up** — kids should instantly see "my car
  got cooler."
- Bodies are **cumulative in feel** (more health, more slots), but you can keep
  a favorite weapon when you upgrade the body.
- Optional cosmetic **paint/sticker shop** (flames, stars, eyeballs) bought with
  spare Scrap — pure fun, no stats.

---

## 6. The Weapons

| Weapon              | Unlocks ~ | Fire Style                         | Feel                                  |
|---------------------|-----------|------------------------------------|---------------------------------------|
| **Bow & Arrow**     | Start     | Single arrow, arcs slightly        | Plinky, satisfying *thwip*            |
| **Crossbow Turret** | Lvl 1–2   | Faster straight bolts              | Reliable rapid fire                   |
| **Catapult**        | Lvl 2     | Lobbed boulder, splash on landing  | Great vs. clustered ground enemies    |
| **Spike Cannon**    | Lvl 3     | Short-range scattershot            | Shotgun-style crowd clearer           |
| **Cannon / Gun**    | Lvl 3–4   | Straight powerful shots            | Punchy, dependable                    |
| **Rocket Launcher** | Lvl 4–5   | Homing-ish rockets, big boom       | The big payoff weapon                 |
| **Bonus: Bubble Blaster** | hidden | Goofy bubbles that trap enemies | Silly, non-violent alternate          |

Weapon design rules:
- Every weapon has a **distinct sound and muzzle effect** so firing feels good.
- Weapons can be **leveled up** (e.g., Bow Lv2 fires two arrows) as a cheaper
  alternative to buying the next weapon — gives the player choices.
- A car with multiple weapon slots can **mix** (e.g., catapult for ground +
  crossbow for air).

---

## 7. The Utility Power-Ups

| Power-Up        | Effect                                                        |
|-----------------|---------------------------------------------------------------|
| **Speed Boost** | Move/scroll faster; useful for dodging                        |
| **Extra Health**| +Hearts to the car body                                       |
| **Shield Bubble**| Absorbs the next few hits; visible bubble around the car     |
| **Magnet**      | Auto-pulls nearby Scrap and pickups toward the car            |
| **Auto-Repair** | Slowly regenerates a heart over time                          |
| **Wheel Spikes**| Ram damage to enemies you touch                               |
| **Horn Blast**  | Special button: a shockwave that pushes back / stuns enemies  |

Power-ups occupy **utility slots**, so part of the strategy is choosing *which*
gadgets to run on a given car — a gentle introduction to "build" decisions.

---

## 8. The Enemies

All enemies are **cartoony and non-scary** — bright colors, big silly eyes,
exaggerated reactions, comedic "poof" when defeated (no blood, they just
tumble, deflate, or turn into a pile of harmless goo/leaves).

### Recurring archetypes (re-skinned per level)
- **Runner** — small, fast, charges the car. Weak.
- **Lobber** — throws something (rock, fruit, bone) in an arc from a distance.
- **Brute** — big, slow, takes several hits, shoves the car.
- **Flyer** — swoops in from above; needs upward-aimed or arcing shots.
- **Shielder** — carries a board/lid; must be hit from a different angle or
  rammed to break the shield.
- **Mini-Boss / Boss** — one big themed enemy per level (see Level Plan).

### Per-level enemy flavor (the "5 different styles")
1. **Goblin Greenwood** → classic green goblins (sticks, slingshots).
2. **Zombie Flats** → wobbly cartoon zombies (slow shamblers, crawlers).
3. **Bandit Badlands** → desert critter-bandits (scorpion-folk, vulture flyers).
4. **Frostbite Peaks** → snow imps & yeti-lite brutes (snowball lobbers).
5. **Volcano Fortress** → armored mecha-goblins & the final boss.

---

## 9. The Five Levels

Each level has its own **terrain, art palette, music, enemy roster, hazards,
and a boss**. Terrain changes are both visual and mechanical (hills, jumps,
gaps, weather).

### Level 1 — Goblin Greenwood 🌳
- **Terrain:** rolling green hills, simple ramps, dirt road. Gentle intro.
- **Hazards:** small log piles you jump or smash.
- **Enemies:** Goblin Runners, Goblin Slingshot Lobbers.
- **Mini-boss:** **Goblin Drummer** (rallies more goblins).
- **Boss:** **Big Chief Gloop** — a fat goblin in a wheelbarrow throwing
  cabbages. Beat him to earn the **Sturdy Axle** (unlocks the Wooden Wagon).
- **Starting car:** Cardboard Cart with Bow & Arrow.
- **Teaches:** driving, shooting, collecting Scrap.

### Level 2 — Zombie Flats 🧟
- **Terrain:** spooky-but-silly swamp/graveyard at dusk; bouncy mud, low fences
  to hop. Foggy backdrop.
- **Hazards:** sticky mud slows you; tombstones block shots (cover).
- **Enemies:** Shambler zombies (Brutes), Crawler zombies (low, must aim down),
  Hand-zombies that pop from the ground.
- **Mini-boss:** **Zombie Conga Line** (a snake of linked zombies).
- **Boss:** **Mayor Moldy** — a top-hat zombie who summons crawlers.
- **Reward:** unlocks **Catapult** + **Iron Buggy** path.
- **Teaches:** aiming at different heights, splash weapons.

### Level 3 — Bandit Badlands 🏜️
- **Terrain:** desert canyon, big jump ramps over gaps, tumbleweeds.
- **Hazards:** gaps you must jump; rolling boulders.
- **Enemies:** Scorpion-bandit Shielders, Vulture Flyers, dynamite-Lobbers.
- **Mini-boss:** **Twin Coyote Karts** (two fast enemy cars — a chase duel).
- **Boss:** **Sheriff Snaketail** — armored bandit on a giant scorpion.
- **Reward:** unlocks **Spike Cannon / Cannon** + **Armored Truck**.
- **Teaches:** jumping/timing, dealing with shields and air enemies.

### Level 4 — Frostbite Peaks ❄️
- **Terrain:** snowy mountains, icy slippery road (slight drift), downhill
  speed sections, snowstorm reduces visibility briefly.
- **Hazards:** ice = momentum/slide; falling icicles; snow drifts to smash.
- **Enemies:** Snow Imp Runners, Snowball-Lobber yetis (Brutes), Ice Flyers.
- **Mini-boss:** **Avalanche Yeti** (rolls a giant snowball you must shoot apart).
- **Boss:** **Frost King Yeti** — big armored yeti throwing ice spikes.
- **Reward:** unlocks **Rocket Launcher** + **Battle Tank** path.
- **Teaches:** managing momentum, prioritizing targets, using power-ups.

### Level 5 — Volcano Fortress 🌋
- **Terrain:** lava fields, metal bridges, rising/falling platforms, fortress
  walls. The big finale; everything you've learned combined.
- **Hazards:** lava gaps, lava geysers, collapsing bridges, gate barriers.
- **Enemies:** Mecha-Goblins (armored versions of every earlier type), bomb
  flyers, shield-wall brutes.
- **Mini-boss:** **The Forge Golem** (guards the gate).
- **Final Boss:** **King Krang the Goblin Warlord** — a multi-phase fight in a
  giant goblin war-machine: phase 1 cannons, phase 2 it sprouts legs, phase 3
  it goes berserk. Beating it = **victory celebration** (confetti, the kid's
  flag plants on the fortress).
- **Reward:** the full **Battle Tank + Rocket Launcher** loadout and a
  **"Champion" sticker** for the car.
- **Teaches:** mastery — using the whole toolkit under pressure.

---

## 10. The End-of-Level Garage (Upgrade Screen)

After each level the car rolls into a friendly **Garage / Pit Stop** run by a
goofy helper character (e.g., **"Bolt," a tinkering robot dog**).

Screen shows:
- **Scrap total** earned this level.
- **Car preview** in the center that visibly changes as you buy upgrades.
- Three shelves: **Bodies**, **Weapons**, **Power-Ups**.
- Big friendly **"Roll Out!"** button to start the next level.

UX rules for kids:
- Everything you can afford **glows**; everything too expensive is dimmed with a
  clear price tag.
- **One confirm tap** to buy, with a fun *clunk/install* animation on the car.
- No way to "soft-lock" — you can always afford *something*, and you can never
  sell/lose your current working setup.

---

## 11. Art, Audio & Feel

- **Art style:** flat, bright, chunky cartoon shapes; thick outlines; readable
  silhouettes. Parallax backgrounds (3–4 layers) sell the "side-scrolling
  adventure" feel and make terrain changes pop.
- **Animation:** squash-and-stretch, big "poof"/"boing" on hits, confetti on
  level clear. Juice = fun for kids.
- **Audio:** upbeat chiptune-ish music per biome; chunky cartoon SFX (boing,
  pop, thwip, kaboom); a cheery announcer/Bolt voice for menus.
- **Accessibility:** colorblind-friendly palette, big UI, optional subtitles,
  the **Little Kid Mode** (no death) and a **Big Kid Mode** (real challenge).

---

## 12. Suggested Tech Stack

Goal: runs in a browser (easy to share with family on any device), simple to
build incrementally.

- **Engine:** [Phaser 3](https://phaser.io/) (HTML5 2D game framework) — great
  for side-scrollers, big community, runs on desktop + tablet + phone.
- **Language:** TypeScript (safer, scales well) or plain JavaScript to start.
- **Bundler/dev:** Vite (fast dev server, easy build).
- **Art:** placeholder shapes first → swap in sprites later (Aseprite / free
  asset packs / Kenney.nl for prototyping).
- **Audio:** Phaser sound + free SFX (e.g., Kenney, freesound) early on.
- **Persistence:** browser `localStorage` for save progress (no accounts).
- **Deploy:** static host (GitHub Pages / Netlify) so the kids can play from a
  link.

(Phaser is the recommendation, but Kaboom.js or plain Canvas would also work —
we can decide together before coding.)

---

## 13. Build Roadmap (how we'll actually make it)

A phased plan so we always have something playable:

- **Milestone 0 — Skeleton:** project setup (Vite + Phaser), an auto-scrolling
  background, a box "car" that moves up/down, and one button that fires a dot.
- **Milestone 1 — Core loop:** spawn Goblin Runners, shooting destroys them,
  Scrap drops & auto-collects, a Scrap counter, reach a "finish" flag.
- **Milestone 2 — Garage:** end-of-level upgrade screen; buy a body, buy a
  weapon, see the car change. Save to localStorage.
- **Milestone 3 — Variety:** add Lobber/Brute/Flyer behaviors; add jumping and
  one terrain hazard.
- **Milestone 4 — Level 1 complete:** full Goblin Greenwood with mini-boss +
  Big Chief Gloop boss, music & SFX.
- **Milestone 5 — Levels 2–5:** roll out the remaining biomes, enemies,
  weapons, cars, and bosses one at a time, reusing the systems.
- **Milestone 6 — Polish:** menus, Little Kid Mode, settings, sticker shop,
  victory sequence, balancing pass with the actual kids playtesting.

Each milestone is independently playable, so the kids can try it (and give
feedback!) early and often.

---

## 14. Quick Reference — At a Glance

| Level | Biome            | Headline Enemy   | Boss               | Big Unlock                 |
|-------|------------------|------------------|--------------------|----------------------------|
| 1     | Goblin Greenwood | Goblins          | Big Chief Gloop    | Wooden Wagon               |
| 2     | Zombie Flats     | Cartoon Zombies  | Mayor Moldy        | Catapult / Iron Buggy      |
| 3     | Bandit Badlands  | Critter-Bandits  | Sheriff Snaketail  | Cannon / Armored Truck     |
| 4     | Frostbite Peaks  | Snow Imps & Yetis| Frost King Yeti    | Rocket Launcher            |
| 5     | Volcano Fortress | Mecha-Goblins    | King Krang         | Battle Tank (full power)   |

---

*Next step: review this plan, tweak anything (names, weapons, level themes),
then I can start building Milestone 0 whenever you're ready.*
