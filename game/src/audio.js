// Skycourier — Aurora Isles: sound, synthesized live with WebAudio.
// No audio files ship with the game: the engine is two detuned oscillators
// through a low-pass filter, the wind is looped noise through a band-pass,
// and the chimes and thuds are short envelopes. Everything starts on the
// first user gesture, so the browser's autoplay rules are never fought.

export function makeAudio() {
  return {
    ctx: null,
    master: null,
    engineOscA: null,
    engineOscB: null,
    engineFilter: null,
    engineGain: null,
    windSource: null,
    windFilter: null,
    windGain: null,
    muted: false,
    started: false,
  };
}

export function ensureAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(ctx.destination);

    // Engine: a low sawtooth pair whose pitch follows the throttle.
    audio.engineOscA = ctx.createOscillator();
    audio.engineOscA.type = 'sawtooth';
    audio.engineOscA.frequency.value = 55;
    audio.engineOscB = ctx.createOscillator();
    audio.engineOscB.type = 'sawtooth';
    audio.engineOscB.frequency.value = 55.7;
    audio.engineFilter = ctx.createBiquadFilter();
    audio.engineFilter.type = 'lowpass';
    audio.engineFilter.frequency.value = 320;
    audio.engineGain = ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOscA.connect(audio.engineFilter);
    audio.engineOscB.connect(audio.engineFilter);
    audio.engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOscA.start();
    audio.engineOscB.start();

    // Wind: two seconds of white noise, looped, band-passed.
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    audio.windSource = ctx.createBufferSource();
    audio.windSource.buffer = buffer;
    audio.windSource.loop = true;
    audio.windFilter = ctx.createBiquadFilter();
    audio.windFilter.type = 'bandpass';
    audio.windFilter.frequency.value = 500;
    audio.windFilter.Q.value = 0.6;
    audio.windGain = ctx.createGain();
    audio.windGain.gain.value = 0;
    audio.windSource.connect(audio.windFilter);
    audio.windFilter.connect(audio.windGain);
    audio.windGain.connect(audio.master);
    audio.windSource.start();

    audio.started = true;
  } catch (err) {
    // No audio device or blocked context: the game stays silent, never broken.
    audio.started = false;
  }
}

// Called every frame: engine pitch follows throttle, wind follows airspeed.
export function updateAudio(audio, plane) {
  if (!audio.started || !audio.ctx) return;
  if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  const on = !audio.muted && plane.speed > 1;
  const freq = 48 + plane.throttle * 62 + plane.speed * 0.35;
  audio.engineOscA.frequency.setTargetAtTime(freq, audio.ctx.currentTime, 0.08);
  audio.engineOscB.frequency.setTargetAtTime(freq * 1.012, audio.ctx.currentTime, 0.08);
  audio.engineGain.gain.setTargetAtTime(on ? 0.05 + plane.throttle * 0.06 : 0, audio.ctx.currentTime, 0.1);
  audio.windGain.gain.setTargetAtTime(on ? Math.min(0.12, plane.speed * 0.0022) : 0, audio.ctx.currentTime, 0.15);
  audio.windFilter.frequency.setTargetAtTime(320 + plane.speed * 14, audio.ctx.currentTime, 0.1);
}

function blip(audio, freq, dur, type, gain) {
  if (!audio.started || !audio.ctx || audio.muted) return;
  try {
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(audio.master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (err) { /* silent */ }
}

export function playChime(audio) {
  blip(audio, 880, 0.5, 'sine', 0.22);
  setTimeout(() => blip(audio, 1318, 0.6, 'sine', 0.18), 90);
}

export function playThud(audio) {
  blip(audio, 90, 0.35, 'triangle', 0.4);
}

export function playCrash(audio) {
  blip(audio, 55, 0.8, 'sawtooth', 0.4);
  blip(audio, 38, 1.1, 'square', 0.25);
}

export function playClick(audio) {
  blip(audio, 660, 0.08, 'sine', 0.12);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
