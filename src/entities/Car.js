import { getBody, getWeapon } from '../data/catalog.js';

// Builds a car as a Phaser Container = body sprite + weapon sprite, so the
// loadout can change visually just by rebuilding it. The container's origin
// sits at the car's bottom-center (where the wheels meet the ground).
//
// Returns the container with a `muzzle` data field {x, y} giving the weapon
// tip offset relative to the container, used as the firing point.
export function buildCar(scene, x, y, bodyId, weaponId) {
  const body = getBody(bodyId);
  const weapon = getWeapon(weaponId);

  const container = scene.add.container(x, y);

  const bodySprite = scene.add.image(0, 0, `body-${body.id}`).setOrigin(0.5, 1);
  // weapon attaches by its back-center at the body's mount point
  const weaponSprite = scene.add
    .image(body.mount.x, body.mount.y, `wpn-${weapon.id}`)
    .setOrigin(0, 0.5);

  container.add([bodySprite, weaponSprite]);
  container.setData('muzzle', {
    x: body.mount.x + weapon.len,
    y: body.mount.y,
  });

  return container;
}
