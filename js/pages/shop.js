import { initPage } from '../core.js';
import { listShop, listPurchases, purchase, equip, SPECIAL_ITEMS } from '../data.js';
import { iconName } from '../icons.js';
import { $, html, raw, ic, setHTML, openModal, emptyState, errorState, skeletonCards, fmtNum, timeAgo, toast, toastError, withLoading, esc } from '../ui.js';
import { playSound, confetti } from '../fx.js';
import { setAccent } from '../prefs.js';

const ctx = await initPage({ title: "Do'kon", active: 'shop' });
const { user } = ctx;
let u = ctx.u;
let items = [];
let cat = 'all';
const CATS = { all: ['Hammasi', 'grid'], badge: ['Nishonlar', 'medal'], avatar: ['Avatar ramkasi', 'frame'], theme: ['Mavzu rangi', 'palette'], other: ['Boshqa', 'gift'] };
const catOf = (it) => (CATS[it.category] && it.category !== 'all' ? it.category : 'other');

function renderBalance() {
  setHTML('balance', html`${ic('coins', 18)} <span>${fmtNum(u.coins)}</span>`);
}

function renderSpecials() {
  const ai = SPECIAL_ITEMS['ai-generator-premium'];
  const fr = SPECIAL_ITEMS['streak-freeze'];
  setHTML('specials', html`
    <div class="card card-glow stack" style="border-color:rgba(124,58,237,.45)">
      <div class="row"><span class="tile-icon tone-violet">${ic('sparkles', 22)}</span>
        <div class="grow"><div class="card-title">AI so'z generatori</div><div class="xs muted">Qolgan urinishlar: <b>${u.aiGeneratorUses || 0}</b></div></div>
        <span class="price">${ic('coins', 16)} ${ai.price}</span></div>
      <p class="small muted">Istalgan mavzu va darajada tarjima va misollari bilan ${'10–40'} ta so'z yaratadi. 20 marta foydalanish.</p>
      <div class="feature-list"><span>${ic('check', 14)} A1–C2 daraja</span><span>${ic('check', 14)} Misol gaplar</span><span>${ic('check', 14)} Takrorlarni tekshiradi</span></div>
      <button class="btn btn-gradient" data-special="${ai.id}" ${u.coins < ai.price ? raw('disabled') : ''}>${u.coins < ai.price ? 'Tanga yetarli emas' : 'Sotib olish'}</button>
    </div>
    <div class="card stack">
      <div class="row"><span class="tile-icon tone-blue">${ic('snowflake', 22)}</span>
        <div class="grow"><div class="card-title">Streak muzlatish</div><div class="xs muted">Sizda: <b>${u.streakFreezes || 0}</b> ta</div></div>
        <span class="price">${ic('coins', 16)} ${fr.price}</span></div>
      <p class="small muted">Bir kun o'qishni o'tkazib yuborsangiz, streak'ingiz uzilmaydi — muzlatish avtomatik ishlatiladi.</p>
      <button class="btn btn-primary" data-special="${fr.id}" ${u.coins < fr.price ? raw('disabled') : ''}>${u.coins < fr.price ? 'Tanga yetarli emas' : 'Sotib olish'}</button>
    </div>`);
  document.querySelectorAll('[data-special]').forEach(b => b.onclick = () => confirmBuy(SPECIAL_ITEMS[b.dataset.special]));
}

async function load() {
  renderBalance();
  renderSpecials();
  setHTML('grid', skeletonCards(6));
  try { items = await listShop(); }
  catch (e) { errorState('grid', load); return; }
  items = items.filter(it => !SPECIAL_ITEMS[it.id]);
  renderTabs();
  renderGrid();
  loadHistory();
}

function renderTabs() {
  const present = new Set(items.map(catOf));
  const keys = Object.keys(CATS).filter(k => k === 'all' || present.has(k));
  $('#tabs').hidden = keys.length <= 2;
  setHTML('tabs', raw(keys.map(k => `<button class="tab${k === cat ? ' active' : ''}" data-c="${k}">${CATS[k][0]}</button>`).join('')));
  document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => { cat = b.dataset.c; renderTabs(); renderGrid(); });
}

