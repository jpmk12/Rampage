// Persistent player profile: currency, owned/equipped parts, and level.
// Saved to localStorage so progress survives a refresh. Falls back to an
// in-memory object if storage is unavailable (e.g. private browsing).

const KEY = 'rampage.save.v1';

function freshDefault() {
  return {
    scrap: 0,
    level: 1,
    body: 'cardboard',
    weapon: 'bow',
    ownedBodies: ['cardboard'],
    ownedWeapons: ['bow'],
    unlockedParts: [], // special boss-drop parts that gate some upgrades
    turrets: 0, // bolt-on top turrets earned from mega enemies
    muted: false,
    littleKid: false, // invincible mode for young players
    // Freestyle bonus-round arsenal — accumulates and persists across replays.
    freestyle: freshFreestyle(),
  };
}

export function freshFreestyle() {
  return {
    guns: 1, spread: 0, rockets: 0, missiles: 0, bombs: 0,
    fireRate: 0, power: 0, heart: 0,
    runs: 0, best: 0,
  };
}

export const MAX_TURRETS = 3;

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...freshDefault(), ...JSON.parse(raw) };
  } catch (e) {
    /* storage unavailable — use defaults */
  }
  return freshDefault();
}

let data = load();

export const Player = {
  get state() {
    return data;
  },

  save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* ignore: keep playing with in-memory state */
    }
  },

  addScrap(n) {
    data.scrap += n;
    this.save();
  },

  spend(n) {
    if (data.scrap < n) return false;
    data.scrap -= n;
    this.save();
    return true;
  },

  ownsBody(id) {
    return data.ownedBodies.includes(id);
  },
  ownsWeapon(id) {
    return data.ownedWeapons.includes(id);
  },

  buyBody(id) {
    if (!this.ownsBody(id)) data.ownedBodies.push(id);
    data.body = id;
    this.save();
  },
  buyWeapon(id) {
    if (!this.ownsWeapon(id)) data.ownedWeapons.push(id);
    data.weapon = id;
    this.save();
  },

  equipBody(id) {
    data.body = id;
    this.save();
  },
  equipWeapon(id) {
    data.weapon = id;
    this.save();
  },

  nextLevel() {
    data.level += 1;
    this.save();
  },

  hasPart(id) {
    return data.unlockedParts.includes(id);
  },
  unlockPart(id) {
    if (!data.unlockedParts.includes(id)) data.unlockedParts.push(id);
    this.save();
  },

  setMuted(m) {
    data.muted = m;
    this.save();
  },

  setLittleKid(v) {
    data.littleKid = v;
    this.save();
  },

  // ---- freestyle bonus round ----
  get freestyle() {
    if (!data.freestyle) data.freestyle = freshFreestyle();
    return data.freestyle;
  },
  upgradeFreestyle(type) {
    const f = this.freestyle;
    f[type] = (f[type] || 0) + 1;
    this.save();
  },
  resetFreestyle() {
    const keep = this.freestyle;
    data.freestyle = freshFreestyle();
    data.freestyle.runs = keep.runs || 0;
    data.freestyle.best = keep.best || 0;
    this.save();
  },
  // True once the player has built up any freestyle arsenal/perks worth wiping.
  hasFreestyleProgress() {
    const f = this.freestyle;
    return (
      (f.guns || 0) > 1 || (f.spread || 0) > 0 || (f.rockets || 0) > 0 ||
      (f.missiles || 0) > 0 || (f.bombs || 0) > 0 || (f.fireRate || 0) > 0 ||
      (f.power || 0) > 0 || (f.heart || 0) > 0
    );
  },
  freestyleRun() {
    this.freestyle.runs = (this.freestyle.runs || 0) + 1;
    this.save();
  },
  setFreestyleBest(score) {
    const f = this.freestyle;
    if (score > (f.best || 0)) {
      f.best = score;
      this.save();
    }
  },

  // Returns true if a turret was added, false if already at the cap.
  addTurret() {
    if (data.turrets >= MAX_TURRETS) return false;
    data.turrets += 1;
    this.save();
    return true;
  },

  reset() {
    data = freshDefault();
    this.save();
  },
};
