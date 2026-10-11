/* AzWord · o'yin mantiqi (sof funksiyalar — Firestore'ga bog'liq emas).
   Daraja, streak, haftalik reyting, mukofot va takrorlash (SRS) qoidalari shu yerda. */

export const XP_PER_LEVEL = 500;
export const DEFAULT_DAILY_GOAL = 20;
export const MAX_SESSION_STARS = 100;      // firestore.rules bilan mos
export const REWARD_COOLDOWN_SEC = 45;     // firestore.rules bilan mos
export const AI_GEN_ITEM = { id: 'ai-generator-premium', price: 100, uses: 20 };
export const STREAK_FREEZE_ITEM = { id: 'streak-freeze', price: 50, freezes: 1 };

export function levelInfo(stars = 0) {
  const s = Math.max(0, Number(stars) || 0);
  const level = Math.floor(s / XP_PER_LEVEL) + 1;
  const xp = s % XP_PER_LEVEL;
  return { level, xp, need: XP_PER_LEVEL, pct: Math.round((xp / XP_PER_LEVEL) * 100), left: XP_PER_LEVEL - xp };
}

/* ── Sana kalitlari (foydalanuvchining mahalliy vaqti) ── */
const pad = (n) => String(n).padStart(2, '0');
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
/* ISO-8601 hafta kaliti: 2026-W41 */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
}
export function weekRange(d = new Date()) {
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

/* ── Streak ─────────────────────────────────────────────
   Ko'rsatiladigan streak: oxirgi mashg'ulot bugun yoki kecha bo'lsa — saqlanadi.
   Bitta kun o'tkazib yuborilgan va "streak muzlatish" bo'lsa — hali tiklash mumkin. */
export function streakState(u = {}, today = dateKey()) {
  const last = u.lastStudyDate || null;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0); // firestore.rules bilan mos
  const days = num(u.streakDays);
  const freezes = num(u.streakFreezes);
  if (!last || !days) return { current: 0, doneToday: false, atRisk: false, broken: !!last };
  if (last === today) return { current: days, doneToday: true, atRisk: false, broken: false };
  if (last === addDays(today, -1)) return { current: days, doneToday: false, atRisk: true, broken: false };
  if (last === addDays(today, -2) && freezes > 0) return { current: days, doneToday: false, atRisk: true, frozen: true, broken: false };
  return { current: 0, doneToday: false, atRisk: false, broken: true };
}
/* Mashg'ulot tugaganda yangi streak qiymatlari */
export function nextStreak(u = {}, today = dateKey()) {
  const last = u.lastStudyDate || null;
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0); // firestore.rules bilan mos
  const days = num(u.streakDays);
  const freezes = num(u.streakFreezes);
  let streakDays;
  let usedFreeze = false;
  if (last === today) streakDays = Math.max(1, days);
  else if (last === addDays(today, -1)) streakDays = days + 1;
  else if (last === addDays(today, -2) && freezes > 0 && days > 0) { streakDays = days + 1; usedFreeze = true; }
  else streakDays = 1;
  const longestStreak = Math.max(num(u.longestStreak), streakDays);
  return { streakDays, longestStreak, usedFreeze };
}
export function todayWords(u = {}, today = dateKey()) {
  const d = u.todayDate || u.lastStudyDate;
  return d === today ? (Number(u.todayWordsLearned) || 0) : 0;
}
export function dailyGoal(u = {}) {
  const g = Number(u.settings && u.settings.dailyGoal);
  return g >= 5 && g <= 200 ? g : DEFAULT_DAILY_GOAL;
}
export function weeklyStars(u = {}, wk = weekKey()) {
  return u.weekKey === wk ? (Number(u.weeklyStars) || 0) : 0;
}

/* ── Mukofot ────────────────────────────────────────────
   Yulduz (XP) — har bir so'zni birinchi marta xatosiz o'zlashtirganda bittadan.
   Tanga — yangi o'zlashtirilgan so'zlar + har 5 ta xatosiz so'z uchun bonus. */
export function computeRewards({ newlyMastered = 0, perfect = 0 }) {
  const stars = Math.min(MAX_SESSION_STARS, newlyMastered);
  const coins = Math.min(MAX_SESSION_STARS * 2, stars + Math.floor(perfect / 5));
  return { stars, coins };
}

/* ── Takrorlash (Leitner, SRS) ──────────────────────── */
export const SRS_DAYS = [0, 1, 2, 4, 7, 15, 30, 60];
export function nextBox(box = 0, correct = true) {
  return correct ? Math.min(SRS_DAYS.length - 1, (Number(box) || 0) + 1) : 1;
}
export function dueDate(box, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + SRS_DAYS[Math.max(0, Math.min(SRS_DAYS.length - 1, box))]);
  d.setHours(4, 0, 0, 0);
  return d;
}

/* ── Manba kalitlari ───────────────────────────────── */
/* src = { kind: 'book' | 'folder', containerId, topicId|null } */
export function sourceKey(src) {
  return `${src.kind}_${src.containerId}_${src.topicId || '_'}`;
}
export function wordStatKey(src, wordId) {
  return `${sourceKey(src)}_${wordId}`;
}
export function sourceFromParams(p) {
  const book = p.get('book');
  const id = p.get('id');
  const topic = p.get('topic') || null;
  if (book && topic) return { kind: 'book', containerId: book, topicId: topic };
  if (id) return { kind: 'folder', containerId: id, topicId: topic };
  return null;
}
export function sourceQuery(src) {
  const q = src.kind === 'book' ? `book=${encodeURIComponent(src.containerId)}` : `id=${encodeURIComponent(src.containerId)}`;
  return src.topicId ? `${q}&topic=${encodeURIComponent(src.topicId)}` : q;
}
export function sourceHome(src) {
  return src.kind === 'book' ? `book.html?id=${encodeURIComponent(src.containerId)}` : `folder.html?id=${encodeURIComponent(src.containerId)}`;
}

/* ── Yutuqlar ───────────────────────────────────────── */
export const ACH_TYPES = {
  words: { label: "O'zlashtirilgan so'zlar", field: 'wordsMastered' },
  stars: { label: 'Yulduzlar (XP)', field: 'stars' },
  coins: { label: 'Tangalar', field: 'coins' },
  streak: { label: 'Eng uzun streak', field: 'longestStreak' },
  sessions: { label: "Mashg'ulotlar soni", field: 'sessionsCount' }
};
export function achievementValue(a, u = {}) {
  const t = ACH_TYPES[a.type];
  if (!t) return 0;
  if (a.type === 'streak') return Math.max(Number(u.longestStreak) || 0, Number(u.streakDays) || 0);
  return Number(u[t.field]) || 0;
}
export function achievementReady(a, u) {
  return !!ACH_TYPES[a.type] && achievementValue(a, u) >= (Number(a.threshold) || 0);
}

/* So'zni solishtirish uchun normallashtirish */
export function normalizeAnswer(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/g, '');
}