function renderGrid() {
  const owned = new Set(u.ownedItems || []);
  const eq = u.equippedItems || {};
  const list = items.filter(it => cat === 'all' || catOf(it) === cat);
  if (!list.length) {
    setHTML('grid', html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'shopping-bag', title: "Hozircha mahsulotlar yo'q", sub: "Tez orada yangi bezaklar qo'shiladi." })}</div>`);
    return;
  }
  setHTML('grid', html`${list.map(it => {
    const has = owned.has(it.id);
    const c = catOf(it);
    const on = eq[c] === it.id;
    const color = /^#[0-9a-f]{6}$/i.test(it.color || '') ? it.color : '';
    return html`<div class="card item-card ${has ? 'owned' : ''}">
      ${it.isNew ? html`<span class="badge badge-info corner">Yangi</span>` : it.isHot ? html`<span class="badge badge-danger corner">${ic('flame', 12)} Hit</span>` : ''}
      <div class="item-icon" ${color ? raw(`style="background:${esc(color)}22;color:${esc(color)}"`) : ''}>${ic(iconName(it.emoji, 'gift'), 32)}</div>
      <div class="card-title">${it.name}</div>
      <div class="xs muted">${CATS[c][0]}</div>
      <div class="item-desc">${it.description || ''}</div>
      ${has
        ? (c === 'other' ? html`<span class="badge badge-success">${ic('check', 12)} Sizda bor</span>`
          : html`<button class="btn btn-sm btn-block ${on ? 'btn-success' : ''}" data-equip="${it.id}">${on ? html`${ic('check', 15)} Taqilgan` : 'Taqish'}</button>`)
        : html`<div class="price">${ic('coins', 16)} ${fmtNum(it.price)}</div>
          <button class="btn btn-primary btn-sm btn-block" data-buy="${it.id}" ${(u.coins || 0) < it.price ? raw('disabled') : ''}>${(u.coins || 0) < it.price ? 'Tanga yetarli emas' : 'Sotib olish'}</button>`}
    </div>`;
  })}`);
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => confirmBuy(items.find(i => i.id === b.dataset.buy)));
  document.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => toggleEquip(items.find(i => i.id === b.dataset.equip), b));
}

function confirmBuy(item) {
  const m = openModal({
    title: 'Xaridni tasdiqlang',
    body: html`<div class="center stack" style="align-items:center">
      <div class="item-card"><div class="item-icon">${ic(iconName(item.emoji, 'gift'), 32)}</div></div>
      <div class="card-title">${item.name}</div>
      <div class="row-between" style="width:100%;max-width:280px"><span class="muted">Narxi</span><span class="price">${ic('coins', 16)} ${fmtNum(item.price)}</span></div>
      <div class="row-between" style="width:100%;max-width:280px"><span class="muted">Balansingiz</span><b>${fmtNum(u.coins)}</b></div>
      <div class="row-between" style="width:100%;max-width:280px"><span class="muted">Xariddan keyin</span><b>${fmtNum((u.coins || 0) - item.price)}</b></div>
    </div>`,
    footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" id="buy-ok">Sotib olish</button>`
  });
  m.$('#buy-ok').onclick = (e) => withLoading(e.currentTarget, async () => {
    try {
      u = await purchase(user.uid, item);
      ctx.setUser(u);
      m.close();
      playSound('coin');
      confetti({ count: 80 });
      toast(`${item.name} sotib olindi!`);
      renderBalance(); renderSpecials(); renderGrid(); loadHistory();
    } catch (err) {
      toastError(err.code === 'no-coins' ? 'Tanga yetarli emas' : err.code === 'owned' ? err.message : "Xarid amalga oshmadi. Qayta urinib ko'ring.");
    }
  });
}

async function toggleEquip(item, btn) {
  const c = catOf(item);
  const on = (u.equippedItems || {})[c] === item.id;
  await withLoading(btn, async () => {
    try {
      const eq = await equip(user.uid, c, on ? null : item.id, u);
      u = { ...u, equippedItems: eq };
      ctx.setUser(u);
      if (c === 'theme') { setAccent(on ? null : item.color); try { localStorage.setItem('az:accent-id', on ? '' : item.id); } catch (e) { /* ignore */ } }
      toast(on ? 'Olib qo\'yildi' : 'Taqildi');
      renderGrid();
    } catch (e) { toastError("Saqlab bo'lmadi"); }
  });
}

async function loadHistory() {
  setHTML('history-title', html`${ic('clipboard-list', 18)} Xaridlar tarixi`);
  try {
    const list = await listPurchases(user.uid, 15);
    setHTML('history', list.length ? html`<div class="list">${list.map(p => html`<div class="list-row">
      <span class="tile-icon sm tone-soft">${ic(iconName(p.icon || p.itemEmoji, 'gift'), 16)}</span>
      <div class="list-main"><div class="list-title">${p.itemName || 'Mahsulot'}</div><div class="list-sub">${timeAgo(p.purchasedAt)}</div></div>
      <span class="price" style="color:var(--danger-light)">−${fmtNum(p.price)}</span></div>`)}</div>`
      : emptyState({ iconName: 'shopping-bag', title: 'Hali xarid qilinmagan' }));
  } catch (e) { setHTML('history', emptyState({ iconName: 'shopping-bag', title: 'Hali xarid qilinmagan' })); }
}

load();
