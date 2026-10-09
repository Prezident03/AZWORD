/* AzWord · sahifa yadrosi
   Har bir himoyalangan sahifa:  const ctx = await initPage({ title, active });
   - Kirishni tekshiradi (bo'lmasa index.html'ga yo'naltiradi)
   - Bloklangan foydalanuvchi va texnik ishlar rejimini boshqaradi
   - Sidebar, topbar, mobil pastki menyu va qidiruv (Ctrl+K) ni chizadi
   - PWA, oflayn banner va kutilayotgan mashg'ulotlarni sinxronlaydi */
import { auth, onAuthStateChanged, signOut } from './firebase.js';
import {
  loadUserDoc, getSettings, isAdminUser, touchLastSeen, syncLeaderboard, flushPending,
  listMyFolders, listBooks, listPublicFolders, countDue
} from './data.js';
import { levelInfo, streakState } from './game.js';
import { icon, LOGO_SVG, starIcon } from './icons.js';
import { esc, html, raw, setHTML, fmtNum, toast } from './ui.js';
import { getPrefs } from './prefs.js';

const NAV = [
  { section: 'Asosiy' },
  { id: 'dashboard', href: 'dashboard.html', label: 'Bosh sahifa', icon: 'home' },
  { id: 'learn', href: 'folders.html', label: "O'rganish", icon: 'library' },
  { id: 'practice', href: 'quiz.html', label: 'Mashq', icon: 'zap' },
  { id: 'review', href: 'review.html', label: 'Takrorlash', icon: 'repeat', badge: 'due' },
  { id: 'vocabulary', href: 'vocabulary.html', label: "Lug'atim", icon: 'book-marked' },
  { id: 'ai', href: 'ai.html', label: 'AI yordamchi', icon: 'sparkles' },
  { section: 'Natijalar' },
  { id: 'stats', href: 'stats.html', label: 'Statistika', icon: 'bar-chart' },
  { id: 'streak', href: 'streak.html', label: 'Streak', icon: 'flame' },
  { id: 'achievements', href: 'achievements.html', label: 'Yutuqlar', icon: 'medal' },
  { id: 'leaderboard', href: 'leaderboard.html', label: 'Reyting', icon: 'trophy' },
  { section: 'Hisob' },
  { id: 'shop', href: 'shop.html', label: "Do'kon", icon: 'shopping-bag' },
  { id: 'profile', href: 'profile.html', label: 'Profil', icon: 'user' },
  { id: 'settings', href: 'settings.html', label: 'Sozlamalar', icon: 'settings' },
  { id: 'admin', href: 'admin.html', label: 'Admin panel', icon: 'shield', admin: true }
];
const BOTTOM = [
  { ids: ['dashboard'], href: 'dashboard.html', label: 'Bosh', icon: 'home' },
  { ids: ['learn'], href: 'folders.html', label: "O'rganish", icon: 'library' },
  { ids: ['practice', 'review', 'vocabulary', 'ai'], href: 'quiz.html', label: 'Mashq', icon: 'zap' },
  { ids: ['leaderboard', 'streak', 'achievements', 'stats'], href: 'leaderboard.html', label: 'Reyting', icon: 'trophy' },
  { ids: ['profile', 'settings', 'shop', 'admin'], href: 'profile.html', label: 'Profil', icon: 'user' }
];

let state = null;

/* Faqat auth holatini kutish (sahifa chizilmaydi) */
export function waitForUser() {
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, (u) => { off(); resolve(u); });
  });
}

function hideBoot() {
  const b = document.querySelector('.boot');
  if (b) { b.classList.add('done'); setTimeout(() => b.remove(), 300); }
}

function fullScreenMessage({ iconName, title, text, actions = '' }) {
  document.body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'center-screen';
  setHTML(wrap, html`<div class="card card-lg" style="max-width:440px">
    <div class="empty" style="padding:8px 0">
      <div class="empty-icon">${raw(icon(iconName, 30))}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${text}</div>
      <div class="row wrap" style="justify-content:center;margin-top:8px">${actions}</div>
    </div></div>`);
  document.body.appendChild(wrap);
  const out = wrap.querySelector('[data-logout]');
  if (out) out.onclick = logout;
}

export async function logout() {
  try { await signOut(auth); } finally { location.href = 'index.html'; }
}

