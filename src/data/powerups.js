// Timed mid-level power-ups (campaign supply drops, combo rewards, rare enemy
// drops). Unlike the Freestyle arsenal pickups these are TEMPORARY, so they
// make a run exciting without breaking the Garage economy.
//
//   dur: effect length in ms (0 = instant or until-used)
//   tint: crate colour  ·  icon: shown above the crate and in the HUD chips
//   weight: relative chance in random drops

export const POWERUPS = {
  rapid: { type: 'rapid', label: 'RAPID FIRE!', icon: '⚡', tint: 0xffb04a, dur: 10000, weight: 22 },
  spread: { type: 'spread', label: 'TRIPLE SHOT!', icon: '◣', tint: 0xffe14d, dur: 10000, weight: 20 },
  shield: { type: 'shield', label: 'SHIELD!', icon: '🛡', tint: 0x7fd4ff, dur: 0, weight: 18 },
  magnet: { type: 'magnet', label: 'SCRAP MAGNET!', icon: '🧲', tint: 0xc060ff, dur: 12000, weight: 16 },
  heal: { type: 'heal', label: '+1 ❤', icon: '❤', tint: 0xff6a7a, dur: 0, weight: 14 },
};

const WEIGHTED = Object.values(POWERUPS).flatMap((p) => Array(p.weight).fill(p.type));

export function pickPowerup(rng) {
  return POWERUPS[WEIGHTED[Math.floor(rng() * WEIGHTED.length)]];
}
