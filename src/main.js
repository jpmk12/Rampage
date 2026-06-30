import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { Player } from './state/PlayerState.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import GarageScene from './scenes/GarageScene.js';
import PauseScene from './scenes/PauseScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b1d2a',
  pixelArt: true,
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
  scene: [BootScene, TitleScene, GameScene, GarageScene, PauseScene],
};

const game = new Phaser.Game(config);

// Tell the startup-error overlay (in index.html) that the game booted, so it
// stops treating later errors as a fatal "couldn't start" blank screen.
window.__GAME_OK__ = true;

// Expose for quick debugging / automated smoke tests in the browser console.
window.__PHASER_GAME__ = game;
window.__PLAYER__ = Player;
