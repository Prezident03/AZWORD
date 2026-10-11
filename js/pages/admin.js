/* AzWord · Admin panel
   Bo'limlar: umumiy ko'rinish, foydalanuvchilar, kitoblar, umumiy bo'limlar,
   e'lonlar, do'kon, yutuqlar, sozlamalar. Holat URL hash'ida saqlanadi. */
import { initPage } from '../core.js';
import {
  listBooks, listPublicFolders, listTopics, listWords, getContainer, getTopic, addWords, updateWord, deleteWord,
  deleteContainerDeep, deleteTopicDeep, OWNER_EMAIL
} from '../data.js';
import {
  counts, listUsers, adminUpdateUser, saveContainer, saveTopic, recount, listCol, saveDoc, removeDoc,
  saveSettings, readSettings, serverTimestamp, migrateUsers, leaderboardCount
} from '../admin-data.js';
import { ACH_TYPES, levelInfo, streakState } from '../game.js';
import { icon, iconName, PICKER_ICONS } from '../icons.js';
import {
  $, $$, html, raw, ic, setHTML, openModal, confirmDialog, toast, toastError, withLoading, loadingBlock,
  emptyState, errorState, fmtNum, fmtDate, timeAgo, debounce, avatar, safeImg
} from '../ui.js';
import { parseText, parseFile } from '../parse.js';
import { aiWords, aiPing } from '../ai.js';
import { coverHtml } from '../widgets.js';

await initPage({ title: 'Admin panel', active: 'admin', admin: true });

const SECTIONS = [
  ['overview', 'Umumiy', 'bar-chart'],
  ['users', 'Foydalanuvchilar', 'users'],
  ['books', 'Kitoblar', 'book'],
  ['folders', "Umumiy bo'limlar", 'library'],
  ['news', "E'lonlar", 'megaphone'],
  ['shop', "Do'kon", 'shopping-bag'],
  ['ach', 'Yutuqlar', 'medal'],
  ['settings', 'Sozlamalar', 'settings']
];
const view = $('#view');

/* ── Router ─────────────────────────────────────────────── */
function route() {
  const parts = location.hash.replace(/^#/, '').split('/').map(decodeURIComponent);
  const sec = SECTIONS.some(s => s[0] === parts[0]) ? parts[0] : 'overview';
  setHTML('nav', raw(SECTIONS.map(([k, l, i]) => `<a class="tab${k === sec ? ' active' : ''}" href="#${k}">${icon(i, 15)} ${l}</a>`).join('')));
  setHTML(view, loadingBlock());
  const handlers = { overview, users, books: () => content('book', parts), folders: () => content('folder', parts), news, shop, ach, settings };
  handlers[sec]().catch(e => { console.error(e); errorState(view, route, e.code === 'permission-denied' ? "Ruxsat yo'q" : e.message); });
}
addEventListener('hashchange', route);

/* ── Umumiy forma oynasi ────────────────────────────────── */
function fieldHtml(f) {
  const v = f.value ?? '';
  const id = 'f-' + f.name;
  if (f.type === 'select') return html`<select class="select" id="${id}">${f.options.map(([val, label]) => html`<option value="${val}" ${String(val) === String(v) ? raw('selected') : ''}>${label}</option>`)}</select>`;
  if (f.type === 'textarea') return html`<textarea class="textarea" id="${id}" maxlength="${f.max || 2000}" placeholder="${f.placeholder || ''}">${v}</textarea>`;
  if (f.type === 'check') return html`<label class="row" style="cursor:pointer"><input type="checkbox" id="${id}" ${v ? raw('checked') : ''} style="width:18px;height:18px;accent-color:var(--primary)"> <span class="small">${f.checkLabel || ''}</span></label>`;
  if (f.type === 'icon') return html`<div class="icon-picker" id="${id}" data-value="${v || 'sparkles'}">${PICKER_ICONS.map(n => raw(`<button type="button" data-icon="${n}" class="${n === iconName(v, 'sparkles') ? 'active' : ''}">${icon(n, 18)}</button>`))}</div>`;
  if (f.type === 'color') return html`<div class="row"><input type="color" id="${id}" value="${/^#[0-9a-f]{6}$/i.test(v) ? v : '#7c3aed'}" style="width:52px;height:40px;border:0;background:none;padding:0"><span class="xs dim">${f.hint || ''}</span></div>`;
  return html`<input class="input" id="${id}" type="${f.type || 'text'}" value="${v}" placeholder="${f.placeholder || ''}" ${f.max ? raw(`maxlength="${f.max}"`) : ''} ${f.min !== undefined ? raw(`min="${f.min}"`) : ''}>`;
}
function formDialog({ title, fields, submit = 'Saqlash', size = '', extra = null }) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title, size,
      body: html`<form id="fd">${fields.map(f => html`<div class="field"><label class="label" for="f-${f.name}">${f.label}</label>${fieldHtml(f)}${f.hint && f.type !== 'color' ? html`<span class="hint">${f.hint}</span>` : ''}</div>`)}${extra || ''}</form>`,
      footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" id="fd-ok">${submit}</button>`,
      onClose: () => { if (!done) resolve(null); }
    });
    m.el.querySelectorAll('.icon-picker').forEach(p => p.querySelectorAll('button').forEach(b => b.onclick = () => {
      p.dataset.value = b.dataset.icon;
      p.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    }));
    const ok = () => {
      const out = {};
      for (const f of fields) {
        const el = m.$('#f-' + f.name);
        let v = f.type === 'check' ? el.checked : f.type === 'icon' ? el.dataset.value : el.value;
        if (f.type === 'number') v = Number(v) || 0;
        if (typeof v === 'string') v = v.trim();
        if (f.required && (v === '' || v === null)) { el.classList.add('is-error'); el.focus(); return; }
        out[f.name] = v;
      }
      done = true;
      resolve({ values: out, modal: m });
      m.close();
    };
    m.$('#fd-ok').onclick = ok;
    m.$('#fd').onsubmit = (e) => { e.preventDefault(); ok(); };
    if (extra && extra.bind) extra.bind(m);
  });
}

