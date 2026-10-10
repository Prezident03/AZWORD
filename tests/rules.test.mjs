/* Firestore qoidalari testlari.
   Ishga tushirish:  cd tests && npm install && npm run test:rules */
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, writeBatch,
  serverTimestamp, Timestamp, getDocs, query, where
} from 'firebase/firestore';

const OWNER = 'abdurasul1406z@gmail.com';
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-azword',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), {
      uid: 'alice', email: 'alice@x.com', displayName: 'Alice', stars: 100, coins: 120, weeklyStars: 10, weekKey: '2026-W41',
      streakDays: 3, longestStreak: 5, lastStudyDate: '2026-10-08', wordsMastered: 100, sessionsCount: 4,
      ownedItems: ['badge1'], achievements: [], aiGeneratorUses: 2
    });
    await setDoc(doc(db, 'users/bob'), { uid: 'bob', email: 'bob@x.com', displayName: 'Bob', stars: 5, coins: 5 });
    await setDoc(doc(db, 'shop/badge1'), { name: 'Badge 1', price: 50, category: 'badge' });
    await setDoc(doc(db, 'shop/badge2'), { name: 'Badge 2', price: 80, category: 'badge' });
    await setDoc(doc(db, 'achievements/a100'), { name: '100 XP', type: 'stars', threshold: 100, starReward: 10, coinReward: 20 });
    await setDoc(doc(db, 'achievements/a999'), { name: '999 XP', type: 'stars', threshold: 999, starReward: 10, coinReward: 20 });
    await setDoc(doc(db, 'folders/pub'), { name: 'Public', isAdmin: true, uid: 'admin' });
    await setDoc(doc(db, 'folders/pub/words/w1'), { en: 'apple', uz: 'olma' });
    await setDoc(doc(db, 'folders/alicef'), { name: 'Mine', isAdmin: false, uid: 'alice', wordCount: 0 });
    await setDoc(doc(db, 'books/b1'), { title: 'Book' });
    await setDoc(doc(db, 'settings/main'), { admins: ['helper@x.com'] });
  });
});

const alice = () => env.authenticatedContext('alice', { email: 'alice@x.com', email_verified: true }).firestore();
const bob = () => env.authenticatedContext('bob', { email: 'bob@x.com' }).firestore();
const owner = () => env.authenticatedContext('own', { email: OWNER }).firestore();
const helperVerified = () => env.authenticatedContext('hlp', { email: 'helper@x.com', email_verified: true }).firestore();
const helperUnverified = () => env.authenticatedContext('hlp2', { email: 'helper@x.com', email_verified: false }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

/* ── users ── */
test('foydalanuvchi faqat o\'z hujjatini o\'qiydi', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
  await assertFails(getDoc(doc(alice(), 'users/bob')));
  await assertSucceeds(getDoc(doc(owner(), 'users/bob')));
});

test('profil maydonlarini o\'zgartirish mumkin', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { displayName: 'Alisa', settings: { dailyGoal: 30 }, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { displayName: 'x'.repeat(41) }));
});

test('tangani o\'zboshimchalik bilan oshirib bo\'lmaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { coins: 99999 }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { stars: 99999, wordsMastered: 99999 + 100, lastRewardAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { aiGeneratorUses: 100 }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { blocked: false, coins: 1000 }));
});

const session = (extra = {}) => ({
  stars: 110, coins: 132, wordsMastered: 110, weeklyStars: 20, weekKey: '2026-W41',
  streakDays: 4, longestStreak: 5, lastStudyDate: '2026-10-09', todayDate: '2026-10-09', todayWordsLearned: 10,
  totalWordsLearned: 10, totalPerfectWords: 10, studyTimeMinutes: 5, sessionsCount: 5,
  lastRewardAt: serverTimestamp(), ...extra
});

test('to\'g\'ri mashg\'ulot yakuni qabul qilinadi', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), session()));
});
test('mashg\'ulot: chegaradan oshgan yulduz rad etiladi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), session({ stars: 300, wordsMastered: 300, weeklyStars: 210 })));
});
test('mashg\'ulot: yulduz va o\'zlashtirilgan so\'z mos bo\'lishi kerak', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), session({ wordsMastered: 100 })));
});
test('mashg\'ulot: streak 1 dan ortiq sakramaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), session({ streakDays: 10, longestStreak: 10 })));
});
test('mashg\'ulot: cooldown ichida qayta mukofot rad etiladi', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), session()));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), session({ stars: 115, coins: 137, wordsMastered: 115, weeklyStars: 25, sessionsCount: 6 })));
});
test('mashg\'ulot: mukofotsiz yakun cooldown\'ga bog\'liq emas', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), session()));
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), {
    totalWordsLearned: 20, totalPerfectWords: 15, sessionsCount: 6, todayWordsLearned: 20
  }));
});
test('mashg\'ulot: yangi hafta haftalik yulduzni qayta boshlaydi', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), session({ weekKey: '2026-W42', weeklyStars: 10 })));
  await env.clearFirestore();
});

