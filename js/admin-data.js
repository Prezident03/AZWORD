/* AzWord · admin uchun ma'lumot amallari */
import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, increment, writeBatch, getCountFromServer, Timestamp
} from './firebase.js';
import { leaderboardData } from './data.js';

const col = (kind) => (kind === 'book' ? 'books' : 'folders');

export async function counts() {
  const safe = (q) => getCountFromServer(q).then(s => s.data().count).catch(() => null);
  const dayAgo = Timestamp.fromMillis(Date.now() - 86400e3);
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 86400e3);
  const [users, active1, active7, books, publicFolders, personal] = await Promise.all([
    safe(collection(db, 'users')),
    safe(query(collection(db, 'users'), where('lastSeen', '>=', dayAgo))),
    safe(query(collection(db, 'users'), where('lastSeen', '>=', weekAgo))),
    safe(collection(db, 'books')),
    safe(query(collection(db, 'folders'), where('isAdmin', '==', true))),
    safe(query(collection(db, 'folders'), where('isAdmin', '==', false)))
  ]);
  return { users, active1, active7, books, publicFolders, personal };
}

export async function listUsers(n = 1000) {
  const snap = await getDocs(query(collection(db, 'users'), limit(n)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Foydalanuvchini tahrirlash — reyting hujjati ham sinxron yangilanadi */
export async function adminUpdateUser(uid, patch, current) {
  const b = writeBatch(db);
  b.update(doc(db, 'users', uid), patch);
  const merged = { ...current, ...patch };
  b.set(doc(db, 'leaderboard', uid), leaderboardData(merged));
  await b.commit();
  return merged;
}

/* Kitob yoki umumiy bo'lim */
export async function saveContainer(kind, id, data) {
  const clean = { ...data, updatedAt: serverTimestamp() };
  if (id) { await updateDoc(doc(db, col(kind), id), clean); return id; }
  const base = kind === 'book'
    ? { topicCount: 0, wordCount: 0 }
    : { uid: 'admin', isAdmin: true, topicCount: 0, wordCount: 0 };
  const ref = await addDoc(collection(db, col(kind)), { ...base, ...clean, createdAt: serverTimestamp() });
  return ref.id;
}
export async function saveTopic(kind, id, topicId, data) {
  if (topicId) { await updateDoc(doc(db, col(kind), id, 'topics', topicId), data); return topicId; }
  const b = writeBatch(db);
  const ref = doc(collection(db, col(kind), id, 'topics'));
  b.set(ref, { ...data, wordCount: 0, createdAt: serverTimestamp() });
  b.update(doc(db, col(kind), id), { topicCount: increment(1) });
  await b.commit();
  return ref.id;
}
/* So'z sonlarini haqiqiy holatga keltirish (hisoblagichlar adashgan bo'lsa) */
export async function recount(kind, id) {
  const topics = await getDocs(collection(db, col(kind), id, 'topics'));
  let total = 0;
  const b = writeBatch(db);
  for (const t of topics.docs) {
    const n = (await getCountFromServer(collection(db, col(kind), id, 'topics', t.id, 'words'))).data().count;
    total += n;
    b.update(t.ref, { wordCount: n });
  }
  const direct = (await getCountFromServer(collection(db, col(kind), id, 'words'))).data().count;
  b.update(doc(db, col(kind), id), { wordCount: total + direct, topicCount: topics.size });
  await b.commit();
  return { words: total + direct, topics: topics.size };
}

/* Oddiy kolleksiyalar: shop, achievements, announcements */
export async function listCol(name, order = null) {
  const snap = await getDocs(order ? query(collection(db, name), orderBy(order, 'desc'), limit(100)) : collection(db, name));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function saveDoc(name, id, data) {
  if (id) { await setDoc(doc(db, name, id), data, { merge: true }); return id; }
  const ref = await addDoc(collection(db, name), data);
  return ref.id;
}
export async function removeDoc(name, id) { await deleteDoc(doc(db, name, id)); }

export async function saveSettings(patch) {
  await setDoc(doc(db, 'settings', 'main'), patch, { merge: true });
}
export async function readSettings() {
  const s = await getDoc(doc(db, 'settings', 'main'));
  return s.exists() ? s.data() : {};
}
export { serverTimestamp, Timestamp };
