// Procedural audio: every sound effect and all music are synthesized with the
// Web Audio API, so there are no audio files to ship. Everything is wrapped
// defensively — if Web Audio is missing or blocked, it silently no-ops.
//
// Signal graph:  oscillators/noise → musicBus | sfxBus → master → compressor → out
// so music and effects have independent volume and a limiter tames peaks.

const NOTE = {
  0: 0,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
};
const n = (name) => NOTE[name] || 0;

// A theme per biome (+ title / freestyle). 16-step melody, 8-step bass.
const SONGS = {
  title: {
    tempo: 250, wave: 'square', vol: 0.05,
    mel: ['C5', 0, 'E5', 'G5', 'E5', 0, 'D5', 0, 'C5', 0, 'E5', 0, 'G5', 'A5', 'G5', 0],
    bass: ['C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'F2', 'F2'],
  },
  // 1 Greenwood — bright & bouncy
  1: {
    tempo: 240, wave: 'square', vol: 0.05,
    mel: ['C5', 0, 'E5', 'G5', 'A5', 'G5', 'E5', 0, 'D5', 0, 'E5', 'D5', 'C5', 0, 'G4', 0],
    bass: ['C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'F2', 'G2'],
  },
  // 2 Zombie Flats — minor & spooky
  2: {
    tempo: 265, wave: 'triangle', vol: 0.06,
    mel: ['A4', 0, 'C5', 0, 'B4', 0, 'A4', 0, 'E4', 0, 'G4', 0, 'A4', 0, 0, 0],
    bass: ['A2', 'A2', 'F2', 'F2', 'G2', 'G2', 'E2', 'E2'],
  },
  // 3 Bandit Badlands — sparse western twang
  3: {
    tempo: 225, wave: 'square', vol: 0.05,
    mel: ['E5', 0, 0, 'G5', 0, 'E5', 0, 'D5', 'C5', 0, 0, 'E5', 0, 'D5', 0, 0],
    bass: ['A2', 0, 'A2', 0, 'E2', 0, 'E2', 0],
  },
  // 4 Frostbite Peaks — airy & gentle
  4: {
    tempo: 275, wave: 'sine', vol: 0.07,
    mel: ['G5', 0, 'D5', 0, 'E5', 0, 'G5', 0, 'A5', 0, 'G5', 0, 'E5', 0, 'D5', 0],
    bass: ['G2', 'G2', 'C3', 'C3', 'D3', 'D3', 'E3', 'E3'],
  },
  // 5 Volcano Fortress — driving & intense
  5: {
    tempo: 210, wave: 'sawtooth', vol: 0.045,
    mel: ['A4', 'A4', 0, 'C5', 0, 'A4', 0, 'E5', 'F5', 0, 'E5', 0, 'C5', 0, 'A4', 0],
    bass: ['A2', 'A2', 'A2', 0, 'F2', 'F2', 'G2', 'G2'],
  },
  // Freestyle — high-energy party
  free: {
    tempo: 200, wave: 'square', vol: 0.05,
    mel: ['C5', 'E5', 'G5', 'C5', 'E5', 'G5', 'A5', 'G5', 'F5', 'A5', 'C5', 'F5', 'E5', 'G5', 'C5', 0],
    bass: ['C3', 'G2', 'A2', 'F2', 'C3', 'G2', 'E2', 'G2'],
  },
};

class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = false;
    this.musicVol = 0.6;
    this.sfxVol = 0.9;
    this.musicTimer = null;
    this.step = 0;
    this.song = null;
    this.songKey = null;
    this.intensity = 0;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(comp);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVol;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
    } catch (e) {
      this.ctx = null;
    }
  }

  // Call from a user gesture so browsers allow audio to start.
  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }
  setMusicVol(v) {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.musicBus) this.musicBus.gain.value = this.musicVol;
  }
  setSfxVol(v) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVol;
  }

  // One short tone with a quick decay envelope, on the chosen bus.
  tone(freq, dur, type, vol, slideTo, bus) {
    if (!this.ctx || this.muted || !freq) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // White-noise burst for explosions / impacts / drums.
  noise(dur, vol, bus) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g);
    g.connect(bus || this.sfxBus);
    src.start(t);
  }

  // slight random detune so repeated effects don't sound identical
  vary(f, cents = 60) {
    return f * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);
  }

  // ---- named effects ----
  shoot() {
    this.tone(this.vary(720, 90), 0.07, 'square', 0.045, 320);
  }
  jump() {
    this.tone(300, 0.16, 'square', 0.12, 720);
  }
  defeat() {
    this.tone(this.vary(220, 80), 0.1, 'square', 0.11, 110);
    this.noise(0.12, 0.07);
  }
  pickup() {
    this.tone(this.vary(880, 30), 0.06, 'triangle', 0.13, 1320);
  }
  hurt() {
    this.tone(180, 0.28, 'sawtooth', 0.2, 70);
  }
  bossHit() {
    this.tone(this.vary(160, 50), 0.05, 'square', 0.13, 110);
  }
  explode() {
    this.noise(0.5, 0.3);
    this.tone(120, 0.4, 'sawtooth', 0.18, 50);
  }
  // rising ding whose pitch climbs with the combo multiplier
  combo(mult = 1) {
    const base = 660 * Math.pow(1.16, Math.max(0, mult - 1));
    this.tone(base, 0.09, 'triangle', 0.12, base * 1.5);
  }
  // sharp zap for a weak-point crit
  crit() {
    this.tone(1200, 0.08, 'square', 0.12, 400);
    this.noise(0.06, 0.06);
  }
  // cheerful rising arpeggio when a power-up kicks in
  powerup() {
    [660, 880, 1174].forEach((f, i) => setTimeout(() => this.tone(f, 0.09, 'triangle', 0.14), i * 70));
  }
  // metallic clank when the shield soaks a hit
  shieldBlock() {
    this.tone(240, 0.12, 'square', 0.16, 180);
    this.noise(0.08, 0.08);
  }
  // low menacing horn when a boss rolls in
  bossAppear() {
    this.tone(110, 0.5, 'sawtooth', 0.2, 82);
    this.tone(82, 0.6, 'square', 0.12);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.16), i * 120));
  }
  lose() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'square', 0.16), i * 160));
  }

  // ---- drums (on the music bus) ----
  kick() {
    this.tone(120, 0.14, 'sine', 0.5, 45, this.musicBus);
  }
  snare() {
    this.noise(0.12, 0.16, this.musicBus);
  }
  hat(v = 0.05) {
    this.noise(0.03, v, this.musicBus);
  }

  // ---- background music: a stepped sequencer with per-theme songs + drums ----
  startMusic(theme = 'title') {
    this.ensure();
    if (!this.ctx) return;
    const key = String(theme);
    if (this.musicTimer && this.songKey === key) return; // already playing this theme
    this.song = SONGS[key] || SONGS.title;
    this.songKey = key;
    this.step = 0;
    this.restartTimer();
  }

  restartTimer() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (!this.song) return;
    const speed = this.intensity >= 2 ? 0.78 : this.intensity >= 1 ? 0.88 : 1;
    this.musicTimer = setInterval(() => this.tick(), this.song.tempo * speed);
  }

  // Ramp the music up for boss fights (1) or danger / low health (2).
  setIntensity(level) {
    const lv = level | 0;
    if (lv === this.intensity) return;
    this.intensity = lv;
    if (this.musicTimer) this.restartTimer();
  }

  tick() {
    const s = this.song;
    if (!s) return;
    const i = this.step % 16;

    const m = n(s.mel[i]);
    if (m) this.tone(m, 0.16, s.wave, s.vol, null, this.musicBus);
    if (i % 2 === 0) {
      const b = n(s.bass[(i / 2) % s.bass.length]);
      if (b) this.tone(b, 0.24, 'triangle', 0.06, null, this.musicBus);
    }

    // drum groove — denser as intensity rises
    if (i % 4 === 0) this.kick();
    if (i === 4 || i === 12) this.snare();
    if (this.intensity >= 1 && i % 2 === 1) this.hat(0.045);
    if (this.intensity >= 2) {
      if (i % 2 === 0) this.hat(0.05);
      if (i === 2 || i === 10) this.snare();
    }

    this.step++;
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.songKey = null;
    this.intensity = 0;
  }
}

// Single shared instance for the whole game.
export const sound = new Sound();
