/* AzWord · Firestore ma'lumotlar qatlami.
   Sahifalar Firestore yo'llarini bilishi shart emas — hammasi shu yerda. */
import {
  db, collection, doc, getDoc, getDocs, getDocFromServer, setDoc, updateDoc, addDoc,
  query, where, orderBy, limit, serverTimestamp, increment, writeBatch, runTransaction, Timestamp
} from './firebase.js';
import {
  dateKey, weekKey, nextStreak, computeRewards, nextBox, dueDate, sourceKey, wordStatKey,
  REWARD_COOLDOWN_SEC, MAX_SESSION_STARS, AI_GEN_ITEM, STREAK_FREEZE_ITEM, achievementReady
} from './game.js';

export const OWNER_EMAIL = 'abdurasul1406z@gmail.com';

/* ── Umumiy ────────────────────────────────────────────── */
const snapList = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''));
function tsMillis(ts) { return ts && ts.toMillis ? ts.toMillis() : ts instanceof Date ? ts.getTime() : 0; }

/* Firestore'da partiyalab (450 tadan) yozish/o'chirish */
export async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach(op => op(batch));
    await batch.commit();
  }
}

/* ── Sozlamalar va adminlik ────────────────────────────── */
export async function getSettings() {
  try {
    const s = await getDoc(doc(db, 'settings', 'main'));
    return s.exists() ? s.data() : {};
  } catch (e) { return {}; }
}
export function isAdminUser(user, settings = {}) {
  if (!user || !user.email) return false;
  if (user.email === OWNER_EMAIL) return true;
  return !!user.emailVerified && Array.isArray(settings.admins) && settings.admins.includes(user.email);
}

/* ── Foydalanuvchi hujjati ─────────────────────────────── */
export const userRef = (uid) => doc(db, 'users', uid);

export async function loadUserDoc(user) {
  const ref = userRef(user.uid);
  let snap;
  try { snap = await getDoc(ref); } catch (e) { snap = null; }
  if (snap && snap.exists()) return snap.data();
  if (snap && !snap.exists()) {
    const data = {
      uid: user.uid,
      email: user.email || '',
      displayName: (user.displayName || (user.email || '').split('@')[0] || 'Foydalanuvchi').slice(0, 40),
      photoBase64: '',
      stars: 0, coins: 0, weeklyStars: 0,
      blocked: false,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };
    await setDoc(ref, data);
    return { ...data, createdAt: null, lastSeen: null };
  }
  return null;
}

/* Profil maydonlarini yangilash (ism, rasm, sozlamalar) */
export async function updateProfileDoc(uid, patch) {
  const allowed = ['displayName', 'photoBase64', 'photoThumb', 'settings', 'lastSeen'];
  const data = {};
  for (const k of allowed) if (k in patch) data[k] = patch[k];
  data.updatedAt = serverTimestamp();
  await updateDoc(userRef(uid), data);
}

export async function touchLastSeen(uid) {
  const k = 'az:seen:' + uid;
  try {
    const last = Number(localStorage.getItem(k) || 0);
    if (Date.now() - last < 3600e3) return;
    localStorage.setItem(k, String(Date.now()));
  } catch (e) { /* ignore */ }
  try { await updateDoc(userRef(uid), { lastSeen: serverTimestamp() }); } catch (e) { /* offline */ }
}

/* Reyting hujjati — users hujjatidagi qiymatlar bilan bir xil bo'lishi shart (rules tekshiradi) */
export function leaderboardData(u) {
  const data = {
    displayName: String(u.displayName || (u.email || '').split('@')[0] || 'Foydalanuvchi').slice(0, 40),
    photoThumb: typeof u.photoThumb === 'string' && u.photoThumb.length < 12000 ? u.photoThumb : '',
    stars: Number(u.stars) || 0,
    weeklyStars: Number(u.weeklyStars) || 0,
    weekKey: u.weekKey || '',
    equipped: u.equippedItems && typeof u.equippedItems === 'object' ? u.equippedItems : {},
    updatedAt: serverTimestamp()
  };
  return data;
}
export async function syncLeaderboard(uid, u) {
  try {
    const ref = doc(db, 'leaderboard', uid);
    const cur = await getDoc(ref);
    const want = leaderboardData(u);
    if (cur.exists()) {
      const c = cur.data();
      const same = c.displayName === want.displayName && c.photoThumb === want.photoThumb && c.stars === want.stars
        && c.weeklyStars === want.weeklyStars && c.weekKey === want.weekKey
        && JSON.stringify(c.equipped || {}) === JSON.stringify(want.equipped);
      if (same) return;
    }
    await setDoc(ref, want);
  } catch (e) { console.warn('leaderboard sync:', e.code || e.message); }
}

