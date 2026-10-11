import { initPage } from '../core.js';
import {
  listBooks, listPublicFolders, listMyFolders, listProgress, recentLogs, logsSince, listAnnouncements,
  countDue, deleteContainerDeep
} from '../data.js';
import { levelInfo, streakState, todayWords, dailyGoal, dateKey, addDays, sourceQuery } from '../game.js';
import { icon, iconName } from '../icons.js';
import {
  $, html, raw, ic, setHTML, ring, animateRings, countUp, timeAgo, emptyState, errorState,
  skeletonCards, confirmDialog, toast, toastError, WEEKDAYS
} from '../ui.js';
import {
  getLast, bookCard, bookProgress, publicFolderCard, myFolderCard, bindCardLinks, folderDialog, popMenu
} from '../widgets.js';

const ctx = await initPage({ title: 'Bosh sahifa', active: 'dashboard' });
const { user } = ctx;
let u = ctx.u;

/* Sarlavhalar */
setHTML('books-title', html`${ic('book', 18)} Kitoblar`);
setHTML('public-title', html`${ic('library', 18)} Umumiy bo'limlar`);
setHTML('mine-title', html`${ic('folder', 18)} Mening bo'limlarim`);
setHTML('recent-title', html`${ic('clock', 18)} So'nggi faollik`);
setHTML('new-folder', html`${ic('plus', 16)} Yangi bo'lim`);

/* ── Hero ── */
const hour = new Date().getHours();
const greet = hour < 5 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';
const name = (u.displayName || user.displayName || (user.email || '').split('@')[0] || '').split(' ')[0];
$('#hero-greet').textContent = greet + ',';
$('#hero-name').textContent = name ? `${name}!` : 'Xush kelibsiz!';
const st = streakState(u);
const goal = dailyGoal(u);
const done = todayWords(u);
$('#hero-sub').textContent = st.doneToday
  ? (done >= goal ? "Bugungi maqsad bajarildi — ajoyib! Xohlasangiz takrorlashni davom ettiring." : `Bugun ${done} ta so'z o'rgandingiz. Maqsadgacha ${goal - done} ta qoldi.`)
  : st.atRisk ? `${st.current} kunlik streak'ingiz xavf ostida — bugun kamida bitta mashg'ulot qiling.` : "Bugungi mashg'ulotni boshlashga tayyormisiz?";

