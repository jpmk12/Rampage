// The five levels. Each defines its biome palette, an enemy colour palette
// (archetype shapes are reused and recoloured per biome), a hazard, a
// mini-boss + boss, and the reward part that unlocks the next car body.
//
// Texture keys are resolved per level: enemies use `${archetype}-${id}`
// (e.g. 'runner-2'), backgrounds use `sky-2`, etc. — all generated in BootScene.

export const LEVELS = [
  {
    id: 1,
    name: 'Goblin Greenwood',
    biome: { skyTop: 0x6fc4e8, skyBottom: 0xcdeefb, far: 0x8fc97a, near: 0x5fa84f, ground: 0x6b4f2a, groundEdge: 0x7e9a3e },
    enemyPal: { body: 0x74b13c, dark: 0x4f8a26, belly: 0x9fd06a, eye: 0xffffff, pupil: 0x222222 },
    hazardStyle: 'log',
    projColor: 0x7cc24a,
    roster: { runner: 44, lobber: 20, flyer: 16, brute: 10, splitter: 12 },
    mini: { tex: 'drummer', name: 'Goblin Drummer', hp: 12 },
    boss: { tex: 'gloop', name: 'Big Chief Gloop', hp: 34, projTex: 'cabbage', attacks: ['lob', 'summon'], rage: ['spread'] },
    reward: { part: 'axle', body: 'Wooden Wagon' },
  },
  {
    id: 2,
    name: 'Zombie Flats',
    biome: { skyTop: 0x5b4a78, skyBottom: 0xa590b0, far: 0x5c6b4a, near: 0x3f5238, ground: 0x3e3a2e, groundEdge: 0x556b3a },
    enemyPal: { body: 0x8fae74, dark: 0x5f7a4a, belly: 0xc0d2a4, eye: 0xf2e9a0, pupil: 0x3a3a2a },
    hazardStyle: 'tombstone',
    projColor: 0x9acb6a,
    roster: { runner: 34, brute: 16, shield: 16, lobber: 16, flyer: 14 },
    mini: { tex: 'brute-2', name: 'Zombie Bruiser', hp: 16, scale: 1.4 },
    boss: { tex: 'boss-moldy', name: 'Mayor Moldy', hp: 40, projTex: 'proj-2', attacks: ['lob', 'spread'], rage: ['barrage'] },
    reward: { part: 'engine', body: 'Iron Buggy' },
  },
  {
    id: 3,
    name: 'Bandit Badlands',
    biome: { skyTop: 0xf0b96a, skyBottom: 0xf6e2b0, far: 0xd9a86a, near: 0xc28f4a, ground: 0xb8975a, groundEdge: 0xd9b878 },
    enemyPal: { body: 0xc98f4a, dark: 0x9c6a2c, belly: 0xe6c48a, eye: 0xffffff, pupil: 0x222222 },
    hazardStyle: 'cactus',
    projColor: 0xd14a3a,
    roster: { runner: 30, charger: 20, flyer: 18, lobber: 14, brute: 12 },
    mini: { tex: 'brute-3', name: 'Coyote Bandit', hp: 20, scale: 1.4 },
    boss: { tex: 'boss-snaketail', name: 'Sheriff Snaketail', hp: 48, projTex: 'proj-3', attacks: ['spread', 'summon'], rage: ['barrage'] },
    reward: { part: 'plate', body: 'Armored Truck' },
  },
  {
    id: 4,
    name: 'Frostbite Peaks',
    biome: { skyTop: 0x9fcfe8, skyBottom: 0xe8f4fb, far: 0xcfe2ee, near: 0xaecbe0, ground: 0xdfe9f1, groundEdge: 0xc4d8e6 },
    enemyPal: { body: 0x7fb6e0, dark: 0x4f86b0, belly: 0xc8e4f4, eye: 0xffffff, pupil: 0x223344 },
    hazardStyle: 'ice',
    projColor: 0x9fd0f0,
    roster: { runner: 28, flyer: 20, diver: 18, brute: 14, shield: 12 },
    mini: { tex: 'brute-4', name: 'Avalanche Yeti', hp: 24, scale: 1.5 },
    boss: { tex: 'boss-yeti', name: 'Frost King Yeti', hp: 56, projTex: 'proj-4', attacks: ['lob', 'barrage'], rage: ['summon', 'spread'] },
    reward: { part: 'reactor', body: 'Battle Tank' },
  },
  {
    id: 5,
    name: 'Volcano Fortress',
    biome: { skyTop: 0x5a2a2a, skyBottom: 0xc06a3a, far: 0x4a3a3a, near: 0x33282a, ground: 0x2e2622, groundEdge: 0x7a3a2a },
    enemyPal: { body: 0x6a6f7a, dark: 0x44484f, belly: 0x8a8f98, eye: 0xff5d4d, pupil: 0x2a0000 },
    hazardStyle: 'lava',
    projColor: 0xff7a3a,
    roster: { brute: 20, charger: 18, shield: 16, lobber: 14, flyer: 14, splitter: 8 },
    mini: { tex: 'brute-5', name: 'Forge Golem', hp: 28, scale: 1.5 },
    boss: { tex: 'boss-krang', name: 'King Krang', hp: 72, projTex: 'proj-5', attacks: ['spread', 'summon', 'barrage'], rage: ['barrage', 'spread'] },
    reward: null, // final boss — victory!
  },
];

export function getLevel(n) {
  const i = Math.min(Math.max(1, n), LEVELS.length) - 1;
  return LEVELS[i];
}

export const LAST_LEVEL = LEVELS.length;
