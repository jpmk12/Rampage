import { getBody, getWeapon } from '../data/catalog.js';

// Builds a car as a Phaser Container = body sprite + weapon sprite, so the
// loadout can change visually just by rebuilding it. The container's origin
// sits at the car's bottom-center (where the wheels meet the ground).
//
// The weapon sprite is stored so the scene can rotate it for aiming; `mount`
// and `weaponLen` let the scene compute the muzzle tip for any aim angle.
export function buildCar(scene, x, y, bodyId, weaponId) {
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

  return container;
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
