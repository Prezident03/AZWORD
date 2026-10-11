/* E2E oqimlari — e2e.mjs tomonidan FLOWS=study,... orqali chaqiriladi */
const DICT = {
  apple: 'olma', book: 'kitob', water: 'suv', friend: "do'st", house: 'uy', school: 'maktab',
  beautiful: 'chiroyli', quickly: 'tez', window: 'deraza', teacher: "o'qituvchi"
};
const UZ2EN = Object.fromEntries(Object.entries(DICT).map(([e, u]) => [u, e]));

/* 5 bosqichni to'liq, xatosiz o'ynaydi */
async function playStudy(page, { wrongOnce = false } = {}) {
  let madeMistake = false;
  for (let guard = 0; guard < 200; guard++) {
    if (/results\.html/.test(page.url())) return;
    await page.waitForTimeout(120);
    try { if (await stepOnce()) continue; } catch (e) {
      if (/context was destroyed|Target closed|navigation/i.test(e.message)) { await page.waitForURL(/results\.html/, { timeout: 15000 }); return; }
      throw e;
    }
  }
  throw new Error('study did not finish');

  async function stepOnce() {
    if (await page.$('#go')) { await page.click('#go'); return true; }
    const label = await page.$eval('#card', el => (el.querySelector('.q-label') || {}).textContent || '').catch(() => '');
    if (!label && await page.$('#next:not([disabled])')) { await page.click('#next'); return true; }
    if (/inglizchasini toping/.test(label)) {
      const uz = await page.$eval('.word-mid', e => e.textContent.trim());
      let target = UZ2EN[uz];
      if (wrongOnce && !madeMistake) { const other = await page.$$eval('#opts .option', bs => bs.map(b => b.dataset.v)); target = other.find(v => v !== UZ2EN[uz]); madeMistake = true; }
      await page.click(`#opts .option[data-v="${target}"]`);
      await page.click('#next');
      return true;
    }
    if (/bo'laklardan/.test(label)) {
      const uz = await page.$eval('.word-mid', e => e.textContent.trim());
      const en = UZ2EN[uz];
      let built = '';
      while (built.length < en.length) {
        const pieces = await page.$$eval('#pieces .piece:not([disabled])', bs => bs.map(b => ({ k: b.dataset.k, t: b.textContent })));
        const p = pieces.find(x => en.startsWith(built + x.t));
        if (!p) throw new Error('piece not found for ' + en);
        await page.click(`#pieces .piece[data-k="${p.k}"]`);
        built += p.t;
      }
      await page.waitForSelector('#next:not([disabled])');
      await page.click('#next');
      return true;
    }
    if (/juftliklarni/.test(label)) {
      const ens = await page.$$eval('#match [data-side="en"]', bs => bs.map(b => b.dataset.id));
      for (const id of ens) {
        await page.click(`#match [data-side="en"][data-id="${id}"]`);
        await page.click(`#match [data-side="uz"][data-id="${id}"]`);
      }
      await page.waitForSelector('#next:not([disabled])');
      await page.click('#next');
      return true;
    }
    if (/Inglizcha yozing/.test(label)) {
      const uz = await page.$eval('.word-mid', e => e.textContent.trim());
      await page.fill('#type', UZ2EN[uz]);
      await page.click('#check');
      await page.waitForTimeout(80);
      await page.click('#check');
      return true;
    }
    return false;
  }
}

export async function study({ page, base, settle, shot }) {
  await page.goto(base + 'book.html?id=b1');
  await settle(page);
  await page.click('[data-start="t1"]');
  await page.waitForURL(/study\.html/);
  await settle(page);
  await shot(page, 'study-1');
  await playStudy(page);
  await page.waitForURL(/results\.html/, { timeout: 15000 });
  await settle(page);
  await page.waitForTimeout(800);
  await shot(page, 'results');
  const txt = await page.textContent('#hero');
  if (!/6\/6/.test(txt)) throw new Error('score not 6/6: ' + txt);
  if (!/\+6/.test(txt)) throw new Error('no +6 XP reward: ' + txt.slice(0, 200));
  await page.goto(base + 'dashboard.html');
  await settle(page);
  const stars = await page.textContent('.stat-pill.stars');
  if (!/\d/.test(stars) || Number(stars.trim()) < 6) throw new Error('stars not updated: ' + stars);
  await shot(page, 'dashboard-after');
}

