// The shop catalog: car bodies and weapons you can buy in the Garage.
// Stats here drive both the shop and actual gameplay, so upgrades feel real.

export const BODIES = [
  {
    id: 'cardboard',
    name: 'Cardboard Cart',
    price: 0,
    health: 3,
    jump: 1.16, // light = springy: jumps highest
    trait: 'Light & springy — highest jump',
    // where the weapon attaches, relative to the car's bottom-center origin
    mount: { x: 36, y: -44 },
    // spinning-wheel overlays (container-space offsets; match the baked wheels)
    wheels: [{ x: -26, y: -14, r: 15 }, { x: 30, y: -14, r: 15 }],
  },
  {
    id: 'wood',
    name: 'Wooden Wagon',
    price: 8,
    health: 5,
    jump: 1.08,
    trait: 'Sturdier, still a good jumper',
    mount: { x: 42, y: -52 },
    requiresPart: 'axle', // earned by beating Big Chief Gloop (Level 1 boss)
    wheels: [{ x: -26, y: -14, r: 17 }, { x: 32, y: -14, r: 17 }],
  },
  {
    id: 'iron',
    name: 'Iron Buggy',
    price: 20,
    health: 8,
    jump: 1.0,
    trait: 'Balanced armor and jump',
    mount: { x: 46, y: -56 },
    requiresPart: 'engine', // beat Mayor Moldy (Level 2)
    wheels: [{ x: -24, y: -14, r: 18 }, { x: 34, y: -14, r: 18 }],
  },
  {
    id: 'armored',
    name: 'Armored Truck',
    price: 36,
    health: 12,
    jump: 0.94,
    trait: 'Heavy plating, lower jump',
    mount: { x: 48, y: -58 },
    requiresPart: 'plate', // beat Sheriff Snaketail (Level 3)
    wheels: [{ x: -24, y: -14, r: 18 }, { x: 34, y: -14, r: 18 }],
  },
  {
    id: 'tank',
    name: 'Battle Tank',
    price: 60,
    health: 18,
    jump: 0.86, // heavy = grounded: toughest but lowest jump
    trait: 'Toughest ride — but the lowest jump',
    mount: { x: 52, y: -60 },
    requiresPart: 'reactor', // beat Frost King Yeti (Level 4)
    wheels: [{ x: -42, y: -16, r: 9 }, { x: 42, y: -16, r: 9 }],
  },
];

export const WEAPONS = [
  {
    id: 'bow',
    name: 'Bow & Arrow',
    price: 0,
    cooldown: 220, // ms between shots
    speed: 640, // px/s
    damage: 1,
    shot: 'shot-bow',
    shotScale: 1,
    len: 28, // barrel length, for the muzzle position
    trait: 'Reliable starter',
  },
  {
    id: 'crossbow',
    name: 'Crossbow',
    price: 10,
    cooldown: 130,
    speed: 780,
    damage: 1,
    shot: 'shot-crossbow',
    shotScale: 1,
    len: 32,
    trait: 'Rapid fire',
  },
  {
    id: 'catapult',
    name: 'Catapult',
    price: 15,
    cooldown: 520,
    speed: 520,
    damage: 2,
    shot: 'shot-catapult',
    shotScale: 1.3,
    len: 34,
    splash: 72, // shots burst on impact — hit a whole cluster at once
    trait: '💥 Splash — clears crowds',
  },
  {
    id: 'cannon',
    name: 'Cannon',
    price: 26,
    cooldown: 300,
    speed: 840,
    damage: 3,
    shot: 'shot-cannon',
    shotScale: 1.1,
    len: 34,
    pierce: 3, // punches through a line of enemies
    trait: '➤ Piercing — punches through',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    price: 44,
    cooldown: 480,
    speed: 720,
    damage: 5,
    shot: 'shot-rocket',
    shotScale: 1.2,
    len: 36,
    splash: 100, // the big boom
    trait: '💥 Huge blast + top damage',
  },
];

export function getBody(id) {
  return BODIES.find((b) => b.id === id) || BODIES[0];
}

export function getWeapon(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}
