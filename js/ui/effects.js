import { getSettings, setSetting } from '../storage.js';

let confettiFn = null;
async function getConfetti() {
  if (confettiFn) return confettiFn;
  const mod = await import('https://cdn.skypack.dev/canvas-confetti');
  confettiFn = mod.default;
  return confettiFn;
}

let audioCtx = null;
function getAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

let _soundEnabled = true;
export async function loadSoundPref() {
  const s = await getSettings();
  _soundEnabled = s.soundEnabled !== false;
}
export function isSoundEnabled() { return _soundEnabled; }
export async function setSoundEnabled(v) {
  _soundEnabled = !!v;
  await setSetting('soundEnabled', _soundEnabled);
}

function tone(freq, duration = 0.1, type = 'sine', volume = 0.15) {
  if (!_soundEnabled) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playTick() { tone(880, 0.08, 'triangle', 0.12); }
export function playBossKill() {
  tone(440, 0.18, 'sawtooth', 0.18);
  setTimeout(() => tone(660, 0.18, 'sawtooth', 0.18), 90);
  setTimeout(() => tone(880, 0.32, 'sawtooth', 0.18), 180);
}

export function xpPopup({ x, y, amount, kind = 'normal' }) {
  const layer = document.getElementById('effects-layer');
  const el = document.createElement('div');
  el.className = 'xp-popup' + (kind === 'boss' ? ' boss' : '');
  el.textContent = `+${amount} XP`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export async function confettiBurst({ x, y, big = false } = {}) {
  const fn = await getConfetti();
  fn({
    particleCount: big ? 100 : 40,
    spread: big ? 90 : 60,
    origin: {
      x: (x ?? window.innerWidth / 2) / window.innerWidth,
      y: (y ?? window.innerHeight / 2) / window.innerHeight
    },
    colors: big ? ['#f5b800', '#ffd45a', '#fff', '#5b9df2'] : ['#f5b800', '#ffd45a']
  });
}

export function showBossBanner() {
  const layer = document.getElementById('effects-layer');
  const el = document.createElement('div');
  el.textContent = 'BOSS DEFEATED';
  el.style.cssText = `
    position: absolute; top: 25%; left: 50%; transform: translate(-50%, 0);
    font-family: 'Fraunces', serif; font-size: 48px; font-weight: 700;
    color: #f5b800; text-shadow: 0 4px 24px rgba(245,184,0,0.6);
    animation: boss-banner 1400ms ease-out forwards;
  `;
  if (!document.getElementById('boss-banner-style')) {
    const s = document.createElement('style');
    s.id = 'boss-banner-style';
    s.textContent = `@keyframes boss-banner {
      0% { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
      30% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translate(-50%, -20px) scale(1); }
    }`;
    document.head.appendChild(s);
  }
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

const LOOT_MESSAGES = [
  "You showed up. That counts.",
  "Future you is cheering.",
  "Small wins compound.",
  "The hard part was starting. You did it.",
  "This is exactly how progress feels.",
  "Inertia broken.",
  "ADHD brain just won a round.",
  "You're allowed to be proud of this.",
  "Momentum unlocked.",
  "One more, then one more.",
  "Dopamine drop — well earned.",
  "Boss music intensifies.",
  "The streak likes you.",
  "Past-you set this up. Thank them.",
  "Done > perfect.",
  "Power up acquired: focus +1.",
  "You can't undo this win.",
  "The list got shorter.",
  "Your brain is learning what 'done' feels like.",
  "Tiny victory, real victory.",
  "You're outrunning the executive dysfunction.",
  "Tomorrow-you will not regret this.",
  "Caps lock: NICE.",
  "Tasks fear you slightly more now.",
  "The Boss can't hide forever.",
  "Stack one more.",
  "Time is moving — so are you.",
  "Done is a feeling. Memorize it.",
  "A check mark is also a deposit.",
  "You earned a stretch."
];

let checkOffCount = 0;
export function showLootIfDue() {
  checkOffCount++;
  if (checkOffCount % 5 !== 0) return;
  const msg = LOOT_MESSAGES[Math.floor(Math.random() * LOOT_MESSAGES.length)];
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = '✨ ' + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
