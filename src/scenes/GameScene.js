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
import { Player } from '../state/PlayerState.js';
import { getWeapon } from '../data/catalog.js';
import { buildCar } from '../entities/Car.js';

// The action level: goblins, shooting, scrap, and the finish flag. On
// completion it hands off to the Garage (Milestone 2) carrying the run's
// earnings. The car is built from the player's equipped loadout, so upgrades
// bought in the Garage show up here both visually and in the weapon stats.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const profile = Player.state;
    this.level = profile.level;
    this.weapon = getWeapon(profile.weapon);
    this.levelStartScrap = profile.scrap;

    this.state = 'playing';
    this.distance = 0;
    this.flagSpawned = false;
    this.flag = null;

    // a touch more pressure each level so upgrades pay off
    this.spawnGap = Math.max(450, ENEMY.spawnEveryMin - (this.level - 1) * 80);

    this.buildBackground();
    this.buildCar(profile);
    this.buildGroups();
    this.buildInput();
    this.buildHud();
    this.nextSpawnAt = this.time.now + ENEMY.firstSpawnDelay;

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

  buildCar(profile) {
    this.car = buildCar(this, CAR.x, CAR.startY, profile.body, profile.weapon);
    this.car.setDepth(5);
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
    this.keys = this.input.keyboard.addKeys('W,S');
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.pointerHeld = false;
    this.input.on('pointerdown', (p) => {
      if (this.state !== 'playing') return;
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
    this.add.text(16, 12, `RAMPAGE — Level ${this.level}`, { ...style, fontSize: '24px' }).setDepth(20);
    this.add
      .text(16, 44, `Weapon: ${this.weapon.name}    Fire: Space / tap`, {
        ...style,
        fontSize: '15px',
        color: '#ffe9b0',
      })
      .setDepth(20);

    this.add.image(GAME_WIDTH - 120, 26, 'scrap').setScale(1.1).setDepth(20);
    this.scrapText = this.add
      .text(GAME_WIDTH - 104, 14, String(Player.state.scrap), { ...style, fontSize: '26px' })
      .setDepth(20);

    this.progressBg = this.add
      .rectangle(GAME_WIDTH / 2, 24, 260, 12, 0x1b1d2a, 0.55)
      .setDepth(20);
    this.progressFill = this.add
      .rectangle(GAME_WIDTH / 2 - 128, 24, 4, 8, 0x6fd06a, 1)
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.add.image(GAME_WIDTH / 2 + 132, 24, 'flag').setScale(0.18).setDepth(20);
  }

  update(time, delta) {
    if (this.state === 'playing') {
      this.scrollWorld(delta);
      this.advanceLevel(delta);
      this.maybeSpawnGoblin(time);
      this.handleFiring(time);
    }
    this.steerCar(delta);
    this.updateGoblins();
    this.updateScraps(delta);
    this.updateFlag(delta);
    this.cullBullets();
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
    if (!this.flagSpawned && this.distance >= LEVEL.length) this.spawnFlag();
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

  maybeSpawnGoblin(time) {
    if (this.distance >= LEVEL.length) return; // flag is inbound
    if (time < this.nextSpawnAt) return;

    const goblin = this.goblins.create(GAME_WIDTH + 50, GROUND_TOP_Y + 2, 'goblin');
    goblin.setOrigin(0.5, 1);
    goblin.body.setAllowGravity(false);
    goblin.setVelocityX(-ENEMY.goblinSpeed);
    goblin.setData('hp', ENEMY.goblinHp);
    goblin.setData('bobSeed', Math.random() * Math.PI * 2);

    const gap = Phaser.Math.Between(this.spawnGap, this.spawnGap + 850);
    this.nextSpawnAt = time + gap;
  }

  updateGoblins() {
    this.goblins.children.iterate((g) => {
      if (!g) return true;
      const t = this.time.now * 0.018 + g.getData('bobSeed');
      g.rotation = Math.sin(t) * 0.08;
      if (g.x < -60) {
        g.destroy();
        if (this.state === 'playing') this.cameras.main.shake(120, 0.004);
      }
      return true;
    });
  }

  onBulletHit(bullet, goblin) {
    bullet.destroy();
    const hp = goblin.getData('hp') - this.weapon.damage;
    if (hp > 0) {
      goblin.setData('hp', hp);
      goblin.setTintFill(0xffffff);
      this.time.delayedCall(60, () => goblin.active && goblin.clearTint());
      return;
    }
    this.defeatGoblin(goblin);
  }

  defeatGoblin(goblin) {
    this.poof(goblin.x, goblin.y - 28, COLORS.goblin);
    this.spawnScrap(goblin.x, goblin.y - 28);
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
    s.setData('vy', -0.18 - Math.random() * 0.12);
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
        const k = Math.min(1, SCRAP.homeLerp * delta);
        s.x += (cx - s.x) * k;
        s.y += (cy - s.y) * k;
      } else {
        s.x -= WORLD_SCROLL * delta;
        let vy = s.getData('vy');
        vy += 0.0016 * delta;
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
    // mutate in-memory total now; persist once at level end (avoids spamming
    // localStorage on every pickup)
    Player.state.scrap += SCRAP.value;
    this.scrapText.setText(String(Player.state.scrap));
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
    if (this.flag.x <= this.car.x) this.completeLevel();
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
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.4).setDepth(30);
    this.add
      .text(cx, cy - 20, 'LEVEL COMPLETE!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#ffe14d',
        stroke: '#1b1d2a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(32);
    this.add
      .text(cx, cy + 34, 'Rolling into the Garage…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#1b1d2a',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(32);
    for (let i = 0; i < 24; i++) {
      this.time.delayedCall(i * 26, () => this.confettiBit(cx, cy - 140));
    }

    const earned = Player.state.scrap - this.levelStartScrap;
    Player.save();
    this.time.delayedCall(1700, () => this.scene.start('Garage', { earned }));
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
      duration: 1500,
      ease: 'Quad.easeIn',
      onComplete: () => bit.destroy(),
    });
  }

  // ---- shooting & misc --------------------------------------------------

  handleFiring(time) {
    const wantsToFire = this.fireKey.isDown || this.pointerHeld;
    if (!wantsToFire) return;
    if (time - this.lastFireAt < this.weapon.cooldown) return;

    this.lastFireAt = time;
    const muzzle = this.car.getData('muzzle');
    const mx = this.car.x + muzzle.x;
    const my = this.car.y + muzzle.y;

    const shot = this.bullets.create(mx, my, this.weapon.shot);
    shot.setScale(this.weapon.shotScale || 1);
    shot.body.setAllowGravity(false);
    shot.setVelocityX(this.weapon.speed);

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