/* ── Kitoblar va bo'limlar ─────────────────────────────── */
export async function listBooks() {
  const snap = await getDocs(collection(db, 'books'));
  return snapList(snap).sort(byOrder);
}
export async function getBook(id) {
  const s = await getDoc(doc(db, 'books', id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function listPublicFolders() {
  const snap = await getDocs(query(collection(db, 'folders'), where('isAdmin', '==', true)));
  return snapList(snap).sort(byOrder);
}
export async function listMyFolders(uid) {
  const snap = await getDocs(query(collection(db, 'folders'), where('uid', '==', uid), where('isAdmin', '==', false)));
  return snapList(snap).sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
}
export async function getFolder(id) {
  const s = await getDoc(doc(db, 'folders', id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function getContainer(kind, id) {
  return kind === 'book' ? getBook(id) : getFolder(id);
}
const containerCol = (kind) => (kind === 'book' ? 'books' : 'folders');

export async function listTopics(kind, id) {
  const snap = await getDocs(collection(db, containerCol(kind), id, 'topics'));
  return snapList(snap).sort(byOrder);
}
export async function getTopic(kind, id, topicId) {
  const s = await getDoc(doc(db, containerCol(kind), id, 'topics', topicId));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export function wordsCol(src) {
  return src.topicId
    ? collection(db, containerCol(src.kind), src.containerId, 'topics', src.topicId, 'words')
    : collection(db, containerCol(src.kind), src.containerId, 'words');
}
export async function listWords(src) {
  const snap = await getDocs(wordsCol(src));
  return snapList(snap).sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
}
/* Manba sarlavhasi: "Kitob · Mavzu" */
export async function describeSource(src) {
  const c = await getContainer(src.kind, src.containerId);
  let topic = null;
  if (src.topicId) topic = await getTopic(src.kind, src.containerId, src.topicId);
  const cName = c ? (c.title || c.name || '') : '';
  return { container: c, topic, title: topic ? (topic.title || 'Mavzu') : cName, subtitle: topic ? cName : '' };
}

/* Shaxsiy bo'lim amallari */
export async function createFolder(uid, name, iconName = 'folder') {
  const ref = await addDoc(collection(db, 'folders'), {
    name: name.slice(0, 60), emoji: iconName, uid, isAdmin: false,
    wordCount: 0, createdAt: serverTimestamp()
  });
  return ref.id;
}
export async function updateFolder(id, patch) {
  const data = {};
  if (patch.name !== undefined) data.name = String(patch.name).slice(0, 60);
  if (patch.emoji !== undefined) data.emoji = patch.emoji;
  await updateDoc(doc(db, 'folders', id), data);
}
/* Bo'limni ichidagi so'z va mavzular bilan birga o'chiradi */
export async function deleteContainerDeep(kind, id) {
  const col = containerCol(kind);
  const ops = [];
  const words = await getDocs(collection(db, col, id, 'words'));
  words.forEach(w => ops.push(b => b.delete(w.ref)));
  const topics = await getDocs(collection(db, col, id, 'topics'));
  for (const t of topics.docs) {
    const tw = await getDocs(collection(db, col, id, 'topics', t.id, 'words'));
    tw.forEach(w => ops.push(b => b.delete(w.ref)));
    ops.push(b => b.delete(t.ref));
  }
  ops.push(b => b.delete(doc(db, col, id)));
  await commitInChunks(ops);
}
export async function deleteTopicDeep(kind, id, topicId) {
  const col = containerCol(kind);
  const tw = await getDocs(collection(db, col, id, 'topics', topicId, 'words'));
  const ops = tw.docs.map(w => (b) => b.delete(w.ref));
  ops.push(b => b.delete(doc(db, col, id, 'topics', topicId)));
  ops.push(b => b.update(doc(db, col, id), { topicCount: increment(-1), wordCount: increment(-tw.size) }));
  await commitInChunks(ops);
}

function cleanWord(w) {
  const out = {
    en: String(w.en || '').trim().slice(0, 120),
    uz: String(w.uz || '').trim().slice(0, 200),
    example: String(w.example || '').trim().slice(0, 400)
  };
  if (w.ipa) out.ipa = String(w.ipa).trim().slice(0, 80);
  if (w.pos) out.pos = String(w.pos).trim().slice(0, 30);
  return out;
}
/* So'zlarni qo'shish: so'z va bo'lim/mavzu hisoblagichi bitta partiyada yangilanadi */
export async function addWords(src, words) {
  const col = containerCol(src.kind);
  const list = words.map(cleanWord).filter(w => w.en && w.uz);
  if (!list.length) return 0;
  const base = Date.now();
  const ops = list.map((w, i) => (b) => b.set(doc(wordsCol(src)), { ...w, createdAt: Timestamp.fromMillis(base + i) }));
  await commitInChunks(ops);
  const counters = writeBatch(db);
  counters.update(doc(db, col, src.containerId), { wordCount: increment(list.length) });
  if (src.topicId) counters.update(doc(db, col, src.containerId, 'topics', src.topicId), { wordCount: increment(list.length) });
  await counters.commit();
  return list.length;
}
export async function updateWord(src, wordId, w) {
  await updateDoc(doc(wordsCol(src), wordId), cleanWord(w));
}
export async function deleteWord(src, wordId) {
  const col = containerCol(src.kind);
  const b = writeBatch(db);
  b.delete(doc(wordsCol(src), wordId));
  b.update(doc(db, col, src.containerId), { wordCount: increment(-1) });
  if (src.topicId) b.update(doc(db, col, src.containerId, 'topics', src.topicId), { wordCount: increment(-1) });
  await b.commit();
}
/* Foydalanuvchining barcha shaxsiy so'zlari (takrorlarni aniqlash uchun) */
export async function myWordSet(uid) {
  const folders = await listMyFolders(uid);
  const set = new Set();
  await Promise.all(folders.map(async f => {
    const snap = await getDocs(collection(db, 'folders', f.id, 'words'));
    snap.forEach(d => set.add(String(d.data().en || '').toLowerCase().trim()));
  }));
  return set;
}

/* ── Progress va statistika ───────────────────────────── */
export async function listProgress(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'progress'));
  const map = {};
  snap.forEach(d => { map[d.id] = d.data(); });
  return map;
}
export async function recentLogs(uid, n = 30) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'studyLog'), orderBy('studiedAt', 'desc'), limit(n)));
  return snapList(snap);
}
export async function logsSince(uid, fromKey) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'studyLog'), where('dateKey', '>=', fromKey)));
  return snapList(snap);
}
export async function dueWords(uid, n = 30) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'wordStats'), where('due', '<=', Timestamp.now()), orderBy('due', 'asc'), limit(n)));
  return snapList(snap);
}
export async function countDue(uid) {
  try {
    const snap = await getDocs(query(collection(db, 'users', uid, 'wordStats'), where('due', '<=', Timestamp.now()), limit(100)));
    return snap.size;
  } catch (e) { return 0; }
}
export async function hardWords(uid, n = 10) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'wordStats'), orderBy('mistakeCount', 'desc'), limit(n)));
  return snapList(snap).filter(w => (w.mistakeCount || 0) > 0);
}
export async function allWordStats(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'wordStats'));
  return snapList(snap);
}

