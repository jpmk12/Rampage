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