/* Ikkinchi marta: mukofot takrorlanmasligi (cooldown yoki allaqachon o'zlashtirilgan) */
export async function studyAgain({ page, base, settle, shot }) {
  await page.goto(base + 'study.html?book=b1&topic=t1');
  await settle(page);
  await playStudy(page, { wrongOnce: true });
  await page.waitForURL(/results\.html/, { timeout: 15000 });
  await settle(page);
  const txt = await page.textContent('#hero');
  if (/\+\d+\s*XP/.test(txt.replace(/\s+/g, ' '))) throw new Error('duplicate reward: ' + txt.slice(0, 200));
  await shot(page, 'results-again');
}

export async function mobile({ newPage, base, settle, shot }) {
  const { page, context } = await newPage({ width: 390, height: 844 });
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'student@test.uz');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await settle(page);
  await shot(page, 'm-dashboard');
  for (const p of (process.env.MPAGES || 'folders,book,study').split(',')) {
    await page.goto(base + p + '.html' + (p === 'book' ? '?id=b1' : p === 'study' ? '?book=b1&topic=t2' : p === 'folder' ? '?id=pub1' : ''));
    await settle(page);
    await shot(page, 'm-' + p);
  }
  await context.close();
}

/* Do'kon: tanga berib, xarid qilish va taqish; yutuqlar avtomatik ochilishi */
export async function shopAch({ page, base, settle, shot, env }) {
  const { doc, updateDoc, getDocs, collection, query, where } = await import('firebase/firestore');
  let uid;
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', 'student@test.uz')));
    uid = snap.docs[0].id;
    await updateDoc(doc(db, 'users', uid), { coins: 700 });
  });
  await page.goto(base + 'shop.html');
  await settle(page);
  await page.click('[data-buy="badge-gold"]');
  await page.click('#buy-ok');
  await page.waitForSelector('[data-equip="badge-gold"]', { timeout: 10000 });
  await page.click('[data-equip="badge-gold"]');
  await page.waitForTimeout(800);
  await page.click('[data-buy="theme-pink"]');
  await page.click('#buy-ok');
  await page.waitForSelector('[data-equip="theme-pink"]', { timeout: 10000 });
  await page.click('[data-equip="theme-pink"]');
  await page.waitForTimeout(800);
  await page.click('[data-special="ai-generator-premium"]');
  await page.click('#buy-ok');
  await page.waitForTimeout(1200);
  await shot(page, 'shop-after');
  let u;
  await env.withSecurityRulesDisabled(async (c) => {
    const { getDoc } = await import('firebase/firestore');
    u = (await getDoc(doc(c.firestore(), 'users', uid))).data();
  });
  if (u.coins !== 700 - 10 - 500 - 100) throw new Error('coins wrong: ' + u.coins);
  if ((u.aiGeneratorUses || 0) < 20) throw new Error('ai uses not added');
  if (!u.equippedItems || u.equippedItems.badge !== 'badge-gold') throw new Error('badge not equipped');
  await page.goto(base + 'achievements.html');
  await settle(page);
  await page.waitForTimeout(1500);
  await shot(page, 'achievements');
  await env.withSecurityRulesDisabled(async (c) => {
    const { getDoc } = await import('firebase/firestore');
    u = (await getDoc(doc(c.firestore(), 'users', uid))).data();
  });
  if (!(u.achievements || []).includes('first')) throw new Error('achievement not claimed');
  await page.goto(base + 'leaderboard.html');
  await settle(page);
  await shot(page, 'leaderboard');
  const lb = await page.textContent('#podium, #list');
  if (!/Test Talaba/.test(await page.content())) throw new Error('user not in leaderboard: ' + lb);
}

