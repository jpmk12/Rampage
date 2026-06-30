// Tiny procedural audio: all sound effects and the music loop are synthesized
// with the Web Audio API, so there are no audio files to ship. Everything is
// wrapped defensively — if Web Audio is missing or blocked, it silently no-ops.

class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
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
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // One short tone with a quick decay envelope.
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // White-noise burst for explosions / impacts.
  noise(dur, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // ---- named effects ----
  shoot() {
    this.tone(720, 0.07, 'square', 0.05, 320);
  }
  jump() {
    this.tone(300, 0.16, 'square', 0.12, 720);
  }
  defeat() {
    this.tone(220, 0.1, 'square', 0.12, 110);
    this.noise(0.12, 0.08);
  }
  pickup() {
    this.tone(880, 0.06, 'triangle', 0.14, 1320);
  }
  hurt() {
    this.tone(180, 0.28, 'sawtooth', 0.2, 70);
  }
  bossHit() {
    this.tone(160, 0.05, 'square', 0.14, 110);
  }
  explode() {
    this.noise(0.5, 0.3);
    this.tone(120, 0.4, 'sawtooth', 0.18, 50);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.18, 'square', 0.16), i * 120)
    );
  }
  lose() {
    [392, 330, 262].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.25, 'square', 0.16), i * 160)
    );
  }

  // ---- background music: a simple cheerful loop ----
  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicTimer) return;
    const melody = [523, 0, 659, 784, 659, 0, 587, 0, 523, 0, 659, 0, 784, 880, 784, 0];
    const bass = [131, 131, 98, 98, 110, 110, 87, 87];
    this.step = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const m = melody[this.step % melody.length];
      if (m) this.tone(m, 0.16, 'square', 0.04);
      const b = bass[this.step % bass.length];
      if (b) this.tone(b, 0.24, 'triangle', 0.06);
      this.step++;
    }, 250);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Single shared instance for the whole game.
export const sound = new Sound();
