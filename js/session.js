/* AzWord · mashg'ulot uchun so'zlarni tayyorlash va natijani saqlash (study, flashcards, kviz, takrorlash) */
import { db, doc, getDoc } from './firebase.js';
import { listWords, describeSource, completeSession, dueWords } from './data.js';
import { wordStatKey, dateKey, weekKey } from './game.js';
import { getLast } from './widgets.js';

/* URL'dan manba, bo'lmasa oxirgi o'qilgan mavzu */
export function resolveSource(p, sourceFromParams) {
  const s = sourceFromParams(p);
  if (s) return s;
  const last = getLast();
  return last ? { kind: last.kind, containerId: last.containerId, topicId: last.topicId || null } : null;
}

/* So'zlarni yuklaydi va har biri uchun foydalanuvchi statistikasini qo'shadi.
   Tartib: hali o'zlashtirilmaganlar → takrorlash vaqti kelganlar → qolganlari. */
export async function loadSession(uid, src, { size = 12, withStats = true } = {}) {
  const [info, words] = await Promise.all([describeSource(src), listWords(src)]);
  let list = words.filter(w => w.en && w.uz);
  if (withStats && list.length) {
    const stats = await Promise.all(list.slice(0, 200).map(w =>
      getDoc(doc(db, 'users', uid, 'wordStats', wordStatKey(src, w.id))).then(s => (s.exists() ? s.data() : null)).catch(() => null)));
    list = list.map((w, i) => ({ ...w, stat: stats[i] || null }));
  }
  const all = list;
  if (size && list.length > size) {
    const now = Date.now();
    const rank = (w) => {
      if (!w.stat) return 0;
      if (!w.stat.mastered) return 1;
      const due = w.stat.due && w.stat.due.toMillis ? w.stat.due.toMillis() : 0;
      return due <= now ? 2 : 3;
    };
    list = list.map((w, i) => ({ w, i, r: rank(w) })).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, size).sort((a, b) => a.i - b.i).map(x => x.w);
  }
  return {
    src: { ...src, title: info.title },
    title: info.title,
    subtitle: info.subtitle,
    container: info.container,
    words: list,
    all
  };
}

/* Takrorlash vaqti kelgan so'zlar (turli manbalardan) */
export async function loadReview(uid, n = 20) {
  const items = await dueWords(uid, n);
  return items.map(s => ({
    id: s.wordId, key: s.id, en: s.en, uz: s.uz, example: s.example || '', stat: s,
    src: { kind: s.srcKind, containerId: s.srcId, topicId: s.srcTopic || null, title: s.srcTitle || '' }
  }));
}

export function finishPayload({ src, words, results, startedAt, mode }) {
  return {
    src,
    words: words.map(w => ({ id: w.id, en: w.en, uz: w.uz, example: w.example || '' })),
    results,
    minutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
    mode,
    dateKey: dateKey(),
    weekKey: weekKey()
  };
}

/* Bir nechta manbadan iborat so'zlarni (takrorlash) manba bo'yicha guruhlab saqlaydi */
export async function saveGrouped(uid, words, results, startedAt, mode) {
  const groups = new Map();
  for (const w of words) {
    const key = `${w.src.kind}|${w.src.containerId}|${w.src.topicId || ''}`;
    if (!groups.has(key)) groups.set(key, { src: w.src, words: [] });
    groups.get(key).words.push(w);
  }
  const out = [];
  let first = true;
  for (const g of groups.values()) {
    const groupResults = {};
    g.words.forEach(w => { groupResults[w.id] = results[w.key || w.id] || { mistakes: [] }; });
    const res = await completeSession(uid, finishPayload({ src: g.src, words: g.words, results: groupResults, startedAt: first ? startedAt : Date.now(), mode }));
    first = false;
    out.push(res);
  }
  return out;
}

/* Natijalar sahifasiga uzatish */
export function storeResult(data) {
  try { sessionStorage.setItem('az:result', JSON.stringify(data)); } catch (e) { /* ignore */ }
}
export function readResult() {
  try { return JSON.parse(sessionStorage.getItem('az:result') || 'null'); } catch (e) { return null; }
}