/* AI generator, so'z qo'shish va shaxsiy bo'lim */
export async function folderFlow({ page, base, settle, shot }) {
  await page.goto(base + 'folders.html?new=1');
  await settle(page);
  await page.fill('#fd-name', "Sayohat so'zlari");
  await page.click('#fd-save');
  await page.waitForURL(/folder\.html\?id=/);
  await settle(page);
  await page.click('#list [data-add], #add-word');
  await page.fill('#wf-en', 'luggage');
  await page.fill('#wf-uz', 'yuk');
  await page.click('#wf-more');
  await page.waitForTimeout(500);
  await page.fill('#wf-en', 'ticket');
  await page.fill('#wf-uz', 'chipta');
  await page.click('#wf-save');
  await page.waitForTimeout(1500);
  await page.click('#ai-gen');
  await page.waitForSelector('#ag-go');
  await page.click('#ag-go');
  await page.waitForSelector('#ag-result:not([hidden])');
  await page.click('#ag-go');
  await page.waitForTimeout(1500);
  await shot(page, 'folder-mine');
  const n = await page.$$eval('#list .list-row', r => r.length);
  if (n < 4) throw new Error('expected 4 words, got ' + n);
  await page.goto(base + 'upload.html?id=' + new URL(page.url()).searchParams.get('id'));
  await settle(page);
  await page.click('[data-m="text"]');
  await page.fill('#text', 'hotel - mehmonxona\nmap, xarita, I need a map.\nluggage - yuk');
  await page.click('#parse-text');
  await shot(page, 'upload');
  await page.click('#save');
  await page.waitForURL(/folder\.html/, { timeout: 10000 });
  await settle(page);
  const n2 = await page.$$eval('#list .list-row', r => r.length);
  if (n2 !== 6) throw new Error('expected 6 words after upload, got ' + n2);
}

/* Admin: kitob → mavzu → so'zlar, import, AI, foydalanuvchi balansi, do'kon, sozlamalar */
export async function adminFlow({ newPage, base, settle, shot }) {
  const { page, context } = await newPage();
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'abdurasul1406z@gmail.com');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await page.goto(base + 'admin.html');
  await settle(page);
  await shot(page, 'admin-overview');
  await page.waitForTimeout(800);
  if (await page.locator('text=qoidalari eskirgan').count()) throw new Error('admin: false outdated-rules banner');
  // Kitob yaratish
  await page.goto(base + 'admin.html#books');
  await page.waitForSelector('#c-new');
  await page.click('#c-new');
  await page.fill('#f-title', 'Test Kitob');
  await page.fill('#f-description', 'E2E kitob');
  await page.click('#fd-ok');
  await page.waitForSelector('#t-new');
  await page.click('#t-new');
  await page.fill('#f-title', 'Lesson 1');
  await page.click('#fd-ok');
  await page.waitForSelector('a.btn[href*="#books/"]');
  await page.click('a.btn[href*="#books/"]');
  await page.waitForSelector('#w-new');
  await page.click('#w-new');
  await page.fill('#f-en', 'river');
  await page.fill('#f-uz', 'daryo');
  await page.click('#fd-ok');
  await page.waitForTimeout(800);
  await page.click('#w-bulk');
  await page.fill('#bk-text', 'mountain - tog\nforest, o\'rmon, The forest is dark.\nriver - daryo');
  await page.click('#bk-parse');
  await page.click('#bk-save');
  await page.waitForTimeout(1000);
  await page.click('#w-ai');
  await page.click('#ai-go');
  await page.waitForSelector('#ai-save:not([disabled])');
  await page.click('#ai-save');
  await page.waitForTimeout(1200);
  const n = await page.$$eval('#w-list .list-row', r => r.length);
  await shot(page, 'admin-words');
  if (n !== 5) throw new Error('admin words expected 5, got ' + n);
  // Foydalanuvchi balansi
  await page.goto(base + 'admin.html#users');
  await page.waitForSelector('[data-u]');
  await shot(page, 'admin-users');
  // Do'kon mahsuloti
  await page.goto(base + 'admin.html#shop');
  await page.waitForSelector('#s-new');
  await page.click('#s-new');
  await page.fill('#f-name', 'Kumush nishon');
  await page.fill('#f-price', '25');
  await page.click('#fd-ok');
  await page.waitForTimeout(800);
  await page.goto(base + 'admin.html#ach');
  await page.waitForSelector('#a-new');
  await shot(page, 'admin-ach');
  await page.goto(base + 'admin.html#settings');
  await shot(page, 'admin-settings');
  await page.goto(base + 'admin.html#news');
  await page.waitForSelector('#n-send');
  await page.fill('#n-text', 'Admin test e\'loni');
  await page.click('#n-send');
  await page.waitForTimeout(800);
  await context.close();
}

