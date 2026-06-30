// ============================================================================
//  REAL ART DROP-IN
// ----------------------------------------------------------------------------
//  Want to replace the code-drawn placeholder art with real sprites?
//
//   1. Put a PNG (transparent background) in:  public/assets/sprites/
//   2. Uncomment its line below (or add a new one). The KEY on the left must
//      match exactly — that's how the game finds it.
//
//  Anything NOT listed here keeps its built-in placeholder, so you can replace
//  art a few pieces at a time. See docs/ASSETS.md for the full list of keys,
//  the recommended pixel sizes, and where to get matching free art.
//
//  Tip: match the listed size and keep the character standing on the bottom
//  edge of the image, so it lines up on the ground without code changes.
// ============================================================================

export const ASSET_OVERRIDES = {
  // ---- Car bodies — 124x92, wheels on the bottom edge ----------------------
  // 'body-cardboard': 'body-cardboard.png',
  // 'body-wood': 'body-wood.png',
  // 'body-iron': 'body-iron.png',
  // 'body-armored': 'body-armored.png',
  // 'body-tank': 'body-tank.png',

  // ---- Enemies — face LEFT, standing on the bottom edge --------------------
  //   runner ~64x66 · brute ~96x96 · lobber ~62x74 · flyer ~74x52
  //   keys are per biome: runner-1..5, brute-1..5, lobber-1..5, flyer-1..5
  // 'runner-1': 'goblin.png',
  // 'brute-1': 'goblin-big.png',
  // 'lobber-1': 'goblin-thrower.png',
  // 'flyer-1': 'imp.png',

  // ---- Bosses — ~150x140, standing on the bottom edge ----------------------
  // 'drummer': 'goblin-drummer.png',
  // 'gloop': 'big-chief-gloop.png',
  // 'boss-moldy': 'mayor-moldy.png',
  // 'boss-snaketail': 'sheriff-snaketail.png',
  // 'boss-yeti': 'frost-king.png',
  // 'boss-krang': 'king-krang.png',

  // ---- Backgrounds ---------------------------------------------------------
  //   sky-N 960x540 · hills-far-N 360x150 (tiles) · hills-near-N 300x210
  //   ground-N 256x90 (tiles). N = 1..5 (one per biome)
  // 'sky-1': 'sky-greenwood.png',
  // 'hills-far-1': 'hills-far-greenwood.png',
  // 'hills-near-1': 'hills-near-greenwood.png',
  // 'ground-1': 'ground-greenwood.png',

  // ---- Pickups / fx / UI ---------------------------------------------------
  // 'scrap': 'coin.png',          // ~26x26
  // 'heart': 'heart.png',         // ~30x30
  // 'heart-empty': 'heart-empty.png',
  // 'flag': 'finish-flag.png',    // ~76x190, pole base at bottom
  // 'cloud': 'cloud.png',
  // 'bolt': 'robot-dog.png',      // garage helper
};
