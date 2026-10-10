import { initPage } from '../core.js';
import { logsSince } from '../data.js';
import { streakState, dateKey, addDays } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, progressBar, MONTHS_FULL, WEEKDAYS } from '../ui.js';
import { confetti } from '../fx.js';

const { user, u } = await initPage({ title: 'Streak', active: 'streak' });
const st = streakState(u);
const longest = Math.max(Number(u.longestStreak) || 0, st.current);
const freezes = Number(u.streakFreezes) || 0;

setHTML('hero', html`
  <div class="celebrate-icon" style="margin:0 auto 14px;${st.current ? '' : 'background:var(--surface-3);box-shadow:none'}">${ic('flame', 42)}</div>
  <div class="stat-value" style="font-size:3rem">${st.current}</div>
  <div class="muted">kunlik streak</div>
  <p class="mt-3" style="max-width:420px;margin-left:auto;margin-right:auto">${
    st.doneToday ? "Bugungi mashg'ulot bajarildi! Ertaga ham davom eting."
    : st.atRisk ? (st.frozen ? "Kecha o'tkazib yubordingiz, lekin streak muzlatish sizni qutqaradi — bugun o'qing!" : "Bugun hali o'qimadingiz. Streak'ni saqlash uchun bitta mashg'ulot yetarli.")
    : st.broken ? "Streak uzilgan. Bugun yangisini boshlang — har bir kun muhim!"
    : "Birinchi mashg'ulotingizni bajaring va streak'ni boshlang."}</p>
  ${st.doneToday ? '' : html`<a class="btn btn-gradient btn-lg mt-4" href="quiz.html">${ic('play', 18)} Hozir mashq qilish</a>`}
`);
if (st.current >= 7 && st.doneToday) setTimeout(() => confetti({ count: 90 }), 500);

setHTML('kpis', raw([
  ['trophy', 'tone-amber', longest, 'Eng uzun streak'],
  ['calendar', 'tone-violet', 0, "Shu oyda o'qilgan kunlar", 'month-days'],
  ['snowflake', 'tone-blue', freezes, 'Streak muzlatish']
].map(([i, t, v, l, id]) => `<div class="card stat"><span class="tile-icon ${t}">${icon(i, 22)}</span><div><div class="stat-value"${id ? ` id="${id}"` : ''}>${v}</div><div class="stat-label">${l}</div></div></div>`).join('')));

/* Kalendar — haqiqiy mashg'ulot tarixi asosida */
let days = new Set();
let view = new Date();
view.setDate(1);
const today = dateKey();
$('#prev').innerHTML = icon('chevron-left', 20);
$('#next').innerHTML = icon('chevron-right', 20);

async function loadDays() {
  try { (await logsSince(user.uid, addDays(today, -400))).forEach(l => days.add(l.dateKey)); } catch (e) { /* oflayn */ }
  if (u.lastStudyDate) days.add(u.lastStudyDate);
  renderCal();
}
function renderCal() {
  const y = view.getFullYear(), m = view.getMonth();
  $('#month').textContent = `${MONTHS_FULL[m]} ${y}`;
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const n = new Date(y, m + 1, 0).getDate();
  let out = WEEKDAYS.map(w => `<div class="cal-head">${w}</div>`).join('');
  for (let i = 0; i < first; i++) out += '<div class="cal-day empty"></div>';
  let count = 0;
  for (let d = 1; d <= n; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const done = days.has(k);
    if (done) count++;
    out += `<div class="cal-day${done ? ' done' : ''}${k === today ? ' today' : ''}${k > today ? ' future' : ''}">${d}</div>`;
  }
  $('#cal').innerHTML = out;
  const md = $('#month-days');
  if (md) md.textContent = count;
  const now = new Date();
  $('#next').disabled = y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth());
}
$('#prev').onclick = () => { view.setMonth(view.getMonth() - 1); renderCal(); };
$('#next').onclick = () => { view.setMonth(view.getMonth() + 1); renderCal(); };

/* Keyingi maqsad */
const GOALS = [3, 7, 14, 30, 50, 100, 200, 365];
const nextGoal = GOALS.find(g => g > st.current) || st.current + 100;
const prevGoal = [...GOALS].reverse().find(g => g <= st.current) || 0;
const pct = Math.round(((st.current - prevGoal) / (nextGoal - prevGoal)) * 100);
setHTML('goal', html`<div class="card-head"><div class="card-title">${ic('target', 17)} Keyingi maqsad: ${nextGoal} kun</div><span class="badge badge-streak">${nextGoal - st.current} kun qoldi</span></div>
  ${progressBar(pct, 'streak')}
  <p class="xs dim mt-3">${ic('snowflake', 13)} Streak muzlatish bir kun o'tkazib yuborilganda streak'ni saqlab qoladi. Uni <a href="shop.html">do'kondan</a> olishingiz mumkin.</p>`);

renderCal();
loadDays();
