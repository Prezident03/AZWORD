/* AzWord · bir nechta sahifada ishlatiladigan UI bloklari */
import { icon, iconName, PICKER_ICONS } from './icons.js';
import { html, raw, esc, ic, openModal, toast, toastError, withLoading, progressBar, safeImg, fmtNum } from './ui.js';
import { createFolder, updateFolder } from './data.js';
import { sourceKey, sourceQuery } from './game.js';

/* Oxirgi o'qilgan manba ("Davom ettirish" uchun) */
export function saveLast(src, title, subtitle = '') {
  try { localStorage.setItem('az:last', JSON.stringify({ ...src, title, subtitle, at: Date.now() })); } catch (e) { /* ignore */ }
}
export function getLast() {
  try {
    const v = JSON.parse(localStorage.getItem('az:last') || 'null');
    if (v && v.kind && v.containerId) return v;
    const old = JSON.parse(localStorage.getItem('az:lastFolder') || 'null'); // eski versiya
    if (old && old.id) return { kind: old.kind === 'book' ? 'book' : 'folder', containerId: old.id, topicId: old.topic || null, title: old.topicName || old.name || '' };
  } catch (e) { /* ignore */ }
  return null;
}

export function iconPicker(selected = 'folder') {
  return raw(`<div class="icon-picker" role="radiogroup">${PICKER_ICONS.map(n =>
    `<button type="button" data-icon="${n}" class="${n === selected ? 'active' : ''}" aria-label="${n}">${icon(n, 18)}</button>`).join('')}</div>`);
}
export function bindIconPicker(root, initial) {
  let value = initial;
  root.querySelectorAll('.icon-picker button').forEach(b => b.addEventListener('click', () => {
    value = b.dataset.icon;
    root.querySelectorAll('.icon-picker button').forEach(x => x.classList.toggle('active', x === b));
  }));
  return () => value;
}

/* Yangi shaxsiy bo'lim yoki nomini o'zgartirish oynasi */
export function folderDialog(uid, existing = null, existingNames = []) {
  return new Promise((resolve) => {
    const startIcon = existing ? iconName(existing.emoji, 'folder') : 'folder';
    let saved = false;
    const m = openModal({
      title: existing ? "Bo'limni tahrirlash" : "Yangi bo'lim",
      body: html`<form id="fd-form">
        <div class="field"><label class="label" for="fd-name">Nomi</label>
          <input class="input" id="fd-name" maxlength="60" placeholder="Masalan: IELTS so'zlari" value="${existing ? existing.name : ''}" required></div>
        <div class="field"><span class="label">Belgi</span>${iconPicker(startIcon)}</div>
      </form>`,
      footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" id="fd-save">${existing ? 'Saqlash' : 'Yaratish'}</button>`,
      onClose: () => { if (!saved) resolve(null); }
    });
    const getIcon = bindIconPicker(m.el, startIcon);
    const input = m.$('#fd-name');
    const submit = () => withLoading(m.$('#fd-save'), async () => {
      const name = input.value.trim();
      if (!name) { input.classList.add('is-error'); input.focus(); return; }
      const lower = name.toLowerCase();
      if (existingNames.some(n => n.toLowerCase() === lower) && (!existing || existing.name.toLowerCase() !== lower)) {
        toastError(`"${name}" nomli bo'lim allaqachon bor`);
        return;
      }
      try {
        let id;
        if (existing) { await updateFolder(existing.id, { name, emoji: getIcon() }); id = existing.id; }
        else id = await createFolder(uid, name, getIcon());
        saved = true;
        toast(existing ? "Bo'lim yangilandi" : "Bo'lim yaratildi");
        m.close();
        resolve({ id, name, emoji: getIcon() });
      } catch (e) { toastError("Saqlab bo'lmadi: " + (e.code === 'permission-denied' ? "ruxsat yo'q" : e.message)); }
    });
    m.$('#fd-save').onclick = submit;
    m.$('#fd-form').onsubmit = (e) => { e.preventDefault(); submit(); };
  });
}

/* Kitob progressi: foydalanuvchining o'zlashtirgan so'zlari / kitobdagi so'zlar */
export function bookProgress(book, progressMap) {
  let mastered = 0, topicsDone = 0;
  const prefix = `book_${book.id}_`;
  for (const [k, p] of Object.entries(progressMap || {})) {
    if (k.startsWith(prefix)) {
      mastered += p.mastered || 0;
      if ((p.masteredPct || 0) >= 100) topicsDone++;
    }
  }
  const total = Number(book.wordCount) || 0;
  return { mastered, topicsDone, pct: total ? Math.min(100, Math.round((mastered / total) * 100)) : 0 };
}
export function topicProgress(src, progressMap) {
  return (progressMap || {})[sourceKey(src)] || null;
}

export function coverHtml(url, fallbackIcon = 'book', title = '') {
  const safe = safeImg(url);
  if (safe) return raw(`<img src="${esc(safe)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cover-fallback',innerHTML:this.dataset.fb}))" data-fb="${esc(icon(fallbackIcon, 40))}">`);
  return raw(`<div class="cover-fallback">${icon(fallbackIcon, 40)}</div>`);
}

export function bookCard(b, prog) {
  return html`<a class="card card-sm card-link book-card" href="book.html?id=${encodeURIComponent(b.id)}">
    <div class="book-cover">${coverHtml(b.imageUrl, 'book')}<span class="badge">${ic('book-open', 12)} ${fmtNum(b.wordCount || 0)} so'z</span></div>
    <div>
      <div class="book-title truncate">${b.title || 'Kitob'}</div>
      <div class="xs muted mt-1">${b.topicCount || 0} mavzu · ${prog.pct}%</div>
      <div class="mt-2">${progressBar(prog.pct, 'progress-sm')}</div>
    </div>
  </a>`;
}

