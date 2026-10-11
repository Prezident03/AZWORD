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

/* ── Talaffuz ──────────────────────────────────────────────
   1) Tabiiy AI ovoz (Groq Orpheus, /api/ai tts) — qurilmada keshlanadi.
   2) Ishlamasa — brauzerning o'z ovozi (SpeechSynthesis). */
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
export const TTS_VOICES = [
  { id: 'troy', name: 'Troy', desc: 'erkak' },
  { id: 'austin', name: 'Austin', desc: 'erkak' },
  { id: 'daniel', name: 'Daniel', desc: 'erkak' },
  { id: 'hannah', name: 'Hannah', desc: 'ayol' },
  { id: 'autumn', name: 'Autumn', desc: 'ayol' },
  { id: 'diana', name: 'Diana', desc: 'ayol' }
];
const TTS_MAX = 200;
const CACHE_NAME = 'az-tts-v1';
const mem = new Map();      // kalit → Promise<Blob|null>
let seq = 0;
/* Bitta audio element: iOS Safari'da birinchi teginishda "ochiladi", keyin async ijro ham ishlaydi */
let el = null, unlocked = false;
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function audioEl() {
  if (!el && typeof Audio !== 'undefined') { el = new Audio(); el.preload = 'auto'; }
  return el;
}
function unlock() {
  if (unlocked) return;
  const a = audioEl();
  if (!a) return;
  unlocked = true;
  if (!a.src) { a.src = SILENT; a.play().catch(() => {}); }
  removeEventListener('pointerdown', unlock, true);
  removeEventListener('keydown', unlock, true);
}
addEventListener('pointerdown', unlock, true);
addEventListener('keydown', unlock, true);
let curUrl = null;
let aiDown = false;
try { aiDown = sessionStorage.getItem('az:tts-down') === '1'; } catch (e) { /* ignore */ }

const useAI = (p) => p.voiceEngine !== 'browser' && !aiDown && typeof Audio !== 'undefined';
const ttsKey = (text, voice) => `https://tts.azword/${voice}/${encodeURIComponent(text)}`;
const clean = (t) => String(t || '').replace(/\s+/g, ' ').trim();

/* Bir vaqtda ko'pi bilan 4 ta so'rov — qolganlari navbatda */
let active = 0;
const queue = [];
function limited(key, fn) {
  return new Promise((resolve, reject) => {
    const run = () => { active++; fn().then(resolve, reject).finally(() => { active--; if (queue.length) queue.shift().run(); }); };
    if (active < 4) run(); else queue.push({ key, run });
  });
}
/* Hozir eshitilishi kerak bo'lgan matn navbat boshiga o'tadi */
function bump(key) {
  const i = queue.findIndex(q => q.key === key);
  if (i > 0) queue.unshift(queue.splice(i, 1)[0]);
}

async function fetchSpeech(text, voice, urgent = false) {
  const key = ttsKey(text, voice);
  if (mem.has(key)) { if (urgent) bump(key); return mem.get(key); }
  const job = (async () => {
    let cache = null;
    try { cache = 'caches' in window ? await caches.open(CACHE_NAME) : null; } catch (e) { cache = null; }
    if (cache) { const hit = await cache.match(key).catch(() => null); if (hit) return hit.blob(); }
    const { auth } = await import('./firebase.js');
    const user = auth.currentUser;
    if (!user) return null;
    if (aiDown) return null;
    const token = await user.getIdToken();
    if (urgent) bump(key);
    const res = await limited(key, () => fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ task: 'tts', text, voice })
    }));
    if (!res.ok || !/audio/.test(res.headers.get('Content-Type') || '')) {
      let code = '';
      try { code = (await res.json()).code || ''; } catch (e) { /* ignore */ }
      /* Sozlash xatosi bo'lsa bu sessiyada qayta urinmaymiz — darhol brauzer ovozi */
      if (res.status !== 429 && code !== 'rate-limited' && code !== 'upstream-limit') {
        aiDown = true;
        try { sessionStorage.setItem('az:tts-down', '1'); } catch (e) { /* ignore */ }
      }
      return null;
    }
    const blob = await res.blob();
    if (cache) cache.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/wav' } })).then(() => { if (Math.random() < 0.05) pruneCache(cache); }).catch(() => {});
    return blob;
  })().catch(() => null);
  mem.set(key, job);
  job.then(b => { if (!b) mem.delete(key); });
  if (mem.size > 150) mem.delete(mem.keys().next().value);
  return job;
}

/* Qurilmadagi ovoz keshi cheksiz o'smasin: eng eskilari o'chiriladi */
async function pruneCache(cache) {
  const keys = await cache.keys();
  const extra = keys.length - 500;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

/* Keyingi so'z/gapni oldindan yuklab qo'yish (kutish bo'lmasin) */
export function preloadSpeech(texts) {
  const p = getPrefs();
  if (!useAI(p)) return;
  for (const t of [].concat(texts)) {
    const c = clean(t);
    if (c && c.length <= TTS_MAX) fetchSpeech(c, p.voice || 'troy');
  }
}

export function resetSpeech() {
  aiDown = false;
  try { sessionStorage.removeItem('az:tts-down'); } catch (e) { /* ignore */ }
}

export const canSpeak = () => 'speechSynthesis' in window || typeof Audio !== 'undefined';

export function stopSpeaking() {
  seq++;
  if (el && !el.paused) { try { el.pause(); } catch (e) { /* ignore */ } }
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function browserSpeak(text, rate, onend) {
  if (!window.speechSynthesis) { onend && onend(); return; }
  const p = getPrefs();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = p.accent;
  u.rate = rate || p.voiceRate || 0.9;
  const v = pickVoice(p.accent);
  if (v) u.voice = v;
  if (onend) { u.onend = onend; u.onerror = onend; }
  speechSynthesis.speak(u);
}

export function speak(text, { rate, onend, engine } = {}) {
  const t = clean(text);
  stopSpeaking();
  if (!t) { onend && onend(); return; }
  const p = getPrefs();
  const r = rate || p.voiceRate || 0.9;
  if (engine === 'browser' || !useAI(p) || t.length > TTS_MAX) return browserSpeak(t, r, onend);
  const my = seq;
  /* AI ovoz 4 soniyada kelmasa — kutib o'tirmasdan brauzer ovozi */
  const timeout = new Promise(res => setTimeout(() => res(null), 4000));
  Promise.race([fetchSpeech(t, p.voice || 'troy', true), timeout]).then((blob) => {
    if (my !== seq) return;
    if (!blob) return browserSpeak(t, r, onend);
    const a = audioEl();
    if (curUrl) URL.revokeObjectURL(curUrl);
    curUrl = URL.createObjectURL(blob);
    a.onended = () => { if (my === seq) onend && onend(); };
    a.onerror = () => { if (my === seq) browserSpeak(t, r, onend); };
    a.src = curUrl;
    /* Tezlik: 0.9 — tabiiy; sekin rejim 0.55 → ~0.6x (ohang o'zgarmaydi) */
    a.defaultPlaybackRate = a.playbackRate = Math.max(0.6, Math.min(1.25, r / 0.9));
    a.preservesPitch = true;
    a.play().catch(() => { if (my === seq) browserSpeak(t, r, onend); });
  });
}
