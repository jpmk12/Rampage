import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { Player } from './state/PlayerState.js';
import { sound } from './audio/Sound.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import GarageScene from './scenes/GarageScene.js';
import PauseScene from './scenes/PauseScene.js';
import SettingsScene from './scenes/SettingsScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1d2a',
  // The art is smooth vector-cartoon, not pixel art — so antialias it. Leaving
  // pixelArt on (its old default) disabled AA and forced nearest-neighbor
  // sampling, which jagged every scaled/rotated sprite and font edge.
  render: {
    antialias: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene, GarageScene, PauseScene, SettingsScene],
};

// Wait for the display fonts to load before booting, so Phaser renders text
// with them (text is rasterized once, so a late font load wouldn't apply).
async function boot() {
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([
          document.fonts.load("32px 'Bangers'"),
          document.fonts.load("24px 'Luckiest Guy'"),
        ]),
        new Promise((r) => setTimeout(r, 2500)), // don't hang if a font is slow
      ]);
    }
  } catch (e) {
    /* fall back to system-ui */
  }

  // apply saved audio preferences to the shared sound engine up front
  sound.setMusicVol(Player.state.musicVol);
  sound.setSfxVol(Player.state.sfxVol);
  sound.setMuted(Player.state.muted);

  const game = new Phaser.Game(config);

  // Tell the startup-error overlay (in index.html) that the game booted, so it
  // stops treating later errors as a fatal "couldn't start" blank screen.
  window.__GAME_OK__ = true;

  // Expose for quick debugging / automated smoke tests in the browser console.
  window.__PHASER_GAME__ = game;
  window.__PLAYER__ = Player;
}

boot();