export function publicFolderCard(f) {
  return html`<a class="card card-sm card-link book-card" href="folder.html?id=${encodeURIComponent(f.id)}">
    <div class="book-cover" style="aspect-ratio:4/3">${coverHtml(f.imageUrl, iconName(f.emoji, 'library'))}</div>
    <div>
      <div class="book-title truncate">${f.name || "Bo'lim"}</div>
      <div class="xs muted mt-1">${f.topicCount ? `${f.topicCount} mavzu` : `${fmtNum(f.wordCount || 0)} so'z`}</div>
    </div>
  </a>`;
}

const TONES = ['tone-violet', 'tone-amber', 'tone-pink', 'tone-blue', 'tone-emerald', 'tone-cyan', 'tone-orange'];
export function toneFor(id = '') {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function myFolderCard(f, prog) {
  const pct = prog ? prog.masteredPct || 0 : 0;
  return html`<div class="card card-link folder-card" data-href="folder.html?id=${encodeURIComponent(f.id)}" tabindex="0" role="link">
    <button class="icon-btn" data-menu="${f.id}" aria-label="Amallar">${ic('more', 18)}</button>
    <div class="tile-icon ${toneFor(f.id)}">${ic(iconName(f.emoji, 'folder'), 22)}</div>
    <div>
      <div class="card-title truncate" style="padding-right:28px">${f.name || "Bo'lim"}</div>
      <div class="xs muted mt-1">${fmtNum(f.wordCount || 0)} ta so'z${prog ? ` · ${pct}% o'zlashtirildi` : ''}</div>
    </div>
    ${progressBar(pct, 'progress-sm')}
  </div>`;
}
/* data-href kartalarni bosiladigan qiladi (ichidagi tugmalar alohida ishlaydi) */
export function bindCardLinks(root) {
  root.querySelectorAll('[data-href]').forEach(card => {
    const go = (e) => { if (e.target.closest('button, a')) return; location.href = card.dataset.href; };
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e); });
  });
}

/* Kichik ochiluvchi menyu */
export function popMenu(anchor, items) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = items.map((it, i) => `<button class="menu-item${it.danger ? ' danger' : ''}" data-i="${i}">${icon(it.icon, 16)}<span>${esc(it.label)}</span></button>`).join('');
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const w = 210;
  menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  menu.style.top = (r.bottom + scrollY + 6) + 'px';
  menu.style.width = w + 'px';
  menu.querySelectorAll('.menu-item').forEach(b => b.onclick = () => { menu.remove(); items[Number(b.dataset.i)].onClick(); });
  setTimeout(() => {
    const off = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', off); } };
    document.addEventListener('mousedown', off);
  });
}

/* Mavzu kartasi (kitob yoki umumiy bo'lim ichidagi) */
export function topicCard(src, t, prog, index) {
  const q = sourceQuery(src);
  const pct = prog ? prog.masteredPct || 0 : 0;
  const done = pct >= 100;
  return html`<div class="card topic-card${done ? ' done' : ''}">
    <div class="row-between">
      <span class="topic-num">${done ? ic('check', 18) : index + 1}</span>
      <button class="icon-btn" data-peek="${t.id}" aria-label="So'zlarni ko'rish" title="So'zlarni ko'rish">${ic('eye', 18)}</button>
    </div>
    <div>
      <div class="card-title">${t.title || 'Mavzu ' + (index + 1)}</div>
      <div class="xs muted mt-1">${fmtNum(t.wordCount || 0)} ta so'z${prog ? ` · ${pct}% o'zlashtirildi` : ''}</div>
    </div>
    ${progressBar(pct, done ? 'progress-sm success' : 'progress-sm')}
    <div class="row mt-1">
      <a class="btn btn-primary btn-sm grow" href="study.html?${raw(q)}" data-start="${t.id}">${ic('play', 15)} ${prog ? 'Davom etish' : 'Boshlash'}</a>
      <a class="btn btn-sm btn-icon" href="flashcards.html?${raw(q)}" title="Flashcard" aria-label="Flashcard">${ic('copy', 16)}</a>
      <a class="btn btn-sm btn-icon" href="quick-quiz.html?${raw(q)}" title="Tezkor kviz" aria-label="Tezkor kviz">${ic('zap', 16)}</a>
      <a class="btn btn-sm btn-icon" href="dictation.html?${raw(q)}" title="Diktant" aria-label="Diktant">${ic('pen-line', 16)}</a>
    </div>
  </div>`;
}

/* So'zlar ro'yxatini ko'rsatuvchi oyna */
export async function peekWords(title, loader) {
  const m = openModal({ title, body: raw('<div class="loading-block"><div class="spinner"></div></div>'), size: 'lg' });
  try {
    const words = await loader();
    const body = m.el.querySelector('.modal-body');
    if (!words.length) { body.innerHTML = '<p class="muted center">Hozircha so\'zlar yo\'q</p>'; return; }
    body.innerHTML = '<div class="list">' + words.map((w, i) => html`<div class="list-row">
      <span class="list-num">${i + 1}</span>
      <div class="list-main"><div class="list-title">${w.en}</div><div class="list-sub">${w.uz}</div></div>
      <button class="icon-btn" data-say="${w.en}" aria-label="Tinglash">${ic('volume', 18)}</button>
    </div>`.value).join('') + '</div>';
    const { speak } = await import('./fx.js');
    body.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  } catch (e) {
    m.el.querySelector('.modal-body').innerHTML = '<p class="muted center">So\'zlarni yuklab bo\'lmadi</p>';
  }
}
