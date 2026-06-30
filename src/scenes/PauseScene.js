import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';

// Overlay launched on top of a paused GameScene. Resume / Restart / Menu.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.6);
    const panel = this.add.rectangle(cx, cy, 380, 300, 0x2a2d3f, 0.98).setStrokeStyle(4, 0xffe9b0);
    panel.setOrigin(0.5);

    this.add
      .text(cx, cy - 104, '⏸  PAUSED', {
        fontFamily: FONTS.display,
        fontSize: '46px',
        color: '#ffe14d',
        stroke: '#1b1d2a',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.button(cx, cy - 36, 'Resume  ▶', 0x39b54a, () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
    this.button(cx, cy + 30, 'Restart Level', 0x4a78c0, () => {
      this.scene.stop('Game');
      this.scene.start('Game');
    });
    this.button(cx, cy + 96, 'Main Menu', 0x7a5a8a, () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });

    // Esc / P also resumes
    this.input.keyboard.on('keydown-ESC', this.resume, this);
    this.input.keyboard.on('keydown-P', this.resume, this);
  }

  resume() {
    this.scene.resume('Game');
    this.scene.stop();
  }

  button(x, y, label, color, onClick) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 280, 52, color, 1).setStrokeStyle(3, 0x1b1d2a);
    bg.setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: FONTS.ui,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1b1d2a',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    btn.add([bg, txt]);
    bg.on('pointerover', () => btn.setScale(1.05));
    bg.on('pointerout', () => btn.setScale(1));
    bg.on('pointerdown', onClick);
    return btn;
  }
}
