/* AzWord · ovoz effektlari, konfetti va talaffuz (Web Audio + Canvas + SpeechSynthesis) */
import { getPrefs } from './prefs.js';

/* ── Ovozlar ────────────────────────────────────────────── */
let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(c, freq, start, dur, type = 'sine', vol = 0.18) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}
const SOUNDS = {
  click: (c) => tone(c, 660, 0, 0.06, 'triangle', 0.06),
  correct: (c) => { tone(c, 880, 0, 0.12); tone(c, 1175, 0.08, 0.18); },
  wrong: (c) => { tone(c, 260, 0, 0.16, 'square', 0.07); tone(c, 196, 0.1, 0.22, 'square', 0.06); },
  coin: (c) => { tone(c, 1047, 0, 0.1); tone(c, 1319, 0.07, 0.2); },
  victory: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.11, 0.3, 'sine', 0.16)),
  achievement: (c) => [784, 988, 1175, 1568].forEach((f, i) => tone(c, f, i * 0.09, 0.4, i < 3 ? 'sine' : 'triangle', 0.14))
};
export function playSound(name) {
  if (!getPrefs().sound) return;
  try { const c = audio(); if (c && SOUNDS[name]) SOUNDS[name](c); } catch (e) { /* audio unavailable */ }
}

export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}

/* ── Konfetti ───────────────────────────────────────────── */
const COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#fbbf24', '#34d399', '#60a5fa'];
let canvas, cctx, parts = [], raf = null;
function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1090';
  document.body.appendChild(canvas);
  cctx = canvas.getContext('2d');
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);
}
function loop() {
  cctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += 0.22; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
    cctx.save();
    cctx.globalAlpha = Math.min(1, p.life / 40);
    cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cctx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop);
  else { raf = null; cctx.clearRect(0, 0, innerWidth, innerHeight); }
}
export function confetti({ count = 110, x = innerWidth / 2, y = innerHeight * 0.35, spread = 1 } = {}) {
  const p = getPrefs();
  if (!p.effects || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  ensureCanvas();
  const n = innerWidth < 600 ? Math.round(count * 0.6) : count;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (4 + Math.random() * 8) * spread;
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[(Math.random() * COLORS.length) | 0], life: 140 + Math.random() * 60
    });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

/* ── Talaffuz (Text-to-Speech) ──────────────────────────── */
let voices = [];
function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}
function pickVoice(lang) {
  if (!voices.length) loadVoices();
  return voices.find(v => v.lang === lang && /Google|Natural|Premium|Enhanced/i.test(v.name))
    || voices.find(v => v.lang === lang)
    || voices.find(v => v.lang && v.lang.startsWith('en'));
}
export const canSpeak = () => 'speechSynthesis' in window;
export function speak(text, { rate, onend } = {}) {
  if (!canSpeak() || !text) { onend && onend(); return; }
  const p = getPrefs();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = p.accent;
  u.rate = rate || p.voiceRate || 0.9;
  const v = pickVoice(p.accent);
  if (v) u.voice = v;
  if (onend) { u.onend = onend; u.onerror = onend; }
  speechSynthesis.speak(u);
}
