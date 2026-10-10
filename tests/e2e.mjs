/* AzWord · brauzer (E2E) tekshiruvi
   Auth + Firestore emulatorlari, lokal statik server va Playwright bilan
   har bir sahifani ochadi, JS xatolarini yig'adi va asosiy oqimlarni sinaydi.
   Ishga tushirish:  cd tests && npm run test:e2e
   Skrinshotlar:     tests/screenshots/ (git'ga kirmaydi) */
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SDK_DIR = dirname(require.resolve('firebase/package.json'));
const SHOTS = process.env.SHOTS || join(ROOT, 'tests', 'screenshots');
const PROJECT = 'azword-30a2e';
const PORT = 5179;
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
mkdirSync(SHOTS, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp' };

/* ── soxta /api/ai ── */
function fakeAI(body) {
  if (body.task === 'example') return { text: `This is an example with ${body.en}.` };
  if (body.task === 'translate') return { text: 'Bu tarjima.' };
  if (body.task === 'words') return { words: [{ en: 'suitcase', uz: 'chamadon', example: 'My suitcase is heavy.' }, { en: 'passport', uz: 'pasport', example: 'Show your passport.' }], usesLeft: 4 };
  if (body.task === 'chat') return { text: "Salom! Men AzWord AI yordamchisiman.\n- \"apple\" — olma" };
  return { error: 'bad' };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/ai') {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(fakeAI(JSON.parse(b || '{}')))); });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.statusCode = 404;
    const nf = join(ROOT, '404.html');
    res.setHeader('Content-Type', TYPES['.html']);
    return res.end(existsSync(nf) ? readFileSync(nf) : 'not found');
  }
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
}).listen(PORT);

/* ── Ma'lumotlarni tayyorlash ── */
const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
await env.clearFirestore();
const now = Date.now();
const words = (pairs) => pairs.map(([en, uz, example], i) => ({ en, uz, example, createdAt: Timestamp.fromMillis(now + i) }));
const TOPIC1 = words([['apple', 'olma', 'I eat an apple every day.'], ['book', 'kitob', 'This book is interesting.'], ['water', 'suv', 'Drink more water.'], ['friend', 'do\'st', 'He is my best friend.'], ['house', 'uy', 'Our house is big.'], ['school', 'maktab', 'I go to school.']]);
const TOPIC2 = words([['beautiful', 'chiroyli', 'What a beautiful day!'], ['quickly', 'tez', 'She runs quickly.'], ['window', 'deraza', 'Open the window.'], ['teacher', "o'qituvchi", 'Our teacher is kind.']]);
await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, 'settings/main'), { appName: 'AzWord', admins: [] });
  await setDoc(doc(db, 'books/b1'), { title: 'Essential Words 1', description: '4000 Essential English Words', order: 1, topicCount: 2, wordCount: 10, imageUrl: '' });
  await setDoc(doc(db, 'books/b1/topics/t1'), { title: 'Unit 1', order: 1, wordCount: 6 });
  await setDoc(doc(db, 'books/b1/topics/t2'), { title: 'Unit 2', order: 2, wordCount: 4 });
  for (const [i, w] of TOPIC1.entries()) await setDoc(doc(db, `books/b1/topics/t1/words/w${i}`), w);
  for (const [i, w] of TOPIC2.entries()) await setDoc(doc(db, `books/b1/topics/t2/words/w${i}`), w);
  await setDoc(doc(db, 'folders/pub1'), { name: 'Travel', emoji: 'rocket', isAdmin: true, uid: 'admin', wordCount: 4, topicCount: 0 });
  for (const [i, w] of TOPIC2.entries()) await setDoc(doc(db, `folders/pub1/words/w${i}`), w);
  await setDoc(doc(db, 'shop/badge-gold'), { name: 'Oltin nishon', description: 'Profilda ko\'rinadi', category: 'badge', price: 10, emoji: 'medal' });
  await setDoc(doc(db, 'shop/theme-pink'), { name: 'Pushti mavzu', description: 'Rang', category: 'theme', price: 500, emoji: 'palette', color: '#ec4899' });
  await setDoc(doc(db, 'achievements/first'), { name: 'Birinchi qadam', description: '1 ta so\'z o\'zlashtiring', type: 'words', threshold: 1, starReward: 5, coinReward: 5, emoji: 'award' });
  await setDoc(doc(db, 'achievements/xp1000'), { name: '1000 XP', description: '', type: 'stars', threshold: 1000, starReward: 50, coinReward: 50, emoji: 'trophy' });
  await setDoc(doc(db, 'announcements/a1'), { text: 'Yangi kitob qo\'shildi!', emoji: 'megaphone', createdAt: Timestamp.now() });
});