/* ── Asosiy kirish nuqtasi ─────────────────────────────── */
export async function initPage({ title = '', active = '', admin = false, shell = true, back = null } = {}) {
  const user = await waitForUser();
  if (!user) {
    const next = location.pathname.split('/').pop() + location.search;
    location.replace('index.html' + (next && next !== 'index.html' ? '?next=' + encodeURIComponent(next) : ''));
    return new Promise(() => {});
  }

  const [settings, u] = await Promise.all([getSettings(), loadUserDoc(user).catch(() => null)]);
  const isAdmin = isAdminUser(user, settings);
  const profile = u || { displayName: user.displayName || '', email: user.email };

  if (profile.blocked && !isAdmin) {
    fullScreenMessage({
      iconName: 'ban', title: 'Hisobingiz bloklangan',
      text: "Hisobingiz administrator tomonidan vaqtincha cheklangan. Savollar bo'lsa, administrator bilan bog'laning.",
      actions: raw(`<button class="btn" data-logout>${icon('log-out', 16)} Chiqish</button>`)
    });
    return new Promise(() => {});
  }
  if (settings.maintenance && !isAdmin) {
    fullScreenMessage({
      iconName: 'settings', title: 'Texnik ishlar olib borilmoqda',
      text: settings.maintenanceText || "AzWord tez orada qaytadi. Iltimos, birozdan so'ng qayta kiring.",
      actions: raw(`<button class="btn" onclick="location.reload()">${icon('refresh', 16)} Qayta tekshirish</button><button class="btn btn-ghost" data-logout>Chiqish</button>`)
    });
    return new Promise(() => {});
  }
  if (admin && !isAdmin) {
    location.replace('dashboard.html');
    return new Promise(() => {});
  }

  state = { user, u: profile, settings, isAdmin, active };
  if (title) document.title = `${title} · AzWord`;
  if (shell) buildShell({ title, active, back });
  hideBoot();
  setupGlobal();

  /* Fon vazifalari */
  if (u) {
    touchLastSeen(user.uid);
    flushPending(user.uid).then(() => {});
    if (!sessionStorage.getItem('az:lb-sync')) {
      sessionStorage.setItem('az:lb-sync', '1');
      syncLeaderboard(user.uid, u);
    }
  }
  if (shell) refreshDueBadge();
  checkReminder(profile);

  return {
    user, u: profile, settings, isAdmin,
    setUser(next) { state.u = next; renderStats(); }
  };
}

/* ── Shell ─────────────────────────────────────────────── */
function buildShell({ title, active, back }) {
  const main = document.querySelector('main');
  const app = document.createElement('div');
  app.className = 'app';
  app.innerHTML = `
    <aside class="sidebar" aria-label="Asosiy menyu">
      <a class="sb-brand" href="dashboard.html"><span class="sb-brand-mark">${LOGO_SVG}</span><span class="sb-brand-name"><b>Az</b>Word</span></a>
      <nav class="sb-nav" id="sb-nav"></nav>
      <div class="sb-footer">
        <div class="sb-level" id="sb-level"></div>
        <a class="sb-user" href="profile.html" id="sb-user"></a>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        ${back ? `<a class="icon-btn topbar-back" href="${esc(back)}" aria-label="Orqaga">${icon('arrow-left', 20)}</a>` : ''}
        <div class="topbar-title" id="topbar-title"></div>
        <div class="topbar-spacer"></div>
        <button class="topbar-search" id="open-search" aria-label="Qidirish">${icon('search', 16)}<span>Qidirish...</span><kbd>Ctrl K</kbd></button>
        <div class="topbar-stats" id="topbar-stats"></div>
      </header>
    </div>
    <nav class="bottom-nav" aria-label="Pastki menyu">
      ${BOTTOM.map(b => `<a class="bn-item${b.ids.includes(active) ? ' active' : ''}" href="${b.href}">${icon(b.icon, 22)}<span>${b.label}</span></a>`).join('')}
    </nav>`;
  document.body.insertBefore(app, document.body.firstChild);
  const appMain = app.querySelector('.app-main');
  if (main) appMain.appendChild(main);
  app.querySelector('#topbar-title').textContent = title;

  const nav = app.querySelector('#sb-nav');
  nav.innerHTML = NAV.filter(n => !n.admin || state.isAdmin).map(n => n.section
    ? `<div class="sb-label">${n.section}</div>`
    : `<a class="sb-link${n.id === active ? ' active' : ''}" href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${icon(n.icon, 18)}<span>${n.label}</span>${n.badge ? `<span class="sb-count" data-badge="${n.badge}" hidden></span>` : ''}</a>`
  ).join('');
  app.querySelector('#open-search').onclick = openPalette;
  renderStats();
}

