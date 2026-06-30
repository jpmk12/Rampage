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
    muted: false,
  };
}

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

  reset() {
    data = freshDefault();
    this.save();
  },
};