/* ── Mashg'ulotni yakunlash ────────────────────────────
   payload = {
     src: { kind, containerId, topicId, title },
     words: [{ id, en, uz, example }],
     results: { [wordId]: { mistakes: [stage...] } },   // bo'sh massiv = xatosiz
     minutes, mode: 'study' | 'quiz' | 'flashcards' | 'review' | 'listening',
     dateKey, weekKey
   }
   Faqat 'study' rejimi so'zni "o'zlashtirilgan" deb belgilaydi va yulduz/tanga beradi.
   Boshqa rejimlar streak, kunlik maqsad va takrorlash jadvalini yangilaydi. */
const PENDING_KEY = 'az:pending-sessions';

export async function completeSession(uid, payload) {
  try {
    return await runSessionTx(uid, payload);
  } catch (e) {
    const offline = navigator.onLine === false || e.code === 'unavailable' || e.code === 'deadline-exceeded';
    if (offline) {
      queuePending(uid, payload);
      return { pending: true, stars: 0, coins: 0, newlyMastered: 0 };
    }
    throw e;
  }
}
function queuePending(uid, payload) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    list.push({ uid, payload });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-20)));
  } catch (e) { /* ignore */ }
}
export async function flushPending(uid) {
  let list;
  try { list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return; }
  if (!list.length || navigator.onLine === false) return;
  const rest = [];
  for (const item of list) {
    if (item.uid !== uid) { rest.push(item); continue; }
    try { await runSessionTx(uid, item.payload); } catch (e) { if (e.code === 'unavailable') rest.push(item); }
  }
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(rest)); } catch (e) { /* ignore */ }
}

