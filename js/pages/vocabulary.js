import { initPage } from '../core.js';
import { allWordStats } from '../data.js';
import { sourceHome } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, emptyState, errorState, loadingBlock, fmtNum, params, debounce, toDate, timeAgo } from '../ui.js';
import { speak } from '../fx.js';

const { user } = await initPage({ title: "Lug'atim", active: 'vocabulary' });
let all = [];
let filter = 'all';
const search = $('#search');
search.value = params().get('q') || '';

const FILTERS = [
  ['all', 'Hammasi', 'list'],
  ['mastered', "O'zlashtirilgan", 'circle-check'],
  ['learning', "O'rganilmoqda", 'layers'],
  ['hard', 'Qiyin', 'alert-triangle'],
  ['due', 'Takrorlash kerak', 'repeat']
];
const isDue = (w) => { const d = toDate(w.due); return d && d.getTime() <= Date.now(); };
const isHard = (w) => (w.mistakeCount || 0) >= 3 || ((w.wrong || 0) > (w.correct || 0));
const match = {
  all: () => true,
  mastered: (w) => !!w.mastered,
  learning: (w) => !w.mastered,
  hard: isHard,
  due: isDue
};

async function load() {
  setHTML('list', loadingBlock());
  try { all = await allWordStats(user.uid); }
  catch (e) { errorState('list', load); return; }
  all.sort((a, b) => String(a.en).localeCompare(String(b.en)));
  const counts = Object.fromEntries(FILTERS.map(([k]) => [k, all.filter(match[k]).length]));
  setHTML('summary', raw([
    ['book-marked', 'tone-violet', counts.all, "Jami so'zlar"],
    ['graduation-cap', 'tone-emerald', counts.mastered, "O'zlashtirilgan"],
    ['repeat', 'tone-blue', counts.due, 'Takrorlash kerak'],
    ['alert-triangle', 'tone-orange', counts.hard, 'Qiyin so\'zlar']
  ].map(([i, t, v, l]) => `<div class="card stat"><span class="tile-icon ${t}">${icon(i, 22)}</span><div><div class="stat-value">${fmtNum(v)}</div><div class="stat-label">${l}</div></div></div>`).join('')));
  setHTML('filters', raw(FILTERS.map(([k, l, i]) => `<button class="tab${k === filter ? ' active' : ''}" data-f="${k}">${icon(i, 15)} ${l} <span class="tab-count">${counts[k]}</span></button>`).join('')));
  document.querySelectorAll('#filters .tab').forEach(b => b.onclick = () => {
    filter = b.dataset.f;
    document.querySelectorAll('#filters .tab').forEach(x => x.classList.toggle('active', x === b));
    render();
  });
  render();
}

function render() {
  if (!all.length) {
    setHTML('list', html`<div class="card">${emptyState({ iconName: 'book-marked', title: "Lug'atingiz hali bo'sh", sub: "Mavzularni o'rganishni boshlang — mashq qilgan har bir so'z shu yerda saqlanadi.", action: html`<a class="btn btn-primary" href="folders.html">${ic('library', 16)} O'rganishni boshlash</a>` })}</div>`);
    return;
  }
  const q = search.value.trim().toLowerCase();
  const shown = all.filter(match[filter]).filter(w => !q || String(w.en).toLowerCase().includes(q) || String(w.uz).toLowerCase().includes(q));
  if (!shown.length) { setHTML('list', html`<div class="card">${emptyState({ iconName: 'search', title: 'Hech narsa topilmadi', sub: q ? `"${q}" bo'yicha so'z yo'q.` : "Bu bo'limda hozircha so'z yo'q." })}</div>`); return; }
  setHTML('list', html`<div class="card card-flush"><div class="list">${shown.slice(0, 400).map(w => {
    const box = w.box || 0;
    const state = w.mastered ? ['badge-success', "O'zlashtirilgan"] : ['badge-warning', "O'rganilmoqda"];
    const href = sourceHome({ kind: w.srcKind, containerId: w.srcId });
    return html`<div class="list-row">
      <button class="icon-btn" data-say="${w.en}" aria-label="Tinglash">${ic('volume', 18)}</button>
      <div class="list-main">
        <div class="list-title">${w.en} <span class="muted" style="font-weight:400">— ${w.uz}</span></div>
        <div class="list-sub"><a href="${href}">${w.srcTitle || 'Manba'}</a> · ${timeAgo(w.lastSeen)}${(w.mistakeCount || 0) ? ` · ${w.mistakeCount} xato` : ''}</div>
      </div>
      <span class="badge ${isDue(w) ? 'badge-info' : ''}" title="Takrorlash qutisi">${ic('layers', 12)} ${box}</span>
      <span class="badge ${state[0]}">${state[1]}</span>
    </div>`;
  })}</div></div>${shown.length > 400 ? html`<p class="xs dim center mt-2">Birinchi 400 ta so'z ko'rsatildi — qidiruvdan foydalaning.</p>` : ''}`);
  document.querySelectorAll('#list [data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
}
search.addEventListener('input', debounce(render, 120));
load();
