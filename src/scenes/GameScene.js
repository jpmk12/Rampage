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
import { ENEMY_TYPES, pickEnemyType, pickEnemyForLevel } from '../data/enemies.js';
import { pickPickup } from '../data/freestyle.js';
import { POWERUPS, pickPowerup } from '../data/powerups.js';
import { getLevel, LAST_LEVEL } from '../data/levels.js';
import { buildCar, muzzleFor, addTurret } from '../entities/Car.js';
import { sound } from '../audio/Sound.js';


// Hazards you must jump over are disabled for now (per request).
const HAZARDS_ENABLED = false;

// Kill-combo: chain defeats within this window to build a score/loot multiplier.
const COMBO_WINDOW = 2200; // ms before a streak lapses

// Freestyle: each weapon fires at most this many projectiles per volley.
// Pickups collected beyond the cap stop adding projectiles and instead LEVEL
// UP that weapon — every shot hits harder (and a touch bigger) — so the screen
// never fills with hundreds of bullets no matter how many crates you grab.
const WEAPON_CAP = { guns: 6, spread: 5, rockets: 4, missiles: 3, bombs: 2 };
const OVERFLOW_DMG = 0.5; // per-pickup bonus damage multiplier past the cap
const OVERFLOW_SIZE = 0.05; // per-pickup projectile size bump past the cap (capped)
// Fire-rate also has a ceiling: past this, shots don't get any faster (which
// would refill the screen) — extra fire-rate pickups boost damage instead.
const FIRE_RATE_CAP = 8;
const FIRE_RATE_OVER_DMG = 0.12; // per-pickup damage past the fire-rate cap

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
    // heavier bodies jump lower — a real trade-off vs. their extra health
    this.carJump = (this.freestyle ? getBody('tank').jump : getBody(profile.body).jump) || 1;
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
    this.combo = 0;
    this.comboUntil = 0;
    this.lastRewardMult = 1; // combo milestones already rewarded this streak
    this.radioItems = null; // Bolt's Radio buttons (campaign only)
    this.fx = {}; // timed power-up expiries: rapid/spread/magnet → timestamp
    this.shieldHits = 0;
    this.shieldBubble = null;
    this.supplyAt = [0.34, 0.67]; // level progress marks for supply drops
    this.supplyIdx = 0;
    this.eventAt = [0.22, 0.5, 0.8]; // road-event marks (treasure / cage, alternating)
    this.eventIdx = 0;
    // OVERDRIVE: kills charge the meter; when full, tap/E for a super burst
    this.odCharge = 0; // 0..100
    this.odReady = false;
    this.odActive = false;
    this.odUntil = 0;

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

    // audio: start this biome's theme, and stop it on shutdown/restart
    this.musicTheme = this.freestyle ? 'free' : this.levelId;
    this.syncAudio();
    sound.startMusic(this.musicTheme);
    this.events.once('shutdown', () => sound.stopMusic());
    this.events.once('destroy', () => sound.stopMusic());
    // pause/resume music with the scene (pause menu)
    this.events.on('pause', () => sound.stopMusic());
    this.events.on('resume', () => {
      this.syncAudio();
      sound.startMusic(this.musicTheme);
      this.refreshIntensity();
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

    this.mountains = this.add
      .tileSprite(0, GROUND_TOP_Y - 200, GAME_WIDTH, 200, `mtns-${id}`)
      .setOrigin(0, 0)
      .setAlpha(0.92);
    this.farHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 150, GAME_WIDTH, 150, `hills-far-${id}`)
      .setOrigin(0, 0);
    this.nearHills = this.add
      .tileSprite(0, GROUND_TOP_Y - 210, GAME_WIDTH, 210, `hills-near-${id}`)
      .setOrigin(0, 0);
    this.ground = this.add
      .tileSprite(0, GROUND_TOP_Y, GAME_WIDTH, 90, `ground-${id}`)
      .setOrigin(0, 0);
    this.buildProps();
  }

  // Scenery props (trees/cacti/…) that roll past on the ground and recycle.
  buildProps() {
    this.props = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const p = this.add
        .image((i / n) * GAME_WIDTH * 1.25 + Math.random() * 90, GROUND_TOP_Y + 5, `prop-${this.levelId}`)
        .setOrigin(0.5, 1)
        .setScale(0.7 + Math.random() * 0.5)
        .setAlpha(0.97)
        .setDepth(0);
      p.flipX = Math.random() < 0.5;
      this.props.push(p);
    }
  }

  updateProps(delta) {
    if (!this.props) return;
    for (const p of this.props) {
      p.x -= WORLD_SCROLL * delta;
      if (p.x < -70) {
        p.x = GAME_WIDTH + 70 + Math.random() * 160;
        p.setScale(0.7 + Math.random() * 0.5);
        p.flipX = Math.random() < 0.5;
      }
    }
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

  // ---- arsenal scaling (capped projectiles + overflow upgrades) ----

  // Projectiles a weapon actually fires, clamped to its cap.
  fsCount(type) {
    return Math.min(WEAPON_CAP[type], this.fs[type] || 0);
  }
  // Pickups collected past a weapon's cap — its "upgrade level".
  fsOverflow(type) {
    return Math.max(0, (this.fs[type] || 0) - WEAPON_CAP[type]);
  }
  // Damage multiplier a weapon earns from its overflow upgrades.
  fsBoost(type) {
    return 1 + this.fsOverflow(type) * OVERFLOW_DMG;
  }
  // Modest, capped projectile size bump so upgraded shots read as "stronger".
  fsSizeBoost(type) {
    return 1 + Math.min(0.8, this.fsOverflow(type) * OVERFLOW_SIZE);
  }

  // Capped projectile count summed across weapons (drives the car visual).
  fsTotalWeapons() {
    return (
      this.fsCount('guns') + this.fsCount('spread') + this.fsCount('rockets') +
      this.fsCount('missiles') + this.fsCount('bombs')
    );
  }
  // Total overflow upgrades across all weapons.
  fsTotalOverflow() {
    return (
      this.fsOverflow('guns') + this.fsOverflow('spread') + this.fsOverflow('rockets') +
      this.fsOverflow('missiles') + this.fsOverflow('bombs')
    );
  }

  // Overall power index — drives how many/how tough the enemies and bosses get.
  // Capped weapon counts plus a gently-damped overflow term, so enemies keep
  // pace as you level up without exploding the way raw pickup counts did.
  fsPower() {
    const f = this.fs;
    return (
      this.fsTotalWeapons() + (f.power || 0) + (f.fireRate || 0) + (f.heart || 0) +
      this.fsTotalOverflow() * 0.15
    );
  }

  fsHpMult() {
    return 1 + this.fsPower() * 0.13;
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
    this.keys = this.input.keyboard.addKeys('W,S,R,E');
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
      if (this.odHit(p)) return;
      if (this.radioHit(p)) return;
      if (this.state === 'over') {
        // freestyle shows its own buttons; campaign game-over restarts on tap
        if (this.freestyle) return;
        this.cameras.main.fadeOut(240, 27, 29, 42);
        this.time.delayedCall(250, () => this.scene.restart({ freestyle: false }));
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

    // active power-up chips (⚡7  ◣3  🛡), under the hearts
    this.fxText = this.add
      .text(16, 102, '', { fontFamily: FONTS.ui, fontSize: '16px', color: '#bfe6ff', stroke: '#1b1d2a', strokeThickness: 3 })
      .setDepth(20);
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
      this.buildRadio();
    }

    // kill-combo readout (hidden until a streak builds)
    this.comboText = this.add
      .text(GAME_WIDTH / 2, 112, '', { fontFamily: FONTS.display, fontSize: '30px', color: '#ffd34d', stroke: '#1b1d2a', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(21)
      .setAlpha(0);

    // OVERDRIVE meter (bottom-center): kills charge it; full = tappable button
    const oy = GAME_HEIGHT - 22;
    this.odBarBg = this.add
      .rectangle(GAME_WIDTH / 2, oy, 224, 18, 0x1b1d2a, 0.65)
      .setStrokeStyle(2, 0x3a3f4a)
      .setDepth(20);
    this.odBarFill = this.add
      .rectangle(GAME_WIDTH / 2 - 108, oy, 0, 10, 0xffd34d, 1)
      .setOrigin(0, 0.5)
      .setDepth(21);
    this.odLabel = this.add
      .text(GAME_WIDTH / 2, oy, '⚡ OVERDRIVE', { fontFamily: FONTS.ui, fontSize: '13px', color: '#ffffff', stroke: '#1b1d2a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setAlpha(0.75)
      .setDepth(22);

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

  // push the saved audio preferences into the sound engine
  syncAudio() {
    sound.setMuted(Player.state.muted);
    sound.setMusicVol(Player.state.musicVol);
    sound.setSfxVol(Player.state.sfxVol);
  }

  // 0 normal, 1 boss fight, 2 danger/overdrive — drives the music energy
  musicIntensity() {
    if (this.odActive) return 2;
    if (this.health <= 1 && this.state === 'playing' && !Player.state.littleKid) return 2;
    if (this.boss) return 1;
    return 0;
  }
  refreshIntensity() {
    sound.setIntensity(this.musicIntensity());
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
        if (this.boss) this.updateBoss(time);
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
      if (this.combo > 0 && time > this.comboUntil) this.resetCombo();
      this.updatePowerups(time);
      this.updateOverdrive(time);
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
    this.mountains.tilePositionX += SCROLL.mountains * delta;
    this.farHills.tilePositionX += SCROLL.farHills * delta;
    this.nearHills.tilePositionX += SCROLL.nearHills * delta;
    this.ground.tilePositionX += SCROLL.ground * delta;
    this.updateProps(delta);
  }

  advanceLevel(delta) {
    this.distance += WORLD_SCROLL * delta;
    const p = Phaser.Math.Clamp(this.distance / LEVEL.length, 0, 1);
    this.progressFill.width = 4 + p * 252;
    if (this.supplyIdx < this.supplyAt.length && p >= this.supplyAt[this.supplyIdx]) {
      this.supplyIdx += 1;
      this.startSupplyDrop();
    }
    if (this.eventIdx < this.eventAt.length && p >= this.eventAt[this.eventIdx]) {
      const treasure = this.eventIdx % 2 === 0;
      this.eventIdx += 1;
      if (treasure) this.spawnTreasureGoblin();
      else this.spawnCage();
    }
    if (this.distance >= LEVEL.length) this.startHorde();
  }

  // ---- car: jump + aim --------------------------------------------------

  tryJump() {
    if (this.state !== 'playing' || !this.onGround) return;
    this.carVY = -CAR.jumpVel * (this.carJump || 1);
    this.onGround = false;
    sound.jump();
    this.carSquash(0.86, 1.16); // stretch up on launch
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
        this.carSquash(1.18, 0.82); // squash flat on landing
      }
    }
    // tilt slightly while airborne for juice
    this.car.rotation = Phaser.Math.Clamp(this.carVY * 0.06, -0.14, 0.14);

    // shadow shrinks/fades as the car rises
    const air = CAR.groundY - this.car.y;
    const f = Phaser.Math.Clamp(1 - air / 170, 0.4, 1);
    this.carShadow.setScale(f, f).setAlpha(0.22 * f);

    // roll the wheels (faster on the ground, coasting in the air)
    const wheels = this.car.getData('wheels');
    if (wheels && wheels.length) {
      const spin = (this.onGround ? 0.02 : 0.008) * delta;
      for (const w of wheels) w.rotation += spin;
    }
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
    this.spawnEnemy(pickEnemyForLevel(this.levelCfg, Math.random));
    const gap = Phaser.Math.Between(this.spawnGap, this.spawnGap + 800);
    this.nextSpawnAt = time + gap;
  }

  // Shared enemy factory (used by normal spawns and the end-of-level horde).
  spawnEnemy(type, horde = false) {
    const x = GAME_WIDTH + 50 + (horde ? Phaser.Math.Between(0, 140) : 0);
    const y = type.lane === 'air' ? CAR.groundY - 120 : GROUND_TOP_Y + 2;
    const e = this.goblins.create(x, y, `${type.tex || type.key}-${this.levelId}`);
    e.setOrigin(0.5, type.lane === 'air' ? 0.5 : 1);
    e.setDepth(1);
    if (type.scale) e.setScale(type.scale);
    e.setData('baseScale', type.scale || 1);
    // a soft contact shadow grounds ground enemies (and reads their little hop)
    if (type.lane !== 'air') {
      const sc = type.scale || 1;
      const shadow = this.add.ellipse(x, GROUND_TOP_Y + 4, 40 * sc, 12 * sc, 0x000000, 0.16).setDepth(0);
      e.setData('shadow', shadow);
    }
    e.body.setAllowGravity(false);
    e.setVelocityX(-type.speed);
    e.setData('type', type);
    e.setData('hp', this.freestyle ? Math.ceil(type.hp * this.fsHpMult()) : type.hp);
    e.setData('seed', Math.random() * Math.PI * 2);
    if (type.lane === 'air') e.setData('baseY', y);
    if (type.lobs) e.setData('nextLob', this.time.now + Phaser.Math.Between(600, 1200));
    if (type.charges) {
      e.setData('chargeState', 'cruise');
      e.setData('chargeNext', this.time.now + Phaser.Math.Between(500, 1100));
    }
    if (type.shield) {
      e.setData('shield', type.shield);
      const plate = this.add
        .image(e.x - 24, e.y - 34, 'shield-plate')
        .setOrigin(0.5, 0.5)
        .setTint(this.levelCfg.enemyPal ? this.levelCfg.enemyPal.dark : 0x8a8f98)
        .setDepth(6);
      if (type.scale) plate.setScale(type.scale);
      e.setData('shieldSprite', plate);
    }
    if (horde) e.setData('horde', true);
    return e;
  }

  // ---- road events (campaign travel): treasure goblin + caged critter -----

  // A glittering gold goblin that gives a scrap jackpot — but it's tanky and
  // escapes if it reaches you, so shoot it fast.
  spawnTreasureGoblin() {
    const type = {
      key: 'treasure', tex: 'runner', hp: 6, speed: 250, scrap: 0,
      lane: 'ground', clearH: 999, scale: 1.3, treasure: true, harmless: true, jackpot: 16,
    };
    const e = this.spawnEnemy(type);
    e.setTint(0xffe14d);
    e.setData('glitter', true);
    sound.powerup();
    this.bannerFlash('💰  TREASURE GOBLIN — shoot it!', '#ffd34d');
    return e;
  }

  // A cage that drifts by at road speed; break it to free the critter.
  spawnCage() {
    const e = this.goblins.create(GAME_WIDTH + 60, GROUND_TOP_Y + 2, 'cage');
    e.setOrigin(0.5, 1).setDepth(1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-WORLD_SCROLL * 1000); // drifts along with the ground
    e.setData('type', { key: 'cage', lane: 'ground', clearH: 999, scrap: 0, cage: true, harmless: true });
    e.setData('hp', 6);
    e.setData('baseScale', 1);
    const shadow = this.add.ellipse(e.x, GROUND_TOP_Y + 4, 46, 12, 0x000000, 0.16).setDepth(0);
    e.setData('shadow', shadow);
    this.bannerFlash('🔒  Free the critter — shoot the cage!', '#9fe6a0');
    return e;
  }

  // Cage broken: the critter hops away happily; you get scrap + a luck boost.
  freeCritter(x, y) {
    sound.powerup();
    this.bannerFlash('🐸  CRITTER FREED!  Lucky!', '#9fe6a0');
    const c = this.add.image(x, y - 6, 'runner-' + this.levelId).setScale(0.7).setDepth(6);
    this.tweens.add({ targets: c, x: x - 70, y: y - 90, angle: -20, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
    const reward = this.freestyle ? 0 : 8;
    for (let i = 0; i < reward; i++) this.spawnScrap(x + Phaser.Math.Between(-16, 16), y - 20 + Phaser.Math.Between(-8, 8));
    if (this.freestyle) {
      this.score += 4;
      this.scoreText.setText('SCORE ' + this.score);
    }
    // luck: better drop rates for a while
    this.fx.luck = this.time.now + 20000;
    this.refreshFxText();
  }

  // ---- freestyle bonus round -------------------------------------------

  freestyleSpawns(time) {
    if (this.fsStart === undefined) {
      this.fsStart = time;
      this.nextFsSpawn = time + 500;
      this.nextFsMega = time + 8000;
      this.nextBossAt = 12; // first boss at score 12
      this.fsBossCount = 0;
    }
    const mins = (time - this.fsStart) / 60000;
    const pw = this.fsPower();

    // spawn faster and in bigger bunches as you grow more powerful
    const gap = Math.max(110, 640 - mins * 160 - pw * 32);
    if (time >= this.nextFsSpawn) {
      const burst = 1 + (Math.random() < Math.min(0.8, mins * 0.3 + pw * 0.05) ? 1 : 0) + (pw >= 6 && Math.random() < 0.4 ? 1 : 0);
      for (let i = 0; i < burst; i++) this.spawnEnemy(pickEnemyType(Math.random));
      this.nextFsSpawn = time + Phaser.Math.Between(gap, gap + 200);
    }

    // megas come more often as power rises
    if (time >= this.nextFsMega) {
      this.spawnFreestyleMega();
      const megaGap = Math.max(5000, 14000 - pw * 700);
      this.nextFsMega = time + Phaser.Math.Between(megaGap, megaGap + 4000);
    }

    // bosses arrive as you rack up the score / power
    if (!this.boss && this.score >= this.nextBossAt) {
      this.spawnFreestyleBoss();
    }
  }

  spawnFreestyleBoss() {
    const cfg = getLevel((this.fsBossCount % LAST_LEVEL) + 1).boss;
    const hp = Math.round(cfg.hp * (1 + this.fsPower() * 0.22) + this.score * 0.6);
    this.fsBossCount += 1;
    this.bannerFlash(`⚠  BOSS: ${cfg.name}!`, '#ff7a7a');
    this.spawnBoss({ tex: cfg.tex, name: cfg.name, hp, role: 'boss', x: 700, projTex: cfg.projTex });
  }

  spawnFreestyleMega() {
    const hp = 22 + Math.floor((this.score || 0) * 0.6);
    const e = this.goblins.create(GAME_WIDTH + 90, GROUND_TOP_Y + 2, `brute-${this.levelId}`);
    e.setOrigin(0.5, 1).setScale(MEGA.scale).setDepth(1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-MEGA.speed);
    e.setData('type', { lane: 'ground', clearH: 999, mega: true, speed: MEGA.speed });
    e.setData('hp', hp);
    e.setData('maxHp', hp);
    e.setData('seed', Math.random() * Math.PI * 2);
    const shadow = this.add.ellipse(e.x, GROUND_TOP_Y + 4, 70, 18, 0x000000, 0.18).setDepth(0);
    e.setData('shadow', shadow);
    const bg = this.add.rectangle(e.x, 0, 72, 9, 0x1b1d2a, 0.7).setDepth(7);
    const fill = this.add.rectangle(e.x - 34, 0, 68, 5, 0xe2483a, 1).setOrigin(0, 0.5).setDepth(8);
    e.setData('hpbar', { bg, fill });
  }

  // Fire every weapon in the arsenal at once. Each weapon fires a capped number
  // of projectiles; pickups beyond the cap make that weapon's shots hit harder
  // (fsBoost) and a little bigger (fsSizeBoost) rather than adding more bullets.
  fireArsenal(time) {
    const f = this.fs;
    // Fire cadence speeds up with fire-rate but only to a floor; beyond the cap
    // the surplus turns into extra damage so the screen doesn't refill.
    const frEff = Math.min(FIRE_RATE_CAP, f.fireRate || 0);
    const frOver = Math.max(0, (f.fireRate || 0) - FIRE_RATE_CAP);
    let rate = 1 / (1 + 0.14 * frEff);
    if (this.fxActive('rapid')) rate *= 0.55; // timed rapid-fire boost
    if (this.odActive) rate *= 0.5; // OVERDRIVE goes berserk
    const base = (1 + (f.power || 0)) * (1 + frOver * FIRE_RATE_OVER_DMG);
    let fired = false;

    const gN = this.fsCount('guns') + (this.fxActive('spread') || this.odActive ? 2 : 0);
    if (gN > 0 && time - (this.tGun || 0) > 170 * rate) {
      this.tGun = time;
      const dmg = base * this.fsBoost('guns');
      const sc = this.fsSizeBoost('guns');
      for (let i = 0; i < gN; i++) this.fireBolt(this.aim + (i - (gN - 1) / 2) * 0.05, 'shot-crossbow', 840, dmg, sc);
      fired = true;
    }
    const sN = this.fsCount('spread');
    if (sN > 0 && time - (this.tSpread || 0) > 520 * rate) {
      this.tSpread = time;
      const n = 2 + sN;
      const dmg = base * this.fsBoost('spread');
      const sc = this.fsSizeBoost('spread');
      for (let i = 0; i < n; i++) this.fireBolt(this.aim + (i - (n - 1) / 2) * 0.16, 'shot-bow', 700, dmg, sc);
      fired = true;
    }
    const rN = this.fsCount('rockets');
    if (rN > 0 && time - (this.tRocket || 0) > 680 * rate) {
      this.tRocket = time;
      const dmg = base * 2 * this.fsBoost('rockets');
      const sc = 1.3 * this.fsSizeBoost('rockets');
      for (let i = 0; i < rN; i++) this.fireBolt(this.aim + (i - (rN - 1) / 2) * 0.05, 'shot-rocket', 640, dmg, sc);
      fired = true;
    }
    const mN = this.fsCount('missiles');
    if (mN > 0 && time - (this.tMissile || 0) > 900 * rate) {
      this.tMissile = time;
      const dmg = base * 2 * this.fsBoost('missiles');
      const sc = 1.3 * this.fsSizeBoost('missiles');
      for (let i = 0; i < mN; i++) {
        const b = this.fireBolt(-0.5, 'shot-rocket', 520, dmg, sc);
        if (b) b.setData('homing', true).setTint(0xc060ff);
      }
    }
    const bN = this.fsCount('bombs');
    if (bN > 0 && time - (this.tBomb || 0) > 1000 * rate) {
      this.tBomb = time;
      const dmg = base * 3 * this.fsBoost('bombs');
      for (let i = 0; i < bN; i++) this.lobBomb(dmg);
    }
    if (fired) {
      sound.shoot();
      this.muzzleFlash(this.car.x + 48, this.car.y - 48, 1.15);
    }
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
    this.shockRing(x, y - 6, 0xffb04a, radius * 1.1);
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

  // Freestyle permanent-arsenal crate (unchanged behaviour).
  dropPickup(x, y) {
    const pk = pickPickup(Math.random);
    const c = this.pickups.create(x, Math.min(y, GROUND_TOP_Y - 20), 'crate');
    c.setTint(pk.tint).setScale(1.15).setDepth(5);
    c.setData('pk', pk);
  }

  // A TIMED power-up crate (both modes): combo rewards + rare campaign drops.
  dropTimedCrate(x, y, pu) {
    pu = pu || pickPowerup(Math.random);
    const c = this.pickups.create(x, Math.min(y, GROUND_TOP_Y - 20), 'crate');
    c.setTint(pu.tint).setScale(1.1).setDepth(5);
    c.setData('pu', pu);
    this.attachCrateLabel(c, pu.icon);
    return c;
  }

  attachCrateLabel(c, icon) {
    const lbl = this.add
      .text(c.x, c.y - 32, icon, { fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(6);
    c.setData('lbl', lbl);
  }

  destroyPickup(p) {
    const lbl = p.getData('lbl');
    if (lbl) lbl.destroy();
    const chute = p.getData('chute');
    if (chute) chute.destroy();
    p.destroy();
  }

  // ---- supply drop: three crates parachute in, you may grab only ONE -------

  startSupplyDrop() {
    this.bannerFlash('📦  SUPPLY DROP — grab ONE!', '#bfe6ff');
    sound.powerup();
    const keys = Phaser.Utils.Array.Shuffle(Object.keys(POWERUPS)).slice(0, 3);
    keys.forEach((k, i) => this.spawnSupplyCrate(POWERUPS[k], GAME_WIDTH - 320 + i * 180, i));
  }

  spawnSupplyCrate(pu, x, i) {
    const p = this.pickups.create(x, -30 - i * 46, 'crate');
    p.setTint(pu.tint).setScale(1.25).setDepth(5);
    p.setData('pu', pu);
    p.setData('supply', true);
    p.setData('fall', true);
    p.setData('vy', 0.3);
    p.setData('landY', GROUND_TOP_Y - 16);
    const chute = this.add.image(x, p.y - 34, 'chute').setDepth(5);
    p.setData('chute', chute);
    this.attachCrateLabel(p, pu.icon);
  }

  // Once one supply crate is taken, the rest balloon away — you chose.
  dismissOtherSupplies() {
    this.pickups.children.iterate((o) => {
      if (o && o.getData('supply') && !o.getData('dead')) {
        o.setData('dead', true);
        const bits = [o, o.getData('lbl'), o.getData('chute')].filter(Boolean);
        this.tweens.add({
          targets: bits,
          y: '-=140',
          alpha: 0,
          duration: 450,
          ease: 'Quad.easeIn',
          onComplete: () => bits.forEach((b) => b.destroy()),
        });
      }
      return true;
    });
  }

  updatePickups(delta) {
    const cx = this.car.x;
    const cy = this.carCenterY();
    this.pickups.children.iterate((p) => {
      if (!p || p.getData('dead')) return true;
      const supply = p.getData('supply');

      if (p.getData('fall')) {
        // parachuting in: drift down with the world scroll
        p.y += p.getData('vy') * delta;
        p.x -= WORLD_SCROLL * delta;
        if (p.y >= p.getData('landY')) {
          p.y = p.getData('landY');
          p.setData('fall', false);
          const chute = p.getData('chute');
          if (chute) {
            p.setData('chute', null);
            this.tweens.add({ targets: chute, alpha: 0, y: chute.y - 20, duration: 260, onComplete: () => chute.destroy() });
          }
        }
      } else {
        const d = Phaser.Math.Distance.Between(p.x, p.y, cx, cy);
        // supply crates never home — you must drive into (or jump over) them
        if (!supply && d < (this.fxActive('magnet') ? 520 : 240)) {
          const k = Math.min(1, 0.02 * delta);
          p.x += (cx - p.x) * k;
          p.y += (cy - p.y) * k;
        } else {
          p.x -= WORLD_SCROLL * delta;
        }
        if (!supply) p.rotation += 0.004 * delta;
      }

      // attachments follow the crate
      const chute = p.getData('chute');
      if (chute) chute.setPosition(p.x, p.y - 34);
      const lbl = p.getData('lbl');
      if (lbl) lbl.setPosition(p.x, p.y - 32);

      if (this.state === 'playing' && Phaser.Math.Distance.Between(p.x, p.y, cx, cy) < 48) {
        this.collectPickup(p);
        return true;
      }
      if (p.x < -40) this.destroyPickup(p);
      return true;
    });
  }

  collectPickup(p) {
    // timed power-up crate (campaign drops, combo rewards, supply drops)
    const pu = p.getData('pu');
    if (pu) {
      const supply = p.getData('supply');
      this.destroyPickup(p);
      if (supply) this.dismissOtherSupplies();
      sound.pickup();
      this.applyPowerup(pu);
      return;
    }

    // freestyle permanent-arsenal crate
    const pk = p.getData('pk');
    this.destroyPickup(p);
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
      this.refreshIntensity();
    } else if (['guns', 'spread', 'rockets', 'missiles', 'bombs'].includes(pk.type)) {
      this.refreshFreestyleCar();
    }
  }

  // ---- timed power-up effects ---------------------------------------------

  fxActive(type) {
    return this.time.now < (this.fx[type] || 0);
  }

  applyPowerup(pu) {
    const kid = Player.state.littleKid ? 1.5 : 1; // little kids keep boosts longer
    sound.powerup();
    const color = '#' + pu.tint.toString(16).padStart(6, '0');
    this.floatLabel(this.car.x, this.car.y - 96, pu.label, color);

    if (pu.type === 'heal') {
      if (this.health < this.maxHealth) {
        this.health += 1;
        this.renderHearts();
        this.refreshIntensity();
      } else if (this.freestyle) {
        this.score += 2;
        this.scoreText.setText('SCORE ' + this.score);
      } else {
        Player.state.scrap += 4;
        this.scrapText.setText(String(Player.state.scrap));
        this.floatNumber(this.car.x + 60, this.car.y - 70, '+4', '#ffe14d', 18);
      }
    } else if (pu.type === 'shield') {
      this.shieldHits = 1;
      if (!this.shieldBubble) {
        this.shieldBubble = this.add
          .circle(this.car.x, this.carCenterY(), 62, 0x7fd4ff, 0.1)
          .setStrokeStyle(3, 0x7fd4ff, 0.95)
          .setDepth(6);
      }
    } else {
      this.fx[pu.type] = this.time.now + pu.dur * kid;
    }
    this.refreshFxText();
  }

  updatePowerups(time) {
    if (this.shieldBubble) {
      if (this.shieldHits <= 0) {
        this.shieldBubble.destroy();
        this.shieldBubble = null;
      } else {
        this.shieldBubble.setPosition(this.car.x, this.carCenterY());
      }
    }
    if (time - (this._fxTextAt || 0) > 250) {
      this._fxTextAt = time;
      this.refreshFxText();
    }
  }

  refreshFxText() {
    if (!this.fxText) return;
    const now = this.time.now;
    const icons = { rapid: '⚡', spread: '◣', magnet: '🧲', damage: '💥', luck: '🍀' };
    const parts = [];
    for (const k of Object.keys(icons)) {
      const left = (this.fx[k] || 0) - now;
      if (left > 0) parts.push(`${icons[k]}${Math.ceil(left / 1000)}`);
    }
    if (this.shieldHits > 0) parts.push('🛡');
    this.fxText.setText(parts.join('   '));
  }

  // ---- Bolt's Field Radio: spend scrap mid-run (campaign only) ------------

  buildRadio() {
    this.radioItems = [
      { key: 'heal', label: '❤ Heal', cost: 6, y: GAME_HEIGHT - 108 },
      { key: 'boost', label: '💥 Boost 15s', cost: 10, y: GAME_HEIGHT - 70 },
    ];
    this.add
      .text(GAME_WIDTH - 150, GAME_HEIGHT - 132, '📻 Bolt’s Radio', { fontFamily: FONTS.ui, fontSize: '12px', color: '#bfe6ff', stroke: '#1b1d2a', strokeThickness: 3 })
      .setDepth(20)
      .setAlpha(0.85);
    for (const it of this.radioItems) {
      const x = GAME_WIDTH - 84;
      it.bg = this.add.rectangle(x, it.y, 148, 32, 0x2c3142, 0.95).setStrokeStyle(2, 0x4a78c0).setDepth(20);
      it.txt = this.add
        .text(x, it.y, `${it.label}  (${it.cost})`, { fontFamily: FONTS.ui, fontSize: '14px', color: '#ffffff', stroke: '#1b1d2a', strokeThickness: 2 })
        .setOrigin(0.5)
        .setDepth(21);
    }
    this.refreshRadio();
  }

  refreshRadio() {
    if (!this.radioItems) return;
    for (const it of this.radioItems) {
      const full = it.key === 'heal' && this.health >= this.maxHealth;
      const afford = Player.state.scrap >= it.cost && !full;
      it.bg.setStrokeStyle(2, afford ? 0x6fd06a : 0x4a4f57);
      it.txt.setColor(afford ? '#ffffff' : '#8a8f98');
      it.bg.setAlpha(afford ? 0.95 : 0.5);
      it.txt.setText(full ? `${it.label}  (full)` : `${it.label}  (${it.cost})`);
    }
  }

  // Swallow taps that hit a radio button (so they don't also jump the car).
  radioHit(p) {
    if (!this.radioItems || this.state !== 'playing') return false;
    for (const it of this.radioItems) {
      if (Math.abs(p.x - it.bg.x) < 76 && Math.abs(p.y - it.bg.y) < 18) {
        this.buyRadio(it);
        return true;
      }
    }
    return false;
  }

  buyRadio(it) {
    if (it.key === 'heal' && this.health >= this.maxHealth) return;
    if (!Player.spend(it.cost)) {
      sound.hurt();
      this.floatNumber(it.bg.x, it.bg.y - 22, 'Need more scrap', '#ff7a7a', 14);
      this.tweens.add({ targets: it.bg, x: { from: it.bg.x - 4, to: it.bg.x }, duration: 60, yoyo: true, repeat: 2 });
      return;
    }
    this.scrapText.setText(String(Player.state.scrap));
    sound.powerup();
    if (it.key === 'heal') {
      this.health += 1;
      this.renderHearts();
      this.refreshIntensity();
      this.floatLabel(this.car.x, this.car.y - 96, '+1 ❤', '#ff6a7a');
    } else {
      this.fx.damage = this.time.now + 15000;
      this.floatLabel(this.car.x, this.car.y - 96, 'DAMAGE BOOST!', '#ff7a3a');
      this.refreshFxText();
    }
    this.refreshRadio();
  }

  // ---- OVERDRIVE ----------------------------------------------------------

  // Kills feed the meter (combo kills feed it faster; quicker in Kid Mode).
  addOdCharge(n) {
    if (this.odActive || this.odReady) return;
    const kid = Player.state.littleKid ? 1.4 : 1;
    this.odCharge = Math.min(100, this.odCharge + n * kid);
    if (this.odCharge >= 100) {
      this.odReady = true;
      sound.powerup();
      this.floatLabel(this.car.x, this.car.y - 120, 'OVERDRIVE READY!', '#ffd34d');
      this.odLabel.setText('⚡ TAP FOR OVERDRIVE! ⚡').setAlpha(1).setColor('#1b1d2a');
      this.odPulse = this.tweens.add({
        targets: [this.odBarBg, this.odBarFill, this.odLabel],
        scaleX: 1.06,
        scaleY: 1.12,
        duration: 360,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // True if the pointer landed on the (ready) OVERDRIVE button.
  odHit(p) {
    if (!this.odReady || this.state !== 'playing') return false;
    const b = this.odBarBg;
    if (Math.abs(p.x - b.x) > 130 || Math.abs(p.y - b.y) > 26) return false;
    this.activateOverdrive();
    return true;
  }

  activateOverdrive() {
    if (!this.odReady || this.odActive || this.state !== 'playing') return;
    this.odReady = false;
    this.odActive = true;
    this.odUntil = this.time.now + 6000;
    this.odCharge = 100; // drains visually over the duration
    if (this.odPulse) {
      this.odPulse.stop();
      this.odPulse = null;
      [this.odBarBg, this.odBarFill, this.odLabel].forEach((o) => o.setScale(1));
    }
    this.odLabel.setText('⚡ OVERDRIVE!! ⚡').setColor('#1b1d2a');

    sound.overdrive();
    this.bannerFlash('⚡ OVERDRIVE!! ⚡', '#ffd34d');
    this.cameras.main.flash(160, 255, 220, 120);
    this.cameras.main.shake(200, 0.006);
    this.shockRing(this.car.x, this.carCenterY(), 0xffd34d, 130, 420);

    // golden glow that rides with the car while it lasts
    this.odGlow = this.add
      .circle(this.car.x, this.carCenterY(), 74, 0xffd34d, 0.16)
      .setStrokeStyle(3, 0xffd34d, 0.85)
      .setDepth(4);
    this.refreshIntensity();
  }

  endOverdrive() {
    this.odActive = false;
    this.odCharge = 0;
    this.odLabel.setText('⚡ OVERDRIVE').setColor('#ffffff').setAlpha(0.75);
    if (this.odGlow) {
      this.odGlow.destroy();
      this.odGlow = null;
    }
    this.refreshIntensity();
  }

  updateOverdrive(time) {
    // keyboard activation
    if (this.keys.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) this.activateOverdrive();

    if (this.odActive) {
      if (time >= this.odUntil) {
        this.endOverdrive();
      } else {
        // glow pulses along, meter drains with time remaining
        const left = (this.odUntil - time) / 6000;
        this.odCharge = 100 * left;
        if (this.odGlow) {
          this.odGlow.setPosition(this.car.x, this.carCenterY());
          const pulse = 1 + Math.sin(time * 0.02) * 0.08;
          this.odGlow.setScale(pulse);
        }
        this.odVolley(time);
      }
    }

    // meter render
    const frac = Phaser.Math.Clamp(this.odCharge / 100, 0, 1);
    this.odBarFill.width = 216 * frac;
    this.odBarFill.setFillStyle(this.odActive ? 0xff8a3a : this.odReady ? 0xffd34d : 0xd4a017);
  }

  // The OVERDRIVE gun: a fast golden fan on top of the normal weapons.
  odVolley(time) {
    if (time < (this.odNextShot || 0)) return;
    this.odNextShot = time + 150;
    const dmg = this.freestyle ? 2 + Math.floor(this.fsPower() * 0.15) : Math.max(2, this.weapon.damage);
    for (const off of [-0.18, 0, 0.18]) {
      const a = this.aim + off;
      const b = this.bullets.create(this.car.x + 44, this.car.y - 56, 'shot-crossbow');
      if (!b) continue;
      b.body.setAllowGravity(false);
      b.setRotation(a).setScale(1.25).setTint(0xffd34d).setDepth(4);
      b.setVelocity(Math.cos(a) * 920, Math.sin(a) * 920);
      b.setData('dmg', dmg);
    }
    this.muzzleFlash(this.car.x + 48, this.car.y - 52, 0.8);
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
    const icon = { guns: '🔫', spread: '◣', rockets: '🚀', missiles: '🎯', bombs: '💣' };
    const parts = [];
    for (const t of ['guns', 'spread', 'rockets', 'missiles', 'bombs']) {
      if (!(f[t] > 0)) continue;
      const lvl = this.fsOverflow(t); // ★ shows the weapon is maxed and upgraded
      parts.push(`${icon[t]}${this.fsCount(t)}${lvl ? `★${lvl}` : ''}`);
    }
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
    const plate = e.getData('shieldSprite');
    if (plate) plate.destroy();
    const shadow = e.getData('shadow');
    if (shadow) shadow.destroy();
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

      const bs = e.getData('baseScale') || 1;
      if (type.lane === 'air') {
        if (type.dives && this.state === 'playing' && e.x < this.car.x + 340) {
          // swoop toward the car's height
          const carCY = this.carCenterY();
          e.y += Math.sign(carCY - e.y) * Math.min(Math.abs(carCY - e.y), 3.4);
          e.rotation = Phaser.Math.Clamp((carCY - e.y) * -0.004, -0.3, 0.3);
        } else {
          e.y = e.getData('baseY') + Math.sin(t * 1.6) * 26;
        }
        // wing flap (fast horizontal squash)
        if (!type.mega) e.setScale(bs * (1 + Math.sin(t * 8) * 0.12), bs * (1 - Math.sin(t * 8) * 0.06));
      } else if (type.cage) {
        // cages just drift by (no waddle); glint occasionally
        if (Math.random() < 0.02) this.spark(e.x - 8 + Math.random() * 16, e.y - 30, 0xdfe9f1);
      } else {
        // a little walking waddle: hop + squash synced to the stride
        const wob = Math.sin(t * 2.4);
        e.rotation = wob * 0.09;
        if (!type.mega) {
          e.setScale(bs * (1 + wob * 0.05), bs * (1 - wob * 0.05));
          e.y = GROUND_TOP_Y + 2 - Math.abs(wob) * 3;
        }
        if (type.lobs && this.state === 'playing' && e.x < GAME_WIDTH - 70 && time > e.getData('nextLob')) {
          this.lobRock(e);
          e.setData('nextLob', time + Phaser.Math.Between(1400, 2400));
        }
        if (type.charges) this.updateCharger(e, time);
        // treasure goblin sparkles as it runs
        if (type.treasure && Math.random() < 0.25) this.spark(e.x, e.y - 30 - Math.random() * 20, 0xffe14d);
      }

      // contact shadow stays on the ground under the enemy (reads the hop)
      const shadow = e.getData('shadow');
      if (shadow) shadow.x = e.x;

      // shielded enemies carry a plate that tracks in front of them
      const plate = e.getData('shieldSprite');
      if (plate) plate.setPosition(e.x - 24 * (type.scale || 1), e.y - 34 * (type.scale || 1));

      // keep a mega's health bar floating above it
      if (type.mega) {
        const bar = e.getData('hpbar');
        if (bar) {
          const topY = e.y - e.displayHeight - 12;
          bar.bg.setPosition(e.x, topY);
          bar.fill.setPosition(e.x - 34, topY);
        }
      }

      // harmless road-event objects (treasure/cage) never damage — they just
      // slip past if you don't shoot them in time
      if (type.harmless) {
        if (type.treasure && this.state === 'playing' && e.x < this.car.x - 20 && !e.getData('escaped')) {
          e.setData('escaped', true);
          this.floatNumber(e.x, e.y - 40, 'got away!', '#bfe6ff', 16);
          this.poof(e.x, e.y - 24, 0xffe14d);
        }
        if (e.x < -90) this.removeEnemy(e);
        return true;
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

  // Charger cycle: cruise → wind up (blink telegraph) → dash forward → cruise.
  updateCharger(e, time) {
    if (this.state !== 'playing') return;
    const st = e.getData('chargeState');
    const next = e.getData('chargeNext') || 0;
    if (st === 'cruise') {
      if (time > next && e.x < GAME_WIDTH - 40 && e.x > this.car.x + 130) {
        e.setData('chargeState', 'tell');
        e.setData('chargeNext', time + 340);
        e.setVelocityX(-40); // rear up before the dash
      }
    } else if (st === 'tell') {
      if (Math.floor(time / 80) % 2) e.setTintFill(0xffef9f);
      else e.clearTint();
      if (time > next) {
        e.clearTint();
        e.setData('chargeState', 'dash');
        e.setData('chargeNext', time + 600);
        e.setVelocityX(-560);
        this.spark(e.x, e.y - 24, 0xffd76a);
      }
    } else if (st === 'dash') {
      if (time > next) {
        e.setData('chargeState', 'cruise');
        e.setData('chargeNext', time + Phaser.Math.Between(900, 1500));
        e.setVelocityX(-e.getData('type').speed);
      }
    }
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

    // bombs and splash weapons (catapult/rocket) burst for area damage
    if (bullet.getData('bomb') || bullet.getData('splash')) {
      this.explodeAt(bullet.x, bullet.y, bullet.getData('splash') || 95, dmg);
      bullet.destroy();
      return;
    }

    // piercing weapons (cannon) punch through a line of enemies
    const pierce = bullet.getData('pierce');
    if (pierce) {
      const hits = bullet.getData('hits') || [];
      if (hits.includes(goblin)) return; // don't hit the same enemy twice
      hits.push(goblin);
      bullet.setData('hits', hits);
      this.hitEnemy(goblin, dmg);
      if (hits.length >= pierce) bullet.destroy();
      return;
    }

    bullet.destroy();
    this.hitEnemy(goblin, dmg);
  }

  hitEnemy(goblin, dmg) {
    if (!goblin.active) return;

    // shielded enemies soak hits on the front plate first (one chip per hit)
    const sh = goblin.getData('shield');
    if (sh > 0) {
      const plate = goblin.getData('shieldSprite');
      this.spark(plate ? plate.x : goblin.x - 20, goblin.y - 30, 0xbfe6ff);
      const left = sh - 1;
      goblin.setData('shield', left);
      if (left <= 0) {
        if (plate) {
          this.poof(plate.x, plate.y, 0xbfe6ff);
          plate.destroy();
        }
        goblin.setData('shieldSprite', null);
        this.floatNumber(goblin.x, goblin.y - 58, 'SHIELD DOWN!', '#bfe6ff', 15);
      }
      return; // the plate absorbs this shot
    }

    const hp = goblin.getData('hp') - dmg;
    if (hp > 0) {
      goblin.setData('hp', hp);
      this.updateMegaBar(goblin);
      goblin.setTintFill(0xffffff);
      this.time.delayedCall(60, () => {
        if (!goblin.active) return;
        // treasure goblins keep their gold shimmer after the hit flash
        if (goblin.getData('type').treasure) goblin.setTint(0xffe14d);
        else goblin.clearTint();
      });
      return;
    }
    this.defeatGoblin(goblin);
  }

  defeatGoblin(goblin) {
    const type = goblin.getData('type');
    const gx = goblin.x;
    const yy = type.lane === 'air' ? goblin.y : goblin.y - 26;
    sound.defeat();
    this.poof(gx, yy, COLORS.goblin);
    if (type.mega) {
      this.poof(gx, yy, 0xffe14d);
      this.shockRing(gx, yy, 0xffe14d, 90);
      this.cameras.main.shake(90, 0.003);
    }

    // splitters burst into little runts (a chain-reaction combo feeder)
    if (type.splits) this.spawnRunts(goblin, type.splits);

    // every kill builds the streak multiplier
    const mult = this.bumpCombo();

    // hitting a new combo tier (x3, x5) drops a guaranteed power-up crate
    if (mult >= 3 && this.lastRewardMult < 3) {
      this.lastRewardMult = 3;
      this.dropTimedCrate(gx, yy - 10);
      this.floatNumber(gx, yy - 44, 'COMBO PRIZE!', '#ffb04a', 16);
    } else if (mult >= 5 && this.lastRewardMult < 5) {
      this.lastRewardMult = 5;
      this.dropTimedCrate(gx, yy - 10);
      this.floatNumber(gx, yy - 44, 'MEGA COMBO PRIZE!', '#ff8a3a', 16);
    }

    // kills feed the OVERDRIVE meter (streaks and megas feed it faster)
    this.addOdCharge(4 + mult * 2 + (type.mega ? 8 : 0));

    // caged critter: free it for scrap + a luck boost (both modes safe)
    if (type.cage) {
      this.freeCritter(gx, yy);
      this.removeEnemy(goblin);
      return;
    }

    if (this.freestyle) {
      const gained = (type.mega ? 5 : 1) * mult;
      this.score += gained;
      this.scoreText.setText('SCORE ' + this.score);
      Player.setFreestyleBest(this.score);
      if (mult > 1 || type.mega) this.floatNumber(gx, yy - 20, `+${gained}`, mult >= 3 ? '#ff8a3a' : '#ffe14d', type.mega ? 28 : 22);
      if (type.mega) this.dropPickup(gx, yy);
      else if (Math.random() < 0.18) this.dropPickup(gx, yy);
      this.removeEnemy(goblin);
      return;
    }

    // treasure goblin: a scrap jackpot + a bonus crate
    if (type.treasure) {
      this.bannerFlash('💰  JACKPOT!  💰', '#ffd34d');
      this.shockRing(gx, yy, 0xffd34d, 100);
      const jack = type.jackpot || 14;
      for (let i = 0; i < jack; i++) {
        this.spawnScrap(gx + Phaser.Math.Between(-20, 20), yy + Phaser.Math.Between(-10, 10));
      }
      this.dropTimedCrate(gx, yy - 10);
      this.removeEnemy(goblin);
      return;
    }

    // combo makes more loot fly out (capped so it never floods the screen)
    const pieces = Math.min(12, (type.scrap || 1) * mult);
    for (let i = 0; i < pieces; i++) {
      this.spawnScrap(gx + Phaser.Math.Between(-14, 14), yy + Phaser.Math.Between(-8, 8));
    }
    // campaign enemies occasionally drop a timed power-up crate (luck ups it)
    if (!type.mega && Math.random() < (this.fxActive('luck') ? 0.2 : 0.08)) this.dropTimedCrate(gx, yy - 10);
    if (mult > 1) this.floatNumber(gx, yy - 20, `x${mult}!`, mult >= 3 ? '#ff8a3a' : '#ffd34d', 22);
    if (goblin.getData('horde')) {
      this.hordeDefeated += 1;
      this.hordeAlive -= 1;
    }
    this.removeEnemy(goblin);
    if (type.mega) this.rewardTurret();
  }

  // Spawn a splitter's little runts at its position, inheriting horde bookkeeping.
  spawnRunts(parent, n) {
    for (let i = 0; i < n; i++) {
      const c = this.spawnEnemy(ENEMY_TYPES.runt);
      c.x = parent.x + Phaser.Math.Between(-12, 12);
      c.y = GROUND_TOP_Y + 2;
      c.setVelocityX(-ENEMY_TYPES.runt.speed - Phaser.Math.Between(0, 90));
      this.poof(c.x, c.y - 20, COLORS.goblin);
      // runts count as extra live enemies to clear, but NOT toward the spawn
      // target (hordeSpawned/hordeTotal) — otherwise the wave never "completes".
      if (parent.getData('horde')) {
        c.setData('horde', true);
        this.hordeAlive += 1;
      }
    }
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

    // nothing stops OVERDRIVE — plow right through
    if (this.odActive) {
      this.poof(this.car.x + 20, this.carCenterY(), 0xffd34d);
      return;
    }

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

    // a shield bubble soaks the hit — and keeps the combo streak alive
    if (this.shieldHits > 0) {
      this.shieldHits -= 1;
      sound.shieldBlock();
      this.poof(this.car.x + 12, this.carCenterY(), 0x7fd4ff);
      this.shockRing(this.car.x, this.carCenterY(), 0x7fd4ff, 80, 280);
      this.floatNumber(this.car.x, this.car.y - 96, 'BLOCKED!', '#7fd4ff', 18);
      this.refreshFxText();
      return;
    }

    this.health -= amount;
    this.hurtFlash.setAlpha(0.4);
    this.tweens.add({ targets: this.hurtFlash, alpha: 0, duration: 320 });
    this.renderHearts();
    if (this.combo > 2) this.floatNumber(this.car.x, this.car.y - 90, 'COMBO LOST', '#ff7a7a', 16);
    this.resetCombo(); // a hit breaks the streak
    this.refreshIntensity(); // ramp music up if we're now on our last heart

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
    this.refreshRadio();
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
    // scrap-magnet power-up: hoover the whole screen, and faster
    const magnet = this.fxActive('magnet');
    const range = magnet ? 900 : SCRAP.magnetRange;
    const lerp = magnet ? SCRAP.homeLerp * 2.4 : SCRAP.homeLerp;
    this.scraps.children.iterate((s) => {
      if (!s) return true;
      const dist = Phaser.Math.Distance.Between(s.x, s.y, cx, cy);
      if (dist < SCRAP.collectRange) {
        this.collectScrap(s);
        return true;
      }
      if (dist < range) {
        const k = Math.min(1, lerp * delta);
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
    this.refreshRadio();
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
      this.spawnEnemy(pickEnemyForLevel(this.levelCfg, Math.random), true);
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
    b.setData('phase', 1);
    b.setData('vulnerable', false);
    b.setData('tellUntil', 0);
    b.setData('flashUntil', 0);
    this.boss = b;
    sound.bossAppear();
    this.refreshIntensity();

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

  // Bosses now cycle telegraphed attacks and enrage at half health. During the
  // wind-up they glow and take DOUBLE damage — the "hit the weak spot" window.
  updateBoss(time) {
    const b = this.boss;
    if (!b || !b.active) return;
    const spec = b.getData('spec');
    const isMini = spec.role === 'mini';
    const bob = Math.sin(time * 0.004) * 6;

    if (!b.getData('fighting')) {
      b.y = b.getData('baseY') + bob;
      return;
    }

    // enrage at half health
    if (b.getData('phase') === 1 && b.getData('hp') <= b.getData('maxHp') * 0.5) {
      b.setData('phase', 2);
      this.bannerFlash(`${spec.name} is ENRAGED!`, '#ff7a7a');
      this.cameras.main.shake(220, 0.006);
    }
    const phase = b.getData('phase');
    const vuln = b.getData('vulnerable');

    // motion: rear up and pulse while charging an attack
    if (vuln) {
      const pulse = 1 + Math.sin(time * 0.03) * 0.05;
      b.setScale((spec.scale || 1) * pulse);
      b.y = b.getData('baseY') + bob - 6;
    } else {
      b.setScale(spec.scale || 1);
      b.y = b.getData('baseY') + bob;
    }

    // drive tint from state (unless a hit-flash is briefly showing)
    if (time > (b.getData('flashUntil') || 0)) {
      if (vuln) b.setTint(0xffd76a); // glowing = punish window
      else if (phase === 2) b.setTint(0xffb0b0); // enraged red
      else b.clearTint();
    }

    // resolve a telegraph → fire the attack
    if (vuln) {
      if (time >= b.getData('tellUntil')) {
        b.setData('vulnerable', false);
        this.execBossAttack(b, spec, b.getData('pending'), phase, isMini);
        const cad = (phase === 2 ? 1150 : 1750) + Phaser.Math.Between(-150, 250);
        b.setData('nextAttack', time + cad);
      }
      return;
    }

    // begin a new attack telegraph
    if (time >= (b.getData('nextAttack') || 0)) {
      const pool = isMini
        ? (phase === 2 ? ['summon', 'lob'] : ['summon'])
        : (phase === 2 ? (spec.attacks || ['lob']).concat(spec.rage || []) : spec.attacks || ['lob']);
      b.setData('pending', pool[Math.floor(Math.random() * pool.length)]);
      b.setData('vulnerable', true);
      b.setData('tellUntil', time + 520);
      this.spark(b.x, b.y - b.displayHeight * 0.55, 0xffe08a);
      sound.bossHit();
    }
  }

  execBossAttack(b, spec, key, phase, isMini) {
    const tex = spec.projTex || 'enemy-rock';
    switch (key) {
      case 'summon':
        this.summonRunner();
        this.summonRunner();
        if (phase === 2) this.summonRunner();
        break;
      case 'spread':
        this.bossSpread(b, tex, phase);
        break;
      case 'barrage':
        this.bossBarrage(b, tex, phase);
        break;
      case 'lob':
      default:
        this.throwProjectile(b, tex);
        if (phase === 2 && !isMini) this.time.delayedCall(240, () => b.active && this.throwProjectile(b, tex));
    }
  }

  // A fan of projectiles.
  bossSpread(b, tex, phase) {
    const n = phase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const c = this.enemyShots.create(b.x - 40, b.y - 90, tex);
      c.body.setAllowGravity(true);
      c.body.setGravityY(760);
      const off = i - (n - 1) / 2;
      c.setVelocity(-540 + off * 60, -430 + Math.abs(off) * 34);
      c.setData('spin', Phaser.Math.FloatBetween(-0.02, 0.02));
    }
  }

  // A staggered rain of shots that land spread across the ground.
  bossBarrage(b, tex, phase) {
    const n = phase === 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 200, () => {
        if (!b.active) return;
        const c = this.enemyShots.create(b.x - 30, b.y - 100, tex);
        c.body.setAllowGravity(true);
        c.body.setGravityY(600);
        c.setVelocity(-300 - i * 80 - Math.random() * 80, -520);
        c.setData('spin', Phaser.Math.FloatBetween(-0.02, 0.02));
      });
    }
  }

  summonRunner() {
    const e = this.goblins.create(GAME_WIDTH + 40, GROUND_TOP_Y + 2, `runner-${this.levelId}`);
    e.setOrigin(0.5, 1).setDepth(1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-320);
    e.setData('type', { lane: 'ground', clearH: 42, hp: 1, scrap: 1 });
    e.setData('hp', 1);
    e.setData('baseScale', 1);
    e.setData('seed', Math.random() * Math.PI * 2);
    const shadow = this.add.ellipse(e.x, GROUND_TOP_Y + 4, 40, 12, 0x000000, 0.16).setDepth(0);
    e.setData('shadow', shadow);
  }

  throwProjectile(b, tex) {
    const c = this.enemyShots.create(b.x - 40, b.y - 90, tex);
    c.body.setAllowGravity(true);
    c.body.setGravityY(900);
    c.setVelocity(-520, -430);
    c.setData('spin', Phaser.Math.FloatBetween(-0.02, 0.02));
  }

  onBulletHitBoss(bullet, boss) {
    let dmg = bullet.getData('dmg') || this.weapon.damage;
    bullet.destroy();
    if (!boss.active) return;
    // hitting the boss mid-wind-up (glowing) lands a double-damage crit
    const crit = boss.getData('vulnerable');
    if (crit) {
      dmg *= 2;
      this.spark(boss.x, boss.y - boss.displayHeight * 0.5, 0xffe14d);
      sound.crit();
    }
    const hp = boss.getData('hp') - dmg;
    boss.setData('hp', Math.max(0, hp));
    this.updateBossBar();
    sound.bossHit();
    if (!crit) {
      // brief white flash; updateBoss restores the state tint after flashUntil
      boss.setTintFill(0xffffff);
      boss.setData('flashUntil', this.time.now + 60);
    }
    if (hp <= 0) this.defeatBoss(boss);
  }

  defeatBoss(boss) {
    const spec = boss.getData('spec');
    const bx = boss.x;
    const by = boss.y - 50;
    boss.destroy();
    this.boss = null;
    this.hideBossBar();
    this.refreshIntensity();
    this.addOdCharge(30);
    sound.explode();
    // a punchy multi-ring blast + white camera flash to sell the kill
    this.shockRing(bx, by, 0xfff2b0, 150, 420);
    this.time.delayedCall(120, () => this.shockRing(bx, by, 0xffb04a, 210, 500));
    this.cameras.main.flash(180, 255, 240, 200);
    this.cameras.main.shake(240, 0.008);
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 80, () =>
        this.poof(bx + Phaser.Math.Between(-50, 50), by + Phaser.Math.Between(-36, 36), i % 2 ? 0xffe14d : 0xff7a3a)
      );
    }

    if (this.freestyle) {
      // big reward + schedule the next, tougher boss
      this.score += 10;
      this.scoreText.setText('SCORE ' + this.score);
      this.floatNumber(bx, by - 30, '+10', '#9fe6a0', 34);
      Player.setFreestyleBest(this.score);
      const drops = 3 + Math.floor(this.fsBossCount / 2);
      for (let i = 0; i < drops; i++) {
        this.dropPickup(bx + Phaser.Math.Between(-60, 60), by - Phaser.Math.Between(0, 30));
      }
      this.bannerFlash('BOSS DOWN!  +loot', '#9fe6a0');
      this.nextBossAt = this.score + 14 + this.fsBossCount * 4;
      return;
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
    // rapid-fire power-up (or OVERDRIVE) more than doubles the fire rate
    const cd = this.weapon.cooldown * (this.odActive ? 0.35 : this.fxActive('rapid') ? 0.45 : 1);
    if (time - this.lastFireAt < cd) return;
    this.lastFireAt = time;

    const m = muzzleFor(this.car, this.aim);
    const mx = this.car.x + m.x;
    const my = this.car.y + m.y;

    this.firePlayerShot(mx, my, this.aim);
    if (this.fxActive('spread') || this.odActive) {
      // triple-shot power-up fans two extra shots
      this.firePlayerShot(mx, my, this.aim - 0.16);
      this.firePlayerShot(mx, my, this.aim + 0.16);
    }
    sound.shoot();
    this.muzzleFlash(mx, my);

    this.tweens.add({
      targets: this.car,
      x: { from: CAR.x - 4, to: CAR.x },
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  // One shot from the equipped weapon at the given angle, carrying its
  // damage/splash/pierce behaviour.
  firePlayerShot(mx, my, angle) {
    const shot = this.bullets.create(mx, my, this.weapon.shot);
    const boosted = this.fxActive('damage');
    shot.setScale((this.weapon.shotScale || 1) * (boosted ? 1.25 : 1));
    if (boosted) shot.setTint(0xff7a3a);
    shot.setRotation(angle);
    shot.body.setAllowGravity(false);
    shot.setVelocity(Math.cos(angle) * this.weapon.speed, Math.sin(angle) * this.weapon.speed);
    shot.setData('dmg', this.weapon.damage * (boosted ? 2 : 1));
    if (this.weapon.splash) shot.setData('splash', this.weapon.splash);
    if (this.weapon.pierce) shot.setData('pierce', this.weapon.pierce);
    return shot;
  }

  // ---- game feel / juice -----------------------------------------------

  // A quick spark at the barrel: a bright star flash plus a soft glow.
  muzzleFlash(x, y, scale = 1) {
    const star = this.add
      .star(x, y, 5, 3 * scale, 9 * scale, 0xfff2b0)
      .setDepth(6)
      .setAlpha(0.95);
    this.tweens.add({ targets: star, scaleX: 0.2, scaleY: 0.2, alpha: 0, angle: 40, duration: 120, onComplete: () => star.destroy() });
    const glow = this.add.image(x, y, 'puff').setTint(0xffd76a).setScale(0.8 * scale).setDepth(5).setAlpha(0.7);
    this.tweens.add({ targets: glow, scale: 0.2, alpha: 0, duration: 140, onComplete: () => glow.destroy() });
  }

  // An expanding shock ring for explosions and big defeats.
  shockRing(x, y, color = 0xffe08a, maxR = 70, dur = 340) {
    const ring = this.add.circle(x, y, 6).setStrokeStyle(4, color, 0.9).setDepth(9);
    ring.setFillStyle();
    this.tweens.add({
      targets: ring,
      scale: maxR / 6,
      alpha: 0,
      duration: dur,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  // Squash on landing / stretch on jumping (scale-only so it doesn't fight the
  // per-frame rotation the physics sets).
  carSquash(sx, sy) {
    if (!this.car) return;
    if (this._squashTween) this._squashTween.stop(); // only the scale tween, not alpha/recoil
    this.car.setScale(sx, sy);
    this._squashTween = this.tweens.add({ targets: this.car, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
  }

  // A few quick sparks (shield pings, dash bursts).
  spark(x, y, color) {
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(x, y, 'puff').setTint(color).setScale(0.4).setDepth(7);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: s, x: x + Math.cos(a) * 16, y: y + Math.sin(a) * 16, alpha: 0, scale: 0.1, duration: 200, onComplete: () => s.destroy() });
    }
  }

  // ---- kill combo -------------------------------------------------------

  comboMult() {
    return Math.min(5, 1 + Math.floor(this.combo / 3));
  }

  // Register a kill toward the streak; returns the current score/loot multiplier.
  bumpCombo() {
    this.combo += 1;
    this.comboUntil = this.time.now + COMBO_WINDOW;
    const m = this.comboMult();
    if (this.combo >= 2) this.showCombo(m);
    return m;
  }

  showCombo(m) {
    const tiers = ['#ffd34d', '#ffd34d', '#ffb04a', '#ff8a3a', '#ff5d4d', '#ff5d4d'];
    this.comboText.setText(`🔥 COMBO x${m}   (${this.combo})`);
    this.comboText.setColor(tiers[m] || '#ff5d4d');
    this.comboText.setAlpha(1);
    this.comboText.setScale(1.3);
    sound.combo(m);
    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 180, ease: 'Back.easeOut' });
  }

  resetCombo() {
    this.combo = 0;
    this.lastRewardMult = 1;
    if (this.comboText) {
      this.tweens.killTweensOf(this.comboText);
      this.tweens.add({ targets: this.comboText, alpha: 0, duration: 220 });
    }
  }

  // A small floating number/label that drifts up and fades (kill rewards, etc.).
  floatNumber(x, y, text, color = '#ffe14d', size = 22) {
    const t = this.add
      .text(x, y, text, { fontFamily: FONTS.display, fontSize: `${size}px`, color, stroke: '#1b1d2a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(23);
    this.tweens.add({
      targets: t,
      y: y - 38,
      alpha: { from: 1, to: 0 },
      scale: { from: 0.6, to: 1.1 },
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
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
