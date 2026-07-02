// ============================================================================
//  ASSET MANIFEST — the single source of truth for every replaceable sprite.
// ----------------------------------------------------------------------------
//  Each entry is one code-drawn texture you can override with a real PNG (see
//  docs/ASSETS.md and docs/AI_PROMPTS.md). This file is pure data with NO
//  imports, so both the game (BootScene validation, the in-browser audit) and
//  Node scripts can read it.
//
//  Fields:
//    key      exact texture key (or a base key when `variants` is set)
//    w, h     expected pixel size of the source image
//    anchor   where the art sits: 'bottom' (feet/wheels on the bottom edge),
//             'center', 'left' (mounts by its left-center), 'topleft'
//    group    human grouping for the docs
//    facing   'left' (enemies/bosses charge the car) | 'right' (cars) | undefined
//    variants biome numbers 1..5 → expands to `${key}-1` … `${key}-5`
//    tiles    true if it must tile seamlessly left-to-right (parallax layers)
//    tinted   true if the code draws it white/grey and tints it at runtime —
//             supply a WHITE/greyscale image so tinting still works
//    desc     what it is (and any behaviour that reuses the same art)
// ============================================================================

export const ASSETS = [
  // ---- Cars (face right; wheels on the bottom edge) ------------------------
  { key: 'body-cardboard', w: 124, h: 92, anchor: 'bottom', group: 'Cars', facing: 'right', desc: 'Cardboard Cart (tier 1)' },
  { key: 'body-wood', w: 124, h: 92, anchor: 'bottom', group: 'Cars', facing: 'right', desc: 'Wooden Wagon (tier 2)' },
  { key: 'body-iron', w: 124, h: 92, anchor: 'bottom', group: 'Cars', facing: 'right', desc: 'Iron Buggy (tier 3)' },
  { key: 'body-armored', w: 124, h: 92, anchor: 'bottom', group: 'Cars', facing: 'right', desc: 'Armored Truck (tier 4)' },
  { key: 'body-tank', w: 124, h: 92, anchor: 'bottom', group: 'Cars', facing: 'right', desc: 'Battle Tank (tier 5)' },

  // ---- Weapons that mount on the car (pivot at their left-center) ----------
  { key: 'wpn-bow', w: 34, h: 32, anchor: 'left', group: 'Weapons', facing: 'right', desc: 'Bow' },
  { key: 'wpn-crossbow', w: 40, h: 32, anchor: 'left', group: 'Weapons', facing: 'right', desc: 'Crossbow' },
  { key: 'wpn-catapult', w: 40, h: 34, anchor: 'left', group: 'Weapons', facing: 'right', desc: 'Catapult' },
  { key: 'wpn-cannon', w: 40, h: 32, anchor: 'left', group: 'Weapons', facing: 'right', desc: 'Cannon' },
  { key: 'wpn-rocket', w: 44, h: 32, anchor: 'left', group: 'Weapons', facing: 'right', desc: 'Rocket launcher' },

  // ---- Player projectiles (fly right; art points right) --------------------
  { key: 'shot-bow', w: 22, h: 10, anchor: 'center', group: 'Player shots', facing: 'right', desc: 'arrow' },
  { key: 'shot-crossbow', w: 24, h: 10, anchor: 'center', group: 'Player shots', facing: 'right', desc: 'bolt' },
  { key: 'shot-catapult', w: 18, h: 18, anchor: 'center', group: 'Player shots', desc: 'rock (splash)' },
  { key: 'shot-cannon', w: 20, h: 20, anchor: 'center', group: 'Player shots', desc: 'cannonball (pierces)' },
  { key: 'shot-rocket', w: 28, h: 14, anchor: 'center', group: 'Player shots', facing: 'right', desc: 'rocket (splash); also freestyle missiles' },

  // ---- Enemies (face left; per biome 1..5). Behaviours reuse these shapes --
  { key: 'runner', variants: [1, 2, 3, 4, 5], w: 64, h: 66, anchor: 'bottom', group: 'Enemies', facing: 'left', desc: 'small quick enemy (also used for the Charger + split Runts)' },
  { key: 'brute', variants: [1, 2, 3, 4, 5], w: 96, h: 96, anchor: 'bottom', group: 'Enemies', facing: 'left', desc: 'big tanky enemy (also the Shield enemy + mega, and mini-bosses 2–5)' },
  { key: 'lobber', variants: [1, 2, 3, 4, 5], w: 62, h: 74, anchor: 'bottom', group: 'Enemies', facing: 'left', desc: 'throws arcing rocks (also the Splitter)' },
  { key: 'flyer', variants: [1, 2, 3, 4, 5], w: 74, h: 52, anchor: 'center', group: 'Enemies', facing: 'left', desc: 'winged flyer (also the Diver)' },

  // ---- Bosses (face left) --------------------------------------------------
  { key: 'drummer', w: 96, h: 104, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'Goblin Drummer (L1 mini-boss)' },
  { key: 'gloop', w: 168, h: 132, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'Big Chief Gloop (L1 boss)' },
  { key: 'boss-moldy', w: 150, h: 150, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'Mayor Moldy (L2 boss)' },
  { key: 'boss-snaketail', w: 160, h: 140, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'Sheriff Snaketail (L3 boss)' },
  { key: 'boss-yeti', w: 150, h: 140, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'Frost King Yeti (L4 boss)' },
  { key: 'boss-krang', w: 160, h: 140, anchor: 'bottom', group: 'Bosses', facing: 'left', desc: 'King Krang (L5 final boss)' },

  // ---- Backgrounds (per biome 1..5) ---------------------------------------
  { key: 'sky', variants: [1, 2, 3, 4, 5], w: 960, h: 540, anchor: 'topleft', group: 'Backgrounds', desc: 'full-screen biome sky' },
  { key: 'mtns', variants: [1, 2, 3, 4, 5], w: 480, h: 200, anchor: 'topleft', tiles: true, group: 'Backgrounds', desc: 'distant hazy mountains (furthest parallax layer)' },
  { key: 'hills-far', variants: [1, 2, 3, 4, 5], w: 360, h: 150, anchor: 'topleft', tiles: true, group: 'Backgrounds', desc: 'far parallax hills' },
  { key: 'hills-near', variants: [1, 2, 3, 4, 5], w: 300, h: 210, anchor: 'topleft', tiles: true, group: 'Backgrounds', desc: 'near parallax hills' },
  { key: 'ground', variants: [1, 2, 3, 4, 5], w: 256, h: 90, anchor: 'topleft', tiles: true, group: 'Backgrounds', desc: 'road/ground strip' },
  { key: 'prop', variants: [1, 2, 3, 4, 5], w: 64, h: 96, anchor: 'bottom', group: 'Backgrounds', desc: 'scenery prop that rolls past (tree/dead tree/cactus/pine/rock)' },

  // ---- Per-biome combat art (1..5) ----------------------------------------
  { key: 'proj', variants: [1, 2, 3, 4, 5], w: 30, h: 30, anchor: 'center', group: 'Enemy combat', desc: "boss thrown projectile (biomes 2–5; L1 uses 'cabbage')" },
  { key: 'hazard', variants: [1, 2, 3, 4, 5], w: 76, h: 56, anchor: 'bottom', group: 'Enemy combat', desc: 'ground hazard art (log/tombstone/cactus/ice/lava — currently unused in play)' },
  { key: 'enemy-rock', w: 22, h: 22, anchor: 'center', group: 'Enemy combat', desc: 'lobber rock / freestyle bomb' },
  { key: 'cabbage', w: 32, h: 32, anchor: 'center', group: 'Enemy combat', desc: "Big Chief Gloop's thrown cabbage" },

  // ---- Pickups / UI / FX ---------------------------------------------------
  { key: 'scrap', w: 26, h: 26, anchor: 'center', group: 'Pickups & UI', desc: 'scrap currency (coin/nut)' },
  { key: 'heart', w: 30, h: 30, anchor: 'center', group: 'Pickups & UI', desc: 'full health heart' },
  { key: 'heart-empty', w: 30, h: 30, anchor: 'center', group: 'Pickups & UI', desc: 'empty health heart' },
  { key: 'crate', w: 30, h: 30, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'freestyle power-up crate (tinted per pickup — supply white)' },
  { key: 'flag', w: 76, h: 190, anchor: 'bottom', group: 'Pickups & UI', desc: 'checkered finish flag on a pole' },
  { key: 'axle', w: 56, h: 32, anchor: 'center', group: 'Pickups & UI', desc: 'boss-drop part (shown on victory)' },
  { key: 'bolt', w: 86, h: 76, anchor: 'bottom', group: 'Pickups & UI', facing: 'right', desc: 'Bolt, the Garage robot-dog mechanic' },
  { key: 'turret', w: 52, h: 30, anchor: 'bottom', group: 'Pickups & UI', facing: 'right', desc: 'bolt-on roof turret (stacks vertically)' },
  { key: 'shield-plate', w: 26, h: 54, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'Shield enemy front plate (tinted per biome — supply white/grey)' },
  { key: 'wheel-spin', w: 36, h: 36, anchor: 'center', group: 'Pickups & UI', desc: 'spinning wheel overlay (rotates — keep it round & centered)' },
  { key: 'puff', w: 24, h: 24, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'smoke/spark particle (tinted — supply white soft dot)' },
  { key: 'cloud', w: 150, h: 64, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'drifting cloud (tinted per biome — supply white)' },
  { key: 'sun', w: 150, h: 150, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'sun/moon disc (tinted per biome — supply white)' },
  { key: 'flake', w: 10, h: 10, anchor: 'center', tinted: true, group: 'Pickups & UI', desc: 'weather particle: pollen/snow/ember (tinted — supply white)' },
];

// The biome each variant number maps to (for docs / prompts).
export const BIOMES = {
  1: 'Goblin Greenwood',
  2: 'Zombie Flats',
  3: 'Bandit Badlands',
  4: 'Frostbite Peaks',
  5: 'Volcano Fortress',
};

// Expand `variants` into concrete { key, w, h, ... } entries — one per texture.
export function assetKeys() {
  const out = [];
  for (const a of ASSETS) {
    if (a.variants) {
      for (const n of a.variants) out.push({ ...a, key: `${a.key}-${n}`, biome: n });
    } else {
      out.push({ ...a });
    }
  }
  return out;
}

// Quick lookup: key → expected spec (used by the loader's size check).
export function specByKey() {
  const map = {};
  for (const a of assetKeys()) map[a.key] = a;
  return map;
}
