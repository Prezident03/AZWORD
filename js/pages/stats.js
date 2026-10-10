import { initPage } from '../core.js';
import { recentLogs, logsSince, hardWords } from '../data.js';
import { levelInfo, streakState, dateKey, addDays, parseKey, sourceHome } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, ring, animateRings, countUp, emptyState, WEEKDAYS } from '../ui.js';
import { speak } from '../fx.js';

const { user, u } = await initPage({ title: 'Statistika', active: 'stats' });

setHTML('t-activity', html`${ic('activity', 17)} Faollik (so'zlar)`);
setHTML('t-acc', html`${ic('target', 17)} Aniqlik`);
setHTML('t-level', html`${ic('award', 17)} Daraja`);
setHTML('t-modes', html`${ic('layers', 17)} Mashq turlari`);
setHTML('t-hard', html`${ic('alert-triangle', 18)} Eng qiyin so'zlar`);

const total = Number(u.totalWordsLearned) || 0;
const acc = total ? Math.round(((Number(u.totalPerfectWords) || 0) / total) * 100) : 0;
const hours = Math.round(((Number(u.studyTimeMinutes) || 0) / 60) * 10) / 10;
const st = streakState(u);
const KPIS = [
  ['layers', 'tone-violet', u.sessionsCount || 0, "Mashg'ulotlar"],
  ['graduation-cap', 'tone-emerald', u.wordsMastered || 0, "O'zlashtirilgan so'z"],
  ['target', 'tone-amber', acc, "O'rtacha aniqlik (%)"],
  ['clock', 'tone-blue', hours, "O'qish vaqti (soat)"],
  ['book-open', 'tone-cyan', total, "Mashq qilingan so'zlar"],
  ['flame', 'tone-orange', st.current, 'Joriy streak'],
  ['star', 'tone-pink', u.stars || 0, 'Jami XP'],
  ['coins', 'tone-emerald', u.coins || 0, 'Tangalar']
];
setHTML('kpis', raw(KPIS.map(([i, t, v, l]) => `<div class="card stat"><span class="tile-icon ${t}">${icon(i, 22)}</span><div><div class="stat-value" data-v="${v}">0</div><div class="stat-label">${l}</div></div></div>`).join('')));
document.querySelectorAll('#kpis .stat-value').forEach(el => countUp(el, Number(el.dataset.v)));

const lv = levelInfo(u.stars);
setHTML('level', html`<div class="row" style="gap:20px">
  ${ring(lv.pct, { size: 110, stroke: 10, label: `${lv.level}`, sub: 'daraja' })}
  <div class="grow"><div class="stat-value">${lv.xp} <span class="small muted">/ ${lv.need} XP</span></div>
  <p class="small muted mt-1">Keyingi darajagacha ${lv.left} XP qoldi. XP har bir yangi so'zni birinchi marta xatosiz o'zlashtirganda beriladi.</p></div></div>`);
animateRings($('#level'));

function bars(el, values, labels, { suffix = '', max = null } = {}) {
  const m = max || Math.max(1, ...values);
  setHTML(el, raw(values.map((v, i) => `<div class="bar${v ? '' : ' zero'}" title="${labels[i]}: ${v}${suffix}"><b>${v || ''}</b><i style="height:${Math.max(3, Math.round((v / m) * 100))}%"></i><span>${labels[i]}</span></div>`).join('')));
}

async function load() {
  const today = dateKey();
  const from = addDays(today, -13);
  let logs14 = [], recent = [];
  try { [logs14, recent] = await Promise.all([logsSince(user.uid, from), recentLogs(user.uid, 50)]); } catch (e) { /* oflayn */ }

  const perDay = {};
  logs14.forEach(l => { perDay[l.dateKey] = (perDay[l.dateKey] || 0) + (l.totalWords || 0); });
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  bars('activity', days.map(d => perDay[d] || 0), days.map(d => WEEKDAYS[(parseKey(d).getDay() + 6) % 7]));

  const last = recent.slice(0, 12).reverse();
  if (last.length) bars('accuracy', last.map(l => l.accuracy || 0), last.map((l, i) => `#${i + 1}`), { suffix: '%', max: 100 });
  else setHTML('accuracy', emptyState({ iconName: 'target', title: "Hali ma'lumot yo'q" }));

  const MODES = { study: ["O'rganish", 'layers', 'tone-violet'], review: ['Takrorlash', 'repeat', 'tone-blue'], flashcards: ['Flashcard', 'copy', 'tone-cyan'], quiz: ['Kviz', 'zap', 'tone-emerald'], listening: ['Tinglash', 'headphones', 'tone-pink'] };
  const counts = {};
  recent.forEach(l => { counts[l.mode || 'study'] = (counts[l.mode || 'study'] || 0) + 1; });
  const totalM = recent.length || 1;
  setHTML('modes', recent.length ? html`<div class="stack">${Object.entries(MODES).map(([k, [name, i, t]]) => html`<div class="row">
      <span class="tile-icon sm ${t}">${ic(i, 16)}</span><div class="grow"><div class="row-between small"><span>${name}</span><b>${counts[k] || 0}</b></div>
      <div class="progress progress-sm mt-1"><span style="width:${Math.round(((counts[k] || 0) / totalM) * 100)}%"></span></div></div></div>`)}</div>`
    : emptyState({ iconName: 'layers', title: "Hali mashg'ulot yo'q" }));

  try {
    const hard = await hardWords(user.uid, 10);
    setHTML('hard', hard.length ? html`<div class="list">${hard.map((w, i) => html`<div class="list-row">
      <span class="list-num">${i + 1}</span>
      <div class="list-main"><div class="list-title">${w.en} <span class="muted" style="font-weight:400">— ${w.uz}</span></div>
      <div class="list-sub"><a href="${sourceHome({ kind: w.srcKind, containerId: w.srcId })}">${w.srcTitle || 'Manba'}</a></div></div>
      <button class="icon-btn" data-say="${w.en}" aria-label="Tinglash">${ic('volume', 18)}</button>
      <span class="badge badge-danger">${w.mistakeCount} xato</span></div>`)}</div>`
      : emptyState({ iconName: 'circle-check', title: "Qiyin so'zlar yo'q", sub: "Xato qilgan so'zlaringiz shu yerda ko'rinadi." }));
    document.querySelectorAll('#hard [data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  } catch (e) { setHTML('hard', emptyState({ iconName: 'alert-triangle', title: "Yuklab bo'lmadi" })); }
}
load();