/* ── 1. Umumiy ko'rinish ───────────────────────────────── */
async function runMigration(btn) {
  const go = async () => {
    try {
      const r = await migrateUsers((d, t) => { if (btn) btn.lastChild.textContent = ` ${d}/${t}`; });
      toast(`Reyting yangilandi: ${r.total} foydalanuvchi${r.migrated ? `, ${r.migrated} tasi yangi formatga o'tkazildi` : ''}`);
    } catch (e) { toastError('Reytingni yangilab bo\'lmadi: ' + e.message); }
  };
  return btn ? withLoading(btn, go) : go();
}

async function overview() {
  const c = await counts();
  const lb = await leaderboardCount();
  if (c.users && lb !== null && lb < c.users) runMigration(null);
  let recent = [];
  try { recent = (await listUsers(500)).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 8); } catch (e) { /* ignore */ }
  const card = (i, t, v, l) => `<div class="card stat"><span class="tile-icon ${t}">${icon(i, 22)}</span><div><div class="stat-value">${v === null ? '—' : fmtNum(v)}</div><div class="stat-label">${l}</div></div></div>`;
  setHTML(view, html`
    <div class="grid-3">${raw([
      card('users', 'tone-violet', c.users, 'Foydalanuvchilar'),
      card('activity', 'tone-emerald', c.active1, 'Faol (24 soat)'),
      card('trending-up', 'tone-blue', c.active7, 'Faol (7 kun)'),
      card('book', 'tone-amber', c.books, 'Kitoblar'),
      card('library', 'tone-cyan', c.publicFolders, "Umumiy bo'limlar"),
      card('folder', 'tone-pink', c.personal, "Shaxsiy bo'limlar")
    ].join(''))}</div>
    <section class="section"><div class="section-head"><h2 class="section-title">${ic('user', 18)} Yangi foydalanuvchilar</h2><a class="btn btn-ghost btn-sm" href="#users">Barchasi</a></div>
    <div class="card card-flush"><div class="list">${recent.map(u => html`<div class="list-row">${avatar(u, 'avatar-sm')}
      <div class="list-main"><div class="list-title">${u.displayName || '—'}</div><div class="list-sub">${u.email || ''}</div></div>
      <span class="xs dim">${u.createdAt ? fmtDate(u.createdAt) : ''}</span></div>`)}</div></div></section>
    <section class="section"><div class="grid-3">
      <a class="card card-link row" href="#books"><span class="tile-icon tone-amber">${ic('plus', 20)}</span><div><div class="card-title">Kitob qo'shish</div><div class="xs muted">Mavzu va so'zlar bilan</div></div></a>
      <a class="card card-link row" href="#news"><span class="tile-icon tone-blue">${ic('megaphone', 20)}</span><div><div class="card-title">E'lon yuborish</div><div class="xs muted">Bosh sahifada ko'rinadi</div></div></a>
      <a class="card card-link row" href="#settings"><span class="tile-icon tone-violet">${ic('settings', 20)}</span><div><div class="card-title">Sozlamalar</div><div class="xs muted">Adminlar, texnik ishlar</div></div></a>
    </div></section>`);
}

/* ── 2. Foydalanuvchilar ───────────────────────────────── */
let usersCache = [];
async function users() {
  usersCache = await listUsers(2000);
  usersCache.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  setHTML(view, html`
    <div class="row wrap mb-4">
      <div class="input-icon grow" style="max-width:380px">${ic('search', 17)}<input class="input" id="u-search" placeholder="Ism yoki email bo'yicha qidirish..."></div>
      <select class="select" id="u-filter" style="width:auto"><option value="all">Hammasi</option><option value="active">Faol (7 kun)</option><option value="blocked">Bloklangan</option></select>
      <span class="small muted" id="u-count"></span>
    </div>
    <div class="card card-flush table-wrap"><table class="table"><thead><tr><th>Foydalanuvchi</th><th>XP</th><th>Tanga</th><th>Streak</th><th>So'zlar</th><th>Oxirgi faollik</th><th>Holat</th><th></th></tr></thead><tbody id="u-body"></tbody></table></div>`);
  const render = () => {
    const q = $('#u-search').value.trim().toLowerCase();
    const f = $('#u-filter').value;
    const week = Date.now() - 7 * 86400e3;
    const list = usersCache.filter(u => (!q || String(u.displayName || '').toLowerCase().includes(q) || String(u.email || '').toLowerCase().includes(q))
      && (f === 'all' || (f === 'blocked' ? u.blocked : (u.lastSeen?.toMillis?.() || 0) > week)));
    $('#u-count').textContent = `${list.length} ta`;
    setHTML('u-body', html`${list.slice(0, 300).map(u => html`<tr>
      <td><div class="row">${avatar(u, 'avatar-sm')}<div style="min-width:0"><div class="bold truncate" style="max-width:220px">${u.displayName || '—'}</div><div class="xs muted truncate" style="max-width:220px">${u.email || ''}</div></div></div></td>
      <td class="mono">${fmtNum(u.stars)}</td><td class="mono">${fmtNum(u.coins)}</td><td class="mono">${streakState(u).current}</td><td class="mono">${fmtNum(u.wordsMastered || 0)}</td>
      <td class="small muted">${u.lastSeen ? timeAgo(u.lastSeen) : '—'}</td>
      <td>${u.blocked ? html`<span class="badge badge-danger">Bloklangan</span>` : html`<span class="badge badge-success">Faol</span>`}</td>
      <td><button class="btn btn-sm" data-u="${u.id}">Boshqarish</button></td></tr>`)}`);
    $$('[data-u]').forEach(b => b.onclick = () => userDialog(usersCache.find(x => x.id === b.dataset.u), render));
  };
  $('#u-search').addEventListener('input', debounce(render, 150));
  $('#u-filter').onchange = render;
  render();
}
function userDialog(u, rerender) {
  const lv = levelInfo(u.stars);
  const m = openModal({
    title: u.displayName || u.email || 'Foydalanuvchi',
    size: 'lg',
    body: html`<div class="row mb-4">${avatar(u, 'avatar-lg')}<div><div class="bold">${u.email || ''}</div>
        <div class="xs muted">ID: ${u.id} · ${lv.level}-daraja · ro'yxatdan: ${u.createdAt ? fmtDate(u.createdAt) : '—'}</div></div></div>
      <div class="grid-3 mb-4" style="gap:10px">
        ${[['XP', u.stars], ['Tanga', u.coins], ['AI urinishlar', u.aiGeneratorUses || 0], ["O'zlashtirgan", u.wordsMastered || 0], ["Mashg'ulot", u.sessionsCount || 0], ['Eng uzun streak', u.longestStreak || 0]]
          .map(([l, v]) => html`<div class="card card-sm"><div class="stat-value" style="font-size:1.2rem">${fmtNum(v || 0)}</div><div class="stat-label">${l}</div></div>`)}
      </div>
      <div class="card card-sm"><div class="card-title mb-3">Balansni o'zgartirish</div>
        <div class="row wrap">
          <select class="select" id="ad-field" style="width:auto"><option value="coins">Tanga</option><option value="stars">XP (yulduz)</option><option value="aiGeneratorUses">AI urinishlar</option><option value="streakFreezes">Streak muzlatish</option></select>
          <input class="input" id="ad-amount" type="number" value="10" style="width:110px">
          <button class="btn btn-success" id="ad-add">${ic('plus', 15)} Qo'shish</button>
          <button class="btn btn-danger" id="ad-sub">${ic('x', 15)} Ayirish</button>
        </div></div>`,
    footer: html`${u.email === OWNER_EMAIL ? '' : html`<button class="btn ${u.blocked ? 'btn-success' : 'btn-danger'}" id="ad-block">${ic(u.blocked ? 'unlock' : 'ban', 16)} ${u.blocked ? 'Blokdan chiqarish' : 'Bloklash'}</button>`}
      <button class="btn btn-ghost" data-close>Yopish</button>`
  });
  const adjust = (sign) => withLoading(m.$(sign > 0 ? '#ad-add' : '#ad-sub'), async () => {
    const field = m.$('#ad-field').value;
    const n = Math.abs(parseInt(m.$('#ad-amount').value, 10) || 0);
    if (!n) return toastError('Miqdorni kiriting');
    const next = Math.max(0, (Number(u[field]) || 0) + sign * n);
    try {
      const merged = await adminUpdateUser(u.id, { [field]: next }, u);
      Object.assign(u, merged);
      toast('Yangilandi');
      m.close(); rerender();
    } catch (e) { toastError("Saqlab bo'lmadi: " + e.message); }
  });
  m.$('#ad-add').onclick = () => adjust(1);
  m.$('#ad-sub').onclick = () => adjust(-1);
  const bl = m.$('#ad-block');
  if (bl) bl.onclick = async () => {
    const ok = await confirmDialog({ title: u.blocked ? 'Blokdan chiqarish' : 'Bloklash', message: u.blocked ? 'Foydalanuvchi yana ilovadan foydalana oladi.' : "Foydalanuvchi ilovaga kira olmaydi va natijalari yozilmaydi.", confirmText: u.blocked ? 'Chiqarish' : 'Bloklash', danger: !u.blocked });
    if (!ok) return;
    try {
      const merged = await adminUpdateUser(u.id, { blocked: !u.blocked }, u);
      Object.assign(u, merged);
      toast(u.blocked ? 'Bloklandi' : 'Blokdan chiqarildi');
      m.close(); rerender();
    } catch (e) { toastError("Saqlab bo'lmadi"); }
  };
}

