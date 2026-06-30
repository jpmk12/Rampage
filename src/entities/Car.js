import { getBody, getWeapon } from '../data/catalog.js';

// Where bolt-on turrets sit on top of the car (relative to the bottom-center
// origin). Up to three.
const TURRET_SLOTS = [
  { x: 8, y: -64 },
  { x: -18, y: -60 },
  { x: 32, y: -58 },
];

// Builds a car as a Phaser Container = body + weapon (+ any top turrets), so
// the loadout can change visually just by rebuilding it. The container's origin
// sits at the car's bottom-center (where the wheels meet the ground).
//
// The weapon sprite is stored so the scene can rotate it for aiming; `mount`
// and `weaponLen` let the scene compute the muzzle tip for any aim angle.
// `turretMuzzles` holds the firing points for each bolt-on turret.
export function buildCar(scene, x, y, bodyId, weaponId, turrets = 0) {
  const body = getBody(bodyId);
  const weapon = getWeapon(weaponId);

  const container = scene.add.container(x, y);

  const bodySprite = scene.add.image(0, 0, `body-${body.id}`).setOrigin(0.5, 1);
  const weaponSprite = scene.add
    .image(body.mount.x, body.mount.y, `wpn-${weapon.id}`)
    .setOrigin(0, 0.5);

  container.add([bodySprite, weaponSprite]);
  container.setData('weaponSprite', weaponSprite);
  container.setData('mount', body.mount);
  container.setData('weaponLen', weapon.len);
  container.setData('muzzle', { x: body.mount.x + weapon.len, y: body.mount.y });
  container.setData('turretMuzzles', []);

  for (let i = 0; i < turrets; i++) addTurret(scene, container, i);
  return container;
}

// Bolt a turret onto the top of the car (used at build time and live when a
// mega enemy is defeated). Pushes its muzzle offset onto `turretMuzzles`.
export function addTurret(scene, container, index) {
  const slot = TURRET_SLOTS[Math.min(index, TURRET_SLOTS.length - 1)];
  const t = scene.add.image(slot.x, slot.y, 'turret').setOrigin(0.5, 1);
  container.add(t);
  // keep the weapon sprite rendered above the turrets if needed; turrets are
  // small and sit on top of the hull, which reads fine.
  const muzzles = container.getData('turretMuzzles');
  muzzles.push({ x: slot.x + 14, y: slot.y - 12 });
  container.setData('turretMuzzles', muzzles);
  return t;
}

// Muzzle tip offset (relative to the container) for a given aim angle, so
// shots leave the end of the barrel as it points up or down.
export function muzzleFor(container, aim) {
  const m = container.getData('mount');
  const len = container.getData('weaponLen');
  return {
    x: m.x + Math.cos(aim) * len,
    y: m.y + Math.sin(aim) * len,
  };
}
