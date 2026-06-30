import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_TOP_Y,
  WORLD_SCROLL,
  CAR,
  COMBAT,
  HAZARD,
  SCROLL,
  ENEMY,
  SCRAP,
  LEVEL,
  COLORS,
  FONTS,
} from '../config.js';
import { Player } from '../state/PlayerState.js';
import { getBody, getWeapon } from '../data/catalog.js';
import { pickEnemyType } from '../data/enemies.js';
import { pickPickup } from '../data/freestyle.js';
import { getLevel, LAST_LEVEL } from '../data/levels.js';
import { buildCar, muzzleFor, addTurret } from '../entities/Car.js';
import { sound } from '../audio/Sound.js';

const MINI_SUMMON_EVERY = 1900; // ms between mini-boss summons
const BOSS_THROW_EVERY = 1600; // ms between boss projectile throws

// Hazards you must jump over are disabled for now (per request).
const HAZARDS_ENABLED = false;

// Bolt-on turrets (earned from mega enemies) fire straight ahead.
const TURRET_COOLDOWN = 300; // ms between turret volleys
const TURRET_SPEED = 780;

// Mega enemies: rare, big, tanky; defeating one bolts on a turret.
const MEGA = { firstAt: 9000, everyMin: 16000, everyMax: 24000, scale: 1.9, speed: 95 };

// Per-biome sun/moon and cloud tints for the sky.
const SKY_TINT = {
  1: { sun: 0xfff3b0, cloud: 0xffffff },
  2: { sun: 0xd6d2e6, cloud: 0xb9b0c8 }, // moon over the swamp
  3: { sun: 0xffd98a, cloud: 0xf6ead0 },
  4: { sun: 0xeaf4ff, cloud: 0xffffff },
  5: { sun: 0xff7a3a, cloud: 0x8a5a4a }, // smoky volcano sky
};

// Aim limits: mostly upward (negative = up on screen) so you can hit flyers.
const AIM = { min: -1.15, max: 0.45, rate: 0.0026, topZ: 70, botZ: GROUND_TOP_Y };