/* ── 3-4. Kitoblar va umumiy bo'limlar ─────────────────── */
const LABEL = { book: { one: 'Kitob', many: 'Kitoblar', sec: 'books' }, folder: { one: "Bo'lim", many: "Umumiy bo'limlar", sec: 'folders' } };

async function content(kind, parts) {
  const [, id, topicId] = parts;
  if (id && topicId !== undefined) return wordsEditor(kind, id, topicId === '_' ? null : topicId);
  if (id) return containerView(kind, id);
  return containerList(kind);
}

async function containerList(kind) {
  const L = LABEL[kind];
  const list = kind === 'book' ? await listBooks() : await listPublicFolders();
  setHTML(view, html`<div class="section-head"><h2 class="section-title">${ic(kind === 'book' ? 'book' : 'library', 18)} ${L.many} <span class="badge">${list.length}</span></h2>
    <button class="btn btn-primary" id="c-new">${ic('plus', 16)} Yangi ${L.one.toLowerCase()}</button></div>
    ${list.length ? html`<div class="grid-auto-sm">${list.map(c => html`<a class="card card-sm card-link book-card" href="#${L.sec}/${encodeURIComponent(c.id)}">
      <div class="book-cover" style="${kind === 'folder' ? 'aspect-ratio:4/3' : ''}">${coverHtml(c.imageUrl, kind === 'book' ? 'book' : iconName(c.emoji, 'library'))}</div>
      <div><div class="book-title truncate">${c.title || c.name || '—'}</div><div class="xs muted">${c.topicCount || 0} mavzu · ${fmtNum(c.wordCount || 0)} so'z · #${c.order || 0}</div></div></a>`)}</div>`
      : html`<div class="card">${emptyState({ iconName: kind === 'book' ? 'book' : 'library', title: `${L.many} hali yo'q`, sub: "Yangi qo'shish uchun yuqoridagi tugmani bosing." })}</div>`}`);
  $('#c-new').onclick = () => containerForm(kind, null);
}

