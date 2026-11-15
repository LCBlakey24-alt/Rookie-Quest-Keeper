/**
 * The dial's click: a very short synthesised tick, so there is no audio file
 * to download. Browsers only allow sound after a tap, which is always true
 * here because the dial ticks while a finger turns it.
 *
 * The player can switch it off; that choice is remembered on this device.
 * Anything unavailable (no Web Audio, storage blocked) quietly does nothing.
 */
const STORAGE_KEY = 'rqk.hexSheet.dialSound';

let context = null;
let tickBuffer = null;
let memorySoundOn = true;
let lastTickTime = -Infinity;

export function isDialSoundOn() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved == null ? memorySoundOn : saved !== 'off';
  } catch {
    return memorySoundOn;
  }
}

export function setDialSoundOn(on) {
  memorySoundOn = Boolean(on);
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

export function playDialTick() {
  if (!isDialSoundOn()) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    context = context || new AudioContextClass();
    if (context.state === 'suspended') context.resume?.()?.catch?.(() => {});
    const now = context.currentTime;
    // Fast spins can cross many values in a single frame. Avoid stacking
    // hundreds of sources into a loud burst while keeping the dial responsive.
    if (now - lastTickTime < 0.025) return;
    if (!tickBuffer) {
      // A brief, damped noise transient has the texture of a physical click.
      // The previous descending oscillator sweep sounded like a laser.
      const rate = context.sampleRate;
      tickBuffer = context.createBuffer(1, Math.ceil(rate * 0.016), rate);
      const samples = tickBuffer.getChannelData(0);
      let filtered = 0;
      for (let index = 0; index < samples.length; index += 1) {
        filtered = 0.35 * (Math.random() * 2 - 1) + 0.65 * filtered;
        samples[index] = filtered * Math.exp(-index / (rate * 0.0025));
      }
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = tickBuffer;
    gain.gain.setValueAtTime(0.16, now);
    source.connect(gain).connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(now);
    lastTickTime = now;
  } catch {
    /* no sound is fine */
  }
}
