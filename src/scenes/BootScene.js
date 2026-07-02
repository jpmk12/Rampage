import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { LEVELS } from '../data/levels.js';
import { ASSET_OVERRIDES } from '../data/assets.js';

// BootScene generates placeholder art as in-code textures. Any real sprite
// registered in data/assets.js is loaded first and used instead — the make*
// generators below skip a key that's already been loaded.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  // Load any real art the player has dropped in (data/assets.js). Missing or
  // mistyped files just warn and fall back to the generated placeholder.
  preload() {
    const keys = Object.keys(ASSET_OVERRIDES);
    if (!keys.length) return;
    this.load.setPath('assets/sprites');
    this.load.on('loaderror', (file) =>
      console.warn('[Rampage] asset override failed to load, using placeholder:', file.key)
    );
    for (const key of keys) this.load.image(key, ASSET_OVERRIDES[key]);
  }

  create() {
    // car bodies (progressively cooler)
    this.makeBodyCardboard('body-cardboard');
    this.makeBodyWood('body-wood');
    this.makeBodyIron('body-iron');
    this.makeBodyArmored('body-armored');
    this.makeBodyTank('body-tank');

    // weapon icons that mount on the car
    this.makeWeaponBow('wpn-bow');
    this.makeWeaponCrossbow('wpn-crossbow');
    this.makeWeaponCatapult('wpn-catapult');
    this.makeWeaponCannon('wpn-cannon');
    this.makeWeaponRocket('wpn-rocket');

    // projectiles
    this.makeShotBow('shot-bow');
    this.makeShotCrossbow('shot-crossbow');
    this.makeShotCatapult('shot-catapult');
    this.makeShotCannon('shot-cannon');
    this.makeShotRocket('shot-rocket');

    // shared fx / pickups / bosses
    this.makeEnemyRock('enemy-rock');
    this.makeCabbage('cabbage');
    this.makeScrap('scrap');
    this.makeFlag('flag');
    this.makePuff('puff');
    this.makeBolt('bolt');
    this.makeAxle('axle');
    this.makeTurret('turret');
    this.makeWheelSpin('wheel-spin');
    this.makeShieldPlate('shield-plate');
    this.makeCloud('cloud');
    this.makeSun('sun');
    this.makeFlake('flake');
    this.makeCrate('crate');
    this.makeHeart('heart', true);
    this.makeHeart('heart-empty', false);
    this.makeDrummer('drummer');
    this.makeGloop('gloop');
    this.makeBossMoldy('boss-moldy');
    this.makeBossSnaketail('boss-snaketail');
    this.makeBossYeti('boss-yeti');
    this.makeBossKrang('boss-krang');

    // per-level biome backgrounds, reskinned enemies, hazards, projectiles
    LEVELS.forEach((lv) => {
      const b = lv.biome;
      this.makeSky(`sky-${lv.id}`, GAME_WIDTH, GAME_HEIGHT, b.skyTop, b.skyBottom);
      this.makeHill(`hills-far-${lv.id}`, 360, 150, b.far, 0.55);
      this.makeHill(`hills-near-${lv.id}`, 300, 210, b.near, 0.7);
      this.makeGround(`ground-${lv.id}`, 256, 90, b.ground, b.groundEdge);
      this.makeRunner(`runner-${lv.id}`, lv.enemyPal);
      this.makeBrute(`brute-${lv.id}`, lv.enemyPal);
      this.makeLobber(`lobber-${lv.id}`, lv.enemyPal);
      this.makeFlyer(`flyer-${lv.id}`, lv.enemyPal);
      this.makeHazard(`hazard-${lv.id}`, lv.hazardStyle);
      this.makeProjBall(`proj-${lv.id}`, lv.projColor);
    });

    this.scene.start('Title');
  }

  // Vertical gradient sky, drawn one scanline at a time (cheap, runs once).
  makeSky(key, w, h, topColor, bottomColor) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    const top = Phaser.Display.Color.IntegerToColor(topColor);
    const bottom = Phaser.Display.Color.IntegerToColor(bottomColor);
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 100, t * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, y, w, 1);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // A single smooth hump that meets the baseline at both edges, so it tiles
  // seamlessly when repeated horizontally as a tileSprite.
  makeHill(key, w, h, color, peakRatio) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, h);
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * w;
      const y = h - Math.sin(t * Math.PI) * (h * peakRatio);
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Dirt band with a grassy top edge and evenly spaced road dashes (tiles).
  makeGround(key, w, h, groundColor, edgeColor) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(groundColor, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(edgeColor, 1);
    g.fillRect(0, 0, w, 12);
    // road dashes
    g.fillStyle(0xf2e6b8, 0.85);
    const dashY = 34;
    for (let x = 16; x < w; x += 64) {
      g.fillRect(x, dashY, 32, 6);
    }
    // a few darker specks for texture
    g.fillStyle(Math.max(0, groundColor - 0x0a0a06), 1);
    for (let i = 0; i < 14; i++) {
      const sx = (i * 53) % (w - 8);
      const sy = 50 + ((i * 29) % (h - 56));
      g.fillRect(sx, sy, 6, 4);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // All bodies share a 124x92 canvas with the wheels at the bottom, so they
  // line up on the ground and the weapon mount points stay consistent.
  drawWheels(g, leftX, rightX, radius, hubColor) {
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(leftX, 78, radius);
    g.fillCircle(rightX, 78, radius);
    g.fillStyle(hubColor, 1);
    g.fillCircle(leftX, 78, radius * 0.38);
    g.fillCircle(rightX, 78, radius * 0.38);
  }

  drawFlag(g, baseX, topY, color) {
    g.lineStyle(3, 0x6b4f2a, 1);
    g.beginPath();
    g.moveTo(baseX, topY + 22);
    g.lineTo(baseX, topY);
    g.strokePath();
    g.fillStyle(color, 1);
    g.fillTriangle(baseX, topY, baseX, topY + 14, baseX + 22, topY + 7);
  }

  // Tier 1 — wobbly cardboard box on two wheels with a red flag.
  makeBodyCardboard(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    this.drawWheels(g, 36, 92, 15, 0x55555f);
    g.fillStyle(0xc18a42, 1);
    g.fillRoundedRect(16, 38, 92, 36, 6);
    g.lineStyle(3, 0x9c6a2c, 1);
    g.strokeRoundedRect(16, 38, 92, 36, 6);
    g.beginPath();
    g.moveTo(62, 38);
    g.lineTo(62, 74);
    g.strokePath();
    this.drawFlag(g, 26, 14, 0xe2483a);
    g.generateTexture(key, 124, 92);
    g.destroy();
  }

  // Tier 2 — sturdier wooden wagon: planks, rope, blue flag, bigger wheels.
  makeBodyWood(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    this.drawWheels(g, 36, 94, 17, 0x6b4f2a);
    // plank body
    g.fillStyle(0xb07a3c, 1);
    g.fillRoundedRect(12, 30, 100, 44, 6);
    g.lineStyle(2, 0x8a5d29, 1);
    g.strokeRoundedRect(12, 30, 100, 44, 6);
    for (let x = 26; x < 110; x += 16) {
      g.beginPath();
      g.moveTo(x, 30);
      g.lineTo(x, 74);
      g.strokePath();
    }
    // rope band
    g.lineStyle(3, 0xd8b06a, 1);
    g.strokeRect(12, 48, 100, 0);
    this.drawFlag(g, 22, 8, 0x3b82d6);
    g.generateTexture(key, 124, 92);
    g.destroy();
  }

  // Tier 3 — riveted iron buggy: metal plates, rivets, a little cab.
  makeBodyIron(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    this.drawWheels(g, 38, 96, 18, 0x9aa0ab);
    // hull
    g.fillStyle(0x8b929c, 1);
    g.fillRoundedRect(10, 30, 104, 46, 8);
    g.fillStyle(0x767d88, 1);
    g.fillRoundedRect(10, 56, 104, 20, 8);
    g.lineStyle(3, 0x5d636d, 1);
    g.strokeRoundedRect(10, 30, 104, 46, 8);
    // cab / windshield
    g.fillStyle(0x6fb6d6, 1);
    g.fillRoundedRect(30, 22, 34, 18, 4);
    g.lineStyle(2, 0x5d636d, 1);
    g.strokeRoundedRect(30, 22, 34, 18, 4);
    // rivets
    g.fillStyle(0x5d636d, 1);
    for (let x = 18; x < 110; x += 16) {
      g.fillCircle(x, 36, 2.2);
      g.fillCircle(x, 70, 2.2);
    }
    this.drawFlag(g, 20, 6, 0xffd34d);
    g.generateTexture(key, 124, 92);
    g.destroy();
  }

  // Weapon icons mount by their back-center and extend to the right.
  makeWeaponBow(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // bow limb (arc bulging right)
    g.lineStyle(4, 0x8a5d29, 1);
    g.beginPath();
    g.arc(6, 16, 14, -Math.PI / 2.2, Math.PI / 2.2, false);
    g.strokePath();
    // string
    g.lineStyle(1.5, 0xe8e8e8, 1);
    g.beginPath();
    g.moveTo(6, 3);
    g.lineTo(6, 29);
    g.strokePath();
    // nocked arrow
    g.lineStyle(3, 0xffd34d, 1);
    g.beginPath();
    g.moveTo(6, 16);
    g.lineTo(28, 16);
    g.strokePath();
    g.fillStyle(0xe88f1a, 1);
    g.fillTriangle(26, 11, 26, 21, 32, 16);
    g.generateTexture(key, 34, 32);
    g.destroy();
  }

  makeWeaponCrossbow(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // stock
    g.fillStyle(0x7a5a30, 1);
    g.fillRoundedRect(0, 13, 30, 7, 2);
    // limbs
    g.lineStyle(4, 0x4a4a52, 1);
    g.beginPath();
    g.moveTo(20, 4);
    g.lineTo(20, 28);
    g.strokePath();
    // string
    g.lineStyle(1.5, 0xe8e8e8, 1);
    g.beginPath();
    g.moveTo(20, 6);
    g.lineTo(8, 16);
    g.lineTo(20, 26);
    g.strokePath();
    // bolt
    g.fillStyle(0xcfd3da, 1);
    g.fillRect(20, 14, 14, 4);
    g.fillStyle(0x9aa0ab, 1);
    g.fillTriangle(34, 12, 34, 20, 40, 16);
    g.generateTexture(key, 40, 32);
    g.destroy();
  }

  makeWeaponCatapult(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // frame
    g.fillStyle(0x6b4f2a, 1);
    g.fillRect(2, 24, 30, 6);
    g.lineStyle(4, 0x6b4f2a, 1);
    g.beginPath();
    g.moveTo(10, 28);
    g.lineTo(18, 8);
    g.strokePath();
    // throwing arm
    g.lineStyle(4, 0x8a5d29, 1);
    g.beginPath();
    g.moveTo(18, 8);
    g.lineTo(34, 14);
    g.strokePath();
    // bucket + rock
    g.fillStyle(0x9aa0ab, 1);
    g.fillCircle(34, 12, 7);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(34, 11, 4);
    g.generateTexture(key, 40, 34);
    g.destroy();
  }

  // A silly, non-scary "runner" baddie that faces left (toward the car).
  // Recoloured per biome via the palette. Drawn into ~64x66.
  makeRunner(key, pal) {
    if (this.textures.exists(key)) return;
    const W = 64;
    const H = 66;
    const g = this.add.graphics();

    // little club in the front (left) hand
    g.fillStyle(0x7a5a30, 1);
    g.fillRoundedRect(2, 30, 8, 18, 3);
    g.fillStyle(0x5e4523, 1);
    g.fillCircle(6, 30, 7);

    // ears
    g.fillStyle(pal.body, 1);
    g.fillTriangle(16, 18, 16, 36, 2, 24);
    g.fillTriangle(48, 18, 48, 36, 62, 24);

    // body
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(16, 26, 34, 34, 10);
    // belly
    g.fillStyle(pal.belly, 1);
    g.fillRoundedRect(24, 38, 18, 18, 8);
    // legs
    g.fillStyle(pal.dark, 1);
    g.fillRoundedRect(20, 56, 9, 8, 3);
    g.fillRoundedRect(36, 56, 9, 8, 3);
    // head
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(18, 8, 30, 24, 10);

    // eyes (big and goofy)
    g.fillStyle(pal.eye, 1);
    g.fillCircle(28, 19, 7);
    g.fillCircle(40, 19, 7);
    g.fillStyle(pal.pupil, 1);
    g.fillCircle(26, 20, 3.2);
    g.fillCircle(38, 20, 3.2);
    // angry-but-silly eyebrows
    g.lineStyle(3, pal.dark, 1);
    g.beginPath();
    g.moveTo(22, 11);
    g.lineTo(32, 15);
    g.moveTo(46, 11);
    g.lineTo(36, 15);
    g.strokePath();
    // grin with a tooth
    g.lineStyle(3, pal.dark, 1);
    g.beginPath();
    g.moveTo(28, 27);
    g.lineTo(38, 27);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(31, 27, 35, 27, 33, 31);

    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Brute — a big, bulky baddie. Tough, slow, can't be jumped over. ~96x96.
  makeBrute(key, pal) {
    if (this.textures.exists(key)) return;
    const W = 96;
    const H = 96;
    const g = this.add.graphics();
    // big club
    g.fillStyle(0x6b4f2a, 1);
    g.fillRoundedRect(2, 40, 12, 30, 4);
    g.fillStyle(0x5e4523, 1);
    g.fillCircle(8, 40, 11);
    // ears
    g.fillStyle(pal.body, 1);
    g.fillTriangle(24, 24, 24, 50, 4, 34);
    g.fillTriangle(72, 24, 72, 50, 92, 34);
    // body
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(22, 34, 54, 50, 14);
    // belly
    g.fillStyle(pal.belly, 1);
    g.fillRoundedRect(34, 50, 30, 28, 12);
    // legs
    g.fillStyle(pal.dark, 1);
    g.fillRoundedRect(28, 80, 14, 12, 4);
    g.fillRoundedRect(54, 80, 14, 12, 4);
    // head
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(28, 8, 42, 32, 12);
    // eyes
    g.fillStyle(pal.eye, 1);
    g.fillCircle(42, 22, 8);
    g.fillCircle(58, 22, 8);
    g.fillStyle(pal.pupil, 1);
    g.fillCircle(40, 24, 3.6);
    g.fillCircle(56, 24, 3.6);
    // angry brows
    g.lineStyle(4, pal.dark, 1);
    g.beginPath();
    g.moveTo(34, 12);
    g.lineTo(48, 18);
    g.moveTo(64, 12);
    g.lineTo(50, 18);
    g.strokePath();
    // tusks
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(44, 34, 48, 34, 45, 40);
    g.fillTriangle(54, 34, 58, 34, 55, 40);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Lobber — hoists a rock overhead to throw. ~62x74.
  makeLobber(key, pal) {
    if (this.textures.exists(key)) return;
    const W = 62;
    const H = 74;
    const g = this.add.graphics();
    // rock held up
    g.fillStyle(0x8b8f98, 1);
    g.fillCircle(38, 12, 12);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(34, 9, 5);
    // arm up to the rock
    g.lineStyle(5, pal.body, 1);
    g.beginPath();
    g.moveTo(30, 40);
    g.lineTo(38, 16);
    g.strokePath();
    // ears
    g.fillStyle(pal.body, 1);
    g.fillTriangle(16, 26, 16, 42, 4, 32);
    // body
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(14, 34, 30, 30, 9);
    g.fillStyle(pal.belly, 1);
    g.fillRoundedRect(20, 44, 16, 16, 7);
    // legs
    g.fillStyle(pal.dark, 1);
    g.fillRoundedRect(18, 60, 8, 10, 3);
    g.fillRoundedRect(30, 60, 8, 10, 3);
    // head
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(14, 14, 26, 22, 9);
    // eyes
    g.fillStyle(pal.eye, 1);
    g.fillCircle(22, 24, 6);
    g.fillCircle(33, 24, 6);
    g.fillStyle(pal.pupil, 1);
    g.fillCircle(20, 25, 2.8);
    g.fillCircle(31, 25, 2.8);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Flyer — a little winged imp. Faces left, flaps. ~74x52.
  makeFlyer(key, pal) {
    if (this.textures.exists(key)) return;
    const W = 74;
    const H = 52;
    const g = this.add.graphics();
    // wings
    g.fillStyle(pal.dark, 1);
    g.fillTriangle(40, 24, 72, 6, 70, 30);
    g.fillTriangle(40, 24, 64, 26, 70, 44);
    // body
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(18, 14, 30, 26, 10);
    // tail
    g.fillStyle(pal.dark, 1);
    g.fillTriangle(46, 22, 46, 32, 60, 27);
    // head
    g.fillStyle(pal.body, 1);
    g.fillRoundedRect(8, 12, 22, 20, 8);
    // ears
    g.fillTriangle(12, 12, 18, 12, 13, 2);
    g.fillTriangle(22, 12, 28, 12, 27, 2);
    // eyes
    g.fillStyle(pal.eye, 1);
    g.fillCircle(15, 22, 5);
    g.fillCircle(24, 22, 5);
    g.fillStyle(pal.pupil, 1);
    g.fillCircle(13, 23, 2.4);
    g.fillCircle(22, 23, 2.4);
    // little fangs
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(14, 28, 17, 28, 15.5, 32);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Goblin Drummer mini-boss — a goblin banging a big drum. ~96x104.
  makeDrummer(key) {
    if (this.textures.exists(key)) return;
    const W = 96;
    const H = 104;
    const g = this.add.graphics();
    // ears
    g.fillStyle(0x6fa336, 1);
    g.fillTriangle(30, 16, 30, 36, 14, 24);
    g.fillTriangle(66, 16, 66, 36, 82, 24);
    // head
    g.fillStyle(0x6fa336, 1);
    g.fillRoundedRect(30, 6, 36, 28, 10);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(42, 18, 7);
    g.fillCircle(56, 18, 7);
    g.fillStyle(0x222222, 1);
    g.fillCircle(40, 20, 3.2);
    g.fillCircle(54, 20, 3.2);
    // brows
    g.lineStyle(3, 0x4f7d22, 1);
    g.beginPath();
    g.moveTo(36, 10); g.lineTo(48, 15);
    g.moveTo(60, 10); g.lineTo(48, 15);
    g.strokePath();
    // body behind drum
    g.fillStyle(0x6fa336, 1);
    g.fillRoundedRect(28, 32, 40, 30, 10);
    // the drum
    g.fillStyle(0xb23b3b, 1);
    g.fillRoundedRect(20, 54, 56, 36, 8);
    g.fillStyle(0xf0e3c2, 1);
    g.fillEllipse(48, 56, 56, 14);
    g.lineStyle(3, 0xe2c34a, 1);
    g.strokeRoundedRect(20, 54, 56, 36, 8);
    // zig-zag drum trim
    g.lineStyle(2, 0xe2c34a, 1);
    g.beginPath();
    for (let x = 22; x < 74; x += 8) { g.moveTo(x, 66); g.lineTo(x + 4, 78); g.lineTo(x + 8, 66); }
    g.strokePath();
    // legs
    g.fillStyle(0x4f7d22, 1);
    g.fillRoundedRect(30, 90, 12, 12, 3);
    g.fillRoundedRect(54, 90, 12, 12, 3);
    // drumsticks
    g.lineStyle(4, 0x8a5d29, 1);
    g.beginPath();
    g.moveTo(8, 40); g.lineTo(26, 56);
    g.moveTo(88, 40); g.lineTo(70, 56);
    g.strokePath();
    g.fillStyle(0xc9a06a, 1);
    g.fillCircle(8, 40, 5);
    g.fillCircle(88, 40, 5);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Big Chief Gloop — a fat goblin chief in a wheelbarrow. ~168x132.
  makeGloop(key) {
    if (this.textures.exists(key)) return;
    const W = 168;
    const H = 132;
    const g = this.add.graphics();
    // wheelbarrow tray
    g.fillStyle(0x8a5d29, 1);
    g.fillRoundedRect(20, 70, 128, 40, 10);
    g.lineStyle(3, 0x6b4720, 1);
    g.strokeRoundedRect(20, 70, 128, 40, 10);
    // wheel
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(40, 116, 16);
    g.fillStyle(0x55555f, 1);
    g.fillCircle(40, 116, 6);
    // leg/stand
    g.lineStyle(5, 0x6b4720, 1);
    g.beginPath();
    g.moveTo(132, 108); g.lineTo(146, 122);
    g.strokePath();
    // fat goblin body
    g.fillStyle(0x5f9a2f, 1);
    g.fillEllipse(86, 64, 96, 70);
    g.fillStyle(0x86c04e, 1);
    g.fillEllipse(86, 74, 60, 40);
    // arms
    g.fillStyle(0x5f9a2f, 1);
    g.fillRoundedRect(118, 50, 26, 16, 8);
    // head
    g.fillStyle(0x5f9a2f, 1);
    g.fillRoundedRect(52, 8, 64, 44, 16);
    // ears
    g.fillTriangle(52, 16, 52, 40, 34, 28);
    g.fillTriangle(116, 16, 116, 40, 134, 28);
    // chief headband + feathers
    g.fillStyle(0xb23b3b, 1);
    g.fillRect(52, 14, 64, 8);
    g.fillStyle(0xe2c34a, 1);
    g.fillTriangle(64, 14, 72, 14, 60, -6);
    g.fillStyle(0x5db4ff, 1);
    g.fillTriangle(80, 14, 88, 14, 90, -8);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(72, 30, 9);
    g.fillCircle(96, 30, 9);
    g.fillStyle(0x222222, 1);
    g.fillCircle(70, 33, 4);
    g.fillCircle(94, 33, 4);
    // angry brows
    g.lineStyle(5, 0x3c641a, 1);
    g.beginPath();
    g.moveTo(60, 20); g.lineTo(82, 28);
    g.moveTo(108, 20); g.lineTo(86, 28);
    g.strokePath();
    // grin + tusks
    g.lineStyle(4, 0x2c4a16, 1);
    g.beginPath(); g.moveTo(74, 44); g.lineTo(96, 44); g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(76, 44, 80, 44, 78, 50);
    g.fillTriangle(90, 44, 94, 44, 92, 50);
    // a cabbage in hand
    g.fillStyle(0x7cc24a, 1);
    g.fillCircle(140, 52, 12);
    g.lineStyle(2, 0x4f8a26, 1);
    g.strokeCircle(140, 52, 12);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // A leafy cabbage that Gloop throws.
  makeCabbage(key) {
    if (this.textures.exists(key)) return;
    const S = 32;
    const g = this.add.graphics();
    g.fillStyle(0x4f8a26, 1);
    g.fillCircle(16, 16, 15);
    g.fillStyle(0x7cc24a, 1);
    g.fillCircle(16, 16, 11);
    g.lineStyle(2, 0x3f7020, 1);
    g.beginPath();
    g.moveTo(16, 5); g.lineTo(16, 27);
    g.moveTo(6, 12); g.lineTo(26, 20);
    g.moveTo(26, 12); g.lineTo(6, 20);
    g.strokePath();
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Bolt-on top turret: a flat-topped, flat-bottomed armored gun segment so it
  // STACKS FLUSH into a clean tower. Anchored at the bottom-center.
  makeTurret(key) {
    if (this.textures.exists(key)) return;
    const W = 52;
    const H = 30;
    const g = this.add.graphics();
    // main armored block (flat top & bottom, small corner radius)
    g.fillStyle(0x6b727d, 1);
    g.fillRoundedRect(8, 1, 30, 27, 4);
    // top highlight band
    g.fillStyle(0x828a95, 1);
    g.fillRoundedRect(8, 1, 30, 7, 4);
    // bottom mount lip — a touch wider, so it visually sits on the one below
    g.fillStyle(0x4a4f57, 1);
    g.fillRect(6, 23, 34, 7);
    // outline + rivets
    g.lineStyle(2, 0x3a3f47, 1);
    g.strokeRoundedRect(8, 1, 30, 27, 4);
    g.fillStyle(0x3a3f47, 1);
    [8, 21].forEach((yy) => {
      g.fillCircle(13, yy, 1.6);
      g.fillCircle(33, yy, 1.6);
    });
    // barrel pointing right
    g.fillStyle(0x33383f, 1);
    g.fillRoundedRect(30, 9, 20, 10, 3);
    g.fillStyle(0x55606b, 1);
    g.fillRoundedRect(46, 7, 5, 14, 2);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // A spoked wheel that overlays each baked wheel and rotates for a sense of
  // rolling. Reference radius 18 (36x36); the car scales it per wheel size.
  makeWheelSpin(key) {
    if (this.textures.exists(key)) return;
    const R = 18;
    const g = this.add.graphics();
    // tire
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(R, R, R);
    // rim
    g.fillStyle(0x4a4f57, 1);
    g.fillCircle(R, R, R * 0.74);
    // spokes (so rotation reads)
    g.lineStyle(3, 0xced2da, 1);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4;
      g.beginPath();
      g.moveTo(R + Math.cos(a) * R * 0.7, R + Math.sin(a) * R * 0.7);
      g.lineTo(R - Math.cos(a) * R * 0.7, R - Math.sin(a) * R * 0.7);
      g.strokePath();
    }
    // hub
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(R, R, R * 0.28);
    g.generateTexture(key, R * 2, R * 2);
    g.destroy();
  }

  // A rounded shield plate a shielded enemy holds up front. Drawn light so it
  // can be tinted to each biome's dark palette colour at spawn; a boss/brute
  // must be shot enough to break it before the body takes damage.
  makeShieldPlate(key) {
    if (this.textures.exists(key)) return;
    const W = 26;
    const H = 54;
    const g = this.add.graphics();
    // plate body
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(3, 2, 20, 50, 9);
    // inner panel (slightly darker so the tint reads as shaded)
    g.fillStyle(0xcfd3da, 1);
    g.fillRoundedRect(7, 7, 12, 40, 6);
    // vertical highlight
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(9, 9, 4, 36, 2);
    // boss/rim outline + centre stud
    g.lineStyle(3, 0x9aa0ab, 1);
    g.strokeRoundedRect(3, 2, 20, 50, 9);
    g.fillStyle(0x9aa0ab, 1);
    g.fillCircle(13, 27, 3.4);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Sturdy Axle reward icon — an axle with two little wheels.
  makeAxle(key) {
    if (this.textures.exists(key)) return;
    const W = 56;
    const H = 32;
    const g = this.add.graphics();
    g.fillStyle(0x9aa0ab, 1);
    g.fillRoundedRect(8, 13, 40, 6, 3);
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(12, 16, 11);
    g.fillCircle(44, 16, 11);
    g.fillStyle(0x8a8f98, 1);
    g.fillCircle(12, 16, 4);
    g.fillCircle(44, 16, 4);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // A grey rock the lobber throws (also used when it lands/poofs).
  makeEnemyRock(key) {
    if (this.textures.exists(key)) return;
    const S = 22;
    const g = this.add.graphics();
    g.fillStyle(0x8b8f98, 1);
    g.fillCircle(11, 11, 10);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0x5a5e66, 1);
    g.fillCircle(14, 14, 2.5);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Ground hazard — a spiky rock/log pile to jump over. Anchored at bottom.
  makeHazard(key, style) {
    if (this.textures.exists(key)) return;
    const W = 76;
    const H = 56;
    const g = this.add.graphics();

    if (style === 'tombstone') {
      g.fillStyle(0x9aa0ab, 1);
      g.fillRoundedRect(16, 14, 44, 42, 6);
      g.fillStyle(0x7c828c, 1);
      g.fillRoundedRect(16, 14, 44, 42, 6);
      g.fillStyle(0x9aa0ab, 1);
      g.fillRect(16, 28, 44, 28);
      g.lineStyle(3, 0x6b7078, 1);
      g.beginPath();
      g.moveTo(28, 26); g.lineTo(48, 26);
      g.moveTo(38, 26); g.lineTo(38, 46);
      g.strokePath();
    } else if (style === 'cactus') {
      g.fillStyle(0x4f9a3c, 1);
      g.fillRoundedRect(30, 8, 16, 48, 6);
      g.fillRoundedRect(14, 26, 14, 10, 4);
      g.fillRoundedRect(14, 18, 10, 20, 4);
      g.fillRoundedRect(48, 30, 14, 10, 4);
      g.fillRoundedRect(52, 22, 10, 20, 4);
      g.fillStyle(0x3c7d2c, 1);
      for (let y = 14; y < 52; y += 8) g.fillRect(37, y, 2, 4);
    } else if (style === 'ice') {
      g.fillStyle(0xbfe6f5, 1);
      for (let i = 0; i < 4; i++) {
        const x = 12 + i * 16;
        g.fillTriangle(x, 56, x + 14, 56, x + 7, 8 + (i % 2) * 10);
      }
      g.fillStyle(0xe6f6ff, 0.7);
      for (let i = 0; i < 4; i++) {
        const x = 12 + i * 16;
        g.fillTriangle(x + 4, 56, x + 10, 56, x + 7, 16 + (i % 2) * 10);
      }
    } else if (style === 'lava') {
      g.fillStyle(0x2e2622, 1);
      g.fillRoundedRect(6, 30, 64, 26, 8);
      g.fillStyle(0xff7a3a, 1);
      g.fillRoundedRect(10, 44, 56, 10, 4);
      g.fillStyle(0xffd24d, 1);
      for (let i = 0; i < 5; i++) g.fillCircle(16 + i * 12, 40, 3);
      g.fillStyle(0x4a3a36, 1);
      for (let i = 0; i < 3; i++) g.fillTriangle(18 + i * 20, 30, 30 + i * 20, 30, 24 + i * 20, 16);
    } else {
      // 'log' (default) — spiky log
      g.fillStyle(0x7a5a30, 1);
      g.fillRoundedRect(6, 30, 64, 24, 8);
      g.fillStyle(0x5e4523, 1);
      g.fillCircle(12, 42, 9);
      g.fillStyle(0x8a6a3a, 1);
      g.fillCircle(12, 42, 4);
      g.fillStyle(0xcfd3da, 1);
      for (let i = 0; i < 4; i++) {
        const x = 18 + i * 14;
        g.fillTriangle(x, 32, x + 12, 32, x + 6, 12);
      }
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // A round, biome-coloured boss projectile.
  makeProjBall(key, color) {
    if (this.textures.exists(key)) return;
    const S = 30;
    const g = this.add.graphics();
    const dark = Math.max(0, color - 0x222222);
    g.fillStyle(dark, 1);
    g.fillCircle(15, 15, 14);
    g.fillStyle(color, 1);
    g.fillCircle(15, 15, 11);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(11, 11, 3);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Heart icon for the health HUD (filled or empty outline).
  makeHeart(key, filled) {
    if (this.textures.exists(key)) return;
    const S = 30;
    const g = this.add.graphics();
    const color = filled ? 0xff5d6c : 0x3a3d4a;
    g.fillStyle(color, 1);
    g.fillCircle(10, 11, 6);
    g.fillCircle(20, 11, 6);
    g.fillTriangle(4, 13, 26, 13, 15, 27);
    if (!filled) {
      g.fillStyle(0x20232f, 1);
      g.fillCircle(10, 11, 3);
      g.fillCircle(20, 11, 3);
      g.fillTriangle(8, 14, 22, 14, 15, 23);
    } else {
      g.fillStyle(0xff8a96, 1);
      g.fillCircle(8, 9, 2);
    }
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // A little gold scrap "nut" pickup.
  makeScrap(key) {
    if (this.textures.exists(key)) return;
    const S = 26;
    const g = this.add.graphics();
    g.fillStyle(0xc9961f, 1);
    g.fillCircle(13, 13, 12);
    g.fillStyle(0xf4c542, 1);
    g.fillCircle(13, 13, 9);
    g.fillStyle(0xc9961f, 1);
    g.fillCircle(13, 13, 4);
    // shine
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(9, 9, 2.5);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Checkered finish flag on a pole, anchored at the bottom of the texture.
  makeFlag(key) {
    if (this.textures.exists(key)) return;
    const W = 76;
    const H = 190;
    const g = this.add.graphics();
    // pole
    g.fillStyle(0xbfc4cc, 1);
    g.fillRect(8, 4, 7, H - 4);
    g.fillStyle(0x8b8f98, 1);
    g.fillRect(8, 4, 3, H - 4);
    // checkered flag
    const cols = 6;
    const rows = 4;
    const cw = 9;
    const ch = 12;
    const ox = 15;
    const oy = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dark = (r + c) % 2 === 0;
        g.fillStyle(dark ? 0x2b2b33 : 0xffffff, 1);
        g.fillRect(ox + c * cw, oy + r * ch, cw, ch);
      }
    }
    // base mound
    g.fillStyle(0x5a4222, 1);
    g.fillEllipse(20, H - 4, 44, 16);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Fluffy cloud made of overlapping soft blobs (tinted per biome at use).
  makeCloud(key) {
    if (this.textures.exists(key)) return;
    const W = 150;
    const H = 64;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.85);
    const blobs = [
      [40, 40, 26], [72, 32, 32], [104, 42, 24], [58, 46, 22], [90, 48, 20],
    ];
    blobs.forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(30, 40, 90, 18, 9);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Freestyle power-up crate (tinted per pickup type at use).
  makeCrate(key) {
    if (this.textures.exists(key)) return;
    const S = 30;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(2, 2, 26, 26, 5);
    g.lineStyle(3, 0x000000, 0.35);
    g.strokeRoundedRect(2, 2, 26, 26, 5);
    // a star so it reads as a pickup
    g.fillStyle(0xffffff, 1);
    const cx = 15, cy = 15, r = 9;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle(0x000000, 0.25);
    g.fillPath();
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Tiny soft particle for weather (snow, embers, pollen, etc.; tinted at use).
  makeFlake(key) {
    if (this.textures.exists(key)) return;
    const S = 10;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(5, 5, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(5, 5, 2.6);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Soft glowing sun/moon disc (tinted per biome at use).
  makeSun(key) {
    if (this.textures.exists(key)) return;
    const S = 150;
    const c = 75;
    const g = this.add.graphics();
    for (let i = 6; i >= 1; i--) {
      g.fillStyle(0xffffff, 0.1 + (6 - i) * 0.02);
      g.fillCircle(c, c, 30 + i * 7);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 34);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Soft round puff used for the cartoony defeat burst (tinted at use).
  makePuff(key) {
    if (this.textures.exists(key)) return;
    const S = 24;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(12, 12, 11);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 7);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Projectiles ---------------------------------------------------------
  makeShotBow(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xffd34d, 1);
    g.fillRoundedRect(0, 2, 16, 6, 3);
    g.fillStyle(0xe88f1a, 1);
    g.fillTriangle(14, 0, 14, 10, 22, 5);
    g.generateTexture(key, 22, 10);
    g.destroy();
  }

  makeShotCrossbow(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xcfd3da, 1);
    g.fillRect(0, 3, 18, 4);
    g.fillStyle(0x8b929c, 1);
    g.fillTriangle(16, 1, 16, 9, 24, 5);
    g.generateTexture(key, 24, 10);
    g.destroy();
  }

  makeShotCatapult(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0x8b8f98, 1);
    g.fillCircle(9, 9, 9);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(7, 7, 4);
    g.generateTexture(key, 18, 18);
    g.destroy();
  }

  // Bolt — the friendly tinkering robot dog who runs the Garage.
  makeBolt(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // body
    g.fillStyle(0xd7a13a, 1);
    g.fillRoundedRect(10, 34, 52, 30, 8);
    // legs
    g.fillStyle(0xb9842a, 1);
    g.fillRoundedRect(16, 60, 8, 14, 3);
    g.fillRoundedRect(48, 60, 8, 14, 3);
    // head
    g.fillStyle(0xe7b245, 1);
    g.fillRoundedRect(44, 14, 34, 30, 8);
    // ear (antenna)
    g.lineStyle(3, 0x8b929c, 1);
    g.beginPath();
    g.moveTo(52, 14);
    g.lineTo(50, 2);
    g.strokePath();
    g.fillStyle(0xff5d5d, 1);
    g.fillCircle(50, 2, 3);
    // snout
    g.fillStyle(0xb9842a, 1);
    g.fillRoundedRect(70, 30, 12, 10, 3);
    // eye (screen)
    g.fillStyle(0x2b2b33, 1);
    g.fillRoundedRect(52, 22, 18, 12, 3);
    g.fillStyle(0x6fd0ff, 1);
    g.fillCircle(58, 28, 3);
    g.fillCircle(65, 28, 3);
    // tail (bolt)
    g.fillStyle(0x9aa0ab, 1);
    g.fillTriangle(10, 38, 10, 50, 2, 44);
    g.generateTexture(key, 86, 76);
    g.destroy();
  }

  makeShotCannon(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0x3a3d44, 1);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(7, 7, 3.5);
    g.generateTexture(key, 20, 20);
    g.destroy();
  }

  makeShotRocket(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0xe04a3a, 1);
    g.fillRoundedRect(0, 3, 18, 8, 3);
    g.fillStyle(0xcfd3da, 1);
    g.fillTriangle(16, 1, 16, 13, 26, 7);
    g.fillStyle(0xffd24d, 1);
    g.fillTriangle(0, 3, 0, 11, -6, 7); // exhaust flame
    g.generateTexture(key, 28, 14);
    g.destroy();
  }

  // Tier 4 — Armored Truck: heavy plated pickup with bull bars. 124x92.
  makeBodyArmored(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    this.drawWheels(g, 38, 96, 18, 0x9aa0ab);
    // hull
    g.fillStyle(0x5b626d, 1);
    g.fillRoundedRect(8, 30, 108, 48, 8);
    g.fillStyle(0x474d57, 1);
    g.fillRoundedRect(8, 56, 108, 22, 8);
    g.lineStyle(3, 0x33383f, 1);
    g.strokeRoundedRect(8, 30, 108, 48, 8);
    // armored cab
    g.fillStyle(0x6b727d, 1);
    g.fillRoundedRect(26, 20, 40, 20, 4);
    g.fillStyle(0x9fd0e8, 1);
    g.fillRoundedRect(32, 24, 28, 12, 3);
    // bull bars (front, right side)
    g.lineStyle(5, 0x9aa0ab, 1);
    g.beginPath();
    g.moveTo(116, 40); g.lineTo(124, 40);
    g.moveTo(116, 56); g.lineTo(124, 56);
    g.moveTo(122, 36); g.lineTo(122, 60);
    g.strokePath();
    // rivets
    g.fillStyle(0x33383f, 1);
    for (let x = 16; x < 112; x += 16) { g.fillCircle(x, 36, 2.4); g.fillCircle(x, 72, 2.4); }
    this.drawFlag(g, 18, 6, 0xff7a3a);
    g.generateTexture(key, 124, 92);
    g.destroy();
  }

  // Tier 5 — Battle Tank: treads, turret, antenna flag. 124x92.
  makeBodyTank(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // tread base
    g.fillStyle(0x33383f, 1);
    g.fillRoundedRect(6, 64, 112, 24, 12);
    g.fillStyle(0x1f2329, 1);
    for (let x = 16; x < 112; x += 16) g.fillCircle(x, 76, 5);
    g.fillStyle(0x55606b, 1);
    g.fillCircle(20, 76, 9);
    g.fillCircle(104, 76, 9);
    // hull
    g.fillStyle(0x556070, 1);
    g.fillRoundedRect(14, 40, 96, 30, 8);
    g.lineStyle(3, 0x39404a, 1);
    g.strokeRoundedRect(14, 40, 96, 30, 8);
    // turret
    g.fillStyle(0x6b7888, 1);
    g.fillRoundedRect(34, 24, 52, 24, 10);
    g.fillStyle(0x4a5460, 1);
    g.fillRoundedRect(40, 30, 40, 12, 6);
    // rivets
    g.fillStyle(0x39404a, 1);
    for (let x = 22; x < 104; x += 14) g.fillCircle(x, 50, 2.2);
    this.drawFlag(g, 28, 4, 0xffd34d);
    g.generateTexture(key, 124, 92);
    g.destroy();
  }

  makeWeaponCannon(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.fillStyle(0x4a4f57, 1);
    g.fillRoundedRect(0, 8, 30, 16, 4);
    g.fillStyle(0x33383f, 1);
    g.fillRoundedRect(26, 6, 10, 20, 3); // muzzle ring
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(6, 16, 6);
    g.generateTexture(key, 40, 32);
    g.destroy();
  }

  makeWeaponRocket(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // launch tube
    g.fillStyle(0x4f5a48, 1);
    g.fillRoundedRect(0, 8, 34, 16, 5);
    g.fillStyle(0x39402f, 1);
    g.fillRoundedRect(0, 12, 34, 8, 3);
    // rocket nose poking out
    g.fillStyle(0xe04a3a, 1);
    g.fillTriangle(34, 8, 34, 24, 44, 16);
    g.generateTexture(key, 44, 32);
    g.destroy();
  }

  // ---- Bosses (levels 2–5) ----------------------------------------------

  // Mayor Moldy — a tall top-hat zombie. ~150x132.
  makeBossMoldy(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // legs
    g.fillStyle(0x3f4a36, 1);
    g.fillRoundedRect(54, 96, 16, 34, 5);
    g.fillRoundedRect(82, 96, 16, 34, 5);
    // tattered coat
    g.fillStyle(0x4a5566, 1);
    g.fillRoundedRect(40, 50, 72, 60, 12);
    g.fillStyle(0x5b6678, 1);
    g.fillRoundedRect(62, 56, 26, 50, 8); // shirt
    // sash
    g.fillStyle(0xb23b3b, 1);
    g.fillTriangle(46, 54, 56, 54, 92, 104);
    // arms
    g.fillStyle(0x8fae74, 1);
    g.fillRoundedRect(28, 56, 16, 40, 6);
    g.fillRoundedRect(108, 56, 16, 40, 6);
    // head
    g.fillStyle(0x8fae74, 1);
    g.fillRoundedRect(54, 14, 44, 40, 12);
    g.fillStyle(0x7a9a62, 1);
    g.fillRect(54, 40, 44, 8); // jaw shadow
    // ears
    g.fillTriangle(54, 24, 54, 40, 42, 32);
    g.fillTriangle(98, 24, 98, 40, 110, 32);
    // top hat
    g.fillStyle(0x2b2b33, 1);
    g.fillRect(48, 6, 56, 8);
    g.fillRect(58, -14, 36, 22);
    g.fillStyle(0xb23b3b, 1);
    g.fillRect(58, 2, 36, 4);
    // eyes (sickly)
    g.fillStyle(0xf2e9a0, 1);
    g.fillCircle(68, 30, 7);
    g.fillCircle(86, 30, 7);
    g.fillStyle(0x3a3a2a, 1);
    g.fillCircle(67, 31, 3);
    g.fillCircle(85, 31, 3);
    // stitched grin
    g.lineStyle(3, 0x4a5a38, 1);
    g.beginPath();
    g.moveTo(64, 46); g.lineTo(88, 46);
    for (let x = 66; x < 88; x += 6) { g.moveTo(x, 42); g.lineTo(x, 50); }
    g.strokePath();
    g.generateTexture(key, 150, 150);
    g.destroy();
  }

  // Sheriff Snaketail — a bandit on a big scorpion. ~160x132.
  makeBossSnaketail(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // scorpion body
    g.fillStyle(0x9c5a2c, 1);
    g.fillEllipse(76, 96, 96, 44);
    g.fillStyle(0x7a4420, 1);
    g.fillEllipse(76, 104, 70, 24);
    // legs
    g.lineStyle(5, 0x7a4420, 1);
    g.beginPath();
    for (let i = 0; i < 3; i++) { g.moveTo(50 + i * 18, 110); g.lineTo(40 + i * 18, 128); }
    g.strokePath();
    // claw (front-left)
    g.fillStyle(0x9c5a2c, 1);
    g.fillCircle(24, 92, 14);
    g.fillTriangle(10, 86, 24, 80, 24, 96);
    // curled tail with stinger (back, up high)
    g.lineStyle(12, 0x9c5a2c, 1);
    g.beginPath();
    g.moveTo(120, 96);
    g.lineTo(140, 70);
    g.lineTo(126, 44);
    g.strokePath();
    g.fillStyle(0xe2c34a, 1);
    g.fillTriangle(118, 44, 134, 44, 126, 26); // stinger
    // bandit rider
    g.fillStyle(0xc98f4a, 1);
    g.fillRoundedRect(60, 44, 34, 36, 10); // body
    g.fillStyle(0x9c6a2c, 1);
    g.fillRoundedRect(66, 16, 24, 24, 8); // head
    // cowboy hat
    g.fillStyle(0x6b4f2a, 1);
    g.fillRect(54, 12, 48, 6);
    g.fillRoundedRect(66, -2, 24, 16, 4);
    // bandana
    g.fillStyle(0xb23b3b, 1);
    g.fillRect(66, 32, 24, 8);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(73, 26, 5);
    g.fillCircle(84, 26, 5);
    g.fillStyle(0x222222, 1);
    g.fillCircle(72, 27, 2.4);
    g.fillCircle(83, 27, 2.4);
    g.generateTexture(key, 160, 140);
    g.destroy();
  }

  // Frost King Yeti — a big armored yeti with an ice crown. ~150x132.
  makeBossYeti(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // legs/feet
    g.fillStyle(0xdfeefb, 1);
    g.fillRoundedRect(40, 100, 26, 30, 8);
    g.fillRoundedRect(86, 100, 26, 30, 8);
    // body fur
    g.fillStyle(0xeaf4fb, 1);
    g.fillEllipse(76, 78, 96, 76);
    g.fillStyle(0xc9e2f2, 1);
    g.fillEllipse(76, 88, 60, 50);
    // arms
    g.fillStyle(0xeaf4fb, 1);
    g.fillRoundedRect(20, 52, 22, 52, 11);
    g.fillRoundedRect(110, 52, 22, 52, 11);
    // head
    g.fillStyle(0xeaf4fb, 1);
    g.fillRoundedRect(48, 18, 56, 44, 16);
    // ice crown
    g.fillStyle(0x7fc6f0, 1);
    for (let i = 0; i < 4; i++) {
      const x = 50 + i * 14;
      g.fillTriangle(x, 20, x + 12, 20, x + 6, 0);
    }
    // eyes (icy blue, angry)
    g.fillStyle(0x2a5a78, 1);
    g.fillCircle(66, 38, 7);
    g.fillCircle(86, 38, 7);
    g.fillStyle(0x9fe0ff, 1);
    g.fillCircle(66, 38, 3);
    g.fillCircle(86, 38, 3);
    g.lineStyle(4, 0xbfe0f2, 1);
    g.beginPath();
    g.moveTo(58, 30); g.lineTo(72, 36);
    g.moveTo(94, 30); g.lineTo(80, 36);
    g.strokePath();
    // tusks
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(64, 52, 70, 52, 67, 60);
    g.fillTriangle(82, 52, 88, 52, 85, 60);
    g.generateTexture(key, 150, 140);
    g.destroy();
  }

  // King Krang — the mecha-goblin warlord (final boss). ~160x140.
  makeBossKrang(key) {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    // legs
    g.fillStyle(0x33383f, 1);
    g.fillRoundedRect(46, 104, 22, 30, 5);
    g.fillRoundedRect(92, 104, 22, 30, 5);
    // armored body
    g.fillStyle(0x5b626d, 1);
    g.fillRoundedRect(38, 52, 84, 62, 12);
    g.fillStyle(0x474d57, 1);
    g.fillRoundedRect(54, 64, 52, 40, 10); // chest plate
    g.fillStyle(0xff5d4d, 1);
    g.fillCircle(80, 84, 9); // power core
    g.fillStyle(0xffd24d, 1);
    g.fillCircle(80, 84, 4);
    // shoulder cannons
    g.fillStyle(0x39404a, 1);
    g.fillRoundedRect(20, 50, 26, 18, 5);
    g.fillRoundedRect(114, 50, 26, 18, 5);
    // head
    g.fillStyle(0x6b727d, 1);
    g.fillRoundedRect(56, 16, 48, 38, 10);
    // horns
    g.fillStyle(0xcfd3da, 1);
    g.fillTriangle(56, 18, 64, 18, 48, 2);
    g.fillTriangle(96, 18, 104, 18, 112, 2);
    // glowing red eyes
    g.fillStyle(0xff3a2a, 1);
    g.fillRoundedRect(64, 30, 12, 8, 2);
    g.fillRoundedRect(84, 30, 12, 8, 2);
    g.fillStyle(0xffd24d, 1);
    g.fillRect(67, 32, 3, 3);
    g.fillRect(87, 32, 3, 3);
    // metal grin
    g.lineStyle(3, 0x2b2b33, 1);
    g.beginPath();
    g.moveTo(64, 46); g.lineTo(96, 46);
    for (let x = 68; x < 96; x += 7) { g.moveTo(x, 42); g.lineTo(x, 50); }
    g.strokePath();
    g.generateTexture(key, 160, 140);
    g.destroy();
  }
}