function coverExtra(prefix) {
  const extra = html`<div class="field"><label class="label">AI bilan muqova yaratish (ixtiyoriy)</label>
    <div class="row"><input class="input" id="ai-cover-prompt" placeholder="masalan: travel suitcase"><button type="button" class="btn" id="ai-cover-go">${ic('wand', 16)} Yaratish</button></div>
    <img id="ai-cover-prev" alt="" style="display:none;margin-top:10px;max-height:160px;border-radius:12px"></div>`;
  extra.bind = (m) => {
    m.$('#ai-cover-go').onclick = () => {
      const p = m.$('#ai-cover-prompt').value.trim();
      if (!p) return toastError('Tavsif yozing');
      const prompt = `${p}, isometric 3d illustration, vibrant colors, soft purple gradient background, clean, no text`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=${prefix === 'book' ? 800 : 450}&seed=${Math.floor(Math.random() * 1e6)}&nologo=true`;
      const img = m.$('#ai-cover-prev');
      img.style.display = 'block';
      img.src = url;
      m.$('#f-imageUrl').value = url;
    };
  };
  return extra;
}

async function containerForm(kind, c) {
  const L = LABEL[kind];
  const fields = kind === 'book'
    ? [
      { name: 'title', label: 'Kitob nomi', value: c?.title, required: true, max: 120 },
      { name: 'description', label: 'Tavsif', type: 'textarea', value: c?.description, max: 500 },
      { name: 'imageUrl', label: "Muqova rasmi (URL, https://)", value: c?.imageUrl, placeholder: 'https://...' },
      { name: 'order', label: 'Tartib raqami', type: 'number', value: c?.order ?? 1 }
    ]
    : [
      { name: 'name', label: "Bo'lim nomi", value: c?.name, required: true, max: 60 },
      { name: 'emoji', label: 'Belgi', type: 'icon', value: c?.emoji || 'library' },
      { name: 'imageUrl', label: "Muqova rasmi (URL, ixtiyoriy)", value: c?.imageUrl, placeholder: 'https://...' },
      { name: 'order', label: 'Tartib raqami', type: 'number', value: c?.order ?? 1 }
    ];
  const r = await formDialog({ title: c ? `${L.one}ni tahrirlash` : `Yangi ${L.one.toLowerCase()}`, fields, extra: coverExtra(kind) });
  if (!r) return;
  if (r.values.imageUrl && !safeImg(r.values.imageUrl)) return toastError("Rasm havolasi https:// bilan boshlanishi kerak");
  try {
    const id = await saveContainer(kind, c?.id || null, r.values);
    toast('Saqlandi');
    location.hash = `#${L.sec}/${encodeURIComponent(id)}`;
    if (c) route();
  } catch (e) { toastError("Saqlab bo'lmadi: " + e.message); }
}

async function containerView(kind, id) {
  const L = LABEL[kind];
  const [c, topics] = await Promise.all([getContainer(kind, id), listTopics(kind, id)]);
  if (!c) { setHTML(view, emptyState({ iconName: 'alert-triangle', title: 'Topilmadi', action: html`<a class="btn" href="#${L.sec}">Orqaga</a>` })); return; }
  const direct = kind === 'folder' ? await listWords({ kind, containerId: id, topicId: null }) : [];
  setHTML(view, html`
    <div class="crumbs mb-3"><a href="#${L.sec}">${L.many}</a>${ic('chevron-right', 14)}<span>${c.title || c.name}</span></div>
    <div class="card card-lg row wrap mb-4" style="gap:20px;align-items:flex-start">
      <div class="book-cover" style="width:110px;${kind === 'folder' ? 'aspect-ratio:1' : ''}">${coverHtml(c.imageUrl, kind === 'book' ? 'book' : iconName(c.emoji, 'library'))}</div>
      <div class="grow"><h2>${c.title || c.name}</h2>${c.description ? html`<p class="muted mt-1">${c.description}</p>` : ''}
        <div class="small muted mt-2">${topics.length} mavzu · ${fmtNum(c.wordCount || 0)} so'z · tartib #${c.order || 0}</div>
        <div class="row wrap mt-3">
          <button class="btn btn-sm" id="c-edit">${ic('edit', 15)} Tahrirlash</button>
          <button class="btn btn-sm" id="c-recount">${ic('refresh', 15)} Hisoblagichlarni tuzatish</button>
          <a class="btn btn-sm" href="${kind === 'book' ? 'book.html?id=' : 'folder.html?id='}${encodeURIComponent(id)}" target="_blank">${ic('external', 15)} Ko'rish</a>
          <button class="btn btn-sm btn-danger" id="c-del">${ic('trash-2', 15)} O'chirish</button>
        </div></div></div>
    <div class="section-head"><h2 class="section-title">${ic('list', 18)} Mavzular</h2><button class="btn btn-primary btn-sm" id="t-new">${ic('plus', 15)} Yangi mavzu</button></div>
    ${topics.length ? html`<div class="card card-flush"><div class="list">${topics.map((t, i) => html`<div class="list-row">
      <span class="list-num">${t.order ?? i + 1}</span>
      <div class="list-main"><a class="list-title" href="#${L.sec}/${encodeURIComponent(id)}/${encodeURIComponent(t.id)}">${t.title || 'Mavzu'}</a><div class="list-sub">${fmtNum(t.wordCount || 0)} so'z</div></div>
      <a class="btn btn-sm" href="#${L.sec}/${encodeURIComponent(id)}/${encodeURIComponent(t.id)}">${ic('book-open', 15)} So'zlar</a>
      <button class="icon-btn" data-t-edit="${t.id}" aria-label="Tahrirlash">${ic('edit', 16)}</button>
      <button class="icon-btn danger" data-t-del="${t.id}" aria-label="O'chirish">${ic('trash-2', 16)}</button></div>`)}</div></div>`
      : html`<div class="card">${emptyState({ iconName: 'list', title: "Mavzular yo'q", sub: kind === 'folder' ? "Mavzusiz bo'limda so'zlar to'g'ridan-to'g'ri saqlanadi (pastda)." : "Kitobga mavzu qo'shing, keyin mavzuga so'zlar." })}</div>`}
    ${kind === 'folder' ? html`<section class="section"><div class="section-head"><h2 class="section-title">${ic('book-open', 18)} Mavzusiz so'zlar <span class="badge">${direct.length}</span></h2>
      <a class="btn btn-sm" href="#${L.sec}/${encodeURIComponent(id)}/_">${ic('edit', 15)} Tahrirlash</a></div>
      ${topics.length && direct.length ? html`<div class="alert alert-warning">${ic('alert-triangle', 18)}<div>Bo'limda mavzular bor — foydalanuvchilar faqat mavzularni ko'radi. Mavzusiz so'zlarni mavzuga ko'chiring yoki o'chiring.</div></div>` : ''}</section>` : ''}`);
  $('#c-edit').onclick = () => containerForm(kind, c);
  $('#c-recount').onclick = (e) => withLoading(e.currentTarget, async () => { const r = await recount(kind, id); toast(`${r.topics} mavzu, ${r.words} so'z`); route(); });
  $('#c-del').onclick = async () => {
    if (!await confirmDialog({ title: `${L.one}ni o'chirish`, message: `"${c.title || c.name}" va undagi barcha mavzu hamda so'zlar butunlay o'chiriladi.`, confirmText: "O'chirish", danger: true })) return;
    try { await deleteContainerDeep(kind, id); toast("O'chirildi"); location.hash = '#' + L.sec; } catch (e) { toastError("O'chirib bo'lmadi"); }
  };
  const topicForm = async (t) => {
    const r = await formDialog({ title: t ? 'Mavzuni tahrirlash' : 'Yangi mavzu', fields: [
      { name: 'title', label: 'Mavzu nomi', value: t?.title, required: true, max: 80 },
      { name: 'order', label: 'Tartib raqami', type: 'number', value: t?.order ?? topics.length + 1 }
    ] });
    if (!r) return;
    try { await saveTopic(kind, id, t?.id || null, r.values); toast('Saqlandi'); route(); } catch (e) { toastError("Saqlab bo'lmadi"); }
  };
  $('#t-new').onclick = () => topicForm(null);
  $$('[data-t-edit]').forEach(b => b.onclick = () => topicForm(topics.find(t => t.id === b.dataset.tEdit)));
  $$('[data-t-del]').forEach(b => b.onclick = async () => {
    const t = topics.find(x => x.id === b.dataset.tDel);
    if (!await confirmDialog({ title: "Mavzuni o'chirish", message: `"${t.title}" va undagi ${t.wordCount || 0} ta so'z o'chiriladi.`, confirmText: "O'chirish", danger: true })) return;
    try { await deleteTopicDeep(kind, id, t.id); toast("O'chirildi"); route(); } catch (e) { toastError("O'chirib bo'lmadi"); }
  });
}

const POS = [['', '—'], ['noun', 'noun (ot)'], ['verb', "verb (fe'l)"], ['adjective', 'adjective (sifat)'], ['adverb', 'adverb (ravish)'], ['pronoun', 'pronoun (olmosh)'], ['preposition', 'preposition'], ['conjunction', "conjunction (bog'lovchi)"], ['phrase', 'phrase (ibora)']];

async function wordsEditor(kind, id, topicId) {
  const L = LABEL[kind];
  const src = { kind, containerId: id, topicId };
  const [c, t, words] = await Promise.all([getContainer(kind, id), topicId ? getTopic(kind, id, topicId) : null, listWords(src)]);
  setHTML(view, html`
    <div class="crumbs mb-3"><a href="#${L.sec}">${L.many}</a>${ic('chevron-right', 14)}<a href="#${L.sec}/${encodeURIComponent(id)}">${c ? c.title || c.name : '—'}</a>${ic('chevron-right', 14)}<span>${t ? t.title : 'Mavzusiz so\'zlar'}</span></div>
    <div class="section-head wrap"><h2 class="section-title">${ic('book-open', 18)} So'zlar <span class="badge">${words.length}</span></h2>
      <div class="row wrap">
        <div class="input-icon" style="width:220px">${ic('search', 17)}<input class="input" id="w-search" placeholder="Qidirish..."></div>
        <button class="btn" id="w-bulk">${ic('upload', 16)} Import</button>
        <button class="btn btn-gradient" id="w-ai">${ic('sparkles', 16)} AI</button>
        <button class="btn btn-primary" id="w-new">${ic('plus', 16)} So'z</button>
      </div></div>
    <div class="card card-flush" id="w-list"></div>`);
  const render = () => {
    const q = $('#w-search').value.trim().toLowerCase();
    const list = words.filter(w => !q || String(w.en).toLowerCase().includes(q) || String(w.uz).toLowerCase().includes(q));
    setHTML('w-list', list.length ? html`<div class="list">${list.map(w => html`<div class="list-row">
      <span class="list-num">${words.indexOf(w) + 1}</span>
      <div class="list-main"><div class="list-title">${w.en} ${w.ipa ? html`<span class="xs dim">${w.ipa}</span>` : ''} ${w.pos ? html`<span class="badge">${w.pos}</span>` : ''} <span class="muted" style="font-weight:400">— ${w.uz}</span></div>
        ${w.example ? html`<div class="xs dim" style="font-style:italic">${w.example}</div>` : ''}</div>
      <button class="icon-btn" data-w-edit="${w.id}" aria-label="Tahrirlash">${ic('edit', 16)}</button>
      <button class="icon-btn danger" data-w-del="${w.id}" aria-label="O'chirish">${ic('trash-2', 16)}</button></div>`)}</div>`
      : emptyState({ iconName: 'file-text', title: q ? 'Topilmadi' : "So'zlar yo'q", sub: q ? '' : "So'z qo'shing, fayldan import qiling yoki AI bilan yarating." }));
    $$('[data-w-edit]').forEach(b => b.onclick = () => wordForm(words.find(w => w.id === b.dataset.wEdit)));
    $$('[data-w-del]').forEach(b => b.onclick = async () => {
      const w = words.find(x => x.id === b.dataset.wDel);
      if (!await confirmDialog({ title: "So'zni o'chirish", message: `"${w.en}" o'chiriladi.`, confirmText: "O'chirish", danger: true })) return;
      try { await deleteWord(src, w.id); words.splice(words.indexOf(w), 1); render(); toast("O'chirildi"); } catch (e) { toastError("O'chirib bo'lmadi"); }
    });
  };
  const reload = async () => { const fresh = await listWords(src); words.splice(0, words.length, ...fresh); render(); $('.section-title .badge').textContent = words.length; };
  const wordForm = async (w) => {
    const r = await formDialog({ title: w ? "So'zni tahrirlash" : "Yangi so'z", fields: [
      { name: 'en', label: 'Inglizcha', value: w?.en, required: true, max: 120 },
      { name: 'uz', label: "O'zbekcha", value: w?.uz, required: true, max: 200 },
      { name: 'ipa', label: 'Transkripsiya (ixtiyoriy)', value: w?.ipa, placeholder: '/ˈæp.əl/', max: 80 },
      { name: 'pos', label: "So'z turkumi", type: 'select', value: w?.pos || '', options: POS },
      { name: 'example', label: 'Misol gap', type: 'textarea', value: w?.example, max: 400 }
    ] });
    if (!r) return;
    const v = r.values;
    if (!w && words.some(x => String(x.en).toLowerCase() === v.en.toLowerCase())) return toastError(`"${v.en}" allaqachon bor`);
    try {
      if (w) await updateWord(src, w.id, v); else await addWords(src, [v]);
      toast('Saqlandi');
      await reload();
    } catch (e) { toastError("Saqlab bo'lmadi: " + e.message); }
  };
  $('#w-new').onclick = () => wordForm(null);
  $('#w-search').addEventListener('input', debounce(render, 120));
  $('#w-bulk').onclick = () => bulkImport(src, words, reload);
  $('#w-ai').onclick = () => aiGenerate(src, words, t ? t.title : (c?.title || c?.name || ''), reload);
  render();
}

function previewPicker(m, list, existing) {
  const box = m.$('#pv');
  box.hidden = false;
  setHTML(box, html`<div class="small muted mb-2">${list.length} ta so'z. Keraksizlarini olib tashlang.</div>
    <div class="card card-flush" style="max-height:40vh;overflow:auto"><div class="list">${list.map((w, i) => html`<label class="list-row" style="cursor:pointer">
      <input type="checkbox" data-i="${i}" style="width:18px;height:18px;accent-color:var(--primary)">
      <div class="list-main"><div class="list-title">${w.en} <span class="muted" style="font-weight:400">— ${w.uz}</span> ${existing.has(w.en.toLowerCase()) ? html`<span class="badge badge-warning">bor</span>` : ''}</div>
      ${w.example ? html`<div class="xs dim">${w.example}</div>` : ''}</div></label>`)}</div></div>`);
  box.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = !existing.has(list[Number(cb.dataset.i)].en.toLowerCase()); });
  return () => [...box.querySelectorAll('input[type=checkbox]')].filter(x => x.checked).map(x => list[Number(x.dataset.i)]);
}

