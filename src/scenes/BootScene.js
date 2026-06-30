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
    this.makeCar('car');
    this.makeBullet('bullet');
    this.makeGoblin('goblin');
    this.makeScrap('scrap');
    this.makeFlag('flag');
    this.makePuff('puff');

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

  // The starter "Cardboard Cart": a wobbly box on two wheels with a little
  // launcher barrel and a flag. Drawn into a 120x86 texture.
  makeCar(key) {
    const W = 120;
    const H = 86;
    const g = this.add.graphics();

    // wheels first (behind the body)
    g.fillStyle(COLORS.wheel, 1);
    g.fillCircle(34, 70, 16);
    g.fillCircle(92, 70, 16);
    g.fillStyle(0x55555f, 1);
    g.fillCircle(34, 70, 6);
    g.fillCircle(92, 70, 6);

    // cardboard body
    g.fillStyle(COLORS.cardboard, 1);
    g.fillRoundedRect(14, 30, 92, 34, 6);
    // tape / fold lines
    g.lineStyle(3, COLORS.cardboardDark, 1);
    g.strokeRoundedRect(14, 30, 92, 34, 6);
    g.beginPath();
    g.moveTo(60, 30);
    g.lineTo(60, 64);
    g.strokePath();

    // launcher barrel pointing right
    g.fillStyle(COLORS.cardboardDark, 1);
    g.fillRoundedRect(96, 36, 22, 12, 3);

    // flag pole + flag
    g.lineStyle(3, 0x6b4f2a, 1);
    g.beginPath();
    g.moveTo(24, 30);
    g.lineTo(24, 8);
    g.strokePath();
    g.fillStyle(0xe2483a, 1);
    g.fillTriangle(24, 8, 24, 22, 46, 15);

    g.generateTexture(key, W, H);
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

  // Simple arrow-ish projectile.
  makeBullet(key) {
    const W = 22;
    const H = 10;
    const g = this.add.graphics();
    g.fillStyle(COLORS.bullet, 1);
    g.fillRoundedRect(0, 2, 16, 6, 3);
    g.fillStyle(COLORS.bulletEdge, 1);
    g.fillTriangle(14, 0, 14, 10, 22, 5);
    g.generateTexture(key, W, H);
    g.destroy();
  }
}
