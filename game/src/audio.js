// audio.js — one job: every sound in Night Archive, synthesized live with
// WebAudio. No audio files: footsteps are filtered noise taps, the alert is a
// short two-note sting, pickups and win/lose are small sine phrases.
// Nothing plays until the first key or click (browsers require a gesture).

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // Short burst of low-passed noise: a footstep. Louder + faster when running.
  footstep(running, alternate) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = alternate ? 320 : 260;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(running ? 0.5 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  // A guard's step, heard from where the guard stands: quieter with distance.
  guardStep(guardX, guardY, playerX, playerY) {
    if (!this.ctx || this.muted) return;
    const dist = Math.hypot(guardX - playerX, guardY - playerY);
    const vol = Math.max(0, 0.22 - dist / 2400);
    if (vol <= 0.01) return;
    const t = this.ctx.currentTime;
    const dur = 0.06;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  tone(freq, startAt, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + startAt;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Two rising notes the moment a guard's meter fills: the near miss.
  alertSting() {
    this.tone(392, 0, 0.16, 'triangle', 0.3);
    this.tone(587, 0.12, 0.24, 'triangle', 0.3);
  }

  pickupChime() {
    this.tone(659, 0, 0.12, 'sine', 0.28);
    this.tone(880, 0.09, 0.2, 'sine', 0.28);
  }

  levelClear() {
    this.tone(523, 0, 0.14, 'sine', 0.28);
    this.tone(659, 0.12, 0.14, 'sine', 0.28);
    this.tone(784, 0.24, 0.3, 'sine', 0.28);
  }

  caughtSound() {
    this.tone(220, 0, 0.3, 'sawtooth', 0.2);
    this.tone(165, 0.2, 0.45, 'sawtooth', 0.2);
  }
}