async function runSessionTx(uid, payload) {
  const { src, words, results, mode = 'study' } = payload;
  const today = payload.dateKey || dateKey();
  const wk = payload.weekKey || weekKey();
  const minutes = Math.max(0, Math.min(240, Math.round(payload.minutes || 0)));
  const list = words.slice(0, 200);
  const uRef = userRef(uid);

  return runTransaction(db, async (tx) => {
    const uSnap = await tx.get(uRef);
    const u = uSnap.exists() ? uSnap.data() : {};
    const statRefs = list.map(w => doc(db, 'users', uid, 'wordStats', wordStatKey(src, w.id)));
    const statSnaps = [];
    for (const r of statRefs) statSnaps.push(await tx.get(r));

    const perfectIds = list.filter(w => results[w.id] && results[w.id].mistakes.length === 0).map(w => w.id);
    const perfect = perfectIds.length;

    /* Mukofot — faqat study rejimida va cooldown tugagan bo'lsa */
    const lastReward = u.lastRewardAt && u.lastRewardAt.toMillis ? u.lastRewardAt.toMillis() : 0;
    const cooldownOk = Date.now() - lastReward > (REWARD_COOLDOWN_SEC + 5) * 1000;
    let masterIds = [];
    if (mode === 'study' && cooldownOk) {
      masterIds = list.filter((w, i) => perfectIds.includes(w.id) && !(statSnaps[i].exists() && statSnaps[i].data().mastered))
        .map(w => w.id).slice(0, MAX_SESSION_STARS);
    }
    const rewards = computeRewards({ newlyMastered: masterIds.length, perfect: mode === 'study' && cooldownOk ? perfect : 0 });
    const gotReward = rewards.stars > 0 || rewards.coins > 0;

    const st = nextStreak(u, today);
    const sameDay = (u.todayDate || u.lastStudyDate) === today;
    const sameWeek = u.weekKey === wk;
    const upd = {
      streakDays: st.streakDays,
      longestStreak: st.longestStreak,
      lastStudyDate: today,
      todayDate: today,
      todayWordsLearned: (sameDay ? Number(u.todayWordsLearned) || 0 : 0) + list.length,
      totalWordsLearned: (Number(u.totalWordsLearned) || 0) + list.length,
      totalPerfectWords: (Number(u.totalPerfectWords) || 0) + perfect,
      studyTimeMinutes: (Number(u.studyTimeMinutes) || 0) + minutes,
      sessionsCount: (Number(u.sessionsCount) || 0) + 1,
      weekKey: wk,
      weeklyStars: (sameWeek ? Number(u.weeklyStars) || 0 : 0) + rewards.stars
    };
    if (st.usedFreeze) upd.streakFreezes = (Number(u.streakFreezes) || 0) - 1;
    if (gotReward) {
      upd.stars = (Number(u.stars) || 0) + rewards.stars;
      upd.coins = (Number(u.coins) || 0) + rewards.coins;
      upd.wordsMastered = (Number(u.wordsMastered) || 0) + rewards.stars;
      upd.lastRewardAt = serverTimestamp();
    }
    tx.update(uRef, upd);
    const after = { ...u, ...upd };
    tx.set(doc(db, 'leaderboard', uid), leaderboardData(after));

    /* So'z statistikasi (takrorlash jadvali) */
    const now = new Date();
    list.forEach((w, i) => {
      const prev = statSnaps[i].exists() ? statSnaps[i].data() : {};
      const ok = !!(results[w.id] && results[w.id].mistakes.length === 0);
      const box = nextBox(prev.box || 0, ok);
      const data = {
        en: String(w.en || '').slice(0, 120), uz: String(w.uz || '').slice(0, 200), example: String(w.example || '').slice(0, 400),
        wordId: w.id, srcKind: src.kind, srcId: src.containerId, srcTopic: src.topicId || null, srcTitle: String(src.title || '').slice(0, 80),
        box, due: Timestamp.fromDate(dueDate(box, now)),
        correct: (prev.correct || 0) + (ok ? 1 : 0),
        wrong: (prev.wrong || 0) + (ok ? 0 : 1),
        mistakeCount: (prev.mistakeCount || 0) + (results[w.id] ? results[w.id].mistakes.length : 0),
        mastered: !!prev.mastered || masterIds.includes(w.id),
        lastSeen: serverTimestamp()
      };
      tx.set(statRefs[i], data);
    });

    /* Mavzu/bo'lim progressi */
    const pct = list.length ? Math.round((perfect / list.length) * 100) : 0;
    const pRef = doc(db, 'users', uid, 'progress', sourceKey(src));
    if (mode === 'study') {
      const mastered = list.filter((w, i) => (statSnaps[i].exists() && statSnaps[i].data().mastered) || masterIds.includes(w.id)).length;
      tx.set(pRef, {
        kind: src.kind, containerId: src.containerId, topicId: src.topicId || null, title: String(src.title || '').slice(0, 80),
        total: list.length, lastPerfect: perfect, lastPct: pct, mastered,
        masteredPct: list.length ? Math.round((mastered / list.length) * 100) : 0,
        lastStudied: serverTimestamp(), sessions: increment(1)
      }, { merge: true });
    }

    /* Tarix */
    tx.set(doc(collection(db, 'users', uid, 'studyLog')), {
      mode, kind: src.kind, containerId: src.containerId, topicId: src.topicId || null, title: String(src.title || '').slice(0, 80),
      totalWords: list.length, correctWords: perfect, accuracy: pct,
      stars: rewards.stars, coins: rewards.coins, minutes,
      dateKey: today, studiedAt: serverTimestamp()
    });

    return {
      pending: false, stars: rewards.stars, coins: rewards.coins, newlyMastered: masterIds.length,
      perfect, total: list.length, pct, streak: st.streakDays, streakUp: u.lastStudyDate !== today,
      usedFreeze: st.usedFreeze, cooldown: mode === 'study' && !cooldownOk, user: after
    };
  });
}

