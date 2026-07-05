// ============================================================================
//  REAL ART DROP-IN
// ----------------------------------------------------------------------------
//  Replace any code-drawn placeholder with a real sprite — the game picks it up
//  automatically, no gameplay changes.
//
//   1. Put a PNG (transparent background) in:  public/assets/sprites/
//   2. Uncomment its line below (the KEY on the left must match EXACTLY).
//   3. Reload. Anything not listed keeps its placeholder, so you can swap art a
//      few pieces at a time.
//
//  • Full key list, sizes, and anchoring:  docs/ASSETS.md
//  • Ready-to-paste AI prompts per sprite:  docs/AI_PROMPTS.md
//  • Every key + expected size also lives in  src/data/assetManifest.js
//    (the loader warns in the console if a dropped-in file is the wrong size).
//  • In the browser console, run  __ASSETS__()  to audit what's custom vs
//    placeholder and check sizes.
//
//  Anchoring: sit characters on the BOTTOM edge (wheels/feet), enemies & bosses
//  face LEFT, cars face RIGHT. Tinted pieces (cloud/sun/flake/crate/shield-plate/
//  puff) are recoloured in code — supply WHITE/greyscale so tinting still works.
// ============================================================================

export const ASSET_OVERRIDES = {
  // ---- Cars — 124x92, wheels on the bottom edge, facing right --------------
  'body-cardboard': 'body-cardboard.png',
  // 'body-wood': 'body-wood.png',
  // 'body-iron': 'body-iron.png',
  // 'body-armored': 'body-armored.png',
  // 'body-tank': 'body-tank.png',

  // ---- Weapons (mount by left-center) · Player shots -----------------------
  // 'wpn-bow': 'wpn-bow.png',           // 34x32   shot-bow      22x10
  // 'wpn-crossbow': 'wpn-crossbow.png', // 40x32   shot-crossbow 24x10
  // 'wpn-catapult': 'wpn-catapult.png', // 40x34   shot-catapult 18x18
  // 'wpn-cannon': 'wpn-cannon.png',     // 40x32   shot-cannon   20x20
  // 'wpn-rocket': 'wpn-rocket.png',     // 44x32   shot-rocket   28x14

  // ---- Enemies — face LEFT, bottom edge, per biome 1..5 --------------------
  //   runner 64x66 · brute 96x96 · lobber 62x74 · flyer 74x52 (center)
  //   Behaviours reuse these: charger=runner, shield=brute, splitter=lobber,
  //   diver=flyer. Replacing runner-1 covers Greenwood runners AND chargers.
  // 'runner-1': 'runner-1.png', 'brute-1': 'brute-1.png', 'lobber-1': 'lobber-1.png', 'flyer-1': 'flyer-1.png',
  // 'runner-2': 'runner-2.png', 'brute-2': 'brute-2.png', 'lobber-2': 'lobber-2.png', 'flyer-2': 'flyer-2.png',
  // 'runner-3': 'runner-3.png', 'brute-3': 'brute-3.png', 'lobber-3': 'lobber-3.png', 'flyer-3': 'flyer-3.png',
  // 'runner-4': 'runner-4.png', 'brute-4': 'brute-4.png', 'lobber-4': 'lobber-4.png', 'flyer-4': 'flyer-4.png',
  // 'runner-5': 'runner-5.png', 'brute-5': 'brute-5.png', 'lobber-5': 'lobber-5.png', 'flyer-5': 'flyer-5.png',

  // ---- Bosses — face LEFT, bottom edge -------------------------------------
  // 'drummer': 'drummer.png',            // 96x104  (L1 mini-boss)
  // 'gloop': 'gloop.png',                // 168x132 (L1 boss)
  // 'boss-moldy': 'boss-moldy.png',      // 150x150 (L2)
  // 'boss-snaketail': 'boss-snaketail.png', // 160x140 (L3)
  // 'boss-yeti': 'boss-yeti.png',        // 150x140 (L4)
  // 'boss-krang': 'boss-krang.png',      // 160x140 (L5)

  // ---- Backgrounds — per biome 1..5 ----------------------------------------
  //   sky 960x540 · mtns 480x200 (tiles) · hills-far 360x150 (tiles) ·
  //   hills-near 300x210 (tiles) · ground 256x90 (tiles) · prop 64x96 (bottom)
  // 'sky-1': 'sky-1.png',
  // 'mtns-1': 'mtns-1.png',
  // 'hills-far-1': 'hills-far-1.png',
  // 'hills-near-1': 'hills-near-1.png',
  // 'ground-1': 'ground-1.png',
  // 'prop-1': 'prop-1.png',

  // ---- Per-biome combat art ------------------------------------------------
  // 'proj-2': 'proj-2.png',   // 30x30 boss throw (biomes 2..5)
  // 'cabbage': 'cabbage.png', // 32x32 Gloop's cabbage
  // 'enemy-rock': 'rock.png', // 22x22 lobber rock / bomb
  // 'hazard-1': 'hazard-1.png', // 76x56 (currently unused in play)

  // ---- Pickups / UI / FX ---------------------------------------------------
  // 'scrap': 'scrap.png',            // 26x26
  // 'heart': 'heart.png',            // 30x30   'heart-empty': 'heart-empty.png'
  // 'crate': 'crate.png',            // 30x30   (tinted — supply white)
  // 'flag': 'flag.png',              // 76x190  pole base at bottom
  // 'turret': 'turret.png',          // 52x30   bolt-on roof gun (faces right)
  // 'shield-plate': 'shield.png',    // 26x54   (tinted — supply white/grey)
  // 'wheel-spin': 'wheel.png',       // 36x36   round & centered (it rotates)
  // 'bolt': 'bolt.png',              // 86x76   garage robot-dog
  // 'axle': 'axle.png',              // 56x32   victory part
  // 'cloud': 'cloud.png',            // 150x64  (tinted — supply white)
  // 'sun': 'sun.png',                // 150x150 (tinted — supply white)
};