/* Oddiy foydalanuvchi admin sahifasiga kira olmasligi */
export async function adminGuard({ page, base }) {
  await page.goto(base + 'admin.html');
  await page.waitForURL(/dashboard\.html/, { timeout: 15000 });
}

/* Yorug' mavzu va asosiy sahifalar */
export async function lightTheme({ page, base, settle, shot }) {
  await page.evaluate(() => localStorage.setItem('az:prefs', JSON.stringify({ theme: 'light' })));
  for (const p of ['dashboard', 'book', 'stats']) {
    await page.goto(base + p + '.html' + (p === 'book' ? '?id=b1' : ''));
    await settle(page);
    await shot(page, 'light-' + p);
  }
  await page.evaluate(() => localStorage.removeItem('az:prefs'));
}

/* Flashcard va kviz to'liq o'tish */
export async function practice({ page, base, settle, shot }) {
  await page.goto(base + 'flashcards.html?book=b1&topic=t2');
  await settle(page);
  await shot(page, 'flashcards');
  for (let i = 0; i < 4; i++) { await page.click('#actions [data-v="yes"]'); await page.waitForTimeout(300); }
  await page.waitForURL(/results\.html/, { timeout: 15000 });
  await page.goto(base + 'quick-quiz.html?book=b1&topic=t1');
  await settle(page);
  await shot(page, 'quiz');
  for (let i = 0; i < 6; i++) {
    await page.waitForSelector('#opts .option:not([disabled])', { timeout: 8000 });
    await page.click('#opts .option >> nth=0');
    await page.waitForTimeout(1800);
  }
  await page.waitForURL(/results\.html/, { timeout: 15000 });
  await settle(page);
  await shot(page, 'quiz-results');
  await page.goto(base + 'vocabulary.html');
  await settle(page);
  await shot(page, 'vocabulary');
  const rows = await page.$$eval('#list .list-row', r => r.length);
  if (rows < 10) throw new Error('vocabulary rows ' + rows);
}