// The action level. The car drives on the ground and JUMPS; up/down AIM the
// weapon. Goblins come in four flavours, lobbers throw arcing rocks, ground
// hazards must be jumped, and hearts track damage.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(data) {
    const profile = Player.state;
    this.freestyle = !!(data && data.freestyle);

    if (this.freestyle) {
      this.fs = Player.freestyle;
      this.levelId = ((this.fs.runs || 0) % LAST_LEVEL) + 1; // rotate biome for variety
      this.level = this.levelId;
      this.levelCfg = getLevel(this.levelId);
      this.score = 0;
      this.maxHealth = 5 + (this.fs.heart || 0);
    } else {
      this.level = profile.level;
      this.levelCfg = getLevel(this.level);
      this.levelId = this.levelCfg.id;
      this.miniSpec = { ...this.levelCfg.mini, role: 'mini', x: 740, projTex: this.levelCfg.boss.projTex };
      this.bossSpec = { ...this.levelCfg.boss, role: 'boss', x: 700 };
      this.maxHealth = getBody(profile.body).health;
      this.levelStartScrap = profile.scrap;
    }
    this.weapon = getWeapon(profile.weapon);
    this.health = this.maxHealth;

    this.state = 'playing';
    this.phase = 'travel'; // travel -> miniboss -> boss (campaign only)
    this.distance = 0;
    this.boss = null;

    // car physics + aim
    this.carVY = 0;
    this.onGround = true;
    this.aim = -0.15;
    this.aiming = false;
    this.aimPointerId = null;
    this.aimTargetY = GROUND_TOP_Y - 120;
    this.invulnUntil = 0;

    this.spawnGap = Math.max(420, ENEMY.spawnEveryMin - (this.level - 1) * 70);

    this.buildBackground();
    this.buildCar(profile);
    this.buildGroups();
    this.buildInput();
    this.buildHud();
    this.nextSpawnAt = this.time.now + ENEMY.firstSpawnDelay;
    this.nextHazardAt = this.time.now + Phaser.Math.Between(HAZARD.everyMin, HAZARD.everyMax);
    this.nextMegaAt = this.time.now + MEGA.firstAt;

    this.physics.add.overlap(this.bullets, this.goblins, this.onBulletHit, null, this);
    this.physics.add.overlap(this.bullets, this.enemyShots, this.onShootRock, null, this);
    this.physics.add.overlap(this.bullets, this.bosses, this.onBulletHitBoss, null, this);

    // audio: start the loop, and stop it when the scene shuts down/restarts
    sound.setMuted(Player.state.muted);
    sound.startMusic();
    this.events.once('shutdown', () => sound.stopMusic());
    this.events.once('destroy', () => sound.stopMusic());
    // pause/resume music with the scene (pause menu)
    this.events.on('pause', () => sound.stopMusic());
    this.events.on('resume', () => {
      sound.setMuted(Player.state.muted);
      sound.startMusic();
    });

    this.buildWeather();
    this.cameras.main.fadeIn(300, 27, 29, 42);
    this.lastDustAt = 0;
  }

  // Per-biome ambient weather particles.
  buildWeather() {
    const id = this.levelId;
    const W = GAME_WIDTH;
    const top = GROUND_TOP_Y;
    let p;
    if (id === 4) {
      // snow
      p = this.add.particles(0, -10, 'flake', {
        x: { min: 0, max: W }, lifespan: 7000, speedY: { min: 30, max: 70 },
        speedX: { min: -25, max: 15 }, scale: { min: 0.4, max: 1.0 },
        alpha: { start: 0.9, end: 0.5 }, frequency: 150, quantity: 1, tint: 0xffffff,
      });
    } else if (id === 5) {
      // rising embers
      p = this.add.particles(0, GAME_HEIGHT + 10, 'flake', {
        x: { min: 0, max: W }, lifespan: 4200, speedY: { min: -95, max: -40 },
        speedX: { min: -18, max: 18 }, scale: { min: 0.3, max: 0.8 },
        alpha: { start: 0.9, end: 0 }, frequency: 110, quantity: 1,
        tint: [0xff7a3a, 0xffd24d], blendMode: 'ADD',
      });
    } else if (id === 3) {
      // blowing sand
      p = this.add.particles(W + 10, 0, 'flake', {
        y: { min: top - 170, max: top }, lifespan: 2400, speedX: { min: -280, max: -170 },
        speedY: { min: -12, max: 22 }, scale: { min: 0.2, max: 0.5 },
        alpha: { start: 0.5, end: 0 }, frequency: 55, quantity: 1, tint: 0xe6c48a,
      });
    } else if (id === 2) {
      // drifting swamp spores / fireflies
      p = this.add.particles(0, 0, 'flake', {
        x: { min: 0, max: W }, y: { min: top - 190, max: top - 10 }, lifespan: 5000,
        speedX: { min: -22, max: 22 }, speedY: { min: -10, max: 10 },
        scale: { min: 0.4, max: 0.9 }, alpha: { start: 0.6, end: 0 },
        frequency: 240, quantity: 1, tint: 0x9acb6a, blendMode: 'ADD',
      });
    } else {
      // floating pollen (Greenwood + default)
      p = this.add.particles(0, 0, 'flake', {
        x: { min: 0, max: W }, y: { min: top - 200, max: top }, lifespan: 6000,
        speedY: { min: -14, max: -3 }, speedX: { min: -10, max: 10 },
        scale: { min: 0.2, max: 0.5 }, alpha: { start: 0.5, end: 0 },
        frequency: 300, quantity: 1, tint: 0xfff0b0,
      });
    }
    if (p) p.setDepth(12);
  }

  // Fade out, then switch scenes (smoother than a hard cut).
  go(key, data) {
    this.cameras.main.fadeOut(240, 27, 29, 42);
    this.time.delayedCall(250, () => this.scene.start(key, data));
  }

  buildBackground() {
    const id = this.levelId;
    this.add.image(0, 0, `sky-${id}`).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // sun / moon, tinted per biome
    const sunTint = SKY_TINT[id].sun;
    this.add.image(720, 110, 'sun').setTint(sunTint).setScale(1.15).setAlpha(0.9);

    // a few drifting parallax clouds
    this.clouds = [];
    const cloudTint = SKY_TINT[id].cloud;
    for (let i = 0; i < 4; i++) {
      const c = this.add
        .image(Math.random() * GAME_WIDTH, 50 + Math.random() * 150, 'cloud')
        .setTint(cloudTint)
        .setScale(0.6 + Math.random() * 0.7)
        .setAlpha(0.5 + Math.random() * 0.4);
      c.setData('speed', 0.006 + Math.random() * 0.014);
      this.clouds.push(c);
    }

    this.farHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 150, GAME_WIDTH, 150, `hills-far-${id}`)
      .setOrigin(0, 0);
    this.nearHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 210, GAME_WIDTH, 210, `hills-near-${id}`)
      .setOrigin(0, 0);
    this.ground = this.add
      .tileSprite(0, GROUND_TOP_Y, GAME_WIDTH, 90, `ground-${id}`)
      .setOrigin(0, 0);
  }

  updateClouds(delta) {
    this.clouds.forEach((c) => {
      c.x -= c.getData('speed') * delta;
      if (c.x < -120) {
        c.x = GAME_WIDTH + 120;
        c.y = 50 + Math.random() * 150;
      }
    });
  }

  buildCar(profile) {
    this.carShadow = this.add
      .ellipse(CAR.x, CAR.groundY + 4, 96, 22, 0x000000, 0.22)
      .setDepth(4);
    if (this.freestyle) {
      // a big tank bristling with guns that grows with the arsenal
      const guns = Math.min(6, 1 + this.fsTotalWeapons());
      this.car = buildCar(this, CAR.x, CAR.groundY, 'tank', 'cannon', guns);
    } else {
      this.car = buildCar(this, CAR.x, CAR.groundY, profile.body, profile.weapon, profile.turrets);
    }
    this.car.setDepth(5);
    this.weaponSprite = this.car.getData('weaponSprite');
    this.lastTurretAt = 0;
  }

  fsTotalWeapons() {
    const f = this.fs;
    return (f.guns || 0) + (f.spread || 0) + (f.rockets || 0) + (f.missiles || 0) + (f.bombs || 0);
  }

  // Rebuild the car so its visible gun count matches the arsenal.
  refreshFreestyleCar() {
    const y = this.car.y;
    this.car.destroy();
    const guns = Math.min(6, 1 + this.fsTotalWeapons());
    this.car = buildCar(this, CAR.x, y, 'tank', 'cannon', guns);
    this.car.setDepth(5);
    this.weaponSprite = this.car.getData('weaponSprite');
  }

  buildGroups() {
    this.bullets = this.physics.add.group();
    this.goblins = this.physics.add.group();
    this.bosses = this.physics.add.group();
    this.enemyShots = this.physics.add.group();
    this.scraps = this.add.group();
    this.hazards = this.add.group();
    this.pickups = this.add.group();
    this.lastFireAt = 0;
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,S,R');
    this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.addPointer(2); // allow two thumbs on a tablet

    // browsers need a user gesture before audio can play
    const wake = () => sound.resume();
    this.input.once('pointerdown', wake);
    this.input.keyboard.once('keydown', wake);

    // pause with Esc or P
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-P', () => this.pauseGame());

    this.input.on('pointerdown', (p) => {
      if (this.muteHit(p)) return;
      if (this.state === 'over') {
        // freestyle shows its own buttons; campaign game-over restarts on tap
        if (this.freestyle) return;
        this.cameras.main.fadeOut(240, 27, 29, 42);
        this.time.delayedCall(250, () => this.scene.restart());
        return;
      }
      if (this.state !== 'playing') return;
      if (p.x < GAME_WIDTH * 0.5) {
        this.tryJump(); // left side = jump
      } else {
        this.aiming = true; // right side = aim
        this.aimPointerId = p.id;
        this.aimTargetY = p.y;
      }
    });
    this.input.on('pointermove', (p) => {
      if (this.aiming && p.id === this.aimPointerId && p.isDown) this.aimTargetY = p.y;
    });
    this.input.on('pointerup', (p) => {
      if (p.id === this.aimPointerId) this.aiming = false;
    });
  }

  buildHud() {
    const style = {
      fontFamily: FONTS.ui,
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#1b1d2a',
      strokeThickness: 4,
    };
    this.add
      .text(16, 12, this.freestyle ? '⚡ FREESTYLE' : `Level ${this.levelId}: ${this.levelCfg.name}`, {
        ...style,
        fontSize: '24px',
        color: this.freestyle ? '#ffd34d' : '#ffffff',
      })
      .setDepth(20);
    this.add
      .text(16, 44, 'Aim: ↑/↓ or drag right   Jump: Space or tap left', {
        ...style,
        fontSize: '15px',
        color: '#ffe9b0',
      })
      .setDepth(20);

    // hearts
    this.hearts = [];
    for (let i = 0; i < this.maxHealth; i++) {
      this.hearts.push(this.add.image(28 + i * 30, 84, 'heart').setDepth(20));
    }
    if (Player.state.littleKid) {
      this.add
        .text(28 + this.maxHealth * 30, 72, '👶 KID MODE', {
          fontFamily: FONTS.ui,
          fontSize: '16px',
          color: '#9fe6a0',
          stroke: '#1b1d2a',
          strokeThickness: 3,
        })
        .setDepth(20);
    }

    if (this.freestyle) {
      // score (top-right) + live arsenal tally (top-center)
      this.scoreText = this.add
        .text(GAME_WIDTH - 16, 12, 'SCORE 0', { ...style, fontSize: '26px', color: '#ffd34d' })
        .setOrigin(1, 0)
        .setDepth(20);
      this.add
        .text(GAME_WIDTH - 16, 44, `Best ${this.fs.best || 0}`, { ...style, fontSize: '14px', color: '#bfe6ff' })
        .setOrigin(1, 0)
        .setDepth(20);
      this.arsenalText = this.add
        .text(GAME_WIDTH / 2, 16, '', { ...style, fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5, 0)
        .setDepth(20);
      this.refreshArsenalText();
    } else {
      this.add.image(GAME_WIDTH - 120, 26, 'scrap').setScale(1.1).setDepth(20);
      this.scrapText = this.add
        .text(GAME_WIDTH - 104, 14, String(Player.state.scrap), { ...style, fontSize: '26px' })
        .setDepth(20);

      this.add.rectangle(GAME_WIDTH / 2, 24, 260, 12, 0x1b1d2a, 0.55).setDepth(20);
      this.progressFill = this.add
        .rectangle(GAME_WIDTH / 2 - 128, 24, 4, 8, 0x6fd06a, 1)
        .setOrigin(0, 0.5)
        .setDepth(20);
      this.add.image(GAME_WIDTH / 2 + 132, 24, 'flag').setScale(0.18).setDepth(20);
    }

    // subtle touch hints
    const hint = { fontFamily: FONTS.ui, fontSize: '13px', color: '#ffffff' };
    this.add.text(20, GAME_HEIGHT - 26, '⤒ tap = jump', hint).setAlpha(0.35).setDepth(20);
    this.add
      .text(GAME_WIDTH - 130, GAME_HEIGHT - 26, 'drag = aim ⇅', hint)
      .setAlpha(0.35)
      .setDepth(20);

    // mute + pause toggles (top-right corner)
    this.muteBtn = this.add
      .text(GAME_WIDTH - 34, 60, Player.state.muted ? '🔇' : '🔊', { fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => this.toggleMute());

    this.pauseBtn = this.add
      .text(GAME_WIDTH - 76, 60, '⏸', { fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.pauseGame());

    // boss health bar (hidden until a boss appears)
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, 56, 440, 22, 0x1b1d2a, 0.7).setDepth(20).setVisible(false);
    this.bossBarFill = this.add
      .rectangle(GAME_WIDTH / 2 - 214, 56, 428, 14, 0xe2483a, 1)
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setVisible(false);
    this.bossName = this.add
      .text(GAME_WIDTH / 2, 34, '', { ...style, fontSize: '16px', color: '#ffd34d' })
      .setOrigin(0.5)
      .setDepth(21)
      .setVisible(false);

    // red full-screen flash for taking damage
    this.hurtFlash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff2a2a, 1)
      .setDepth(24)
      .setAlpha(0);
  }

  toggleMute() {
    const m = !Player.state.muted;
    Player.setMuted(m);
    sound.setMuted(m);
    if (!m) sound.resume();
    this.muteBtn.setText(m ? '🔇' : '🔊');
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.scene.launch('Pause');
    this.scene.pause();
  }

  // True if the pointer hit a HUD button (so it isn't also a jump/aim).
  muteHit(p) {
    const onMute = Math.abs(p.x - this.muteBtn.x) < 24 && Math.abs(p.y - this.muteBtn.y) < 22;
    const onPause = Math.abs(p.x - this.pauseBtn.x) < 24 && Math.abs(p.y - this.pauseBtn.y) < 22;
    if (onPause) this.pauseGame();
    return onMute || onPause;
  }

  update(time, delta) {
    if (this.state === 'playing') {
      if (this.freestyle) {
        this.scrollWorld(delta);
        this.freestyleSpawns(time);
        this.fireArsenal(time);
      } else {
        if (this.phase === 'travel') {
          this.scrollWorld(delta);
          this.advanceLevel(delta);
          this.maybeSpawnGoblin(time);
          if (HAZARDS_ENABLED) this.maybeSpawnHazard(time);
          this.maybeSpawnMega(time);
        } else if (this.phase === 'horde') {
          this.updateHorde(time);
        } else {
          this.updateBoss(time, delta);
        }
        this.handleFiring(time);
        this.fireTurrets(time);
      }
      this.emitDust(time);
    }
    this.updateClouds(delta);
    this.updateCarPhysics(delta);
    this.updateAim(delta);
    this.updateGoblins(time);
    this.updateEnemyShots();
    this.updateScraps(delta);
    this.updateHazards(delta);
    this.updatePickups(delta);
    this.updateHoming(delta);
    this.cullBullets();
  }

  // A little dust kicked up behind the wheels as the car drives.
  emitDust(time) {
    if (!this.onGround || time - this.lastDustAt < 130) return;
    this.lastDustAt = time;
    const d = this.add
      .image(this.car.x - 44, CAR.groundY - 6, 'puff')
      .setTint(0xded2b8)
      .setScale(0.5)
      .setAlpha(0.7)
      .setDepth(4);
    this.tweens.add({
      targets: d,
      x: d.x - 26,
      y: d.y - 14,
      alpha: 0,
      scale: 0.2,
      duration: 420,
      onComplete: () => d.destroy(),
    });
  }

  // A burst of dust when the car lands from a jump.
  landPuff() {
    for (let i = 0; i < 5; i++) {
      const dir = i < 3 ? -1 : 1;
      const d = this.add
        .image(this.car.x + dir * 20, CAR.groundY - 4, 'puff')
        .setTint(0xded2b8)
        .setScale(0.6)
        .setDepth(4);
      this.tweens.add({
        targets: d,
        x: d.x + dir * (20 + Math.random() * 20),
        y: d.y - 10,
        alpha: 0,
        scale: 0.2,
        duration: 360,
        onComplete: () => d.destroy(),
      });
    }
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
    if (this.distance >= LEVEL.length) this.startHorde();
  }

  // ---- car: jump + aim --------------------------------------------------

  tryJump() {
    if (this.state !== 'playing' || !this.onGround) return;
    this.carVY = -CAR.jumpVel;
    this.onGround = false;
    sound.jump();
  }

  updateCarPhysics(delta) {
    // jump is edge-triggered (a tap), not held
    if (
      this.state === 'playing' &&
      (Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W))
    ) {
      this.tryJump();
    }

    if (!this.onGround) {
      this.carVY += CAR.gravity * delta;
      this.car.y += this.carVY * delta;
      if (this.car.y >= CAR.groundY) {
        this.car.y = CAR.groundY;
        this.carVY = 0;
        this.onGround = true;
        this.landPuff();
      }
    }
    // tilt slightly while airborne for juice
    this.car.rotation = Phaser.Math.Clamp(this.carVY * 0.06, -0.14, 0.14);

    // shadow shrinks/fades as the car rises
    const air = CAR.groundY - this.car.y;
    const f = Phaser.Math.Clamp(1 - air / 170, 0.4, 1);
    this.carShadow.setScale(f, f).setAlpha(0.22 * f);
  }

  updateAim(delta) {
    const up = this.cursors.up.isDown;
    const down = this.cursors.down.isDown;
    if (up || down) {
      this.aim += (down ? 1 : -1) * AIM.rate * delta;
    } else if (this.aiming) {
      const t = Phaser.Math.Clamp((this.aimTargetY - AIM.topZ) / (AIM.botZ - AIM.topZ), 0, 1);
      const target = Phaser.Math.Linear(AIM.min, AIM.max, t);
      this.aim = Phaser.Math.Linear(this.aim, target, Math.min(1, 0.02 * delta));
    }
    this.aim = Phaser.Math.Clamp(this.aim, AIM.min, AIM.max);
    if (this.weaponSprite) this.weaponSprite.rotation = this.aim;
  }

  carCenterY() {
    return this.car.y - 30;
  }

  // ---- enemies ----------------------------------------------------------

  maybeSpawnGoblin(time) {
    if (this.distance >= LEVEL.length) return;
    if (time < this.nextSpawnAt) return;
    this.spawnEnemy(pickEnemyType(Math.random));
    const gap = Phaser.Math.Between(this.spawnGap, this.spawnGap + 800);
    this.nextSpawnAt = time + gap;
  }

  // Shared enemy factory (used by normal spawns and the end-of-level horde).
  spawnEnemy(type, horde = false) {
    const x = GAME_WIDTH + 50 + (horde ? Phaser.Math.Between(0, 140) : 0);
    const y = type.lane === 'air' ? CAR.groundY - 120 : GROUND_TOP_Y + 2;
    const e = this.goblins.create(x, y, `${type.key}-${this.levelId}`);
    e.setOrigin(0.5, type.lane === 'air' ? 0.5 : 1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-type.speed);
    e.setData('type', type);
    e.setData('hp', type.hp);
    e.setData('seed', Math.random() * Math.PI * 2);
    if (type.lane === 'air') e.setData('baseY', y);
    if (type.lobs) e.setData('nextLob', this.time.now + Phaser.Math.Between(600, 1200));
    if (horde) e.setData('horde', true);
    return e;
  }

  // ---- freestyle bonus round -------------------------------------------

  freestyleSpawns(time) {
    if (this.fsStart === undefined) {
      this.fsStart = time;
      this.nextFsSpawn = time + 500;
      this.nextFsMega = time + 8000;
    }
    const mins = (time - this.fsStart) / 60000;
    const gap = Math.max(150, 700 - mins * 220);
    if (time >= this.nextFsSpawn) {
      this.spawnEnemy(pickEnemyType(Math.random));
      if (Math.random() < Math.min(0.65, mins * 0.35)) this.spawnEnemy(pickEnemyType(Math.random));
      this.nextFsSpawn = time + Phaser.Math.Between(gap, gap + 220);
    }
    if (time >= this.nextFsMega) {
      this.spawnFreestyleMega();
      this.nextFsMega = time + Phaser.Math.Between(11000, 17000);
    }
  }

  spawnFreestyleMega() {
    const hp = 22 + Math.floor((this.score || 0) * 0.6);
    const e = this.goblins.create(GAME_WIDTH + 90, GROUND_TOP_Y + 2, `brute-${this.levelId}`);
    e.setOrigin(0.5, 1).setScale(MEGA.scale);
    e.body.setAllowGravity(false);
    e.setVelocityX(-MEGA.speed);
    e.setData('type', { lane: 'ground', clearH: 999, mega: true, speed: MEGA.speed });
    e.setData('hp', hp);
    e.setData('maxHp', hp);
    e.setData('seed', Math.random() * Math.PI * 2);
    const bg = this.add.rectangle(e.x, 0, 72, 9, 0x1b1d2a, 0.7).setDepth(7);
    const fill = this.add.rectangle(e.x - 34, 0, 68, 5, 0xe2483a, 1).setOrigin(0, 0.5).setDepth(8);
    e.setData('hpbar', { bg, fill });
  }

  // Fire every weapon in the arsenal at once.
  fireArsenal(time) {
    const f = this.fs;
    const rate = 1 / (1 + 0.14 * (f.fireRate || 0));
    const dmg = 1 + (f.power || 0);
    let fired = false;

    if ((f.guns || 0) > 0 && time - (this.tGun || 0) > 170 * rate) {
      this.tGun = time;
      const n = f.guns;
      for (let i = 0; i < n; i++) this.fireBolt(this.aim + (i - (n - 1) / 2) * 0.05, 'shot-crossbow', 840, dmg, 1);
      fired = true;
    }
    if ((f.spread || 0) > 0 && time - (this.tSpread || 0) > 520 * rate) {
      this.tSpread = time;
      const n = 2 + f.spread;
      for (let i = 0; i < n; i++) this.fireBolt(this.aim + (i - (n - 1) / 2) * 0.16, 'shot-bow', 700, dmg, 1);
      fired = true;
    }
    if ((f.rockets || 0) > 0 && time - (this.tRocket || 0) > 680 * rate) {
      this.tRocket = time;
      for (let i = 0; i < f.rockets; i++) this.fireBolt(this.aim + (i - (f.rockets - 1) / 2) * 0.05, 'shot-rocket', 640, dmg * 2, 1.3);
      fired = true;
    }
    if ((f.missiles || 0) > 0 && time - (this.tMissile || 0) > 900 * rate) {
      this.tMissile = time;
      for (let i = 0; i < f.missiles; i++) {
        const b = this.fireBolt(-0.5, 'shot-rocket', 520, dmg * 2, 1.3);
        if (b) b.setData('homing', true).setTint(0xc060ff);
      }
    }
    if ((f.bombs || 0) > 0 && time - (this.tBomb || 0) > 1000 * rate) {
      this.tBomb = time;
      for (let i = 0; i < f.bombs; i++) this.lobBomb(dmg * 3);
    }
    if (fired) sound.shoot();
  }

  fireBolt(angle, tex, speed, dmg, scale) {
    const mx = this.car.x + 46;
    const my = this.car.y - 48;
    const b = this.bullets.create(mx, my, tex);
    if (!b) return null;
    b.body.setAllowGravity(false);
    b.setRotation(angle).setScale(scale || 1).setDepth(4);
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    b.setData('dmg', dmg);
    return b;
  }

  lobBomb(dmg) {
    const b = this.bullets.create(this.car.x + 40, this.car.y - 60, 'enemy-rock');
    b.setTint(0x33383f).setScale(1.3).setDepth(4);
    b.body.setAllowGravity(true);
    b.body.setGravityY(700);
    b.setVelocity(360 + Math.random() * 120, -380);
    b.setData('dmg', dmg);
    b.setData('bomb', true);
  }

  explodeAt(x, y, radius, dmg) {
    this.poof(x, y, 0xffd24d);
    this.poof(x, y - 10, 0xff7a3a);
    sound.explode();
    this.cameras.main.shake(120, 0.004);
    this.goblins.children.iterate((e) => {
      if (e && Phaser.Math.Distance.Between(x, y, e.x, e.y - 20) < radius) this.hitEnemy(e, dmg);
      return true;
    });
  }

  updateHoming(delta) {
    this.bullets.children.iterate((b) => {
      if (!b || !b.getData('homing')) return true;
      const t = this.nearestGoblin(b.x, b.y);
      if (t) {
        const target = Phaser.Math.Angle.Between(b.x, b.y, t.x, t.y - 20);
        const v = b.body.velocity;
        const spd = Math.hypot(v.x, v.y) || 540;
        const cur = Math.atan2(v.y, v.x);
        const na = Phaser.Math.Angle.RotateTo(cur, target, 0.005 * delta);
        b.setVelocity(Math.cos(na) * spd, Math.sin(na) * spd);
        b.setRotation(na);
      }
      return true;
    });
  }

  nearestGoblin(x, y) {
    let best = null;
    let bd = 1e9;
    this.goblins.children.iterate((e) => {
      if (e) {
        const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return true;
    });
    return best;
  }

  dropPickup(x, y) {
    const pk = pickPickup(Math.random);
    const c = this.pickups.create(x, Math.min(y, GROUND_TOP_Y - 20), 'crate');
    c.setTint(pk.tint).setScale(1.15).setDepth(5);
    c.setData('pk', pk);
  }

  updatePickups(delta) {
    if (!this.freestyle) return;
    const cx = this.car.x;
    const cy = this.carCenterY();
    this.pickups.children.iterate((p) => {
      if (!p) return true;
      const d = Phaser.Math.Distance.Between(p.x, p.y, cx, cy);
      if (d < 46) {
        this.collectPickup(p);
        return true;
      }
      if (d < 240) {
        const k = Math.min(1, 0.02 * delta);
        p.x += (cx - p.x) * k;
        p.y += (cy - p.y) * k;
      } else {
        p.x -= WORLD_SCROLL * delta;
      }
      p.rotation += 0.004 * delta;
      if (p.x < -40) p.destroy();
      return true;
    });
  }

  collectPickup(p) {
    const pk = p.getData('pk');
    p.destroy();
    Player.upgradeFreestyle(pk.type);
    this.fs = Player.freestyle;
    sound.pickup();
    const color = '#' + pk.tint.toString(16).padStart(6, '0');
    this.floatLabel(this.car.x, this.car.y - 96, pk.label, color);
    this.refreshArsenalText();
    if (pk.type === 'heart') {
      this.maxHealth += 1;
      this.health = this.maxHealth;
      this.rebuildHearts();
    } else if (['guns', 'spread', 'rockets', 'missiles', 'bombs'].includes(pk.type)) {
      this.refreshFreestyleCar();
    }
  }

  floatLabel(x, y, text, color) {
    const t = this.add
      .text(x, y, text, { fontFamily: FONTS.display, fontSize: '24px', color, stroke: '#1b1d2a', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(22);
    this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 950, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  refreshArsenalText() {
    if (!this.arsenalText) return;
    const f = this.fs;
    const parts = [];
    if (f.guns) parts.push(`🔫${f.guns}`);
    if (f.spread) parts.push(`◣${f.spread}`);
    if (f.rockets) parts.push(`🚀${f.rockets}`);
    if (f.missiles) parts.push(`🎯${f.missiles}`);
    if (f.bombs) parts.push(`💣${f.bombs}`);
    if (f.fireRate) parts.push(`⚡${f.fireRate}`);
    if (f.power) parts.push(`💥${f.power}`);
    this.arsenalText.setText(parts.join('   '));
  }

  rebuildHearts() {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    const shown = Math.min(this.maxHealth, 10);
    for (let i = 0; i < shown; i++) this.hearts.push(this.add.image(28 + i * 30, 84, 'heart').setDepth(20));
    this.renderHearts();
  }

  freestyleOver() {
    this.state = 'over';
    this.aiming = false;
    sound.stopMusic();
    sound.lose();
    Player.setFreestyleBest(this.score);
    Player.freestyleRun();
    this.freezeEnemies();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.62).setDepth(30);
    this.bannerText(cx, cy - 96, 'BONUS ROUND OVER', '#ffd34d', 40);
    this.bannerText(cx, cy - 44, `You smashed ${this.score}!  (Best ${this.fs.best})`, '#ffffff', 22);
    this.bannerText(cx, cy - 8, 'Your arsenal is saved 💪', '#9fe6a0', 18);

    this.overButton(cx, cy + 34, 'Replay (keep arsenal)', 0x39b54a, () =>
      this.scene.restart({ freestyle: true })
    );
    this.overButton(cx, cy + 86, 'Start fresh arsenal', 0x7a5a8a, () => {
      Player.resetFreestyle();
      this.scene.restart({ freestyle: true });
    });
    this.overButton(cx, cy + 138, 'Main Menu', 0x4a78c0, () => this.scene.start('Title'));
  }

  overButton(x, y, label, color, onClick) {
    const c = this.add.container(x, y).setDepth(32);
    const bg = this.add.rectangle(0, 0, 300, 44, color, 1).setStrokeStyle(3, 0x1b1d2a);
    bg.setInteractive({ useHandCursor: true });
    const t = this.add
      .text(0, 0, label, { fontFamily: FONTS.ui, fontSize: '20px', color: '#ffffff', stroke: '#1b1d2a', strokeThickness: 3 })
      .setOrigin(0.5);
    c.add([bg, t]);
    bg.on('pointerover', () => c.setScale(1.05));
    bg.on('pointerout', () => c.setScale(1));
    bg.on('pointerdown', onClick);
    return c;
  }

  // Rare, big, tanky enemy. Defeating it bolts a turret onto the car.
  maybeSpawnMega(time) {
    if (this.distance >= LEVEL.length - 1500) return; // not right before the boss
    if (time < this.nextMegaAt) return;

    const hp = 12 + this.level * 4;
    const type = { key: 'mega', lane: 'ground', clearH: 999, scrap: 4, mega: true, speed: MEGA.speed };
    const e = this.goblins.create(GAME_WIDTH + 90, GROUND_TOP_Y + 2, `brute-${this.levelId}`);
    e.setOrigin(0.5, 1).setScale(MEGA.scale);
    e.body.setAllowGravity(false);
    e.setVelocityX(-MEGA.speed);
    e.setData('type', type);
    e.setData('hp', hp);
    e.setData('maxHp', hp);
    e.setData('seed', Math.random() * Math.PI * 2);

    // floating health bar
    const bg = this.add.rectangle(e.x, 0, 72, 9, 0x1b1d2a, 0.7).setDepth(7);
    const fill = this.add.rectangle(e.x - 34, 0, 68, 5, 0xe2483a, 1).setOrigin(0, 0.5).setDepth(8);
    e.setData('hpbar', { bg, fill });

    this.nextMegaAt = time + Phaser.Math.Between(MEGA.everyMin, MEGA.everyMax);
  }

  // Bolt-on top turrets auto-fire toward the enemy band, so their shots angle
  // down and actually hit ground enemies instead of flying over them.
  fireTurrets(time) {
    const muzzles = this.car.getData('turretMuzzles');
    if (!muzzles || !muzzles.length) return;
    if (time - this.lastTurretAt < TURRET_COOLDOWN) return;
    this.lastTurretAt = time;

    const targetY = GROUND_TOP_Y - 30; // roughly the middle of a ground enemy
    const reach = 520; // how far ahead the shots converge
    muzzles.forEach((m) => {
      const mx = this.car.x + m.x;
      const my = this.car.y + m.y;
      const ang = Math.atan2(targetY - my, reach);
      const b = this.bullets.create(mx, my, 'shot-crossbow');
      b.body.setAllowGravity(false);
      b.setRotation(ang);
      b.setVelocity(Math.cos(ang) * TURRET_SPEED, Math.sin(ang) * TURRET_SPEED);
      b.setData('dmg', 1);
    });
  }

  // Destroy an enemy and clean up its attached health bar, if any.
  removeEnemy(e) {
    const bar = e.getData('hpbar');
    if (bar) {
      bar.bg.destroy();
      bar.fill.destroy();
    }
    e.destroy();
  }

  updateMegaBar(e) {
    const bar = e.getData('hpbar');
    if (!bar) return;
    const frac = Math.max(0, e.getData('hp') / e.getData('maxHp'));
    bar.fill.width = 68 * frac;
  }

  updateGoblins(time) {
    const carCY = this.carCenterY();
    this.goblins.children.iterate((e) => {
      if (!e) return true;
      const type = e.getData('type');
      const t = this.time.now * 0.012 + e.getData('seed');

      if (type.lane === 'air') {
        e.y = e.getData('baseY') + Math.sin(t * 1.6) * 26;
      } else {
        e.rotation = Math.sin(t * 1.5) * 0.08;
        if (type.lobs && this.state === 'playing' && e.x < GAME_WIDTH - 70 && time > e.getData('nextLob')) {
          this.lobRock(e);
          e.setData('nextLob', time + Phaser.Math.Between(1400, 2400));
        }
      }

      // keep a mega's health bar floating above it
      if (type.mega) {
        const bar = e.getData('hpbar');
        if (bar) {
          const topY = e.y - e.displayHeight - 12;
          bar.bg.setPosition(e.x, topY);
          bar.fill.setPosition(e.x - 34, topY);
        }
      }

      // reached the car?
      if (this.state === 'playing' && Math.abs(e.x - this.car.x) < 40) {
        const hitsAir = type.lane === 'air' && Math.abs(e.y - carCY) < 48;
        const airborne = CAR.groundY - this.car.y;
        const hitsGround = type.lane !== 'air' && airborne < type.clearH;
        if (hitsAir || hitsGround) {
          this.poof(e.x, type.lane === 'air' ? e.y : e.y - 24, COLORS.goblin);
          if (e.getData('horde')) this.hordeAlive -= 1; // crashed into us — not a kill
          this.removeEnemy(e);
          this.damageCar(COMBAT.contactDamage);
          return true;
        }
      }

      if (e.x < -90) {
        if (e.getData('horde')) this.hordeAlive -= 1; // slipped past — not a kill
        this.removeEnemy(e);
      }
      return true;
    });
  }

  lobRock(lobber) {
    const r = this.enemyShots.create(lobber.x - 8, lobber.y - 52, 'enemy-rock');
    r.body.setAllowGravity(true);
    r.body.setGravityY(900);
    r.setVelocity(-190, -360);
    r.setData('spin', Phaser.Math.FloatBetween(-0.01, 0.01));
  }

  updateEnemyShots() {
    const carCY = this.carCenterY();
    this.enemyShots.children.iterate((r) => {
      if (!r) return true;
      r.rotation += r.getData('spin') || 0.006;

      if (
        this.state === 'playing' &&
        Math.abs(r.x - this.car.x) < 30 &&
        Math.abs(r.y - carCY) < 34
      ) {
        this.poof(r.x, r.y, 0x9aa0ab);
        r.destroy();
        this.damageCar(COMBAT.rockDamage);
        return true;
      }
      if (r.y > GROUND_TOP_Y - 2) {
        this.poof(r.x, GROUND_TOP_Y - 6, 0x9aa0ab);
        r.destroy();
        return true;
      }
      if (r.x < -40 || r.x > GAME_WIDTH + 80) r.destroy();
      return true;
    });
  }

  onShootRock(bullet, rock) {
    bullet.destroy();
    this.poof(rock.x, rock.y, 0xcfd3da);
    rock.destroy();
  }

  onBulletHit(bullet, goblin) {
    const dmg = bullet.getData('dmg') || this.weapon.damage;
    if (bullet.getData('bomb')) {
      this.explodeAt(bullet.x, bullet.y, 95, dmg);
      bullet.destroy();
      return;
    }
    bullet.destroy();
    this.hitEnemy(goblin, dmg);
  }

  hitEnemy(goblin, dmg) {
    if (!goblin.active) return;
    const hp = goblin.getData('hp') - dmg;
    if (hp > 0) {
      goblin.setData('hp', hp);
      this.updateMegaBar(goblin);
      goblin.setTintFill(0xffffff);
      this.time.delayedCall(60, () => goblin.active && goblin.clearTint());
      return;
    }
    this.defeatGoblin(goblin);
  }

  defeatGoblin(goblin) {
    const type = goblin.getData('type');
    const yy = type.lane === 'air' ? goblin.y : goblin.y - 26;
    sound.defeat();
    this.poof(goblin.x, yy, COLORS.goblin);
    if (type.mega) this.poof(goblin.x, yy, 0xffe14d);

    if (this.freestyle) {
      this.score += type.mega ? 5 : 1;
      this.scoreText.setText('SCORE ' + this.score);
      Player.setFreestyleBest(this.score);
      if (type.mega) this.dropPickup(goblin.x, yy);
      else if (Math.random() < 0.18) this.dropPickup(goblin.x, yy);
      this.removeEnemy(goblin);
      return;
    }

    for (let i = 0; i < (type.scrap || 1); i++) {
      this.spawnScrap(goblin.x + Phaser.Math.Between(-12, 12), yy + Phaser.Math.Between(-8, 8));
    }
    if (goblin.getData('horde')) {
      this.hordeDefeated += 1;
      this.hordeAlive -= 1;
    }
    this.removeEnemy(goblin);
    if (type.mega) this.rewardTurret();
  }

  // Mega defeated → bolt a turret on (live), or bonus scrap if already maxed.
  rewardTurret() {
    if (Player.addTurret()) {
      addTurret(this, this.car, Player.state.turrets - 1);
      sound.win();
      this.bannerFlash('⚙  TURRET UNLOCKED — extra firepower!', '#9fe6a0');
    } else {
      sound.win();
      this.bannerFlash('MEGA SMASHED!  +scrap', '#ffe14d');
      for (let i = 0; i < 6; i++) {
        this.spawnScrap(this.car.x + 220 + i * 8, GROUND_TOP_Y - 30);
      }
    }
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

  // ---- damage / health --------------------------------------------------

  damageCar(amount) {
    if (this.state !== 'playing') return;
    if (this.time.now < this.invulnUntil) return;

    this.invulnUntil = this.time.now + COMBAT.invuln;
    sound.hurt();
    this.cameras.main.shake(140, 0.005);

    // Kid Mode: the car is just briefly stunned, never damaged or destroyed.
    if (Player.state.littleKid) {
      this.tweens.add({
        targets: this.car,
        alpha: { from: 0.4, to: 1 },
        duration: 130,
        yoyo: true,
        repeat: 2,
        onComplete: () => this.car && this.car.setAlpha(1),
      });
      return;
    }

    this.health -= amount;
    this.hurtFlash.setAlpha(0.4);
    this.tweens.add({ targets: this.hurtFlash, alpha: 0, duration: 320 });
    this.renderHearts();

    // blink the car while invulnerable
    this.tweens.add({
      targets: this.car,
      alpha: { from: 0.25, to: 1 },
      duration: 150,
      yoyo: true,
      repeat: Math.floor(COMBAT.invuln / 300),
      onComplete: () => this.car && this.car.setAlpha(1),
    });

    if (this.health <= 0) {
      if (this.freestyle) this.freestyleOver();
      else this.gameOver();
    }
  }

  renderHearts() {
    this.hearts.forEach((h, i) => h.setTexture(i < this.health ? 'heart' : 'heart-empty'));
  }

  // ---- scrap ------------------------------------------------------------

  spawnScrap(x, y) {
    const s = this.scraps.create(x, y, 'scrap');
    s.setDepth(4);
    s.setData('vy', -0.18 - Math.random() * 0.12);
  }

  updateScraps(delta) {
    const cx = this.car.x;
    const cy = this.carCenterY();
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
    sound.pickup();
    Player.state.scrap += SCRAP.value;
    this.scrapText.setText(String(Player.state.scrap));
    this.tweens.add({
      targets: this.scrapText,
      scale: { from: 1.35, to: 1 },
      duration: 160,
      ease: 'Back.easeOut',
    });
  }

  // ---- hazards ----------------------------------------------------------

  maybeSpawnHazard(time) {
    if (this.distance >= LEVEL.length) return;
    if (time < this.nextHazardAt) return;
    const h = this.hazards.create(GAME_WIDTH + 60, GROUND_TOP_Y + 6, 'hazard');
    h.setOrigin(0.5, 1).setDepth(4);
    h.setData('hit', false);
    this.nextHazardAt = time + Phaser.Math.Between(HAZARD.everyMin, HAZARD.everyMax);
  }

  updateHazards(delta) {
    this.hazards.children.iterate((h) => {
      if (!h) return true;
      h.x -= WORLD_SCROLL * delta;
      if (
        this.state === 'playing' &&
        !h.getData('hit') &&
        Math.abs(h.x - this.car.x) < 38
      ) {
        const airborne = CAR.groundY - this.car.y;
        if (airborne < HAZARD.clearH) {
          h.setData('hit', true);
          this.poof(h.x, GROUND_TOP_Y - 10, 0xcfd3da);
          this.damageCar(COMBAT.hazardDamage);
        }
      }
      if (h.x < -60) h.destroy();
      return true;
    });
  }

  // ---- end-of-level horde ----------------------------------------------

  startHorde() {
    this.phase = 'horde';
    this.progressFill.width = 256;
    this.hordeTotal = 6 + this.level; // grows a little each level
    this.hordeSpawned = 0;
    this.hordeAlive = 0;
    this.hordeDefeated = 0;
    this.hordeDone = false;
    this.nextHordeSpawnAt = this.time.now + 600;
    this.bannerFlash('🔥  HORDE INCOMING!  🔥', '#ff7a7a');
  }

  updateHorde(time) {
    // stagger the wave in
    if (this.hordeSpawned < this.hordeTotal && time >= this.nextHordeSpawnAt) {
      this.spawnEnemy(pickEnemyType(Math.random), true);
      this.hordeSpawned += 1;
      this.hordeAlive += 1;
      this.nextHordeSpawnAt = time + Phaser.Math.Between(220, 360);
    }
    // all spawned and none left → clear
    if (!this.hordeDone && this.hordeSpawned >= this.hordeTotal && this.hordeAlive <= 0) {
      this.finishHorde();
    }
  }

  finishHorde() {
    this.hordeDone = true;
    const perfect = this.hordeDefeated >= this.hordeTotal;
    const bonus = this.hordeDefeated * 2 + (perfect ? 10 : 0);
    Player.state.scrap += bonus;
    this.scrapText.setText(String(Player.state.scrap));
    sound.win();
    this.bannerFlash(
      `${perfect ? 'PERFECT HORDE!' : 'HORDE CLEARED!'}  +${bonus} scrap`,
      perfect ? '#9fe6a0' : '#ffe14d'
    );
    this.time.delayedCall(1300, () => this.startBossSequence());
  }

  // ---- boss sequence ----------------------------------------------------

  startBossSequence() {
    this.phase = 'miniboss';
    this.progressFill.width = 256;
    this.bannerFlash('⚠  BOSS INCOMING!  ⚠', '#ff7a7a');
    this.time.delayedCall(900, () => this.spawnBoss(this.miniSpec));
  }

  spawnBoss(spec) {
    const b = this.bosses.create(GAME_WIDTH + 160, GROUND_TOP_Y + 6, spec.tex);
    b.setOrigin(0.5, 1).setDepth(5);
    b.body.setAllowGravity(false);
    if (spec.scale) b.setScale(spec.scale);
    b.setData('spec', spec);
    b.setData('hp', spec.hp);
    b.setData('maxHp', spec.hp);
    b.setData('fighting', false);
    b.setData('baseY', GROUND_TOP_Y + 6);
    b.setData('nextAttack', 0);
    this.boss = b;

    this.showBossBar(spec.name);
    this.tweens.add({
      targets: b,
      x: spec.x,
      duration: 1100,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (b.active) {
          b.setData('fighting', true);
          b.setData('nextAttack', this.time.now + 700);
        }
      },
    });
  }

  updateBoss(time) {
    const b = this.boss;
    if (!b || !b.active) return;
    const spec = b.getData('spec');

    b.y = b.getData('baseY') + Math.sin(time * 0.004) * 6;

    if (!b.getData('fighting')) return;
    if (time < b.getData('nextAttack')) return;

    if (spec.role === 'mini') {
      this.summonRunner();
      b.setData('nextAttack', time + MINI_SUMMON_EVERY);
    } else {
      const enraged = b.getData('hp') <= b.getData('maxHp') * 0.5;
      this.throwProjectile(b, spec.projTex);
      if (enraged) this.time.delayedCall(260, () => b.active && this.throwProjectile(b, spec.projTex));
      b.setData('nextAttack', time + (enraged ? BOSS_THROW_EVERY * 0.7 : BOSS_THROW_EVERY));
    }
  }

  summonRunner() {
    const e = this.goblins.create(GAME_WIDTH + 40, GROUND_TOP_Y + 2, `runner-${this.levelId}`);
    e.setOrigin(0.5, 1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-320);
    e.setData('type', { lane: 'ground', clearH: 42, hp: 1, scrap: 1 });
    e.setData('hp', 1);
    e.setData('seed', Math.random() * Math.PI * 2);
  }

  throwProjectile(b, tex) {
    const c = this.enemyShots.create(b.x - 40, b.y - 90, tex);
    c.body.setAllowGravity(true);
    c.body.setGravityY(900);
    c.setVelocity(-520, -430);
    c.setData('spin', Phaser.Math.FloatBetween(-0.02, 0.02));
  }

  onBulletHitBoss(bullet, boss) {
    const dmg = bullet.getData('dmg') || this.weapon.damage;
    bullet.destroy();
    if (!boss.active) return;
    const hp = boss.getData('hp') - dmg;
    boss.setData('hp', Math.max(0, hp));
    this.updateBossBar();
    sound.bossHit();
    boss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => boss.active && boss.clearTint());
    if (hp <= 0) this.defeatBoss(boss);
  }

  defeatBoss(boss) {
    const spec = boss.getData('spec');
    const bx = boss.x;
    const by = boss.y - 50;
    boss.destroy();
    this.boss = null;
    this.hideBossBar();
    sound.explode();
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 90, () =>
        this.poof(bx + Phaser.Math.Between(-40, 40), by + Phaser.Math.Between(-30, 30), 0xffe14d)
      );
    }

    if (spec.role === 'mini') {
      this.phase = 'boss';
      this.bannerFlash(`Here comes ${this.bossSpec.name}!`, '#ffe14d');
      this.time.delayedCall(1100, () => this.spawnBoss(this.bossSpec));
    } else {
      this.winLevel(true);
    }
  }

  // ---- boss health bar UI ----
  showBossBar(name) {
    this.bossName.setText(name).setVisible(true);
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossBarFill.width = 428;
  }
  updateBossBar() {
    if (!this.boss) return;
    const frac = this.boss.getData('hp') / this.boss.getData('maxHp');
    this.bossBarFill.width = Math.max(0, 428 * frac);
  }
  hideBossBar() {
    this.bossName.setVisible(false);
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
  }

  bannerFlash(msg, color) {
    const t = this.bannerText(GAME_WIDTH / 2, 150, msg, color, 34);
    t.setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      yoyo: true,
      hold: 600,
      duration: 300,
      onComplete: () => t.destroy(),
    });
  }

  winLevel(beatBoss) {
    this.state = 'complete';
    this.aiming = false;
    this.freezeEnemies();
    sound.stopMusic();
    sound.win();

    const reward = this.levelCfg.reward;
    const isFinal = this.levelId >= LAST_LEVEL;

    // boss drops a part that unlocks the next car body
    Player.state.scrap += 12;
    if (reward) Player.unlockPart(reward.part);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.5).setDepth(30);

    if (isFinal) {
      this.bannerText(cx, cy - 80, '🏆  YOU SAVED THE LAND!  🏆', '#ffe14d', 38);
      this.bannerText(cx, cy - 30, `You beat ${this.bossSpec.name} and every goblin horde!`, '#ffffff', 20);
      this.bannerText(cx, cy + 16, 'CHAMPION', '#9fe6a0', 30);
    } else {
      this.bannerText(cx, cy - 78, `YOU BEAT ${this.bossSpec.name.toUpperCase()}!`, '#ffe14d', 36);
      if (reward) {
        this.add.image(cx, cy, 'axle').setScale(1.5).setDepth(32);
        this.bannerText(cx, cy + 38, `New part unlocked — build the ${reward.body}!`, '#9fe6a0', 18);
      }
    }
    this.bannerText(cx, cy + 80, 'Rolling into the Garage…', '#ffffff', 20);
    for (let i = 0; i < 36; i++) this.time.delayedCall(i * 20, () => this.confettiBit(cx, cy - 150));

    const earned = Player.state.scrap - this.levelStartScrap;
    Player.save();
    this.time.delayedCall(2400, () => this.go('Garage', { earned }));
  }

  freezeEnemies() {
    this.goblins.children.iterate((g) => {
      if (g) g.setVelocityX(0);
      return true;
    });
    this.bosses.children.iterate((b) => {
      if (b) b.setData('fighting', false);
      return true;
    });
  }

  gameOver() {
    this.state = 'over';
    this.aiming = false;
    sound.stopMusic();
    sound.lose();
    Player.save();
    this.freezeEnemies();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.55).setDepth(30);
    this.bannerText(cx, cy - 30, 'GAME OVER', '#ff7a7a', 50);
    this.bannerText(cx, cy + 26, 'Tap or press R to try again', '#ffffff', 22);
    this.bannerText(cx, cy + 60, `Scrap kept: ${Player.state.scrap}`, '#ffe14d', 18);
  }

  bannerText(x, y, msg, color, size) {
    return this.add
      .text(x, y, msg, {
        fontFamily: FONTS.display,
        fontSize: `${size}px`,
        color,
        stroke: '#1b1d2a',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(32);
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

  // ---- shooting ---------------------------------------------------------

  handleFiring(time) {
    if (time - this.lastFireAt < this.weapon.cooldown) return;
    this.lastFireAt = time;

    const m = muzzleFor(this.car, this.aim);
    const mx = this.car.x + m.x;
    const my = this.car.y + m.y;

    const shot = this.bullets.create(mx, my, this.weapon.shot);
    shot.setScale(this.weapon.shotScale || 1);
    shot.setRotation(this.aim);
    shot.body.setAllowGravity(false);
    shot.setVelocity(Math.cos(this.aim) * this.weapon.speed, Math.sin(this.aim) * this.weapon.speed);
    sound.shoot();
    this.muzzleFlash(mx, my);

    this.tweens.add({
      targets: this.car,
      x: { from: CAR.x - 4, to: CAR.x },
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  muzzleFlash(x, y) {
    const f = this.add.image(x, y, 'puff').setTint(0xffe08a).setScale(0.7).setDepth(6);
    this.tweens.add({
      targets: f,
      scale: 0.2,
      alpha: 0,
      duration: 110,
      onComplete: () => f.destroy(),
    });
  }

  cullBullets() {
    this.bullets.children.iterate((b) => {
      if (!b) return true;
      // bombs explode when they hit the ground
      if (b.getData('bomb') && b.y > GROUND_TOP_Y - 6) {
        this.explodeAt(b.x, GROUND_TOP_Y - 8, 95, b.getData('dmg') || 1);
        b.destroy();
        return true;
      }
      if (b.x > GAME_WIDTH + 40 || b.x < -40 || b.y < -40 || b.y > GAME_HEIGHT + 40) b.destroy();
      return true;
    });
  }
}
