import { initPage } from '../core.js';
import { listBooks, listTopics, listMyFolders, listPublicFolders, countDue } from '../data.js';
import { sourceQuery } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, openModal, loadingBlock } from '../ui.js';
import { getLast, saveLast } from '../widgets.js';

const ctx = await initPage({ title: 'Mashq', active: 'practice' });
const { user } = ctx;

let last = getLast();
const due = await countDue(user.uid);

function renderSource() {
  setHTML('source', html`<span class="tile-icon sm tone-soft">${ic('target', 18)}</span>
    <div class="grow"><div class="xs muted">Mashq qilinadigan mavzu</div><div class="bold truncate">${last ? last.title || 'Tanlangan mavzu' : 'Tanlanmagan'}</div>${last && last.subtitle ? html`<div class="xs dim truncate">${last.subtitle}</div>` : ''}</div>
    <button class="btn btn-sm" id="pick">${ic('edit', 15)} ${last ? "O'zgartirish" : 'Tanlash'}</button>`);
  $('#pick').onclick = pickSource;
  renderModes();
}

function renderModes() {
  const q = last ? sourceQuery(last) : '';
  const modes = [
    { href: last ? `study.html?${q}` : null, icon: 'layers', tone: 'tone-violet', name: "O'rganish (5 bosqich)", desc: "Tanishish, variant, bo'laklash, moslashtirish va yozish" },
    { href: 'review.html', icon: 'repeat', tone: 'tone-blue', name: 'Takrorlash', desc: due ? `${due} ta so'zni takrorlash vaqti keldi` : "Hozircha takrorlanadigan so'z yo'q", badge: due ? String(due) : '', always: true },
    { href: last ? `flashcards.html?${q}` : null, icon: 'copy', tone: 'tone-cyan', name: 'Flashcard', desc: 'Kartalar bilan tezkor takrorlash' },
    { href: last ? `quick-quiz.html?${q}` : null, icon: 'zap', tone: 'tone-emerald', name: 'Tezkor kviz', desc: '10 ta savol — tarjimani toping' },
    { href: last ? `quick-quiz.html?${q}&mode=listen` : null, icon: 'headphones', tone: 'tone-pink', name: 'Tinglab tushunish', desc: "So'zni eshiting va ma'nosini toping" },
    { href: 'vocabulary.html', icon: 'book-marked', tone: 'tone-amber', name: "Lug'atim", desc: "O'rgangan barcha so'zlaringiz", always: true },
    { href: 'ai.html', icon: 'sparkles', tone: 'tone-orange', name: 'AI yordamchi', desc: 'Savol bering, tushuntirish oling', always: true }
  ];
  setHTML('modes', raw(modes.map(m => {
    const disabled = !m.href;
    return `<${disabled ? 'button' : 'a'} class="card card-link row" ${disabled ? 'data-need-source' : `href="${m.href}"`} style="text-align:left;width:100%;${disabled ? 'opacity:.75' : ''}">
      <span class="tile-icon ${m.tone}">${icon(m.icon, 22)}</span>
      <div class="grow"><div class="card-title">${m.name}</div><div class="small muted">${disabled ? 'Avval mavzu tanlang' : m.desc}</div></div>
      ${m.badge ? `<span class="badge badge-primary">${m.badge}</span>` : ''}${icon('chevron-right', 18)}
    </${disabled ? 'button' : 'a'}>`;
  }).join('')));
  document.querySelectorAll('[data-need-source]').forEach(b => b.onclick = pickSource);
}

/* Mavzu tanlash oynasi */
async function pickSource() {
  const m = openModal({ title: 'Mavzuni tanlang', body: loadingBlock(), size: 'lg' });
  const body = m.el.querySelector('.modal-body');
  try {
    const [books, mine, pub] = await Promise.all([listBooks(), listMyFolders(user.uid), listPublicFolders()]);
    const row = (data, title, sub, iconName) => `<button class="list-row clickable" style="width:100%;border:0;background:none;text-align:left;font:inherit;color:inherit" data-src="${encodeURIComponent(JSON.stringify(data))}">
      <span class="tile-icon sm tone-soft">${icon(iconName, 16)}</span><div class="list-main"><div class="list-title">${esc(title)}</div>${sub ? `<div class="list-sub">${esc(sub)}</div>` : ''}</div>${icon('chevron-right', 16)}</button>`;
    let out = '';
    if (mine.length) out += `<div class="cmdk-group">Mening bo'limlarim</div>` + mine.filter(f => (f.wordCount || 0) >= 2).map(f => row({ kind: 'folder', containerId: f.id, topicId: null, title: f.name }, f.name, `${f.wordCount} so'z`, 'folder')).join('');
    for (const b of books) out += `<div class="cmdk-group">${esc(b.title || 'Kitob')}</div><div data-book="${esc(b.id)}" class="xs dim" style="padding:6px 16px">Yuklanmoqda...</div>`;
    const flat = pub.filter(f => !(f.topicCount > 0));
    const topical = pub.filter(f => f.topicCount > 0);
    if (flat.length) out += `<div class="cmdk-group">Umumiy bo'limlar</div>` + flat.map(f => row({ kind: 'folder', containerId: f.id, topicId: null, title: f.name }, f.name, `${f.wordCount || 0} so'z`, 'library')).join('');
    for (const f of topical) out += `<div class="cmdk-group">${esc(f.name || "Bo'lim")}</div><div data-pfolder="${esc(f.id)}" class="xs dim" style="padding:6px 16px">Yuklanmoqda...</div>`;
    body.innerHTML = out ? `<div class="list">${out}</div>` : '<p class="muted center">Hali mavzular yo\'q</p>';
    const bind = () => body.querySelectorAll('[data-src]').forEach(b => b.onclick = () => {
      const s = JSON.parse(decodeURIComponent(b.dataset.src));
      saveLast({ kind: s.kind, containerId: s.containerId, topicId: s.topicId }, s.title, s.subtitle || '');
      last = getLast();
      m.close();
      renderSource();
    });
    bind();
    await Promise.all([
      ...books.map(async b => {
        const ts = await listTopics('book', b.id).catch(() => []);
        const slot = body.querySelector(`[data-book="${CSS.escape(b.id)}"]`);
        if (slot) slot.outerHTML = ts.map(t => row({ kind: 'book', containerId: b.id, topicId: t.id, title: t.title, subtitle: b.title }, t.title || 'Mavzu', `${t.wordCount || 0} so'z`, 'book')).join('') || '';
      }),
      ...topical.map(async f => {
        const ts = await listTopics('folder', f.id).catch(() => []);
        const slot = body.querySelector(`[data-pfolder="${CSS.escape(f.id)}"]`);
        if (slot) slot.outerHTML = ts.map(t => row({ kind: 'folder', containerId: f.id, topicId: t.id, title: t.title, subtitle: f.name }, t.title || 'Mavzu', `${t.wordCount || 0} so'z`, 'library')).join('') || '';
      })
    ]);
    bind();
  } catch (e) { body.innerHTML = '<p class="muted center">Yuklab bo\'lmadi. Qayta urinib ko\'ring.</p>'; }
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

renderSource();
