import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { Player } from '../state/PlayerState.js';
import { sound } from '../audio/Sound.js';

// A small overlay for audio settings: Music / SFX volume + Mute. Launched on
// top of the Title or the Pause menu; `from` tells it which to leave behind.
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(data) {
    this.from = (data && data.from) || 'Title';
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // interactive backdrop blocks clicks from reaching the scene underneath
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1b1d2a, 0.66).setInteractive();
    this.add.rectangle(cx, cy, 420, 320, 0x2a2d3f, 0.98).setStrokeStyle(4, 0xffe9b0);

    this.add
      .text(cx, cy - 118, '⚙  SETTINGS', {
        fontFamily: FONTS.display,
        fontSize: '40px',
        color: '#ffe14d',
        stroke: '#1b1d2a',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.volRow(cx, cy - 54, '🎵 Music', 'musicVol', (v) => {
      sound.setMusicVol(v);
      Player.setMusicVol(v);
    });
    this.volRow(cx, cy + 2, '🔊 Effects', 'sfxVol', (v) => {
      sound.setSfxVol(v);
      Player.setSfxVol(v);
      sound.pickup(); // audible preview
    });

    // mute toggle
    this.muteBtn = this.button(cx, cy + 66, this.muteLabel(), 0x4a78c0, () => {
      const m = !Player.state.muted;
      Player.setMuted(m);
      sound.setMuted(m);
      if (!m) sound.resume();
      this.muteBtn.getData('txt').setText(this.muteLabel());
    });

    this.button(cx, cy + 122, 'Back  ✕', 0x7a5a8a, () => this.close());

    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  muteLabel() {
    return Player.state.muted ? '🔇 Muted — tap to unmute' : '🔈 Sound On';
  }

  close() {
    this.scene.stop();
    // Title keeps running underneath; Pause needs no action either — just leave.
  }

  // A labelled 0–100% stepper drawn as five segments with − / + buttons.
  volRow(cx, y, label, key, apply) {
    this.add
      .text(cx - 180, y, label, { fontFamily: FONTS.ui, fontSize: '18px', color: '#ffffff' })
      .setOrigin(0, 0.5);

    const segs = [];
    const startX = cx - 6;
    for (let i = 0; i < 5; i++) {
      segs.push(this.add.rectangle(startX + i * 26, y, 20, 20, 0x556070).setStrokeStyle(2, 0x1b1d2a));
    }
    const redraw = () => {
      const v = Player.state[key];
      const on = Math.round(v * 5);
      segs.forEach((s, i) => s.setFillStyle(i < on ? 0x6fd06a : 0x3a3f4a));
    };
    redraw();

    const step = (dir) => {
      const v = Math.max(0, Math.min(1, Math.round(Player.state[key] * 5 + dir) / 5));
      apply(v);
      redraw();
    };
    this.stepBtn(cx + 138, y, '−', () => step(-1));
    this.stepBtn(cx + 174, y, '+', () => step(1));
  }

  stepBtn(x, y, glyph, onClick) {
    const b = this.add
      .text(x, y, glyph, { fontFamily: FONTS.ui, fontSize: '26px', color: '#ffe14d', stroke: '#1b1d2a', strokeThickness: 3 })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setScale(1.2));
    b.on('pointerout', () => b.setScale(1));
    b.on('pointerdown', onClick);
    return b;
  }

  button(x, y, label, color, onClick) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 300, 44, color, 1).setStrokeStyle(3, 0x1b1d2a);
    bg.setInteractive({ useHandCursor: true });
    const txt = this.add
      .text(0, 0, label, { fontFamily: FONTS.ui, fontSize: '19px', color: '#ffffff', stroke: '#1b1d2a', strokeThickness: 3 })
      .setOrigin(0.5);
    btn.add([bg, txt]);
    btn.setData('txt', txt);
    bg.on('pointerover', () => btn.setScale(1.04));
    bg.on('pointerout', () => btn.setScale(1));
    bg.on('pointerdown', onClick);
    return btn;
  }
}