/* Diktant: so'zni va gapni harfma-harf yozish (bitta xato, bitta yordam) */
const EXAMPLES = { beautiful: 'What a beautiful day!', quickly: 'She runs quickly.', window: 'Open the window.', teacher: 'Our teacher is kind.' };
export async function dictation({ newPage, base, settle, shot }) {
  for (const [vw, tag] of [[{ width: 1366, height: 860 }, ''], [{ width: 390, height: 844 }, '-mobile']]) {
    const { page, context } = await newPage(vw);
    await page.goto(base + 'index.html');
    await page.fill('#login-email', 'student@test.uz');
    await page.fill('#login-password', 'secret123');
    await page.click('#form-login button[type=submit]');
    await page.waitForURL(/dashboard\.html/);
    await page.goto(base + 'dictation.html?book=b1&topic=t2');
    await settle(page);
    let n = 0, wrongDone = false, revealDone = false;
    for (let guard = 0; guard < 30 && !/results\.html/.test(page.url()); guard++) {
      await Promise.race([page.waitForSelector('#ti', { timeout: 10000 }), page.waitForURL(/results\.html/, { timeout: 10000 })]);
      if (/results\.html/.test(page.url())) break;
      const sentence = await page.$eval('#slots', el => el.classList.contains('sm'));
      let en;
      if (sentence) en = await page.$eval('.dict-hint b', el => el.textContent.trim());
      else en = UZ2EN[await page.$eval('.word-trans', el => el.textContent.trim())];
      if (!en) throw new Error('unknown word');
      if (n === 0 && tag === '') await shot(page, 'dictation-word');
      if (!sentence) {
        if (!wrongDone) { await page.keyboard.type('z'); wrongDone = true; await page.waitForTimeout(450); }
        await page.keyboard.type(en, { delay: 15 });
      } else if (!revealDone && n >= 3) {
        await page.keyboard.type(EXAMPLES[en].slice(0, 4), { delay: 15 });
        if (tag === '') await shot(page, 'dictation-sentence');
        await page.click('#reveal');
        revealDone = true;
      } else {
        await page.keyboard.type(EXAMPLES[en], { delay: 10 });
      }
      await page.waitForSelector('#next', { timeout: 5000 });
      if (sentence) {
        await page.waitForSelector('.gloss-w', { timeout: 5000 });
        if (n === 1) await shot(page, 'dictation-gloss' + tag);
      }
      await page.keyboard.press('Enter');
      n++;
      await page.waitForTimeout(250);
    }
    await page.waitForURL(/results\.html/, { timeout: 15000 });
    await settle(page);
    await shot(page, 'dictation-results' + tag);
    const label = await page.$eval('.score-ring', el => el.textContent);
    if (!/2\/4/.test(label) || !/yordamsiz/.test(label)) throw new Error('dictation score ' + label);
    if (n !== 8) throw new Error('dictation steps ' + n);
    await context.close();
  }
}

/* Eski versiyadan qolgan ma'lumotlar bilan foydalanuvchi (haqiqiy saytdagidek) */
export async function legacy({ newPage, base, settle, shot, env, signUp }) {
  const { doc, setDoc, Timestamp } = await import('firebase/firestore');
  const others = [];
  for (const [email, stars, wk] of [['old1@test.uz', 900, '2026-W40'], ['old2@test.uz', 450, '2026-W41'], ['old3@test.uz', 120, '2026-W39']]) {
    const r = await signUp(email);
    others.push({ uid: r.localId, email, stars, wk });
  }
  const me = await signUp('legacy@test.uz');
  const uid = me.localId;
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const o of others) {
      await setDoc(doc(db, 'users', o.uid), { uid: o.uid, displayName: o.email.split('@')[0], email: o.email, photoURL: '', stars: o.stars, coins: 40, weeklyStars: 30, weekKey: o.wk, blocked: false, createdAt: Timestamp.now(), lastSeen: new Date() });
    }
    await setDoc(doc(db, 'users', uid), {
      uid, displayName: 'Eski Foydalanuvchi', email: 'legacy@test.uz', photoURL: '',
      stars: 340, coins: 260, weeklyStars: 50, weekKey: '2026-W40', streakDays: 5, lastStudyDate: '2026-10-05', longestStreak: 7,
      todayWordsLearned: 12, totalWordsLearned: 300, studyTimeMinutes: 120, totalPerfectWords: 200,
      ownedItems: ['ai-generator-premium', 'oldbadge'], equippedItems: { badge: 'oldbadge' }, achievements: ['oldach'],
      aiGeneratorUses: 3, blocked: false, createdAt: Timestamp.now(), lastSeen: new Date(), updatedAt: new Date()
    });
    await setDoc(doc(db, 'shop/oldbadge'), { name: 'Eski nishon', emoji: '??', category: 'badge', price: 30, description: '' });
    await setDoc(doc(db, 'shop/oldboost'), { name: 'Boost', emoji: '🚀', category: 'boost', price: 40 });
    await setDoc(doc(db, 'achievements/oldach'), { name: 'Top 3', type: 'rank', threshold: 3, starReward: 10, coinReward: 10, emoji: '🏆' });
    await setDoc(doc(db, 'folders/legacyf'), { name: 'Mening eski so\'zlarim', uid, isAdmin: false, wordCount: 3, progress: 0, lastScore: '2/3', createdAt: Timestamp.now(), emoji: '📚' });
    for (const [i, [en, uz]] of [['cat', 'mushuk'], ['dog', 'it'], ['bird', 'qush']].entries()) {
      await setDoc(doc(db, `folders/legacyf/words/w${i}`), { en, uz, example: '', createdAt: Timestamp.fromMillis(Date.now() + i), rewarded: true, mistakeCount: 2 });
    }
    await setDoc(doc(db, `users/${uid}/studyLog/old1`), { folderId: 'legacyf', totalWords: 3, correctWords: 2, accuracy: 67, studiedAt: Timestamp.now(), dateKey: '2026-10-05' });
    await setDoc(doc(db, `users/${uid}/purchases/old1`), { itemId: 'oldbadge', itemName: 'Eski nishon', itemEmoji: '??', price: 30, purchasedAt: Timestamp.now() });
    await setDoc(doc(db, 'announcements/old'), { text: 'Eski e\'lon', emoji: '🎉', createdAt: Timestamp.fromMillis(Date.now() - 86400e3) });
  });

  const { page, context } = await newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'legacy@test.uz');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await settle(page);
  await shot(page, 'legacy-dashboard');
  for (const p of ['leaderboard', 'shop', 'achievements', 'profile', 'stats', 'streak', 'vocabulary', 'folders', 'review', 'settings']) {
    await page.goto(base + p + '.html');
    await settle(page);
    await page.waitForTimeout(800);
    await shot(page, 'legacy-' + p);
  }
  await page.goto(base + 'leaderboard.html');
  await settle(page);
  await page.waitForTimeout(1000);
  const lb = await page.textContent('main');
  console.log('    reyting:', lb.replace(/\s+/g, ' ').slice(0, 260));
  await page.goto(base + 'study.html?id=legacyf');
  await settle(page);
  await shot(page, 'legacy-study');
  console.log('    ogohlantirishlar:', JSON.stringify(errs.filter(e => !/Failed to load resource/.test(e)).slice(0, 10)));
  await context.close();
}

