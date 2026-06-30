// Central tunables so balancing stays in one place as the game grows.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Where the ground band starts (top edge of the dirt).
export const GROUND_TOP_Y = GAME_HEIGHT - 90;

// Apparent speed of the world sliding past the (fixed) car, in px/ms.
// Kept in sync with the ground tile scroll so things resting on the ground
// drift at the same rate as the road under them.
export const WORLD_SCROLL = 0.32;

export const CAR = {
  x: 160, // fixed horizontal position; the world scrolls past it
  minY: 200, // highest the car can fly
  maxY: GROUND_TOP_Y + 5, // wheels rest just on the ground
  startY: GROUND_TOP_Y - 10,
  vSpeed: 0.5, // vertical move speed in px per millisecond
  fireCooldown: 220, // ms between shots
  bulletSpeed: 640, // px per second
};

// Parallax scroll speeds (px per millisecond) for each background layer.
export const SCROLL = {
  farHills: 0.02,
  nearHills: 0.06,
  ground: 0.32,
};

export const ENEMY = {
  goblinHp: 1,
  goblinSpeed: 440, // px/s, moving left toward the car (faster than the world)
  spawnEveryMin: 850, // ms
  spawnEveryMax: 1700, // ms
  firstSpawnDelay: 1200, // ms grace before the first goblin
};

export const SCRAP = {
  value: 1,
  magnetRange: 240, // start homing toward the car within this distance
  collectRange: 42, // collected once this close
  homeLerp: 0.018, // how strongly scrap eases toward the car per ms
};

export const LEVEL = {
  // distance (px of world scroll) the player covers before the finish flag
  // rolls in. ~11000 / 0.32 ≈ 34s of action.
  length: 11000,
};

export const COLORS = {
  skyTop: 0x6fc4e8,
  skyBottom: 0xcdeefb,
  farHills: 0x8fc97a,
  nearHills: 0x5fa84f,
  ground: 0x6b4f2a,
  groundEdge: 0x7e9a3e,
  cardboard: 0xc18a42,
  cardboardDark: 0x9c6a2c,
  wheel: 0x2b2b33,
  bullet: 0xffd34d,
  bulletEdge: 0xe88f1a,
  goblin: 0x74b13c,
  goblinDark: 0x4f8a26,
  goblinBelly: 0x9fd06a,
  scrap: 0xf4c542,
  scrapDark: 0xc9961f,
  puff: 0xffffff,
};
