import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_TOP_Y,
  CAR,
  SCROLL,
} from '../config.js';

// Milestone 0: an auto-scrolling parallax world, a car you move up/down, and a
// fire button. No enemies yet — that's Milestone 1.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.buildBackground();
    this.buildCar();
    this.buildBullets();
    this.buildInput();
    this.buildHud();
  }

  buildBackground() {
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.farHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 150, GAME_WIDTH, 150, 'hills-far')
      .setOrigin(0, 0);

    this.nearHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 210, GAME_WIDTH, 210, 'hills-near')
      .setOrigin(0, 0);

    this.ground = this.add
      .tileSprite(0, GROUND_TOP_Y, GAME_WIDTH, 90, 'ground')
      .setOrigin(0, 0);
  }

  buildCar() {
    this.car = this.add.image(CAR.x, CAR.startY, 'car');
    this.car.setOrigin(0.5, 1); // anchor at the wheels
    this.carTargetY = CAR.startY; // used by touch-drag steering
    this.usePointerSteering = false;
  }

  buildBullets() {
    this.bullets = this.physics.add.group();
    this.lastFireAt = 0;
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S');
    this.fireKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Touch / mouse: drag to steer vertically, hold to fire.
    this.pointerHeld = false;
    this.input.on('pointerdown', (p) => {
      this.pointerHeld = true;
      this.usePointerSteering = true;
      this.carTargetY = p.y;
    });
    this.input.on('pointermove', (p) => {
      if (p.isDown) this.carTargetY = p.y;
    });
    this.input.on('pointerup', () => {
      this.pointerHeld = false;
    });
  }

  buildHud() {
    const style = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#1b1d2a',
      strokeThickness: 4,
    };
    this.add.text(16, 12, 'RAMPAGE — Milestone 0', { ...style, fontSize: '24px' });
    this.add.text(
      16,
      44,
      'Move: ↑/↓ or W/S (or drag)    Fire: Space (or tap/hold)',
      { ...style, fontSize: '16px', color: '#ffe9b0' }
    );
  }

  update(time, delta) {
    this.scrollWorld(delta);
    this.steerCar(delta);
    this.handleFiring(time);
    this.cullBullets();
  }

  scrollWorld(delta) {
    this.farHills.tilePositionX += SCROLL.farHills * delta;
    this.nearHills.tilePositionX += SCROLL.nearHills * delta;
    this.ground.tilePositionX += SCROLL.ground * delta;
  }

  steerCar(delta) {
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    // Keyboard takes over the moment it's used.
    if (up || down) {
      this.usePointerSteering = false;
      if (up) this.car.y -= CAR.vSpeed * delta;
      if (down) this.car.y += CAR.vSpeed * delta;
    } else if (this.usePointerSteering) {
      // Ease the car toward the finger position.
      const diff = this.carTargetY - this.car.y;
      this.car.y += diff * Math.min(1, 0.015 * delta);
    }

    this.car.y = Phaser.Math.Clamp(this.car.y, CAR.minY, CAR.maxY);

    // a gentle bob so the parked-looking car feels alive
    this.car.rotation = Math.sin(this.time.now * 0.006) * 0.015;
  }

  handleFiring(time) {
    const wantsToFire = this.fireKey.isDown || this.pointerHeld;
    if (!wantsToFire) return;
    if (time - this.lastFireAt < CAR.fireCooldown) return;

    this.lastFireAt = time;
    const muzzleX = this.car.x + 56;
    const muzzleY = this.car.y - 44;

    const bullet = this.bullets.create(muzzleX, muzzleY, 'bullet');
    bullet.body.setAllowGravity(false);
    bullet.setVelocityX(CAR.bulletSpeed);

    // tiny recoil pop for feel
    this.tweens.add({
      targets: this.car,
      x: { from: CAR.x - 4, to: CAR.x },
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  cullBullets() {
    this.bullets.children.iterate((b) => {
      if (b && b.x > GAME_WIDTH + 40) b.destroy();
      return true;
    });
  }
}
