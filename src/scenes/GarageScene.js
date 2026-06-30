import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Player } from '../state/PlayerState.js';
import { BODIES, WEAPONS } from '../data/catalog.js';
import { buildCar } from '../entities/Car.js';

// Milestone 2: the end-of-level Garage. Spend Scrap on a new car body or
// weapon and watch the car change. Everything persists via PlayerState.
const UI = {
  panel: 0x2a2d3f,
  panelBright: 0x3a3f5a,
  equipped: 0x6fd06a,
  owned: 0x5db4ff,
  buy: 0xffe14d,
  locked: 0x6b6f7a,
  text: '#ffffff',
};

export default class GarageScene extends Phaser.Scene {
  constructor() {
    super('Garage');
  }

  init(data) {
    this.earned = (data && data.earned) || 0;
  }

  create() {
    this.cards = [];
    this.buildBackdrop();
    this.buildHeader();
    this.buildBolt();
    this.buildPreview();
    this.buildShelves();
    this.buildRollOut();
  }

  buildBackdrop() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x20232f);
    // floor band
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, 120, 0x2c3142);
    // header bar
    this.add.rectangle(GAME_WIDTH / 2, 28, GAME_WIDTH, 56, 0x171922);
  }

  buildHeader() {
    this.add.text(24, 12, '🔧 GARAGE', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '30px',
      color: '#ffe14d',
      stroke: '#000000',
      strokeThickness: 3,
    });
    if (this.earned > 0) {
      this.add.text(210, 22, `+${this.earned} scrap this level!`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#9fe6a0',
      });
    }

    this.add.image(GAME_WIDTH - 150, 28, 'scrap').setScale(1.2);
    this.scrapText = this.add
      .text(GAME_WIDTH - 134, 12, String(Player.state.scrap), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0);
  }

  buildBolt() {
    this.add.image(862, 150, 'bolt').setScale(1.15);
    this.drawSpeech(770, 96, 'Nice driving!\nSpend your scrap.');
  }

  drawSpeech(x, y, msg) {
    const w = 196;
    const h = 60;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x - w, y, w, h, 10);
    g.fillTriangle(x - 6, y + h - 6, x + 16, y + h + 14, x + 16, y + h - 2);
    this.add
      .text(x - w + 14, y + 12, msg, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#222222',
        align: 'left',
      });
  }

  buildPreview() {
    this.previewX = 470;
    this.previewY = 200;
    // platform
    this.add.ellipse(this.previewX, this.previewY + 6, 230, 40, 0x171922, 0.6);
    this.refreshPreview();
  }

  refreshPreview() {
    if (this.preview) this.preview.destroy();
    this.preview = buildCar(this, this.previewX, this.previewY, Player.state.body, Player.state.weapon);
    this.preview.setScale(1.9);
    // a little "clunk" pop whenever the loadout changes
    this.tweens.add({
      targets: this.preview,
      scale: { from: 1.7, to: 1.9 },
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  buildShelves() {
    this.shelfLabel('BODIES', 78, 246);
    this.shelfLabel('WEAPONS', 78, 372);
    this.renderCards();
  }

  shelfLabel(text, x, y) {
    this.add.text(x, y, text, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#bfe6ff',
      stroke: '#000000',
      strokeThickness: 2,
    });
  }

  renderCards() {
    this.cards.forEach((c) => c.destroy());
    this.cards = [];

    const xs = [150, 315, 480];
    BODIES.forEach((item, i) => this.cards.push(this.makeCard(xs[i], 320, 'body', item)));
    WEAPONS.forEach((item, i) => this.cards.push(this.makeCard(xs[i], 446, 'weapon', item)));
  }

  makeCard(x, y, kind, item) {
    const owned = kind === 'body' ? Player.ownsBody(item.id) : Player.ownsWeapon(item.id);
    const equipped = Player.state[kind] === item.id;
    const affordable = Player.state.scrap >= item.price;
    const partLocked = !!item.requiresPart && !Player.hasPart(item.requiresPart) && !owned;

    let border = UI.locked;
    let status = `${item.price}`;
    let statusColor = '#cfd3da';
    let fill = UI.panel;
    let dim = false;

    if (equipped) {
      border = UI.equipped;
      status = 'EQUIPPED';
      statusColor = '#9fe6a0';
    } else if (owned) {
      border = UI.owned;
      status = 'EQUIP';
      statusColor = '#bfe6ff';
    } else if (partLocked) {
      dim = true;
      border = UI.locked;
      status = '🔒 Beat the boss';
      statusColor = '#c9a0ff';
    } else if (affordable) {
      border = UI.buy;
      status = `BUY  ${item.price}`;
      statusColor = '#ffe14d';
      fill = UI.panelBright;
    } else {
      dim = true;
      status = `${item.price} scrap`;
      statusColor = '#9aa0ab';
    }

    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 150, 100, fill, 1).setStrokeStyle(3, border);
    bg.setInteractive({ useHandCursor: true });

    const iconKey = kind === 'body' ? `body-${item.id}` : `wpn-${item.id}`;
    const icon = this.add.image(0, -22, iconKey).setScale(kind === 'body' ? 0.6 : 1.4);

    const name = this.add
      .text(0, 20, item.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: UI.text,
        align: 'center',
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(0, 38, status, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: statusColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, icon, name, statusText]);
    if (dim) container.setAlpha(0.55);

    bg.on('pointerover', () => container.setScale(1.05));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerdown', () => this.onCardClick(kind, item, container));

    return container;
  }

  onCardClick(kind, item, container) {
    const owned = kind === 'body' ? Player.ownsBody(item.id) : Player.ownsWeapon(item.id);
    const equipped = Player.state[kind] === item.id;

    if (equipped) return; // nothing to do

    if (owned) {
      if (kind === 'body') Player.equipBody(item.id);
      else Player.equipWeapon(item.id);
      this.afterChange();
      return;
    }

    // locked behind a boss-drop part
    if (item.requiresPart && !Player.hasPart(item.requiresPart)) {
      this.denied(container);
      return;
    }

    // not owned → try to buy
    if (Player.spend(item.price)) {
      if (kind === 'body') Player.buyBody(item.id);
      else Player.buyWeapon(item.id);
      this.afterChange();
    } else {
      this.denied(container);
    }
  }

  afterChange() {
    this.scrapText.setText(String(Player.state.scrap));
    this.refreshPreview();
    this.renderCards();
  }

  denied(container) {
    this.cameras.main.shake(140, 0.004);
    this.tweens.add({
      targets: this.scrapText,
      x: { from: this.scrapText.x - 6, to: this.scrapText.x },
      duration: 70,
      yoyo: true,
      repeat: 2,
    });
    if (container) {
      this.tweens.add({
        targets: container,
        angle: { from: -3, to: 3 },
        duration: 60,
        yoyo: true,
        repeat: 3,
        onComplete: () => container.setAngle(0),
      });
    }
  }

  buildRollOut() {
    const x = 760;
    const y = 470;
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 200, 64, 0x39b54a, 1).setStrokeStyle(4, 0x2c8f3a);
    bg.setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 0, 'ROLL OUT! ▶', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#1b5524',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    btn.add([bg, label]);

    bg.on('pointerover', () => btn.setScale(1.06));
    bg.on('pointerout', () => btn.setScale(1));
    bg.on('pointerdown', () => {
      Player.nextLevel();
      this.scene.start('Game');
    });

    // gentle attention pulse
    this.tweens.add({
      targets: btn,
      scale: { from: 1, to: 1.04 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