const last = getLast();
const due = await countDue(user.uid);
setHTML('hero-actions', html`
  ${last
    ? html`<a class="btn btn-gradient btn-lg" href="study.html?${raw(sourceQuery(last))}">${ic('play', 18)} Davom ettirish${last.title ? html`<span class="truncate" style="max-width:180px;opacity:.85;font-weight:500">· ${last.title}</span>` : ''}</a>`
    : html`<a class="btn btn-gradient btn-lg" href="folders.html">${ic('play', 18)} O'rganishni boshlash</a>`}
  ${due ? html`<a class="btn btn-lg" href="review.html">${ic('repeat', 18)} Takrorlash · ${due}</a>` : html`<a class="btn btn-lg" href="quiz.html">${ic('zap', 18)} Mashq</a>`}
`);

/* ── Kunlik maqsad ── */
function renderGoal() {
  const d = todayWords(u), g = dailyGoal(u);
  const pct = Math.min(100, Math.round((d / g) * 100));
  setHTML('goal-card', html`
    ${ring(pct, { size: 92, stroke: 9, label: `${Math.min(d, 999)}`, sub: `/ ${g}` })}
    <div class="grow">
      <div class="card-title">Kunlik maqsad</div>
      <p class="small muted mt-1">${pct >= 100 ? "Bajarildi! Bugun zo'r ishladingiz." : `Bugun ${g} ta so'z — ${Math.max(0, g - d)} tasi qoldi.`}</p>
      <a class="btn btn-ghost btn-sm mt-2" href="settings.html" style="padding-left:0">${ic('target', 15)} Maqsadni o'zgartirish</a>
    </div>`);
  animateRings($('#goal-card'));
}
renderGoal();

/* ── Streak + hafta ── */
async function renderStreak() {
  const today = dateKey();
  const monday = addDays(today, -((new Date().getDay() + 6) % 7));
  let days = new Set();
  try { (await logsSince(user.uid, monday)).forEach(l => days.add(l.dateKey)); } catch (e) { /* oflayn */ }
  if (u.lastStudyDate && u.lastStudyDate >= monday) days.add(u.lastStudyDate);
  const s = streakState(u);
  setHTML('streak-card', html`
    <div class="row-between">
      <div class="row"><span class="tile-icon sm tone-orange">${ic('flame', 18)}</span>
        <div><div class="card-title">${s.current} kunlik streak</div>
        <div class="xs muted">${s.doneToday ? 'Bugun bajarildi' : s.atRisk ? "Bugun o'qing — streak saqlanadi" : s.broken ? 'Yangi streak boshlang' : 'Birinchi kunni boshlang'}</div></div>
      </div>
      ${ic('chevron-right', 18)}
    </div>
    <div class="week-dots">${raw(WEEKDAYS.map((w, i) => {
      const k = addDays(monday, i);
      return `<div class="week-dot${days.has(k) ? ' done' : ''}${k === today ? ' today' : ''}"><i></i>${w}</div>`;
    }).join(''))}</div>`);
}
renderStreak();

/* ── KPI ── */
function renderKpis() {
  const lv = levelInfo(u.stars);
  const total = Number(u.totalWordsLearned) || 0;
  const acc = total ? Math.round(((Number(u.totalPerfectWords) || 0) / total) * 100) : 0;
  const hours = Math.round(((Number(u.studyTimeMinutes) || 0) / 60) * 10) / 10;
  const items = [
    { i: 'award', tone: 'tone-violet', v: lv.level, l: `Daraja · ${lv.xp}/${lv.need} XP`, href: 'stats.html' },
    { i: 'graduation-cap', tone: 'tone-emerald', v: u.wordsMastered || 0, l: "O'zlashtirilgan so'z", href: 'vocabulary.html' },
    { i: 'clock', tone: 'tone-blue', v: hours, l: "O'qish vaqti (soat)", href: 'stats.html' },
    { i: 'target', tone: 'tone-amber', v: acc, l: 'Aniqlik (%)', href: 'stats.html' }
  ];
  setHTML('kpis', raw(items.map(k => `<a class="card card-link stat" href="${k.href}"><span class="tile-icon ${k.tone}">${icon(k.i, 22)}</span><div><div class="stat-value" data-v="${k.v}">0</div><div class="stat-label">${k.l}</div></div></a>`).join('')));
  document.querySelectorAll('#kpis .stat-value').forEach(el => countUp(el, Number(el.dataset.v)));
}
renderKpis();

/* ── E'lon ── */
async function renderAnnouncement() {
  try {
    const list = await listAnnouncements(1);
    const a = list[0];
    if (!a || !a.text) return;
    let dismissed = '';
    try { dismissed = localStorage.getItem('az:ann-dismissed') || ''; } catch (e) { /* ignore */ }
    if (dismissed === a.id) return;
    const box = $('#announce');
    setHTML(box, html`<div class="alert alert-info mb-4 fade-up">${ic(iconName(a.emoji, 'megaphone'), 20)}
      <div class="grow"><div style="white-space:pre-wrap">${a.text}</div><div class="xs dim mt-1">${timeAgo(a.createdAt)}</div></div>
      <button class="icon-btn alert-close" aria-label="Yopish">${ic('x', 16)}</button></div>`);
    box.querySelector('.alert-close').onclick = () => { try { localStorage.setItem('az:ann-dismissed', a.id); } catch (e) { /* ignore */ } box.innerHTML = ''; };
  } catch (e) { /* e'lonsiz davom etamiz */ }
}
renderAnnouncement();

/* ── Kitoblar, umumiy bo'limlar, mening bo'limlarim ── */
let progress = {};
async function loadContent() {
  setHTML('books', skeletonCards(4));
  setHTML('public', skeletonCards(4));
  setHTML('mine', skeletonCards(3));
  try { progress = await listProgress(user.uid); } catch (e) { progress = {}; }

  listBooks().then(books => {
    if (!books.length) { $('#books-section').hidden = true; return; }
    setHTML('books', raw(books.slice(0, 8).map(b => bookCard(b, bookProgress(b, progress)).value).join('')));
  }).catch(() => errorState('books', loadContent));

  listPublicFolders().then(list => {
    if (!list.length) { $('#public-section').hidden = true; return; }
    setHTML('public', raw(list.slice(0, 8).map(f => publicFolderCard(f).value).join('')));
  }).catch(() => errorState('public', loadContent));

  loadMine();
}
let myFolders = [];
async function loadMine() {
  try { myFolders = await listMyFolders(user.uid); }
  catch (e) { errorState('mine', loadMine); return; }
  const box = $('#mine');
  if (!myFolders.length) {
    setHTML(box, html`<div class="card" style="grid-column:1/-1">${emptyState({
      iconName: 'folder-plus', title: "Hali shaxsiy bo'lim yo'q",
      sub: "O'zingiz uchun bo'lim yarating va unga so'zlar qo'shing — qo'lda, fayldan yoki AI yordamida.",
      action: html`<button class="btn btn-primary" data-new>${ic('plus', 16)} Bo'lim yaratish</button>`
    })}</div>`);
    box.querySelector('[data-new]').onclick = newFolder;
    return;
  }
  setHTML(box, raw(myFolders.slice(0, 7).map(f => myFolderCard(f, progress[`folder_${f.id}__`]).value).join('')
    + `<button class="add-card" data-new>${icon('plus', 26)}<span>Yangi bo'lim</span></button>`));
  box.querySelector('[data-new]').onclick = newFolder;
  bindCardLinks(box);
  box.querySelectorAll('[data-menu]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const f = myFolders.find(x => x.id === btn.dataset.menu);
    popMenu(btn, [
      { icon: 'play', label: "O'rganish", onClick: () => { location.href = 'study.html?id=' + encodeURIComponent(f.id); } },
      { icon: 'edit', label: 'Tahrirlash', onClick: async () => { if (await folderDialog(user.uid, f, myFolders.map(x => x.name))) loadMine(); } },
      { icon: 'trash-2', label: "O'chirish", danger: true, onClick: () => removeFolder(f) }
    ]);
  }));
}
async function newFolder() {
  const r = await folderDialog(user.uid, null, myFolders.map(f => f.name));
  if (r) location.href = 'folder.html?id=' + encodeURIComponent(r.id);
}
async function removeFolder(f) {
  const ok = await confirmDialog({ title: "Bo'limni o'chirish", message: `"${f.name}" bo'limi va undagi ${f.wordCount || 0} ta so'z butunlay o'chiriladi.`, confirmText: "O'chirish", danger: true });
  if (!ok) return;
  try { await deleteContainerDeep('folder', f.id); toast("Bo'lim o'chirildi"); loadMine(); }
  catch (e) { toastError("O'chirib bo'lmadi"); }
}
$('#new-folder').onclick = newFolder;
loadContent();

