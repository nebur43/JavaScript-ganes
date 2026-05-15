import { getPref, setPref } from './storage.js';

let ctx = null;
let muted = getPref('muted', '0') === '1';

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.08, type = 'square', gain = 0.06) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ac.destination);
  const t = ac.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  move: () => tone(420, 0.05, 'square', 0.04),
  click: () => tone(660, 0.06, 'triangle', 0.05),
  success: () => { tone(660, 0.08); setTimeout(() => tone(880, 0.12), 70); },
  fail: () => { tone(220, 0.12, 'sawtooth', 0.06); setTimeout(() => tone(160, 0.18, 'sawtooth', 0.06), 100); },
  pop: () => tone(520, 0.05, 'sine', 0.06),
  drop: () => tone(180, 0.1, 'triangle', 0.07),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.06), i * 90)); },
};

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  setPref('muted', muted ? '1' : '0');
  document.querySelectorAll('[data-sound-toggle]').forEach(b => {
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');
  });
}

export function initSound() {
  setMuted(muted);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sound-toggle]');
    if (!t) return;
    setMuted(!muted);
  });
  const wake = () => { ensure(); window.removeEventListener('pointerdown', wake); };
  window.addEventListener('pointerdown', wake, { once: true });
}
