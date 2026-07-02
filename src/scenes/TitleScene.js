import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GROUND_TOP_Y, SCROLL, FONTS, CAR } from '../config.js';
import { Player } from '../state/PlayerState.js';
import { buildCar } from '../entities/Car.js';
import { sound } from '../audio/Sound.js';

// The front door: a gently animated scene with the title, the player's current
// car idling, and a big PLAY button.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.buildScenery();
    this.buildCar();
    this.buildTitle();
    this.buildButtons();
    this.buildMute();

    // wake audio on the first interaction and start the music
    this.input.once('pointerdown', () => {
      sound.resume();
      sound.setMuted(Player.state.muted);
      sound.startMusic();
    });

    this.cameras.main.fadeIn(400, 27, 29, 42);
  }

  buildScenery() {
    this.add.image(0, 0, 'sky-1').setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.image(720, 110, 'sun').setTint(0xfff3b0).setScale(1.15).setAlpha(0.9);

    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const c = this.add
        .image(Math.random() * GAME_WIDTH, 40 + Math.random() * 140, 'cloud')
        .setScale(0.6 + Math.random() * 0.7)
        .setAlpha(0.5 + Math.random() * 0.4);
      c.setData('speed', 0.006 + Math.random() * 0.012);
      this.clouds.push(c);
    }

    this.mountains = this.add.tileSprite(0, GROUND_TOP_Y - 200, GAME_WIDTH, 200, 'mtns-1').setOrigin(0, 0).setAlpha(0.92);
    this.farHills = this.add.tileSprite(0, GROUND_TOP_Y - 150, GAME_WIDTH, 150, 'hills-far-1').setOrigin(0, 0);
    this.nearHills = this.add.tileSprite(0, GROUND_TOP_Y - 210, GAME_WIDTH, 210, 'hills-near-1').setOrigin(0, 0);
    this.ground = this.add.tileSprite(0, GROUND_TOP_Y, GAME_WIDTH, 90, 'ground-1').setOrigin(0, 0);
  }

  buildCar() {
    const p = Player.state;
    this.car = buildCar(this, 220, CAR.groundY, p.body, p.weapon, p.turrets);
    this.car.setScale(1.3).setDepth(5);
  }

  buildTitle() {
    this.add
      .text(GAME_WIDTH / 2, 150, 'RAMPAGE', {
        fontFamily: FONTS.display,
        fontSize: '120px',
        color: '#ffe14d',
        stroke: '#1b1d2a',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, '#00000055', 8);
    this.add
      .text(GAME_WIDTH / 2, 214, 'Build your battle car!', {
        fontFamily: FONTS.ui,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#1b1d2a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  buildButtons() {
    const cont = Player.state.level > 1;
    this.bigButton(GAME_WIDTH / 2, 296, cont ? `PLAY  ▶   (Level ${Player.state.level})` : 'PLAY  ▶', 0x39b54a, () => {
      this.cameras.main.fadeOut(260, 27, 29, 42);
      this.time.delayedCall(270, () => this.scene.start('Game', { freestyle: false }));
    });

    // Freestyle bonus round
    this.bigButton(GAME_WIDTH / 2, 360, '⚡ FREESTYLE', 0xe08a2a, () => {
      this.cameras.main.fadeOut(260, 27, 29, 42);
      this.time.delayedCall(270, () => this.scene.start('Game', { freestyle: true }));
    });

    // Kid Mode (invincible) toggle
    this.kidBtn = this.smallButton(GAME_WIDTH / 2, 408, this.kidLabel(), () => {
      Player.setLittleKid(!Player.state.littleKid);
      this.kidBtn.setText(this.kidLabel());
    });

    // Small secondary actions, stacked under Kid Mode.
    let y = 438;
    if (cont) {
      this.smallButton(GAME_WIDTH / 2, y, 'New Game', () => {
        Player.reset();
        this.scene.restart();
      });
      y += 28;
    }
    if (Player.hasFreestyleProgress()) {
      this.resetFsBtn = this.smallButton(GAME_WIDTH / 2, y, '🔄 Reset Freestyle arsenal', () => {
        Player.resetFreestyle();
        this.scene.restart();
      });
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'Aim: ↑/↓ or drag • Jump: Space or tap • Pause: Esc', {
        fontFamily: FONTS.ui,
        fontSize: '15px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
  }

  kidLabel() {
    return `👶 Kid Mode (no losing): ${Player.state.littleKid ? 'ON' : 'OFF'}`;
  }

  bigButton(x, y, label, color, onClick) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 320, 70, color, 1).setStrokeStyle(4, 0x2c8f3a);
    bg.setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: FONTS.ui,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1b5524',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    btn.add([bg, txt]);
    bg.on('pointerover', () => btn.setScale(1.06));
    bg.on('pointerout', () => btn.setScale(1));
    bg.on('pointerdown', onClick);
    this.tweens.add({ targets: btn, scale: { from: 1, to: 1.04 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return btn;
  }

  smallButton(x, y, label, onClick) {
    const t = this.add
      .text(x, y, label, {
        fontFamily: FONTS.ui,
        fontSize: '18px',
        color: '#bfe6ff',
        stroke: '#1b1d2a',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setScale(1.1));
    t.on('pointerout', () => t.setScale(1));
    t.on('pointerdown', onClick);
    return t;
  }

  buildMute() {
    this.muteBtn = this.add
      .text(GAME_WIDTH - 34, 34, Player.state.muted ? '🔇' : '🔊', { fontSize: '26px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      const m = !Player.state.muted;
      Player.setMuted(m);
      sound.setMuted(m);
      if (!m) {
        sound.resume();
        sound.startMusic();
      }
      this.muteBtn.setText(m ? '🔇' : '🔊');
    });
  }

  update(time, delta) {
    this.clouds.forEach((c) => {
      c.x -= c.getData('speed') * delta;
      if (c.x < -120) c.x = GAME_WIDTH + 120;
    });
    this.mountains.tilePositionX += SCROLL.mountains * delta;
    this.farHills.tilePositionX += SCROLL.farHills * delta;
    this.nearHills.tilePositionX += SCROLL.nearHills * delta;
    this.ground.tilePositionX += SCROLL.ground * delta;
    this.car.rotation = Math.sin(time * 0.005) * 0.02;
    const wheels = this.car.getData('wheels');
    if (wheels) for (const w of wheels) w.rotation += 0.012 * delta;
  }
}