/* Admin panel ochilganda reyting eski foydalanuvchilar bilan to'ldirilishi */
export async function legacyAdmin({ newPage, base, settle, shot, env }) {
  const { page, context } = await newPage();
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'abdurasul1406z@gmail.com');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await page.goto(base + 'admin.html');
  await settle(page);
  await page.waitForTimeout(3000);
  const { getDocs, collection, getDoc, doc } = await import('firebase/firestore');
  let n = 0, wm;
  await env.withSecurityRulesDisabled(async (c) => {
    const fdb = c.firestore();
    n = (await getDocs(collection(fdb, 'leaderboard'))).size;
    const users = await getDocs(collection(fdb, 'users'));
    wm = users.docs.map(d => d.data()).find(u => u.email === 'legacy@test.uz').wordsMastered;
  });
  await context.close();
  if (n < 5) throw new Error('leaderboard not backfilled: ' + n);
  if (wm !== 200) throw new Error('wordsMastered not migrated: ' + wm);
  // Eski foydalanuvchi: reyting va eski so'zni tahrirlash
  const s = await newPage();
  const p = s.page;
  await p.goto(base + 'index.html');
  await p.fill('#login-email', 'legacy@test.uz');
  await p.fill('#login-password', 'secret123');
  await p.click('#form-login button[type=submit]');
  await p.waitForURL(/dashboard\.html/);
  await p.goto(base + 'leaderboard.html');
  await settle(p);
  await p.click('#tabs [data-t="all"]');
  await p.waitForTimeout(1200);
  await shot(p, 'legacy-leaderboard-all');
  const txt = await p.textContent('main');
  if (!/old1/.test(txt) || !/Eski Foydalanuvchi/.test(txt)) throw new Error('all-time leaderboard missing users: ' + txt.replace(/\s+/g, ' ').slice(0, 200));
  await p.goto(base + 'folder.html?id=legacyf');
  await settle(p);
  await p.click('[data-edit="w0"]');
  await p.fill('#wf-uz', 'mushukcha');
  await p.click('#wf-save');
  await p.waitForTimeout(1200);
  const list = await p.textContent('#list');
  if (!/mushukcha/.test(list)) throw new Error('legacy word edit failed');
  await s.context.close();
}