/* ── So'nggi faollik ── */
const MODE = { study: ["O'rganish", 'layers'], quiz: ['Tezkor kviz', 'zap'], flashcards: ['Flashcard', 'copy'], review: ['Takrorlash', 'repeat'], listening: ['Tinglash', 'headphones'], dictation: ['Diktant', 'pen-line'] };
async function renderRecent() {
  try {
    const logs = await recentLogs(user.uid, 6);
    if (!logs.length) {
      setHTML('recent', emptyState({ iconName: 'activity', title: "Hali mashg'ulot yo'q", sub: "Birinchi mavzuni o'rganib chiqing — natijalaringiz shu yerda ko'rinadi." }));
      return;
    }
    setHTML('recent', raw('<div class="list">' + logs.map(l => {
      const [label, ico] = MODE[l.mode] || MODE.study;
      const tone = l.accuracy >= 80 ? 'badge-success' : l.accuracy >= 50 ? 'badge-warning' : 'badge-danger';
      return html`<div class="list-row">
        <span class="tile-icon sm tone-soft">${ic(ico, 18)}</span>
        <div class="list-main"><div class="list-title truncate">${l.title || label}</div>
          <div class="list-sub">${label} · ${l.totalWords || 0} so'z · ${timeAgo(l.studiedAt)}</div></div>
        ${l.stars ? html`<span class="badge badge-warning">+${l.stars} XP</span>` : ''}
        <span class="badge ${tone}">${l.accuracy || 0}%</span>
      </div>`.value;
    }).join('') + '</div>'));
  } catch (e) { errorState('recent', renderRecent); }
}
renderRecent();
