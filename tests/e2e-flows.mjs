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
