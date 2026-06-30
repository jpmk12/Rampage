// Freestyle bonus-round pickups. Each drop bumps one arsenal stat (stored in
// PlayerState.freestyle) and persists across replays, so the vehicle just keeps
// getting more powerful.

export const PICKUPS = [
  { type: 'guns', label: '+GUN', tint: 0xffd34d, weight: 20 },
  { type: 'spread', label: '+SPREAD', tint: 0xff9a3a, weight: 14 },
  { type: 'rockets', label: '+ROCKET', tint: 0xe04a3a, weight: 14 },
  { type: 'missiles', label: '+MISSILE', tint: 0xc060ff, weight: 10 },
  { type: 'bombs', label: '+BOMB', tint: 0x6b6f78, weight: 10 },
  { type: 'fireRate', label: '+FIRE RATE', tint: 0x5db4ff, weight: 12 },
  { type: 'power', label: '+POWER', tint: 0xff5d6c, weight: 12 },
  { type: 'heart', label: '+HEART', tint: 0x6fd06a, weight: 8 },
];

const WEIGHTED = PICKUPS.flatMap((p) => Array(p.weight).fill(p));

export function pickPickup(rng) {
  return WEIGHTED[Math.floor(rng() * WEIGHTED.length)];
}
