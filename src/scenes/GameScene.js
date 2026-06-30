import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_TOP_Y,
  WORLD_SCROLL,
  CAR,
  SCROLL,
  ENEMY,
  SCRAP,
  LEVEL,
  COLORS,
} from '../config.js';

// Milestone 1: goblins run in, your shots destroy them with a poof, defeated
// goblins drop Scrap that auto-collects into a counter, and a finish flag
// rolls in to end the level.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.state = 'playing';
    this.distance = 0; // world distance covered this level
    this.scrap = 0;
    this.flagSpawned = false;
    this.flag = null;

    this.buildBackground();
    this.buildCar();
    this.buildGroups();
    this.buildInput();
    this.buildHud();
    this.scheduleNextSpawn(this.time.now + ENEMY.firstSpawnDelay);

    // bullet → goblin hits
    this.physics.add.overlap(this.bullets, this.goblins, this.onBulletHit, null, this);
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
    this.car.setOrigin(0.5, 1).setDepth(5);
    this.carTargetY = CAR.startY;
    this.usePointerSteering = false;
  }

  buildGroups() {
    this.bullets = this.physics.add.group();
    this.goblins = this.physics.add.group();
    this.scraps = this.add.group();
    this.lastFireAt = 0;
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S,R');
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.pointerHeld = false;
    this.input.on('pointerdown', (p) => {
      if (this.state === 'complete') {
        this.scene.restart();
        return;
      }
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
    this.add.text(16, 12, 'RAMPAGE — Level 1', { ...style, fontSize: '24px' }).setDepth(20);
    this.add
      .text(16, 44, 'Move: ↑/↓ or W/S (or drag)    Fire: Space (or tap/hold)', {
        ...style,
        fontSize: '15px',
        color: '#ffe9b0',
      })
      .setDepth(20);

    // scrap counter (top-right)
    this.add.image(GAME_WIDTH - 120, 26, 'scrap').setScale(1.1).setDepth(20);
    this.scrapText = this.add
      .text(GAME_WIDTH - 104, 14, '0', { ...style, fontSize: '26px' })
      .setDepth(20);

    // progress bar toward the finish flag
    this.progressBg = this.add
      .rectangle(GAME_WIDTH / 2, 24, 260, 12, 0x1b1d2a, 0.55)
      .setDepth(20);
    this.progressFill = this.add
      .rectangle(GAME_WIDTH / 2 - 128, 24, 4, 8, 0x6fd06a, 1)
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.add
      .image(GAME_WIDTH / 2 + 132, 24, 'flag')
      .setScale(0.18)
      .setDepth(20);
  }

  update(time, delta) {
    if (this.state === 'playing') {
      this.scrollWorld(delta);
      this.advanceLevel(delta);
      this.maybeSpawnGoblin(time);
    }
    this.steerCar(delta);
    if (this.state === 'playing') this.handleFiring(time);
    this.updateGoblins();
    this.updateScraps(delta);
    this.updateFlag(delta);
    this.cullBullets();
    this.handleRestartKey();
  }

  scrollWorld(delta) {
    this.farHills.tilePositionX += SCROLL.farHills * delta;
    this.nearHills.tilePositionX += SCROLL.nearHills * delta;
    this.ground.tilePositionX += SCROLL.ground * delta;
  }

  advanceLevel(delta) {
    this.distance += WORLD_SCROLL * delta;
    const p = Phaser.Math.Clamp(this.distance / LEVEL.length, 0, 1);
    this.progressFill.width = 4 + p * 252;

    if (!this.flagSpawned && this.distance >= LEVEL.length) {
      this.spawnFlag();
    }
  }

  steerCar(delta) {
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    if (up || down) {
      this.usePointerSteering = false;
      if (up) this.car.y -= CAR.vSpeed * delta;
      if (down) this.car.y += CAR.vSpeed * delta;
    } else if (this.usePointerSteering) {
      const diff = this.carTargetY - this.car.y;
      this.car.y += diff * Math.min(1, 0.015 * delta);
    }

    this.car.y = Phaser.Math.Clamp(this.car.y, CAR.minY, CAR.maxY);
    this.car.rotation = Math.sin(this.time.now * 0.006) * 0.015;
  }

  // ---- enemies ----------------------------------------------------------

  scheduleNextSpawn(at) {
    this.nextSpawnAt = at;
  }

  maybeSpawnGoblin(time) {
    // stop sending new goblins once the finish flag is on its way
    if (this.distance >= LEVEL.length) return;
    if (time < this.nextSpawnAt) return;

    const y = GROUND_TOP_Y + 2;
    const goblin = this.goblins.create(GAME_WIDTH + 50, y, 'goblin');
    goblin.setOrigin(0.5, 1);
    goblin.body.setAllowGravity(false);
    goblin.setVelocityX(-ENEMY.goblinSpeed);
    goblin.setData('hp', ENEMY.goblinHp);
    // a little run bob
    goblin.setData('bobSeed', Math.random() * Math.PI * 2);

    const gap = Phaser.Math.Between(ENEMY.spawnEveryMin, ENEMY.spawnEveryMax);
    this.scheduleNextSpawn(time + gap);
  }

  updateGoblins() {
    this.goblins.children.iterate((g) => {
      if (!g) return true;
      // bobbing run
      const t = this.time.now * 0.018 + g.getData('bobSeed');
      g.rotation = Math.sin(t) * 0.08;
      // got past the car
      if (g.x < -60) {
        g.destroy();
        if (this.state === 'playing') this.cameras.main.shake(120, 0.004);
      }
      return true;
    });
  }

  onBulletHit(bullet, goblin) {
    bullet.destroy();
    const hp = goblin.getData('hp') - 1;
    if (hp > 0) {
      goblin.setData('hp', hp);
      goblin.setTintFill(0xffffff);
      this.time.delayedCall(60, () => goblin.active && goblin.clearTint());
      return;
    }
    this.defeatGoblin(goblin);
  }

  defeatGoblin(goblin) {
    const x = goblin.x;
    const y = goblin.y - 28;
    this.poof(x, y, COLORS.goblin);
    this.spawnScrap(x, y);
    goblin.destroy();
  }

  poof(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const puff = this.add.image(x, y, 'puff').setTint(color).setDepth(6);
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 26;
      this.tweens.add({
        targets: puff,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 10,
        alpha: 0,
        scale: { from: 1, to: 0.2 },
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  // ---- scrap ------------------------------------------------------------

  spawnScrap(x, y) {
    const s = this.scraps.create(x, y, 'scrap');
    s.setDepth(4);
    s.setData('vy', -0.18 - Math.random() * 0.12); // little pop upward
  }

  updateScraps(delta) {
    const cx = this.car.x;
    const cy = this.car.y - 30;
    this.scraps.children.iterate((s) => {
      if (!s) return true;

      const dist = Phaser.Math.Distance.Between(s.x, s.y, cx, cy);
      if (dist < SCRAP.collectRange) {
        this.collectScrap(s);
        return true;
      }

      if (dist < SCRAP.magnetRange) {
        // home toward the car (forgiving auto-collect for little hands)
        const k = Math.min(1, SCRAP.homeLerp * delta);
        s.x += (cx - s.x) * k;
        s.y += (cy - s.y) * k;
      } else {
        // drift left with the world and settle on the ground
        s.x -= WORLD_SCROLL * delta;
        let vy = s.getData('vy');
        vy += 0.0016 * delta; // gravity
        s.y += vy * delta;
        s.setData('vy', vy);
        const floor = GROUND_TOP_Y - 6;
        if (s.y > floor) {
          s.y = floor;
          s.setData('vy', 0);
        }
      }

      s.rotation += 0.004 * delta;
      if (s.x < -40) s.destroy();
      return true;
    });
  }

  collectScrap(s) {
    s.destroy();
    this.scrap += SCRAP.value;
    this.scrapText.setText(String(this.scrap));
    this.tweens.add({
      targets: this.scrapText,
      scale: { from: 1.35, to: 1 },
      duration: 160,
      ease: 'Back.easeOut',
    });
  }

  // ---- finish flag ------------------------------------------------------

  spawnFlag() {
    this.flagSpawned = true;
    this.flag = this.add.image(GAME_WIDTH + 80, GROUND_TOP_Y + 6, 'flag');
    this.flag.setOrigin(0.2, 1).setDepth(3);
  }

  updateFlag(delta) {
    if (!this.flag || this.state !== 'playing') return;
    this.flag.x -= WORLD_SCROLL * delta;
    if (this.flag.x <= this.car.x) {
      this.completeLevel();
    }
  }

  completeLevel() {
    this.state = 'complete';
    this.pointerHeld = false;
    this.goblins.children.iterate((g) => {
      if (g) g.setVelocityX(0);
      return true;
    });

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.55).setDepth(30);
    const panel = this.add.rectangle(cx, cy, 520, 240, 0x2a2d3f, 0.96).setDepth(31);
    panel.setStrokeStyle(4, 0xffe9b0);

    const big = {
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
      stroke: '#1b1d2a',
      strokeThickness: 5,
      align: 'center',
    };
    this.add
      .text(cx, cy - 70, 'LEVEL COMPLETE!', { ...big, fontSize: '40px', color: '#ffe14d' })
      .setOrigin(0.5)
      .setDepth(32);
    this.add
      .text(cx, cy - 8, `Scrap collected: ${this.scrap}`, { ...big, fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(32);
    this.add
      .text(cx, cy + 60, 'Press R or tap to play again', {
        ...big,
        fontSize: '20px',
        color: '#bfe6ff',
      })
      .setOrigin(0.5)
      .setDepth(32);

    // a little confetti
    for (let i = 0; i < 26; i++) {
      this.time.delayedCall(i * 24, () => this.confettiBit(cx, cy - 120));
    }
  }

  confettiBit(x, y) {
    const colors = [0xff5d5d, 0xffe14d, 0x6fd06a, 0x5db4ff, 0xffffff];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const bit = this.add
      .rectangle(x + Phaser.Math.Between(-200, 200), y, 8, 8, c)
      .setDepth(33)
      .setAngle(Math.random() * 360);
    this.tweens.add({
      targets: bit,
      y: y + 260 + Math.random() * 80,
      angle: bit.angle + Phaser.Math.Between(-180, 180),
      alpha: { from: 1, to: 0.2 },
      duration: 1400 + Math.random() * 600,
      ease: 'Quad.easeIn',
      onComplete: () => bit.destroy(),
    });
  }

  // ---- shooting & misc --------------------------------------------------

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

  handleRestartKey() {
    if (this.state === 'complete' && Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.scene.restart();
    }
  }
}