export function renderStats() {
  if (!state) return;
  const u = state.u || {};
  const st = streakState(u);
  const lv = levelInfo(u.stars);
  const stats = document.getElementById('topbar-stats');
  if (stats) {
    stats.innerHTML = `
      <a class="stat-pill streak${st.current ? '' : ' off'}" href="streak.html" title="Streak">${icon('flame', 16)}<span>${fmtNum(st.current)}</span></a>
      <a class="stat-pill stars" href="stats.html" title="Yulduzlar (XP)">${starIcon(16)}<span>${fmtNum(u.stars)}</span></a>
      <a class="stat-pill coins" href="shop.html" title="Tangalar">${icon('coins', 16)}<span>${fmtNum(u.coins)}</span></a>`;
  }
  const lvl = document.getElementById('sb-level');
  if (lvl) {
    lvl.innerHTML = `<div class="sb-level-row"><span><b>${lv.level}</b>-daraja</span><span>${lv.xp} / ${lv.need} XP</span></div>
      <div class="progress progress-sm"><span style="width:${lv.pct}%"></span></div>`;
  }
  const sbu = document.getElementById('sb-user');
  if (sbu) {
    const name = u.displayName || state.user.displayName || (state.user.email || '').split('@')[0];
    const photo = u.photoBase64 && /^data:image\//.test(u.photoBase64) ? `<img src="${esc(u.photoBase64)}" alt="">` : esc(name.charAt(0).toUpperCase());
    sbu.innerHTML = `<div class="avatar avatar-sm">${photo}</div><div class="sb-user-info"><div class="sb-user-name">${esc(name)}</div><div class="sb-user-email">${esc(state.user.email || '')}</div></div>`;
  }
}

async function refreshDueBadge() {
  try {
    const n = await countDue(state.user.uid);
    document.querySelectorAll('[data-badge="due"]').forEach(el => {
      el.hidden = !n;
      el.textContent = n >= 100 ? '99+' : String(n);
    });
  } catch (e) { /* ignore */ }
}

/* ── Global: PWA, tarmoq, klaviatura ───────────────────── */
let globalsReady = false;
function setupGlobal() {
  if (globalsReady) return;
  globalsReady = true;
  registerSW();
  const banner = document.createElement('div');
  banner.className = 'net-banner';
  banner.setAttribute('role', 'status');
  document.body.appendChild(banner);
  let timer;
  const offline = () => { clearTimeout(timer); banner.className = 'net-banner show'; banner.textContent = "Internet yo'q — oxirgi saqlangan ma'lumotlar ko'rsatilmoqda"; };
  const online = () => {
    banner.className = 'net-banner show online'; banner.textContent = 'Internet tiklandi';
    timer = setTimeout(() => banner.classList.remove('show'), 2200);
    if (state && state.user) flushPending(state.user.uid);
  };
  addEventListener('offline', offline);
  addEventListener('online', online);
  if (navigator.onLine === false) offline();

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  });
}
export function registerSW() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

/* ── Eslatma (bildirishnoma) ───────────────────────────── */
function checkReminder(u) {
  const p = getPrefs();
  if (!p.reminder || !('Notification' in window) || Notification.permission !== 'granted') return;
  const st = streakState(u);
  if (st.doneToday) return;
  const [h, m] = String(p.reminderTime || '19:00').split(':').map(Number);
  const now = new Date();
  const at = new Date(); at.setHours(h || 19, m || 0, 0, 0);
  const key = 'az:reminded:' + now.toDateString();
  const fire = () => {
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      const body = st.atRisk ? `${st.current} kunlik streak'ingizni saqlab qoling!` : "Bugungi mashg'ulotni boshlash vaqti keldi.";
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(r => r.showNotification('AzWord — mashq vaqti', { body, icon: 'icon-192.png', tag: 'az-reminder' }));
      } else {
        new Notification('AzWord — mashq vaqti', { body, icon: 'icon-192.png', tag: 'az-reminder' });
      }
    } catch (e) { /* ignore */ }
  };
  if (now >= at) fire();
  else setTimeout(fire, Math.min(at - now, 2 ** 31 - 1));
}

