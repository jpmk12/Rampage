// Enemy roster. Each type has its own toughness, speed, and behaviour flags.
// `weight` controls how often it spawns in the global (freestyle) pick; per-biome
// campaign spawns use each level's `roster` (see levels.js). `clearH` is how high
// the car must jump to leap over it (air/tall enemies set it very high so they
// can't be jumped and must be shot).
//
// `tex` names the generated art the type borrows (so several behaviours can reuse
// one drawn shape, recoloured per biome). Signature behaviour flags:
//   charges  — winds up and dashes forward in bursts (telegraphed)
//   shield   — carries a front plate that soaks N hits before the body is hurt
//   splits   — bursts into N little runts when defeated
//   dives    — an air enemy that swoops down toward the car
//   lobs     — throws arcing rocks

export const ENEMY_TYPES = {
  runner: { key: 'runner', tex: 'runner', hp: 1, speed: 300, scrap: 1, weight: 40, lane: 'ground', clearH: 42 },
  brute: { key: 'brute', tex: 'brute', hp: 5, speed: 140, scrap: 3, weight: 12, lane: 'ground', clearH: 999 },
  lobber: { key: 'lobber', tex: 'lobber', hp: 2, speed: 110, scrap: 2, weight: 16, lane: 'ground', clearH: 48, lobs: true },
  flyer: { key: 'flyer', tex: 'flyer', hp: 1, speed: 330, scrap: 2, weight: 18, lane: 'air', clearH: 999 },

  // --- signature behaviours (borrow existing art, recoloured per biome) ---
  charger: { key: 'charger', tex: 'runner', hp: 2, speed: 150, scrap: 2, weight: 10, lane: 'ground', clearH: 44, charges: true, scale: 1.12 },
  shield: { key: 'shield', tex: 'brute', hp: 3, speed: 120, scrap: 3, weight: 8, lane: 'ground', clearH: 999, shield: 4 },
  splitter: { key: 'splitter', tex: 'lobber', hp: 2, speed: 130, scrap: 2, weight: 10, lane: 'ground', clearH: 52, splits: 2, scale: 1.16 },
  diver: { key: 'diver', tex: 'flyer', hp: 1, speed: 300, scrap: 2, weight: 8, lane: 'air', clearH: 999, dives: true },

  // split product — never spawns on its own (weight 0), only from a splitter
  runt: { key: 'runt', tex: 'runner', hp: 1, speed: 360, scrap: 0, weight: 0, lane: 'ground', clearH: 38, scale: 0.62 },
};

// Build a flat, weighted list for quick random picks (used by freestyle + horde).
const WEIGHTED = Object.values(ENEMY_TYPES).flatMap((t) => Array(t.weight).fill(t.key));

export function pickEnemyType(rng) {
  const i = Math.floor(rng() * WEIGHTED.length);
  return ENEMY_TYPES[WEIGHTED[i]];
}

// Per-biome weighted pick. Each level defines a `roster` of { typeKey: weight }
// so every land has its own signature mix; falls back to the global pick.
const rosterCache = {};
export function pickEnemyForLevel(level, rng) {
  if (!level || !level.roster) return pickEnemyType(rng);
  let list = rosterCache[level.id];
  if (!list) {
    list = Object.entries(level.roster).flatMap(([k, w]) => Array(w).fill(k));
    rosterCache[level.id] = list;
  }
  return ENEMY_TYPES[list[Math.floor(rng() * list.length)]];
}
