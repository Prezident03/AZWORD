import { initPage } from '../core.js';
import { listAchievements, claimAchievements, listTopics, flushPending, pendingCount } from '../data.js';
import { sourceQuery, achievementReady } from '../game.js';
import { iconName, starIcon } from '../icons.js';
import { $, html, raw, ic, setHTML, ring, animateRings, emptyState, withLoading, toast, toastError } from '../ui.js';
import { readResult } from '../session.js';
import { playSound, confetti } from '../fx.js';

const ctx = await initPage({ title: 'Natija', active: 'practice' });
const data = readResult();
const STAGE_NAMES = { 1: 'Tanishish', 2: 'Variantlar', 3: "Bo'laklash", 4: 'Moslashtirish', 5: 'Yozish', 6: 'Kviz', 7: 'Flashcard', 8: 'Tinglash', 9: "Diktant: so'z", 10: 'Diktant: gap' };
const MODE_LABEL = { study: "O'rganish", quiz: 'Tezkor kviz', flashcards: 'Flashcard', review: 'Takrorlash', listening: 'Tinglab tushunish', dictation: 'Diktant' };

if (!data || !data.words || !data.words.length) {
  setHTML('hero', emptyState({ iconName: 'activity', title: "Natija topilmadi", sub: "Mashg'ulotni yakunlaganingizdan keyin natijalar shu yerda ko'rinadi.", action: html`<a class="btn btn-primary" href="dashboard.html">Bosh sahifa</a>` }));
  $('#all').closest('.section').hidden = true;
} else {
  render();
}

