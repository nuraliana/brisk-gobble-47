// All sound is synthesised with WebAudio — oscillators and filtered noise, no audio
// files and no network. The context is created lazily on the first user gesture so
// browsers allow it; every effect is a short function the game calls by name.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (!ctx) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
      const length = ctx.sampleRate * 0.5;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone({ freq, freqEnd, type = 'sine', dur = 0.15, vol = 0.2, delay = 0, slide = 'exp' }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== undefined) {
      if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.08, vol = 0.12, freq = 1200, delay = 0, type = 'bandpass' }) {
    const c = ensure();
    if (!c || muted || !noiseBuffer) return;
    const t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** Short two-note footstep patter, pitch varies with speed. */
    footstep(sprinting) {
      noise({ dur: 0.05, vol: sprinting ? 0.1 : 0.06, freq: sprinting ? 900 : 600 });
    },
    /** The turkey's gobble: three rapid warbling clucks. */
    gobble() {
      for (let i = 0; i < 3; i += 1) {
        tone({ freq: 420 - i * 40, freqEnd: 180, type: 'square', dur: 0.09, vol: 0.16, delay: i * 0.11 });
        tone({ freq: 640 - i * 50, freqEnd: 300, type: 'triangle', dur: 0.08, vol: 0.1, delay: i * 0.11 + 0.02 });
      }
    },
    /** Corn pickup: a bright little pop. */
    pickup() {
      tone({ freq: 660, freqEnd: 990, type: 'triangle', dur: 0.12, vol: 0.18 });
      tone({ freq: 1320, type: 'sine', dur: 0.08, vol: 0.08, delay: 0.05 });
    },
    /** Spotted! A sharp alarm sting: two rising brass-ish blasts. */
    alarm() {
      tone({ freq: 220, freqEnd: 440, type: 'sawtooth', dur: 0.22, vol: 0.22 });
      tone({ freq: 330, freqEnd: 660, type: 'sawtooth', dur: 0.22, vol: 0.18, delay: 0.16 });
      noise({ dur: 0.15, vol: 0.08, freq: 2400, delay: 0.05 });
    },
    /** Hurt: a low thud plus a descending squawk. */
    hurt() {
      noise({ dur: 0.12, vol: 0.2, freq: 300, type: 'lowpass' });
      tone({ freq: 500, freqEnd: 140, type: 'square', dur: 0.25, vol: 0.16 });
    },
    /** Stage cleared: a cheerful three-note climb. */
    stageClear() {
      [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.18, delay: i * 0.11 }));
    },
    /** Escape fanfare: a little Thanksgiving jig. */
    fanfare() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.2, delay: i * 0.13 }));
      tone({ freq: 262, type: 'sine', dur: 0.9, vol: 0.12, delay: 0.1 });
    },
    /** Caught: a sad descending trombone-ish slide. */
    caught() {
      tone({ freq: 392, freqEnd: 370, type: 'sawtooth', dur: 0.3, vol: 0.18 });
      tone({ freq: 370, freqEnd: 349, type: 'sawtooth', dur: 0.3, vol: 0.18, delay: 0.32 });
      tone({ freq: 349, freqEnd: 220, type: 'sawtooth', dur: 0.6, vol: 0.2, delay: 0.64 });
    },
    /** Knife whistle as a blade flies past. */
    whoosh() {
      noise({ dur: 0.18, vol: 0.1, freq: 1800 });
    },
  };
}
