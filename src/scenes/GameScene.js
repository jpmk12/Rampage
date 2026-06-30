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
} from '../config.js';
import { Player } from '../state/PlayerState.js';
import { getBody, getWeapon } from '../data/catalog.js';
import { pickEnemyType } from '../data/enemies.js';
import { getLevel, LAST_LEVEL } from '../data/levels.js';
import { buildCar, muzzleFor } from '../entities/Car.js';
import { sound } from '../audio/Sound.js';

const MINI_SUMMON_EVERY = 1900; // ms between mini-boss summons
const BOSS_THROW_EVERY = 1600; // ms between boss projectile throws

// Aim limits: mostly upward (negative = up on screen) so you can hit flyers.
const AIM = { min: -1.15, max: 0.45, rate: 0.0026, topZ: 70, botZ: GROUND_TOP_Y };

// The action level. The car drives on the ground and JUMPS; up/down AIM the
// weapon. Goblins come in four flavours, lobbers throw arcing rocks, ground
// hazards must be jumped, and hearts track damage.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const profile = Player.state;
    this.level = profile.level;
    this.levelCfg = getLevel(this.level);
    this.levelId = this.levelCfg.id;
    this.miniSpec = { ...this.levelCfg.mini, role: 'mini', x: 740, projTex: this.levelCfg.boss.projTex };
    this.bossSpec = { ...this.levelCfg.boss, role: 'boss', x: 700 };
    this.weapon = getWeapon(profile.weapon);
    this.maxHealth = getBody(profile.body).health;
    this.health = this.maxHealth;
    this.levelStartScrap = profile.scrap;

    this.state = 'playing';
    this.phase = 'travel'; // travel -> miniboss -> boss
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

    this.physics.add.overlap(this.bullets, this.goblins, this.onBulletHit, null, this);
    this.physics.add.overlap(this.bullets, this.enemyShots, this.onShootRock, null, this);
    this.physics.add.overlap(this.bullets, this.bosses, this.onBulletHitBoss, null, this);

    // audio: start the loop, and stop it when the scene shuts down/restarts
    sound.setMuted(Player.state.muted);
    sound.startMusic();
    this.events.once('shutdown', () => sound.stopMusic());
    this.events.once('destroy', () => sound.stopMusic());
  }

  buildBackground() {
    const id = this.levelId;
    this.add.image(0, 0, `sky-${id}`).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
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

  buildCar(profile) {
    this.car = buildCar(this, CAR.x, CAR.groundY, profile.body, profile.weapon);
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

    this.input.on('pointerdown', (p) => {
      if (this.muteHit(p)) return;
      if (this.state === 'over') {
        this.scene.restart();
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
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#1b1d2a',
      strokeThickness: 4,
    };
    this.add
      .text(16, 12, `Level ${this.levelId}: ${this.levelCfg.name}`, { ...style, fontSize: '24px' })
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

    // subtle touch hints
    const hint = { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#ffffff' };
    this.add.text(20, GAME_HEIGHT - 26, '⤒ tap = jump', hint).setAlpha(0.35).setDepth(20);
    this.add
      .text(GAME_WIDTH - 130, GAME_HEIGHT - 26, 'drag = aim ⇅', hint)
      .setAlpha(0.35)
      .setDepth(20);

    // mute toggle (top-right corner)
    this.muteBtn = this.add
      .text(GAME_WIDTH - 34, 60, Player.state.muted ? '🔇' : '🔊', { fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => this.toggleMute());

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
  }

  toggleMute() {
    const m = !Player.state.muted;
    Player.setMuted(m);
    sound.setMuted(m);
    if (!m) sound.resume();
    this.muteBtn.setText(m ? '🔇' : '🔊');
  }

  // Returns true if the pointer hit the mute button (so it isn't also a jump).
  muteHit(p) {
    return Math.abs(p.x - this.muteBtn.x) < 24 && Math.abs(p.y - this.muteBtn.y) < 22;
  }

  update(time, delta) {
    if (this.state === 'playing') {
      if (this.phase === 'travel') {
        this.scrollWorld(delta);
        this.advanceLevel(delta);
        this.maybeSpawnGoblin(time);
        this.maybeSpawnHazard(time);
      } else {
        this.updateBoss(time, delta);
      }
      this.handleFiring(time);
    }
    this.updateCarPhysics(delta);
    this.updateAim(delta);
    this.updateGoblins(time);
    this.updateEnemyShots();
    this.updateScraps(delta);
    this.updateHazards(delta);
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
    if (this.distance >= LEVEL.length) this.startBossSequence();
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
      }
    }
    // tilt slightly while airborne for juice
    this.car.rotation = Phaser.Math.Clamp(this.carVY * 0.06, -0.14, 0.14);
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

    const type = pickEnemyType(Math.random);
    const x = GAME_WIDTH + 50;
    const y = type.lane === 'air' ? CAR.groundY - 120 : GROUND_TOP_Y + 2;

    const e = this.goblins.create(x, y, `${type.key}-${this.levelId}`);
    e.setOrigin(0.5, 1);
    e.body.setAllowGravity(false);
    e.setVelocityX(-type.speed);
    e.setData('type', type);
    e.setData('hp', type.hp);
    e.setData('seed', Math.random() * Math.PI * 2);
    if (type.lane === 'air') {
      e.setOrigin(0.5, 0.5);
      e.setData('baseY', y);
    }
    if (type.lobs) e.setData('nextLob', time + Phaser.Math.Between(600, 1200));

    const gap = Phaser.Math.Between(this.spawnGap, this.spawnGap + 800);
    this.nextSpawnAt = time + gap;
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

      // reached the car?
      if (this.state === 'playing' && Math.abs(e.x - this.car.x) < 40) {
        const hitsAir = type.lane === 'air' && Math.abs(e.y - carCY) < 48;
        const airborne = CAR.groundY - this.car.y;
        const hitsGround = type.lane !== 'air' && airborne < type.clearH;
        if (hitsAir || hitsGround) {
          this.poof(e.x, type.lane === 'air' ? e.y : e.y - 24, COLORS.goblin);
          e.destroy();
          this.damageCar(COMBAT.contactDamage);
          return true;
        }
      }

      if (e.x < -90) e.destroy();
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
    const type = goblin.getData('type');
    const yy = type.lane === 'air' ? goblin.y : goblin.y - 26;
    sound.defeat();
    this.poof(goblin.x, yy, COLORS.goblin);
    for (let i = 0; i < (type.scrap || 1); i++) {
      this.spawnScrap(goblin.x + Phaser.Math.Between(-12, 12), yy + Phaser.Math.Between(-8, 8));
    }
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

  // ---- damage / health --------------------------------------------------

  damageCar(amount) {
    if (this.state !== 'playing') return;
    if (this.time.now < this.invulnUntil) return;

    this.health -= amount;
    this.invulnUntil = this.time.now + COMBAT.invuln;
    sound.hurt();
    this.cameras.main.shake(180, 0.006);
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

    if (this.health <= 0) this.gameOver();
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
    bullet.destroy();
    if (!boss.active) return;
    const hp = boss.getData('hp') - this.weapon.damage;
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
    this.time.delayedCall(2400, () => this.scene.start('Garage', { earned }));
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
        fontFamily: 'system-ui, sans-serif',
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

    this.tweens.add({
      targets: this.car,
      x: { from: CAR.x - 4, to: CAR.x },
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  cullBullets() {
    this.bullets.children.iterate((b) => {
      if (!b) return true;
      if (b.x > GAME_WIDTH + 40 || b.x < -40 || b.y < -40 || b.y > GAME_HEIGHT + 40) b.destroy();
      return true;
    });
  }
}