function bulkImport(src, words, reload) {
  const existing = new Set(words.map(w => String(w.en).toLowerCase()));
  let getPicked = null;
  const m = openModal({
    title: "So'zlarni import qilish", size: 'lg',
    body: html`<p class="small muted mb-3">Har bir qatorda: inglizcha, o'zbekcha, misol (ixtiyoriy). Ajratuvchi: tab, vergul, ";" yoki " - ". Yoki Excel/Word/TXT fayl tanlang.</p>
      <textarea class="textarea" id="bk-text" rows="7" placeholder="apple - olma&#10;book, kitob, This book is good."></textarea>
      <div class="row mt-3"><button class="btn" id="bk-parse">Tahlil qilish</button><label class="btn" for="bk-file">${ic('upload', 16)} Fayl tanlash</label><input type="file" id="bk-file" accept=".txt,.csv,.xlsx,.xls,.docx" hidden></div>
      <div id="pv" class="mt-4" hidden></div>`,
    footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" id="bk-save" disabled>Import qilish</button>`
  });
  const show = (list) => {
    if (!list.length) return toastError("So'z topilmadi. Formatni tekshiring.");
    getPicked = previewPicker(m, list, existing);
    m.$('#bk-save').disabled = false;
  };
  m.$('#bk-parse').onclick = () => show(parseText(m.$('#bk-text').value));
  m.$('#bk-file').onchange = async (e) => { try { show(await parseFile(e.target.files[0])); } catch (err) { toastError(err.message); } e.target.value = ''; };
  m.$('#bk-save').onclick = (e) => withLoading(e.currentTarget, async () => {
    const list = getPicked ? getPicked() : [];
    if (!list.length) return toastError("Kamida bitta so'z tanlang");
    try { const n = await addWords(src, list); toast(`${n} ta so'z qo'shildi`); m.close(); await reload(); }
    catch (err) { toastError("Import qilib bo'lmadi: " + err.message); }
  });
}

