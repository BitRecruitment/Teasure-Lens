// Synthesized Web Audio API Sound Effects (Camera-Driven Visual Metal Detector)

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.beepTimer = null;
    this.currentBeepCadence = 0; // ms interval
    this.isBeeping = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Visual Metal Detector: Beeps faster and with higher pitch as camera spots the location!
  updateVisualBeep(similarityScore) {
    this.init();
    if (this.muted) {
      this.stopVisualBeep();
      return;
    }

    // Silence if landmark is not in frame
    if (similarityScore < 35) {
      this.stopVisualBeep();
      return;
    }

    // Determine interval & frequency based on visual match score
    let intervalMs;
    let freq;

    if (similarityScore >= 85) {
      // LOCKED ONTO LANDMARK! High-priority rapid sonar lock (every 220ms)
      intervalMs = 220;
      freq = 1380;
    } else if (similarityScore >= 65) {
      // Getting hot! Rapid beeping (every 380ms)
      intervalMs = 380;
      freq = 1150;
    } else {
      // Faint detection (every 850ms)
      intervalMs = 850;
      freq = 880;
    }

    if (this.currentBeepCadence !== intervalMs) {
      this.stopVisualBeep();
      this.currentBeepCadence = intervalMs;
      this.isBeeping = true;

      this.playDetectorChirp(freq, similarityScore >= 85);
      this.beepTimer = setInterval(() => {
        this.playDetectorChirp(freq, similarityScore >= 85);
      }, intervalMs);
    }
  }

  playDetectorChirp(frequency, isLock = false) {
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isLock ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, t);

    const dur = isLock ? 0.09 : 0.07;
    gain.gain.setValueAtTime(isLock ? 0.18 : 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  stopVisualBeep() {
    if (this.beepTimer) {
      clearInterval(this.beepTimer);
      this.beepTimer = null;
    }
    this.currentBeepCadence = 0;
    this.isBeeping = false;
  }

  // Landmark Matched & Verified chime
  playMatchSuccess() {
    this.init();
    if (!this.ctx || this.muted) return;

    const notes = [659.25, 880, 1174.66, 1318.5]; // E5, A5, D6, E6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + (idx * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  // Shovel digging into earth sound (white noise + low thump)
  playShovelDig() {
    this.init();
    if (!this.ctx || this.muted) return;

    const t = this.ctx.currentTime;

    // Low earth thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.23);

    // Dirt crunch noise
    const bufferSize = this.ctx.sampleRate * 0.18;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  // Chest unlocks & opens (Chimes + Arpeggio)
  playChestUnlock() {
    this.init();
    if (!this.ctx || this.muted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major chord)
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + (idx * 0.09);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  // Grand victory fanfare
  playVictory() {
    this.init();
    if (!this.ctx || this.muted) return;

    const fanfare = [
      { f: 523.25, d: 0.18, pause: 0 },
      { f: 659.25, d: 0.18, pause: 0.2 },
      { f: 783.99, d: 0.18, pause: 0.4 },
      { f: 1046.5, d: 0.5, pause: 0.6 }
    ];

    fanfare.forEach(item => {
      const t = this.ctx.currentTime + item.pause;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(item.f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + item.d + 0.05);
    });
  }

  // UI button click
  playClick() {
    this.init();
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
}

export const soundFX = new SoundFX();
