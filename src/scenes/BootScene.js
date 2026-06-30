import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

// BootScene generates all placeholder art as in-code textures so the project
// has zero binary assets for now. We'll swap these for real sprites later.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.makeSky('sky', GAME_WIDTH, GAME_HEIGHT);
    this.makeHill('hills-far', 360, 150, COLORS.farHills, 0.55);
    this.makeHill('hills-near', 300, 210, COLORS.nearHills, 0.7);
    this.makeGround('ground', 256, 90);

    // car bodies (progressively cooler)
    this.makeBodyCardboard('body-cardboard');
    this.makeBodyWood('body-wood');
    this.makeBodyIron('body-iron');

    // weapon icons that mount on the car
    this.makeWeaponBow('wpn-bow');
    this.makeWeaponCrossbow('wpn-crossbow');
    this.makeWeaponCatapult('wpn-catapult');

    // projectiles
    this.makeShotBow('shot-bow');
    this.makeShotCrossbow('shot-crossbow');
    this.makeShotCatapult('shot-catapult');

    // enemies & fx
    this.makeGoblin('goblin');
    this.makeBrute('brute');
    this.makeLobber('lobber');
    this.makeFlyer('flyer');
    this.makeEnemyRock('enemy-rock');
    this.makeHazard('hazard');
    this.makeScrap('scrap');
    this.makeFlag('flag');
    this.makePuff('puff');
    this.makeBolt('bolt');
    this.makeHeart('heart', true);
    this.makeHeart('heart-empty', false);

    this.scene.start('Game');
  }

  // Vertical gradient sky, drawn one scanline at a time (cheap, runs once).
  makeSky(key, w, h) {
    const g = this.add.graphics();
    const top = Phaser.Display.Color.IntegerToColor(COLORS.skyTop);
    const bottom = Phaser.Display.Color.IntegerToColor(COLORS.skyBottom);
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
  makeGround(key, w, h) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.ground, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(COLORS.groundEdge, 1);
    g.fillRect(0, 0, w, 12);
    // road dashes
    g.fillStyle(0xf2e6b8, 1);
    const dashY = 34;
    for (let x = 16; x < w; x += 64) {
      g.fillRect(x, dashY, 32, 6);
    }
    // a few darker dirt specks for texture
    g.fillStyle(COLORS.ground - 0x0a0a06, 1);
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
    g.fillStyle(COLORS.wheel, 1);
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
    const g = this.add.graphics();
    this.drawWheels(g, 36, 92, 15, 0x55555f);
    g.fillStyle(COLORS.cardboard, 1);
    g.fillRoundedRect(16, 38, 92, 36, 6);
    g.lineStyle(3, COLORS.cardboardDark, 1);
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

  // A silly, non-scary goblin that faces left (toward the car). Big eyes,
  // pointy ears, a little club. Drawn into ~64x66.
  makeGoblin(key) {
    const W = 64;
    const H = 66;
    const g = this.add.graphics();

    // little club in the front (left) hand
    g.fillStyle(0x7a5a30, 1);
    g.fillRoundedRect(2, 30, 8, 18, 3);
    g.fillStyle(0x5e4523, 1);
    g.fillCircle(6, 30, 7);

    // ears
    g.fillStyle(COLORS.goblin, 1);
    g.fillTriangle(16, 18, 16, 36, 2, 24);
    g.fillTriangle(48, 18, 48, 36, 62, 24);

    // body
    g.fillStyle(COLORS.goblin, 1);
    g.fillRoundedRect(16, 26, 34, 34, 10);
    // belly
    g.fillStyle(COLORS.goblinBelly, 1);
    g.fillRoundedRect(24, 38, 18, 18, 8);
    // legs
    g.fillStyle(COLORS.goblinDark, 1);
    g.fillRoundedRect(20, 56, 9, 8, 3);
    g.fillRoundedRect(36, 56, 9, 8, 3);
    // head
    g.fillStyle(COLORS.goblin, 1);
    g.fillRoundedRect(18, 8, 30, 24, 10);

    // eyes (big and goofy)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28, 19, 7);
    g.fillCircle(40, 19, 7);
    g.fillStyle(0x222222, 1);
    g.fillCircle(26, 20, 3.2);
    g.fillCircle(38, 20, 3.2);
    // angry-but-silly eyebrows
    g.lineStyle(3, COLORS.goblinDark, 1);
    g.beginPath();
    g.moveTo(22, 11);
    g.lineTo(32, 15);
    g.moveTo(46, 11);
    g.lineTo(36, 15);
    g.strokePath();
    // grin with a tooth
    g.lineStyle(3, 0x2c4a16, 1);
    g.beginPath();
    g.moveTo(28, 27);
    g.lineTo(38, 27);
    g.strokePath();
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(31, 27, 35, 27, 33, 31);

    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Brute — a big, bulky goblin. Tough, slow, can't be jumped over. ~96x96.
  makeBrute(key) {
    const W = 96;
    const H = 96;
    const g = this.add.graphics();
    // big club
    g.fillStyle(0x6b4f2a, 1);
    g.fillRoundedRect(2, 40, 12, 30, 4);
    g.fillStyle(0x5e4523, 1);
    g.fillCircle(8, 40, 11);
    // ears
    g.fillStyle(0x5f9a2f, 1);
    g.fillTriangle(24, 24, 24, 50, 4, 34);
    g.fillTriangle(72, 24, 72, 50, 92, 34);
    // body
    g.fillStyle(0x5f9a2f, 1);
    g.fillRoundedRect(22, 34, 54, 50, 14);
    // belly
    g.fillStyle(0x86c04e, 1);
    g.fillRoundedRect(34, 50, 30, 28, 12);
    // legs
    g.fillStyle(0x4a7d22, 1);
    g.fillRoundedRect(28, 80, 14, 12, 4);
    g.fillRoundedRect(54, 80, 14, 12, 4);
    // head
    g.fillStyle(0x5f9a2f, 1);
    g.fillRoundedRect(28, 8, 42, 32, 12);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(42, 22, 8);
    g.fillCircle(58, 22, 8);
    g.fillStyle(0x222222, 1);
    g.fillCircle(40, 24, 3.6);
    g.fillCircle(56, 24, 3.6);
    // angry brows
    g.lineStyle(4, 0x3c641a, 1);
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

  // Lobber — a goblin hoisting a rock overhead to throw. ~62x74.
  makeLobber(key) {
    const W = 62;
    const H = 74;
    const g = this.add.graphics();
    // rock held up
    g.fillStyle(0x8b8f98, 1);
    g.fillCircle(38, 12, 12);
    g.fillStyle(0x6b6f78, 1);
    g.fillCircle(34, 9, 5);
    // arm up to the rock
    g.lineStyle(5, 0x7aa83c, 1);
    g.beginPath();
    g.moveTo(30, 40);
    g.lineTo(38, 16);
    g.strokePath();
    // ears
    g.fillStyle(0x7aa83c, 1);
    g.fillTriangle(16, 26, 16, 42, 4, 32);
    // body
    g.fillStyle(0x7aa83c, 1);
    g.fillRoundedRect(14, 34, 30, 30, 9);
    g.fillStyle(0xa6d36a, 1);
    g.fillRoundedRect(20, 44, 16, 16, 7);
    // legs
    g.fillStyle(0x5f8a2c, 1);
    g.fillRoundedRect(18, 60, 8, 10, 3);
    g.fillRoundedRect(30, 60, 8, 10, 3);
    // head
    g.fillStyle(0x7aa83c, 1);
    g.fillRoundedRect(14, 14, 26, 22, 9);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(22, 24, 6);
    g.fillCircle(33, 24, 6);
    g.fillStyle(0x222222, 1);
    g.fillCircle(20, 25, 2.8);
    g.fillCircle(31, 25, 2.8);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Flyer — a little winged imp. Faces left, flaps. ~74x52.
  makeFlyer(key) {
    const W = 74;
    const H = 52;
    const g = this.add.graphics();
    // wings
    g.fillStyle(0x8a5bb0, 1);
    g.fillTriangle(40, 24, 72, 6, 70, 30);
    g.fillTriangle(40, 24, 64, 26, 70, 44);
    // body
    g.fillStyle(0xa06fc8, 1);
    g.fillRoundedRect(18, 14, 30, 26, 10);
    // tail
    g.fillStyle(0x8a5bb0, 1);
    g.fillTriangle(46, 22, 46, 32, 60, 27);
    // head
    g.fillStyle(0xa06fc8, 1);
    g.fillRoundedRect(8, 12, 22, 20, 8);
    // ears
    g.fillTriangle(12, 12, 18, 12, 13, 2);
    g.fillTriangle(22, 12, 28, 12, 27, 2);
    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(15, 22, 5);
    g.fillCircle(24, 22, 5);
    g.fillStyle(0x222222, 1);
    g.fillCircle(13, 23, 2.4);
    g.fillCircle(22, 23, 2.4);
    // little fangs
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(14, 28, 17, 28, 15.5, 32);
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // A grey rock the lobber throws (also used when it lands/poofs).
  makeEnemyRock(key) {
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
  makeHazard(key) {
    const W = 76;
    const H = 52;
    const g = this.add.graphics();
    // log
    g.fillStyle(0x7a5a30, 1);
    g.fillRoundedRect(6, 26, 64, 24, 8);
    g.fillStyle(0x5e4523, 1);
    g.fillCircle(12, 38, 9);
    g.fillStyle(0x8a6a3a, 1);
    g.fillCircle(12, 38, 4);
    // spikes
    g.fillStyle(0xcfd3da, 1);
    for (let i = 0; i < 4; i++) {
      const x = 18 + i * 14;
      g.fillTriangle(x, 28, x + 12, 28, x + 6, 8);
    }
    g.generateTexture(key, W, H);
    g.destroy();
  }

  // Heart icon for the health HUD (filled or empty outline).
  makeHeart(key, filled) {
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
    const S = 26;
    const g = this.add.graphics();
    g.fillStyle(COLORS.scrapDark, 1);
    g.fillCircle(13, 13, 12);
    g.fillStyle(COLORS.scrap, 1);
    g.fillCircle(13, 13, 9);
    g.fillStyle(COLORS.scrapDark, 1);
    g.fillCircle(13, 13, 4);
    // shine
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(9, 9, 2.5);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Checkered finish flag on a pole, anchored at the bottom of the texture.
  makeFlag(key) {
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

  // Soft round puff used for the cartoony defeat burst (tinted at use).
  makePuff(key) {
    const S = 24;
    const g = this.add.graphics();
    g.fillStyle(COLORS.puff, 0.5);
    g.fillCircle(12, 12, 11);
    g.fillStyle(COLORS.puff, 1);
    g.fillCircle(12, 12, 7);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // Projectiles ---------------------------------------------------------
  makeShotBow(key) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.bullet, 1);
    g.fillRoundedRect(0, 2, 16, 6, 3);
    g.fillStyle(COLORS.bulletEdge, 1);
    g.fillTriangle(14, 0, 14, 10, 22, 5);
    g.generateTexture(key, 22, 10);
    g.destroy();
  }

  makeShotCrossbow(key) {
    const g = this.add.graphics();
    g.fillStyle(0xcfd3da, 1);
    g.fillRect(0, 3, 18, 4);
    g.fillStyle(0x8b929c, 1);
    g.fillTriangle(16, 1, 16, 9, 24, 5);
    g.generateTexture(key, 24, 10);
    g.destroy();
  }

  makeShotCatapult(key) {
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
}
