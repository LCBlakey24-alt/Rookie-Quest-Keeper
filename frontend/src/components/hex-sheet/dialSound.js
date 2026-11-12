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

export function isDialSoundOn() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setDialSoundOn(on) {
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
    if (context.state === 'suspended') context.resume?.();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(2400, now);
    oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.025);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.035);
  } catch {
    /* no sound is fine */
  }
}
