// The shop catalog: car bodies and weapons you can buy in the Garage.
// Stats here drive both the shop and actual gameplay, so upgrades feel real.

export const BODIES = [
  {
    id: 'cardboard',
    name: 'Cardboard Cart',
    price: 0,
    health: 3,
    // where the weapon attaches, relative to the car's bottom-center origin
    mount: { x: 36, y: -44 },
  },
  {
    id: 'wood',
    name: 'Wooden Wagon',
    price: 8,
    health: 5,
    mount: { x: 42, y: -52 },
  },
  {
    id: 'iron',
    name: 'Iron Buggy',
    price: 20,
    health: 8,
    mount: { x: 46, y: -56 },
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
  },
];

export function getBody(id) {
  return BODIES.find((b) => b.id === id) || BODIES[0];
}

export function getWeapon(id) {
  return WEAPONS.find((w) => w.id === id) || WEAPONS[0];
}