/* ── xarid ── */
test('do\'kondan to\'g\'ri narxda xarid', async () => {
  const db = alice();
  await assertSucceeds(updateDoc(doc(db, 'users/alice'), { coins: 40, ownedItems: ['badge1', 'badge2'], lastPurchase: 'badge2' }));
});
test('xarid: noto\'g\'ri narx rad etiladi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { coins: 119, ownedItems: ['badge1', 'badge2'], lastPurchase: 'badge2' }));
});
test('xarid: mavjud mahsulotni qayta olib bo\'lmaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { coins: 70, ownedItems: ['badge1', 'badge1'], lastPurchase: 'badge1' }));
});
test('xarid: AI generator — 100 tanga, +20 marta', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { coins: 20, aiGeneratorUses: 22, lastPurchase: 'ai-generator-premium' }));
});
test('xarid: AI generator — ko\'proq marta olib bo\'lmaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { coins: 20, aiGeneratorUses: 200, lastPurchase: 'ai-generator-premium' }));
});
test('xarid: tanga yetmasa rad etiladi', async () => {
  await assertFails(updateDoc(doc(bob(), 'users/bob'), { coins: -45, ownedItems: ['badge1'], lastPurchase: 'badge1' }));
});
test('xarid: streak muzlatish', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { coins: 70, streakFreezes: 1, lastPurchase: 'streak-freeze' }));
});

/* ── taqish ── */
test('faqat sotib olingan mahsulotni taqish mumkin', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { equippedItems: { badge: 'badge1' } }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { equippedItems: { badge: 'badge2' } }));
});

/* ── yutuqlar ── */
test('bajarilgan yutuqni olish', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { achievements: ['a100'], lastAchievement: 'a100', stars: 110, coins: 140 }));
});
test('bajarilmagan yutuqni olib bo\'lmaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { achievements: ['a999'], lastAchievement: 'a999', stars: 110, coins: 140 }));
});
test('yutuq mukofotini oshirib bo\'lmaydi', async () => {
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { achievements: ['a100'], lastAchievement: 'a100', stars: 500, coins: 140 }));
});

/* ── AI ishlatish ── */
test('AI urinishini faqat bittaga kamaytirish mumkin', async () => {
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { aiGeneratorUses: 1 }));
  await assertFails(updateDoc(doc(alice(), 'users/alice'), { aiGeneratorUses: 5 }));
});

/* ── create / blocked ── */
test('yangi foydalanuvchi faqat nol balans bilan yaratiladi', async () => {
  const db = env.authenticatedContext('carol', { email: 'c@x.com' }).firestore();
  await assertFails(setDoc(doc(db, 'users/carol'), { uid: 'carol', email: 'c@x.com', displayName: 'C', stars: 1000, coins: 0 }));
  await assertSucceeds(setDoc(doc(db, 'users/carol'), { uid: 'carol', email: 'c@x.com', displayName: 'C', photoBase64: '', stars: 0, coins: 0, weeklyStars: 0, blocked: false, createdAt: serverTimestamp(), lastSeen: serverTimestamp() }));
});
test('bloklangan foydalanuvchi o\'z hujjatini o\'zgartira olmaydi', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => { await updateDoc(doc(ctx.firestore(), 'users/bob'), { blocked: true }); });
  await assertFails(updateDoc(doc(bob(), 'users/bob'), { displayName: 'B2' }));
  await assertFails(updateDoc(doc(bob(), 'users/bob'), { blocked: false }));
});

/* ── adminlar ── */
test('admin: egasi va tasdiqlangan qo\'shimcha admin', async () => {
  await assertSucceeds(updateDoc(doc(owner(), 'users/bob'), { coins: 500 }));
  await assertSucceeds(setDoc(doc(helperVerified(), 'shop/x'), { name: 'X', price: 5 }));
  await assertFails(setDoc(doc(helperUnverified(), 'shop/y'), { name: 'Y', price: 5 }));
  await assertFails(setDoc(doc(alice(), 'shop/z'), { name: 'Z', price: 5 }));
});

/* ── leaderboard ── */
test('reyting hujjati users bilan mos bo\'lishi kerak', async () => {
  const db = alice();
  await assertSucceeds(setDoc(doc(db, 'leaderboard/alice'), { displayName: 'Alice', photoThumb: '', stars: 100, weeklyStars: 10, weekKey: '2026-W41', equipped: {}, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db, 'leaderboard/alice'), { displayName: 'Alice', photoThumb: '', stars: 9999, weeklyStars: 10, weekKey: '2026-W41', equipped: {} }));
  await assertFails(setDoc(doc(db, 'leaderboard/bob'), { displayName: 'Bob', stars: 5, weeklyStars: 0, weekKey: '' }));
  await assertSucceeds(getDocs(collection(bob(), 'leaderboard')));
  await assertFails(getDocs(collection(anon(), 'leaderboard')));
});
test('reyting + mashg\'ulot bitta partiyada', async () => {
  const db = alice();
  const b = writeBatch(db);
  b.update(doc(db, 'users/alice'), session());
  b.set(doc(db, 'leaderboard/alice'), { displayName: 'Alice', photoThumb: '', stars: 110, weeklyStars: 20, weekKey: '2026-W41', equipped: {}, updatedAt: serverTimestamp() });
  b.set(doc(db, 'users/alice/wordStats/k1'), { en: 'a', box: 1 });
  b.set(doc(db, 'users/alice/progress/p1'), { total: 1 });
  b.set(doc(collection(db, 'users/alice/studyLog')), { totalWords: 1, dateKey: '2026-10-09' });
  await assertSucceeds(b.commit());
});