function aiGenerate(src, words, topicTitle, reload) {
  const existing = new Set(words.map(w => String(w.en).toLowerCase()));
  let getPicked = null;
  const m = openModal({
    title: "AI bilan so'z yaratish", size: 'lg',
    body: html`<div class="grid-3" style="gap:12px">
        <div class="field" style="grid-column:span 3"><label class="label" for="ai-topic">Mavzu</label><input class="input" id="ai-topic" value="${topicTitle}" maxlength="80"></div>
        <div class="field"><label class="label" for="ai-level">Daraja</label><select class="select" id="ai-level">${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => html`<option ${l === 'B1' ? raw('selected') : ''}>${l}</option>`)}</select></div>
        <div class="field"><label class="label" for="ai-count">Soni</label><select class="select" id="ai-count"><option>10</option><option selected>20</option><option>30</option><option>40</option></select></div>
        <div class="field" style="align-self:end"><button class="btn btn-gradient btn-block" id="ai-go">${ic('sparkles', 16)} Yaratish</button></div>
      </div><div id="pv" class="mt-2" hidden></div>`,
    footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" id="ai-save" disabled>Qo'shish</button>`
  });
  m.$('#ai-go').onclick = (e) => withLoading(e.currentTarget, async () => {
    const topic = m.$('#ai-topic').value.trim();
    if (!topic) return toastError('Mavzuni kiriting');
    try {
      const res = await aiWords(topic, m.$('#ai-level').value, m.$('#ai-count').value);
      getPicked = previewPicker(m, res.words, existing);
      m.$('#ai-save').disabled = false;
    } catch (err) { toastError(err.message); }
  });
  m.$('#ai-save').onclick = (e) => withLoading(e.currentTarget, async () => {
    const list = getPicked ? getPicked() : [];
    if (!list.length) return toastError("Kamida bitta so'z tanlang");
    try { const n = await addWords(src, list); toast(`${n} ta so'z qo'shildi`); m.close(); await reload(); }
    catch (err) { toastError("Saqlab bo'lmadi"); }
  });
}

/* ── 5. E'lonlar ───────────────────────────────────────── */
async function news() {
  const list = await listCol('announcements', 'createdAt');
  setHTML(view, html`<div class="grid-2" style="align-items:start">
    <div class="card"><div class="card-title mb-3">Yangi e'lon</div>
      <div class="field"><label class="label" for="n-text">Matn</label><textarea class="textarea" id="n-text" maxlength="500" placeholder="Yangi kitob qo'shildi!..."></textarea></div>
      <div class="field"><label class="label">Belgi</label><div class="icon-picker" id="n-icon" data-value="megaphone">${['megaphone', 'sparkles', 'gift', 'bell', 'rocket', 'alert-triangle', 'book', 'trophy'].map(n => raw(`<button type="button" data-icon="${n}" class="${n === 'megaphone' ? 'active' : ''}">${icon(n, 18)}</button>`))}</div></div>
      <button class="btn btn-primary" id="n-send">${ic('send', 16)} E'lon qilish</button>
    </div>
    <div class="card card-flush"><div class="list">${list.length ? list.map(a => html`<div class="list-row">
      <span class="tile-icon sm tone-soft">${ic(iconName(a.emoji, 'megaphone'), 16)}</span>
      <div class="list-main"><div style="white-space:pre-wrap">${a.text}</div><div class="xs dim">${timeAgo(a.createdAt)}</div></div>
      <button class="icon-btn danger" data-n-del="${a.id}" aria-label="O'chirish">${ic('trash-2', 16)}</button></div>`) : html`<div class="list-row muted">E'lonlar yo'q</div>`}</div></div></div>`);
  const picker = $('#n-icon');
  picker.querySelectorAll('button').forEach(b => b.onclick = () => { picker.dataset.value = b.dataset.icon; picker.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); });
  $('#n-send').onclick = (e) => withLoading(e.currentTarget, async () => {
    const text = $('#n-text').value.trim();
    if (!text) return toastError('Matn kiriting');
    try { await saveDoc('announcements', null, { text, emoji: picker.dataset.value, createdAt: serverTimestamp() }); toast("E'lon yuborildi"); route(); }
    catch (err) { toastError("Yuborib bo'lmadi"); }
  });
  $$('[data-n-del]').forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "E'lonni o'chirish", confirmText: "O'chirish", danger: true })) return;
    await removeDoc('announcements', b.dataset.nDel); route();
  });
}

