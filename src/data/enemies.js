// Enemy roster for Level 1. Each type has its own art, toughness, speed, and
// behaviour flags. `weight` controls how often it spawns; `clearH` is how high
// the car must jump to leap over it (air/tall enemies set it very high so they
// can't be jumped and must be shot).

export const ENEMY_TYPES = {
  runner: {
    key: 'runner',
    texture: 'goblin',
    hp: 1,
    speed: 300, // px/s leftward
    scrap: 1, // scrap pieces dropped when defeated
    weight: 44,
    lane: 'ground',
    clearH: 42, // easy to jump over
  },
  brute: {
    key: 'brute',
    texture: 'brute',
    hp: 5,
    speed: 140,
    scrap: 3,
    weight: 14,
    lane: 'ground',
    clearH: 999, // too tall to jump — shoot it
  },
  lobber: {
    key: 'lobber',
    texture: 'lobber',
    hp: 2,
    speed: 110,
    scrap: 2,
    weight: 20,
    lane: 'ground',
    clearH: 48,
    lobs: true, // throws arcing rocks
  },
  flyer: {
    key: 'flyer',
    texture: 'flyer',
    hp: 1,
    speed: 330,
    scrap: 2,
    weight: 22,
    lane: 'air',
    clearH: 999, // in the air — shoot it
  },
};

// Build a flat, weighted list for quick random picks.
const WEIGHTED = Object.values(ENEMY_TYPES).flatMap((t) =>
  Array(t.weight).fill(t.key)
);

export function pickEnemyType(rng) {
  const i = Math.floor(rng() * WEIGHTED.length);
  return ENEMY_TYPES[WEIGHTED[i]];
}