/* ── folders ── */
test('oddiy foydalanuvchi umumiy bo\'lim yarata olmaydi', async () => {
  await assertFails(addDoc(collection(alice(), 'folders'), { name: 'Hack', uid: 'alice', isAdmin: true }));
  await assertSucceeds(addDoc(collection(alice(), 'folders'), { name: 'Mine2', uid: 'alice', isAdmin: false, wordCount: 0 }));
  await assertFails(addDoc(collection(alice(), 'folders'), { name: 'Other', uid: 'bob', isAdmin: false }));
});
test('umumiy bo\'limni hamma o\'qiydi, faqat admin yozadi', async () => {
  await assertSucceeds(getDocs(query(collection(bob(), 'folders'), where('isAdmin', '==', true))));
  await assertSucceeds(getDoc(doc(bob(), 'folders/pub/words/w1')));
  await assertFails(setDoc(doc(bob(), 'folders/pub/words/w2'), { en: 'x', uz: 'y' }));
  await assertFails(updateDoc(doc(bob(), 'folders/pub'), { name: 'hacked' }));
  await assertSucceeds(setDoc(doc(owner(), 'folders/pub/words/w2'), { en: 'x', uz: 'y' }));
});
test('shaxsiy bo\'lim faqat egasiga ochiq', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'folders/alicef')));
  await assertFails(getDoc(doc(bob(), 'folders/alicef')));
  await assertSucceeds(setDoc(doc(alice(), 'folders/alicef/words/w1'), { en: 'cat', uz: 'mushuk', example: '', createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(bob(), 'folders/alicef/words/w2'), { en: 'cat', uz: 'mushuk' }));
  await assertFails(setDoc(doc(alice(), 'folders/alicef/words/w3'), { en: '', uz: 'mushuk' }));
  await assertFails(updateDoc(doc(alice(), 'folders/alicef'), { isAdmin: true }));
  await assertSucceeds(getDocs(query(collection(alice(), 'folders'), where('uid', '==', 'alice'), where('isAdmin', '==', false))));
});

/* ── kontent ── */
test('kitoblar: o\'qish hammaga, yozish adminга', async () => {
  await assertSucceeds(getDoc(doc(bob(), 'books/b1')));
  await assertFails(updateDoc(doc(bob(), 'books/b1'), { title: 'x' }));
  await assertFails(getDoc(doc(anon(), 'books/b1')));
});
test('settings: hammaga o\'qish, adminga yozish', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'settings/main')));
  await assertFails(setDoc(doc(alice(), 'settings/main'), { maintenance: true }));
  await assertSucceeds(setDoc(doc(owner(), 'settings/main'), { maintenance: false }, { merge: true }));
});
test('studyLog: faqat qo\'shish, o\'zgartirish yo\'q', async () => {
  const ref = await assertSucceeds(addDoc(collection(alice(), 'users/alice/studyLog'), { totalWords: 1 }));
  await assertFails(updateDoc(doc(alice(), 'users/alice/studyLog', ref.id), { totalWords: 1000 }));
  await assertFails(addDoc(collection(bob(), 'users/alice/studyLog'), { totalWords: 1 }));
});

/* ── Eski versiyadan qolgan ma'lumotlar ── */
test('eski so\'zni (qo\'shimcha maydonlar bilan) tahrirlash mumkin', async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'folders/alicef/words/old'), { en: 'cat', uz: 'mushuk', rewarded: true, mistakeCount: 3 });
  });
  await assertSucceeds(updateDoc(doc(alice(), 'folders/alicef/words/old'), { uz: 'mushukcha', example: 'A cat.' }));
  await assertFails(updateDoc(doc(alice(), 'folders/alicef/words/old'), { hacked: true }));
});
test('uzun ismli eski foydalanuvchi natijani saqlay oladi', async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await updateDoc(doc(c.firestore(), 'users/alice'), { displayName: 'x'.repeat(60) });
  });
  await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), session()));
});
test('eski bo\'lim (isAdmin maydonisiz) hisoblagichini yangilash', async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'folders/oldf'), { name: 'Old', uid: 'alice', wordCount: 1 });
  });
  await assertSucceeds(updateDoc(doc(alice(), 'folders/oldf'), { wordCount: 2 }));
});
