import { getBody, getWeapon } from '../data/catalog.js';
import { ASSET_OVERRIDES } from '../data/assets.js';

// Bolt-on turrets stack vertically into a tower on the roof (relative to the
// bottom-center origin). The segments are flat-topped so they sit flush; the
// stack step equals the segment's body height so there are no gaps.
const TURRET_X = 6;
const TURRET_BASE_Y = -54; // first turret's base sits here
const TURRET_STACK = 25; // each turret stacks this much higher (≈ segment height)

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
  container.add(bodySprite);

  // spinning wheels overlaid on top of the baked wheels (rotated by the scene).
  // Custom body art draws its own wheels, so skip the overlay for overridden
  // bodies to avoid double/misaligned wheels.
  const wheels = [];
  const customBody = !!ASSET_OVERRIDES[`body-${body.id}`];
  if (!customBody) {
    (body.wheels || []).forEach((w) => {
      const ws = scene.add.image(w.x, w.y, 'wheel-spin').setOrigin(0.5).setScale(w.r / 18);
      container.add(ws);
      wheels.push(ws);
    });
  }

  const weaponSprite = scene.add
    .image(body.mount.x, body.mount.y, `wpn-${weapon.id}`)
    .setOrigin(0, 0.5);
  container.add(weaponSprite);

  container.setData('weaponSprite', weaponSprite);
  container.setData('wheels', wheels);
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
  const y = TURRET_BASE_Y - index * TURRET_STACK;
  const t = scene.add.image(TURRET_X, y, 'turret').setOrigin(0.5, 1);
  container.add(t);
  const muzzles = container.getData('turretMuzzles');
  // muzzle = barrel tip of this turret (texture 52x30, origin bottom-center)
  muzzles.push({ x: TURRET_X + 24, y: y - 16 });
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