/* ── Do'kon ─────────────────────────────────────────── */
export async function listShop() {
  const snap = await getDocs(collection(db, 'shop'));
  return snapList(snap).sort((a, b) => (a.price || 0) - (b.price || 0));
}
export async function listPurchases(uid, n = 15) {
  const snap = await getDocs(query(collection(db, 'users', uid, 'purchases'), orderBy('purchasedAt', 'desc'), limit(n)));
  return snapList(snap);
}
/* item: shop hujjati yoki maxsus mahsulot (AI generator, streak muzlatish) */
export async function purchase(uid, item) {
  const uRef = userRef(uid);
  return runTransaction(db, async (tx) => {
    const s = await tx.get(uRef);
    const u = s.data() || {};
    const price = Number(item.price) || 0;
    const coins = Number(u.coins) || 0;
    if (coins < price) throw Object.assign(new Error('Tanga yetarli emas'), { code: 'no-coins' });
    const owned = Array.isArray(u.ownedItems) ? u.ownedItems : [];
    const consumable = !!item.consumable;
    if (!consumable && owned.includes(item.id)) throw Object.assign(new Error('Bu mahsulot allaqachon sizda bor'), { code: 'owned' });
    const upd = { coins: coins - price, lastPurchase: item.id, updatedAt: serverTimestamp() };
    if (!consumable) upd.ownedItems = owned.concat([item.id]);
    if (item.aiUses) upd.aiGeneratorUses = (Number(u.aiGeneratorUses) || 0) + Number(item.aiUses);
    if (item.freezes) upd.streakFreezes = (Number(u.streakFreezes) || 0) + Number(item.freezes);
    tx.update(uRef, upd);
    tx.set(doc(collection(db, 'users', uid, 'purchases')), {
      itemId: item.id, itemName: String(item.name || '').slice(0, 80), icon: item.emoji || item.icon || 'gift',
      price, purchasedAt: serverTimestamp()
    });
    return { ...u, ...upd };
  });
}
export const SPECIAL_ITEMS = {
  [AI_GEN_ITEM.id]: { id: AI_GEN_ITEM.id, name: 'AI Word Generator (20 marta)', price: AI_GEN_ITEM.price, aiUses: AI_GEN_ITEM.uses, consumable: true, emoji: 'bot' },
  [STREAK_FREEZE_ITEM.id]: { id: STREAK_FREEZE_ITEM.id, name: 'Streak muzlatish', price: STREAK_FREEZE_ITEM.price, freezes: STREAK_FREEZE_ITEM.freezes, consumable: true, emoji: 'snowflake' }
};
export async function equip(uid, category, itemId, u) {
  const equipped = { ...(u.equippedItems || {}) };
  if (itemId) equipped[category] = itemId; else delete equipped[category];
  const b = writeBatch(db);
  b.update(userRef(uid), { equippedItems: equipped, updatedAt: serverTimestamp() });
  b.set(doc(db, 'leaderboard', uid), leaderboardData({ ...u, equippedItems: equipped }));
  await b.commit();
  return equipped;
}