/* ── Buyruqlar palitrasi (Ctrl+K) ─────────────────────── */
let paletteCache = null;
async function paletteItems() {
  const pages = NAV.filter(n => !n.section && (!n.admin || state.isAdmin)).map(n => ({ group: 'Sahifalar', title: n.label, icon: n.icon, href: n.href }));
  const extra = [
    { group: 'Amallar', title: "Yangi bo'lim yaratish", icon: 'folder-plus', href: 'folders.html?new=1' },
    { group: 'Amallar', title: 'Tezkor kviz', icon: 'zap', href: 'quick-quiz.html' },
    { group: 'Amallar', title: 'Flashcard takrorlash', icon: 'layers', href: 'flashcards.html' },
    { group: 'Amallar', title: 'Tinglab tushunish', icon: 'headphones', href: 'quick-quiz.html?mode=listen' }
  ];
  if (!paletteCache) {
    paletteCache = [];
    try {
      const [mine, books, pub] = await Promise.all([
        listMyFolders(state.user.uid).catch(() => []), listBooks().catch(() => []), listPublicFolders().catch(() => [])
      ]);
      books.forEach(b => paletteCache.push({ group: 'Kitoblar', title: b.title || 'Kitob', icon: 'book', href: 'book.html?id=' + encodeURIComponent(b.id) }));
      pub.forEach(f => paletteCache.push({ group: "Umumiy bo'limlar", title: f.name || "Bo'lim", icon: 'library', href: 'folder.html?id=' + encodeURIComponent(f.id) }));
      mine.forEach(f => paletteCache.push({ group: "Mening bo'limlarim", title: f.name || "Bo'lim", sub: `${f.wordCount || 0} so'z`, icon: 'folder', href: 'folder.html?id=' + encodeURIComponent(f.id) }));
    } catch (e) { /* ignore */ }
  }
  return [...pages, ...extra, ...paletteCache];
}
function highlight(text, q) {
  const t = esc(text);
  if (!q) return t;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return t;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}
export async function openPalette() {
  if (document.querySelector('.cmdk') || !state) return;
  const el = document.createElement('div');
  el.className = 'cmdk';
  el.innerHTML = `<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Qidiruv">
    <div class="cmdk-input-wrap">${icon('search', 18)}<input class="cmdk-input" placeholder="Sahifa, kitob, bo'lim yoki so'z qidiring..." aria-label="Qidiruv"><kbd>Esc</kbd></div>
    <div class="cmdk-list" role="listbox"><div class="loading-block"><div class="spinner"></div></div></div>
    <div class="cmdk-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> tanlash</span><span><kbd>Enter</kbd> ochish</span></div>
  </div>`;
  document.body.appendChild(el);
  const input = el.querySelector('input');
  const list = el.querySelector('.cmdk-list');
  input.focus();
  const close = () => el.remove();
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  const items = await paletteItems();
  let shown = [];
  let activeIdx = 0;
  const render = () => {
    const q = input.value.trim();
    const ql = q.toLowerCase();
    shown = (q ? items.filter(i => i.title.toLowerCase().includes(ql) || (i.sub || '').toLowerCase().includes(ql)) : items).slice(0, 40);
    if (q) shown.push({ group: "Lug'at", title: `"${q}" so'zini lug'atimdan qidirish`, icon: 'search', href: 'vocabulary.html?q=' + encodeURIComponent(q) });
    if (!shown.length) { list.innerHTML = `<div class="cmdk-empty">Hech narsa topilmadi</div>`; return; }
    activeIdx = Math.min(activeIdx, shown.length - 1);
    let out = '', group = '';
    shown.forEach((it, i) => {
      if (it.group !== group) { group = it.group; out += `<div class="cmdk-group">${esc(group)}</div>`; }
      out += `<div class="cmdk-item${i === activeIdx ? ' active' : ''}" data-i="${i}" role="option">${icon(it.icon || 'arrow-right', 18)}<span class="cmdk-item-title">${highlight(it.title, q)}</span>${it.sub ? `<span class="cmdk-item-sub">${esc(it.sub)}</span>` : ''}</div>`;
    });
    list.innerHTML = out;
    list.querySelectorAll('.cmdk-item').forEach(n => {
      n.onclick = () => go(Number(n.dataset.i));
      n.onmousemove = () => { if (activeIdx !== Number(n.dataset.i)) { activeIdx = Number(n.dataset.i); sync(); } };
    });
  };
  const sync = () => list.querySelectorAll('.cmdk-item').forEach(n => {
    const on = Number(n.dataset.i) === activeIdx;
    n.classList.toggle('active', on);
    if (on) n.scrollIntoView({ block: 'nearest' });
  });
  const go = (i) => { const it = shown[i]; if (it) { close(); location.href = it.href; } };
  input.addEventListener('input', () => { activeIdx = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % shown.length; sync(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + shown.length) % shown.length; sync(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(activeIdx); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  render();
}

export function currentState() { return state; }
export { toast };