/* Tabiiy ovoz: sozlamalarda ovoz tanlash va so'zlar AI ovoz orqali o'qilishi */
export async function voice({ newPage, base, settle, shot }) {
  const { page, context } = await newPage();
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'student@test.uz');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await page.goto(base + 'settings.html');
  await settle(page);
  const seen = [];
  page.on('request', r => { if (r.url().endsWith('/api/ai')) { try { const b = JSON.parse(r.postData() || '{}'); if (b.task === 'tts') seen.push(b); } catch (e) { /* ignore */ } } });
  await page.selectOption('#voice', 'hannah');
  await page.waitForTimeout(600);
  await shot(page, 'settings-voice');
  if (!seen.some(b => b.voice === 'hannah')) throw new Error('settings: no tts request with hannah ' + JSON.stringify(seen));
  /* Brauzer ovoziga o'tilsa — AI so'rovi bo'lmaydi va UK/US tanlovi chiqadi */
  await page.click('#engine [data-v="browser"]');
  if (await page.isHidden('#accent-row')) throw new Error('accent row hidden');
  const n = seen.length;
  await page.click('#test-voice');
  await page.waitForTimeout(400);
  if (seen.length !== n) throw new Error('browser engine still calls tts');
  await page.click('#engine [data-v="ai"]');
  /* Mashqda so'zlar oldindan yuklanadi va AI ovoz bilan o'qiladi */
  seen.length = 0;
  await page.goto(base + 'quick-quiz.html?book=b1&topic=t1&mode=listen');
  await settle(page);
  await page.waitForTimeout(800);
  if (seen.length < 3) throw new Error('listen: preload count ' + seen.length);
  const cached = await page.evaluate(async () => (await (await caches.open('az-tts-v1')).keys()).length);
  if (cached < 3) throw new Error('device cache ' + cached);
  await context.close();
}

/* Eski hisob: son maydonlari null/matn — mashg'ulot natijasi baribir saqlanadi */
export async function nullish({ newPage, base, settle, shot, env, signUp }) {
  const { doc, setDoc, getDoc } = await import('firebase/firestore');
  const me = await signUp('nullish@test.uz');
  const uid = me.localId;
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'users', uid), {
      uid, email: 'nullish@test.uz', displayName: 'Null Foydalanuvchi', stars: null, coins: '15', weeklyStars: null, weekKey: null,
      streakDays: null, longestStreak: '2', streakFreezes: null, totalWordsLearned: '30', ownedItems: null, equippedItems: { badge: 'yoq' }
    });
  });
  const { page, context } = await newPage();
  await page.goto(base + 'index.html');
  await page.fill('#login-email', 'nullish@test.uz');
  await page.fill('#login-password', 'secret123');
  await page.click('#form-login button[type=submit]');
  await page.waitForURL(/dashboard\.html/);
  await page.goto(base + 'study.html?book=b1&topic=t2');
  await settle(page);
  await playStudy(page);
  await settle(page);
  await shot(page, 'nullish-results');
  if (await page.$('#pending-alert')) throw new Error('nullish: pending alert ' + await page.$eval('#pending-alert', e => e.innerText));
  let u, lb;
  await env.withSecurityRulesDisabled(async (c) => {
    const fdb = c.firestore();
    u = (await getDoc(doc(fdb, 'users', uid))).data();
    lb = (await getDoc(doc(fdb, 'leaderboard', uid))).data();
  });
  if (u.sessionsCount !== 1 || u.streakDays !== 1 || !(u.stars > 0)) throw new Error('nullish user ' + JSON.stringify({ s: u.sessionsCount, st: u.streakDays, stars: u.stars }));
  if (!lb || lb.stars !== u.stars) throw new Error('nullish leaderboard ' + JSON.stringify(lb));
  await context.close();
}