function render() {
  const { words, results, res = {}, mode = 'study' } = data;
  const total = words.length;
  const perfect = words.filter(w => results[w.id] && !results[w.id].mistakes.length).length;
  const pct = total ? Math.round((perfect / total) * 100) : 0;
  const [title, sub] = pct === 100 ? ['Mukammal natija!', "Barcha so'zlarni xatosiz bajardingiz.", 'success']
    : pct >= 70 ? ["Zo'r natija!", 'Juda yaxshi — shu ruhda davom eting.', 'success']
    : pct >= 40 ? ['Yaxshi urinish!', "Xato qilgan so'zlaringizni yana takrorlang.", 'warning']
    : ["O'rganishda davom eting", "Bu so'zlar takrorlash ro'yxatiga qo'shildi — ertaga yana uchrashamiz.", 'danger'];

  setHTML('hero', html`
    <span class="badge badge-primary">${ic('layers', 12)} ${MODE_LABEL[mode] || 'Mashg\'ulot'} · ${data.title || ''}</span>
    <div class="score-ring mt-4">${ring(pct, { size: 140, stroke: 12, label: `${perfect}/${total}`, sub: mode === 'dictation' ? 'yordamsiz' : 'xatosiz' })}</div>
    <h1 class="page-title">${title}</h1>
    <p class="muted mt-1">${sub}</p>
    <div class="reward-row">
      ${res.stars ? html`<div class="reward">${raw(starIcon(22))}<div><b>+${res.stars}</b><div class="xs muted">XP</div></div></div>` : ''}
      ${res.coins ? html`<div class="reward" style="color:var(--coin)">${ic('coins', 22)}<div style="color:var(--text)"><b>+${res.coins}</b><div class="xs muted">tanga</div></div></div>` : ''}
      ${res.streakUp && res.streak ? html`<div class="reward" style="color:var(--streak-light)">${ic('flame', 22)}<div style="color:var(--text)"><b>${res.streak}</b><div class="xs muted">kunlik streak</div></div></div>` : ''}
    </div>
    ${res.pending ? html`<div class="alert alert-warning mt-4" id="pending-alert">${ic(res.error && res.errorCode !== 'unavailable' ? 'alert-triangle' : 'wifi-off', 18)}<div class="grow" style="text-align:left">
      ${res.error ? html`<b>Natija serverga yuborilmadi:</b> ${res.error}${res.errorCode ? html` <span class="xs dim">(${res.errorCode})</span>` : ''}<br>` : html`Internet yo'q. `}
      Natija qurilmada saqlandi va keyinroq avtomatik yuboriladi.
      <div class="mt-2"><button class="btn btn-sm" id="resend">${ic('refresh', 15)} Hozir qayta yuborish</button></div></div></div>` : ''}
    ${res.cooldown ? html`<div class="alert alert-info mt-4">${ic('clock', 18)}<div>Mukofotlar juda tez-tez berilmaydi — keyingi mashg'ulotda yangi so'zlar uchun XP olasiz.</div></div>` : ''}
    ${mode === 'study' && !res.pending && !res.cooldown && !res.stars && perfect > 0 ? html`<p class="xs dim mt-3">Bu so'zlar uchun mukofot avval berilgan. Yangi so'zlarni o'zlashtirib XP to'plang.</p>` : ''}
    ${res.usedFreeze ? html`<p class="xs mt-3" style="color:var(--info-light)">${ic('snowflake', 13)} Streak muzlatish ishlatildi — streak'ingiz saqlab qolindi.</p>` : ''}
  `);
  animateRings($('#hero'));
  const rs = $('#resend');
  if (rs) rs.onclick = () => withLoading(rs, async () => {
    const sent = await flushPending(ctx.user.uid);
    if (sent && !pendingCount(ctx.user.uid)) { toast('Natija yuborildi'); $('#pending-alert').remove(); }
    else toastError("Hali yuborib bo'lmadi. Keyinroq avtomatik urinib ko'riladi.");
  });
  setTimeout(() => {
    playSound(pct >= 70 ? 'victory' : 'coin');
    if (pct === 100) confetti({ count: 160 });
    else if (pct >= 70) confetti({ count: 80 });
  }, 400);

  /* Tugmalar */
  const q = data.src ? sourceQuery(data.src) : '';
  const retryHref = mode === 'review' ? 'review.html'
    : mode === 'quiz' ? `quick-quiz.html?${q}` : mode === 'listening' ? `quick-quiz.html?${q}&mode=listen`
    : mode === 'dictation' ? `dictation.html?${q}`
    : mode === 'flashcards' ? `flashcards.html?${q}` : `study.html?${q}`;
  setHTML('actions', html`
    <a class="btn btn-lg" href="${retryHref}">${ic('rotate-ccw', 18)} Qayta</a>
    ${data.home ? html`<a class="btn btn-lg" href="${data.home}">${ic('list', 18)} Mavzular</a>` : ''}
    <span id="next-slot"></span>
    <a class="btn btn-lg btn-ghost" href="dashboard.html">${ic('home', 18)} Bosh sahifa</a>
  `);
  nextTopic();

  /* Xatolar va barcha so'zlar */
  const wrong = words.filter(w => results[w.id] && results[w.id].mistakes.length);
  setHTML('mistakes-title', html`${ic('x-circle', 18)} Xato qilingan so'zlar <span class="badge badge-danger">${wrong.length}</span>`);
  setHTML('all-title', html`${ic('list', 18)} Barcha so'zlar`);
  if (wrong.length) {
    $('#mistakes-section').hidden = false;
    setHTML('mistakes', html`<div class="list">${wrong.map(w => html`<div class="list-row">
      <span style="color:var(--danger-light)">${ic('x-circle', 20)}</span>
      <div class="list-main"><div class="list-title">${w.en} <span class="muted" style="font-weight:400">— ${w.uz}</span></div>
        <div class="list-sub">Xato: ${results[w.id].mistakes.map(s => STAGE_NAMES[s] || s).join(', ')}</div>
        ${w.example ? html`<div class="xs dim mt-1" style="font-style:italic">"${w.example}"</div>` : ''}</div>
    </div>`)}</div>`);
  }
  setHTML('all', html`<div class="list">${words.map(w => {
    const ok = !results[w.id].mistakes.length;
    return html`<div class="list-row"><span style="color:${ok ? 'var(--success-light)' : 'var(--danger-light)'}">${ic(ok ? 'circle-check' : 'x-circle', 20)}</span>
      <div class="list-main"><div class="list-title">${w.en}</div><div class="list-sub">${w.uz}</div></div>
      <span class="badge ${ok ? 'badge-success' : 'badge-danger'}">${ok ? (mode === 'dictation' ? 'Yordamsiz' : 'Xatosiz') : `${results[w.id].mistakes.length} xato`}</span></div>`;
  })}</div>`);

  checkAchievements(res);
}

/* Kitob/bo'limdagi keyingi mavzu */
async function nextTopic() {
  const s = data.src;
  if (!s || !s.topicId || data.mode !== 'study') return;
  try {
    const topics = await listTopics(s.kind, s.containerId);
    const i = topics.findIndex(t => t.id === s.topicId);
    const nx = topics[i + 1];
    if (!nx) return;
    const q = sourceQuery({ ...s, topicId: nx.id });
    setHTML('next-slot', html`<a class="btn btn-primary btn-lg" href="study.html?${raw(q)}">Keyingi mavzu ${ic('arrow-right', 18)}</a>`);
    try { localStorage.setItem('az:last', JSON.stringify({ ...s, topicId: nx.id, title: nx.title, subtitle: data.subtitle || '', at: Date.now() })); } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

/* Yangi bajarilgan yutuqlarni avtomatik olish */
async function checkAchievements(res) {
  if (!res || res.pending || !res.user) return;
  try {
    const all = await listAchievements();
    const have = new Set(ctx.u.achievements || []);
    const u = { ...ctx.u, ...res.user };
    const ready = all.filter(a => !have.has(a.id) && achievementReady(a, u));
    if (!ready.length) return;
    const got = await claimAchievements(ctx.user.uid, ready);
    if (got.length) setTimeout(() => celebrate(got), 1800);
  } catch (e) { /* ignore */ }
}
function celebrate(list) {
  const a = list[0];
  playSound('achievement');
  confetti({ count: 140 });
  const el = document.createElement('div');
  el.className = 'celebrate';
  setHTML(el, html`<div class="celebrate-card">
    <div class="celebrate-icon">${ic(iconName(a.emoji, 'award'), 42)}</div>
    <div class="xs muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Yangi yutuq${list.length > 1 ? ` (+${list.length - 1})` : ''}</div>
    <h2 class="mt-2">${a.name}</h2>
    ${a.description ? html`<p class="muted mt-1">${a.description}</p>` : ''}
    <div class="reward-row">
      ${a.starReward ? html`<div class="reward">${raw(starIcon(20))}<b>+${a.starReward}</b></div>` : ''}
      ${a.coinReward ? html`<div class="reward" style="color:var(--coin)">${ic('coins', 20)}<b style="color:var(--text)">+${a.coinReward}</b></div>` : ''}
    </div>
    <div class="row mt-4" style="justify-content:center"><a class="btn" href="achievements.html">Yutuqlar</a><button class="btn btn-primary" data-x>Ajoyib!</button></div>
  </div>`);
  document.body.appendChild(el);
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
}