/* ── 6. Do'kon ─────────────────────────────────────────── */
const SHOP_CATS = [['badge', 'Nishon (profilda va reytingda)'], ['avatar', 'Avatar ramkasi (rang)'], ['theme', 'Mavzu rangi (ilova rangi)'], ['other', 'Boshqa']];
async function shop() {
  const list = (await listCol('shop')).sort((a, b) => (a.price || 0) - (b.price || 0));
  setHTML(view, html`<div class="section-head"><h2 class="section-title">${ic('shopping-bag', 18)} Mahsulotlar <span class="badge">${list.length}</span></h2><button class="btn btn-primary" id="s-new">${ic('plus', 16)} Yangi mahsulot</button></div>
    <div class="alert alert-info mb-4">${ic('info', 18)}<div>"AI so'z generatori" (100 tanga) va "Streak muzlatish" (50 tanga) do'konda doim mavjud — ularni bu yerga qo'shish shart emas.</div></div>
    ${list.length ? html`<div class="grid-auto">${list.map(it => html`<div class="card item-card">
      <div class="item-icon" style="${/^#[0-9a-f]{6}$/i.test(it.color || '') ? `color:${it.color}` : ''}">${ic(iconName(it.emoji, 'gift'), 30)}</div>
      <div class="card-title">${it.name}</div><div class="xs muted">${(SHOP_CATS.find(c => c[0] === it.category) || ['', it.category || 'Boshqa'])[1]}</div>
      <div class="price">${ic('coins', 16)} ${fmtNum(it.price)}</div>
      <div class="row"><button class="btn btn-sm" data-s-edit="${it.id}">${ic('edit', 15)}</button><button class="btn btn-sm btn-danger" data-s-del="${it.id}">${ic('trash-2', 15)}</button></div></div>`)}</div>`
      : html`<div class="card">${emptyState({ iconName: 'shopping-bag', title: "Mahsulotlar yo'q" })}</div>`}`);
  const form = async (it) => {
    const r = await formDialog({ title: it ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot', fields: [
      { name: 'name', label: 'Nomi', value: it?.name, required: true, max: 60 },
      { name: 'description', label: 'Tavsif', value: it?.description, max: 160 },
      { name: 'category', label: 'Turi', type: 'select', value: it?.category || 'badge', options: SHOP_CATS },
      { name: 'price', label: 'Narxi (tanga)', type: 'number', value: it?.price ?? 50, min: 1 },
      { name: 'color', label: 'Rang (ramka va mavzu uchun)', type: 'color', value: it?.color, hint: 'Faqat "Avatar ramkasi" va "Mavzu rangi" uchun' },
      { name: 'emoji', label: 'Belgi', type: 'icon', value: it?.emoji || 'gift' },
      { name: 'isNew', label: 'Belgilar', type: 'check', value: it?.isNew, checkLabel: '"Yangi" belgisi' },
      { name: 'isHot', label: '', type: 'check', value: it?.isHot, checkLabel: '"Hit" belgisi' }
    ] });
    if (!r) return;
    if (r.values.price <= 0) return toastError("Narx 0 dan katta bo'lishi kerak");
    try { await saveDoc('shop', it?.id || null, r.values); toast('Saqlandi'); route(); } catch (e) { toastError("Saqlab bo'lmadi"); }
  };
  $('#s-new').onclick = () => form(null);
  $$('[data-s-edit]').forEach(b => b.onclick = () => form(list.find(x => x.id === b.dataset.sEdit)));
  $$('[data-s-del]').forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "Mahsulotni o'chirish", message: "Sotib olganlarda u saqlanib qoladi, lekin do'konda ko'rinmaydi.", confirmText: "O'chirish", danger: true })) return;
    await removeDoc('shop', b.dataset.sDel); route();
  });
}