/* ── Yutuqlar ───────────────────────────────────────── */
export async function listAchievements() {
  const snap = await getDocs(collection(db, 'achievements'));
  return snapList(snap).sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
}
/* Bajarilgan, lekin hali olinmagan yutuqlarni birma-bir ochadi */
export async function claimAchievements(uid, achievements) {
  const unlocked = [];
  for (const a of achievements) {
    try {
      const res = await runTransaction(db, async (tx) => {
        const s = await tx.get(userRef(uid));
        const u = s.data() || {};
        const have = Array.isArray(u.achievements) ? u.achievements : [];
        if (have.includes(a.id) || !achievementReady(a, u)) return null;
        const upd = {
          achievements: have.concat([a.id]),
          lastAchievement: a.id,
          stars: (Number(u.stars) || 0) + (Number(a.starReward) || 0),
          coins: (Number(u.coins) || 0) + (Number(a.coinReward) || 0),
          updatedAt: serverTimestamp()
        };
        tx.update(userRef(uid), upd);
        tx.set(doc(db, 'leaderboard', uid), leaderboardData({ ...u, ...upd }));
        return { ...u, ...upd };
      });
      if (res) unlocked.push(a);
    } catch (e) { console.warn('claim achievement', a.id, e.code || e.message); }
  }
  return unlocked;
}

/* ── E'lonlar va reyting ─────────────────────────────── */
export async function listAnnouncements(n = 5) {
  const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(n)));
  return snapList(snap);
}
export async function weeklyLeaders(wk = weekKey()) {
  const snap = await getDocs(query(collection(db, 'leaderboard'), where('weekKey', '==', wk), limit(500)));
  return snapList(snap).filter(x => x.weeklyStars > 0).sort((a, b) => b.weeklyStars - a.weeklyStars);
}
export async function allTimeLeaders(n = 100) {
  const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy('stars', 'desc'), limit(n)));
  return snapList(snap).filter(x => x.stars > 0);
}

export { getDocFromServer };