async function signUp(email, password = 'secret123') {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  return r.json();
}
await signUp('abdurasul1406z@gmail.com');

/* ── Brauzer ── */
const browser = await chromium.launch();
const problems = [];
async function newPage(viewport = { width: 1366, height: 860 }) {
  const context = await browser.newContext({ viewport, locale: 'uz-UZ' });
  await context.addInitScript(() => { window.__AZ_EMULATOR__ = { host: '127.0.0.1', auth: 9099, firestore: 8080 }; });
  await context.route('https://www.gstatic.com/firebasejs/10.12.0/*', (route) => {
    const name = route.request().url().split('/').pop();
    route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(join(SDK_DIR, name)) });
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await context.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|image\.pollinations\.ai/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`[pageerror] ${page.url()} :: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR/.test(m.text())) problems.push(`[console] ${page.url()} :: ${m.text().slice(0, 300)}`);
  });
  return { context, page };
}
const base = `http://127.0.0.1:${PORT}/`;
const shot = (page, name) => page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: true });
const step = async (name, fn) => {
  try { await fn(); console.log('  ✓', name); }
  catch (e) { problems.push(`[step] ${name} :: ${e.message.split('\n')[0]}`); console.log('  ✗', name, '—', e.message.split('\n')[0]); }
};
const settle = (page) => page.waitForFunction(() => !document.querySelector('.boot') || document.querySelector('.boot.done'), null, { timeout: 15000 }).then(() => page.waitForTimeout(900));

/* 1) Ro'yxatdan o'tish */
const { page, context } = await newPage();
await step("ro'yxatdan o'tish", async () => {
  await page.goto(base + 'index.html');
  await page.click('[data-tab="register"]');
  await page.fill('#reg-name', 'Test Talaba');
  await page.fill('#reg-email', 'student@test.uz');
  await page.fill('#reg-password', 'secret123');
  await shot(page, '00-register');
  await page.click('#form-register button[type=submit]');
  await page.waitForURL(/dashboard\.html/, { timeout: 15000 });
  await settle(page);
  await shot(page, '01-dashboard');
});

const PAGES = (process.env.PAGES || 'dashboard').split(',');
for (const p of PAGES) {
  if (ONLY && !ONLY.includes(p)) continue;
  await step('sahifa: ' + p, async () => {
    await page.goto(base + p + '.html' + (p === 'book' ? '?id=b1' : p === 'folder' ? '?id=pub1' : ''));
    await settle(page);
    await shot(page, 'page-' + p);
  });
}

/* Qo'shimcha oqimlar FLOWS o'zgaruvchisi orqali */
const flows = (process.env.FLOWS || '').split(',').filter(Boolean);
const flowMod = flows.length ? await import('./e2e-flows.mjs') : null;
for (const f of flows) {
  await step('oqim: ' + f, () => flowMod[f]({ page, base, settle, shot, newPage, env, signUp }));
}

await browser.close();
server.close();
await env.cleanup();
console.log('\n' + (problems.length ? `MUAMMOLAR (${problems.length}):\n` + [...new Set(problems)].join('\n') : 'Muammo topilmadi'));
process.exit(problems.length ? 1 : 0);