/* ── 7. Yutuqlar ───────────────────────────────────────── */
async function ach() {
  const list = (await listCol('achievements')).sort((a, b) => String(a.type).localeCompare(String(b.type)) || (a.threshold || 0) - (b.threshold || 0));
  setHTML(view, html`<div class="section-head"><h2 class="section-title">${ic('medal', 18)} Yutuqlar <span class="badge">${list.length}</span></h2><button class="btn btn-primary" id="a-new">${ic('plus', 16)} Yangi yutuq</button></div>
    ${list.length ? html`<div class="card card-flush table-wrap"><table class="table"><thead><tr><th>Yutuq</th><th>Shart</th><th>Mukofot</th><th></th></tr></thead><tbody>${list.map(a => html`<tr>
      <td><div class="row"><span class="tile-icon sm tone-soft">${ic(iconName(a.emoji, 'award'), 16)}</span><div><div class="bold">${a.name}</div><div class="xs muted">${a.description || ''}</div></div></div></td>
      <td class="small">${ACH_TYPES[a.type] ? ACH_TYPES[a.type].label : html`<span class="badge badge-danger">${a.type} (qo'llanmaydi)</span>`} ≥ ${fmtNum(a.threshold)}</td>
      <td class="small">+${a.starReward || 0} XP · +${a.coinReward || 0} tanga</td>
      <td><div class="row"><button class="icon-btn" data-a-edit="${a.id}">${ic('edit', 16)}</button><button class="icon-btn danger" data-a-del="${a.id}">${ic('trash-2', 16)}</button></div></td></tr>`)}</tbody></table></div>`
      : html`<div class="card">${emptyState({ iconName: 'medal', title: "Yutuqlar yo'q" })}</div>`}`);
  const form = async (a) => {
    const r = await formDialog({ title: a ? 'Yutuqni tahrirlash' : 'Yangi yutuq', fields: [
      { name: 'name', label: 'Nomi', value: a?.name, required: true, max: 60 },
      { name: 'description', label: 'Tavsif', value: a?.description, max: 160 },
      { name: 'type', label: 'Shart turi', type: 'select', value: ACH_TYPES[a?.type] ? a.type : 'words', options: Object.entries(ACH_TYPES).map(([k, v]) => [k, v.label]) },
      { name: 'threshold', label: 'Maqsad qiymati', type: 'number', value: a?.threshold ?? 10, min: 1 },
      { name: 'starReward', label: 'XP mukofoti', type: 'number', value: a?.starReward ?? 10, min: 0 },
      { name: 'coinReward', label: 'Tanga mukofoti', type: 'number', value: a?.coinReward ?? 10, min: 0 },
      { name: 'emoji', label: 'Belgi', type: 'icon', value: a?.emoji || 'award' }
    ] });
    if (!r) return;
    if (r.values.threshold <= 0) return toastError("Maqsad 0 dan katta bo'lishi kerak");
    try { await saveDoc('achievements', a?.id || null, r.values); toast('Saqlandi'); route(); } catch (e) { toastError("Saqlab bo'lmadi"); }
  };
  $('#a-new').onclick = () => form(null);
  $$('[data-a-edit]').forEach(b => b.onclick = () => form(list.find(x => x.id === b.dataset.aEdit)));
  $$('[data-a-del]').forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: "Yutuqni o'chirish", confirmText: "O'chirish", danger: true })) return;
    await removeDoc('achievements', b.dataset.aDel); route();
  });
}

/* ── 8. Sozlamalar ─────────────────────────────────────── */
async function settings() {
  const s = await readSettings();
  const admins = Array.isArray(s.admins) ? s.admins : [];
  setHTML(view, html`<div class="grid-2" style="align-items:start">
    <div class="card">
      <div class="card-title mb-3">${ic('settings', 17)} Texnik ishlar rejimi</div>
      <div class="setting-row"><div class="setting-info"><div class="setting-name">Saytni vaqtincha yopish</div><div class="setting-desc">Adminlardan boshqa hamma "texnik ishlar" sahifasini ko'radi</div></div>
        <label class="switch"><input type="checkbox" id="st-maint" ${s.maintenance ? raw('checked') : ''}><span></span></label></div>
      <div class="field mt-3"><label class="label" for="st-text">Foydalanuvchilarga xabar</label><textarea class="textarea" id="st-text" maxlength="300" placeholder="AzWord tez orada qaytadi...">${s.maintenanceText || ''}</textarea></div>
      <button class="btn btn-primary" id="st-save">Saqlash</button>
    </div>
    <div class="card">
      <div class="card-title mb-2">${ic('shield', 17)} Adminlar</div>
      <p class="xs muted mb-3">Qo'shimcha adminlar emailini tasdiqlagan bo'lishi kerak (Google orqali kirish — avtomatik tasdiqlangan).</p>
      <div class="list mb-3"><div class="list-row">${ic('crown', 18)}<div class="list-main"><div class="list-title">${OWNER_EMAIL}</div><div class="list-sub">Asosiy admin</div></div></div>
        ${admins.map(e => html`<div class="list-row">${ic('shield', 18)}<div class="list-main"><div class="list-title">${e}</div></div><button class="icon-btn danger" data-adm-del="${e}" aria-label="Olib tashlash">${ic('x', 16)}</button></div>`)}</div>
      <form class="row" id="adm-form"><input class="input" id="adm-email" type="email" placeholder="email@example.com"><button class="btn" type="submit">${ic('plus', 16)} Qo'shish</button></form>
    </div>
    <div class="card">
      <div class="card-title mb-2">${ic('trophy', 17)} Reyting va ma'lumotlar</div>
      <p class="xs muted mb-3">Barcha foydalanuvchilarni reytingga qo'shadi va eski versiyadan qolgan hisoblagichlarni yangilaydi. Xavfsiz — istalgan vaqtda qayta ishga tushirish mumkin.</p>
      <button class="btn" id="st-migrate">${ic('refresh', 16)}<span> Reytingni qayta tiklash</span></button>
    </div>
    <div class="card">
      <div class="card-title mb-2">${ic('sparkles', 17)} AI xizmati</div>
      <p class="xs muted mb-3">Groq API kaliti va modelini tekshiradi. Xato bo'lsa, aniq sababi ko'rsatiladi.</p>
      <button class="btn" id="st-ai">${ic('zap', 16)} AI holatini tekshirish</button>
      <div class="mt-3" id="st-ai-out"></div>
    </div></div>`);
  $('#st-ai').onclick = (e) => withLoading(e.currentTarget, async () => {
    const out = $('#st-ai-out');
    try {
      const r = await aiPing();
      const t = r.tts || {};
      setHTML(out, html`<div class="alert alert-success">${ic('circle-check', 18)}<div>AI ishlayapti. Model: <b>${r.model}</b> · ${r.ms} ms</div></div>
        ${t.ok ? html`<div class="alert alert-success mt-2">${ic('volume', 18)}<div>Tabiiy ovoz ishlayapti (${t.model})</div></div>`
          : html`<div class="alert alert-warning mt-2">${ic('volume', 18)}<div style="word-break:break-word">Tabiiy ovoz ishlamayapti — foydalanuvchilar brauzer ovozini eshitadi.<br>${t.error || ''}${t.detail ? html` <span class="xs dim">(${t.detail})</span>` : ''}</div></div>`}`);
    } catch (err) {
      setHTML(out, html`<div class="alert alert-danger">${ic('alert-triangle', 18)}<div style="word-break:break-word">${err.message}</div></div>`);
    }
  });
  $('#st-migrate').onclick = (e) => runMigration(e.currentTarget);
  $('#st-save').onclick = (e) => withLoading(e.currentTarget, async () => {
    const on = $('#st-maint').checked;
    if (on && !s.maintenance && !await confirmDialog({ title: 'Saytni yopish', message: 'Oddiy foydalanuvchilar ilovadan foydalana olmaydi. Davom etasizmi?', confirmText: 'Yopish', danger: true })) return;
    try { await saveSettings({ maintenance: on, maintenanceText: $('#st-text').value.trim() }); toast(on ? 'Texnik ishlar rejimi yoqildi' : 'Saqlandi'); s.maintenance = on; }
    catch (err) { toastError("Saqlab bo'lmadi"); }
  });
  $('#adm-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#adm-email').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toastError("Email noto'g'ri");
    if (email === OWNER_EMAIL || admins.includes(email)) return toastError('Bu email allaqachon admin');
    try { await saveSettings({ admins: [...admins, email] }); toast("Admin qo'shildi"); route(); } catch (err) { toastError("Saqlab bo'lmadi"); }
  };
  $$('[data-adm-del]').forEach(b => b.onclick = async () => {
    if (!await confirmDialog({ title: 'Adminni olib tashlash', message: b.dataset.admDel, confirmText: 'Olib tashlash', danger: true })) return;
    try { await saveSettings({ admins: admins.filter(x => x !== b.dataset.admDel) }); route(); } catch (err) { toastError("Saqlab bo'lmadi"); }
  });
}

route();
