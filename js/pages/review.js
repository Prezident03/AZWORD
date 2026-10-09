/* AzWord · Aqlli takrorlash (Leitner tizimi)
   Vaqti kelgan so'zlar: so'zni ko'ring → eslang → javobni oching → o'zingizni baholang. */
import { initPage } from '../core.js';
import { db, collection, query, orderBy, limit, getDocs } from '../firebase.js';
import { SRS_DAYS } from '../game.js';
import { $, html, raw, ic, setHTML, emptyState, errorState, loadingBlock, fmtDate, fmtNum } from '../ui.js';
import { playSound, speak, canSpeak } from '../fx.js';
import { getPrefs } from '../prefs.js';
import { loadReview, saveGrouped, storeResult } from '../session.js';

const { user } = await initPage({ title: 'Takrorlash', active: 'review' });

let items = [], i = 0;
const results = {};
let startedAt = 0;

async function load() {
  setHTML('content', loadingBlock());
  try { items = await loadReview(user.uid, 30); }
  catch (e) { errorState('content', load); return; }
  if (!items.length) return renderEmpty();
  renderIntro();
}

async function renderEmpty() {
  let next = null, total = 0;
  try {
    const snap = await getDocs(query(collection(db, 'users', user.uid, 'wordStats'), orderBy('due', 'asc'), limit(1)));
    next = snap.docs[0] ? snap.docs[0].data().due : null;
    total = snap.size;
  } catch (e) { /* ignore */ }
  setHTML('content', html`<div class="card card-lg">${emptyState({
    iconName: 'circle-check',
    title: total ? 'Hammasi takrorlangan!' : "Hali takrorlanadigan so'z yo'q",
    sub: total ? `Keyingi takrorlash: ${fmtDate(next)}. Bu orada yangi mavzularni o'rganing.` : "Mavzularni o'rganganingizda so'zlar avtomatik ravishda takrorlash jadvaliga qo'shiladi.",
    action: html`<a class="btn btn-primary" href="folders.html">${ic('library', 16)} Yangi mavzu o'rganish</a>`
  })}</div>
  <div class="card mt-4"><div class="card-title mb-2">Qanday ishlaydi?</div>
    <p class="small muted">Har bir so'z "quti"ga ega. To'g'ri eslasangiz, so'z keyingi qutiga o'tadi va keyinroq qaytadi (${SRS_DAYS.slice(1).join(', ')} kun). Unutsangiz — birinchi qutiga qaytadi va ertaga yana so'raladi.</p></div>`);
}

function renderIntro() {
  setHTML('content', html`<div class="card card-lg card-glow center fade-up">
    <div class="empty-icon" style="margin:0 auto 12px">${ic('repeat', 30)}</div>
    <h2>${fmtNum(items.length)} ta so'zni takrorlash vaqti keldi</h2>
    <p class="muted mt-2">Har bir so'zni ko'ring, ma'nosini eslang va javobni ochib, o'zingizni baholang.</p>
    <button class="btn btn-gradient btn-lg mt-4" id="start">${ic('play', 18)} Boshlash</button>
  </div>
  <div class="card card-flush mt-4"><div class="list">${items.slice(0, 8).map(w => html`<div class="list-row">
    <div class="list-main"><div class="list-title">${w.en}</div><div class="list-sub">${w.src.title || ''}</div></div>
    <span class="badge">${ic('layers', 12)} ${w.stat.box || 0}-quti</span></div>`)}
    ${items.length > 8 ? html`<div class="list-row xs dim">va yana ${items.length - 8} ta so'z...</div>` : ''}</div></div>`);
  $('#start').onclick = () => { startedAt = Date.now(); i = 0; show(); };
}

function show() {
  if (i >= items.length) return finish();
  const w = items[i];
  setHTML('content', html`
    <div class="study-meta"><span>Takrorlash</span><span>${i + 1} / ${items.length}</span></div>
    <div class="progress mb-4"><span style="width:${Math.round((i / items.length) * 100)}%"></span></div>
    <div class="study-card" id="card">
      <span class="badge">${w.src.title || ''}</span>
      <div class="word-big">${w.en}</div>
      ${canSpeak() ? html`<button class="speak-btn" id="say">${ic('volume', 17)} Tinglash</button>` : ''}
      <div id="answer" hidden class="stack" style="align-items:center">
        <div class="word-trans">${w.uz}</div>
        ${w.example ? html`<div class="example">"${w.example}"</div>` : ''}
      </div>
    </div>
    <div class="row mt-4" id="btns"><button class="btn btn-primary btn-lg grow" id="reveal">${ic('eye', 18)} Javobni ko'rish</button></div>`);
  const say = $('#say');
  if (say) say.onclick = () => speak(w.en);
  if (getPrefs().autoSpeak) setTimeout(() => speak(w.en), 250);
  $('#reveal').onclick = reveal;
}
function reveal() {
  $('#answer').hidden = false;
  playSound('click');
  setHTML('btns', html`<button class="btn btn-danger btn-lg grow" id="no">${ic('x', 18)} Eslay olmadim</button>
    <button class="btn btn-success btn-lg grow" id="yes">${ic('check', 18)} Esladim</button>`);
  $('#no').onclick = () => grade(false);
  $('#yes').onclick = () => grade(true);
}
function grade(ok) {
  const w = items[i];
  results[w.key] = { mistakes: ok ? [] : [9] };
  playSound(ok ? 'correct' : 'wrong');
  i++;
  show();
}

async function finish() {
  setHTML('content', loadingBlock());
  let res = [];
  try { res = await saveGrouped(user.uid, items, results, startedAt, 'review'); } catch (e) { console.warn(e); }
  const r0 = res[0] || {};
  storeResult({
    mode: 'review', title: 'Takrorlash', home: 'review.html',
    words: items.map(w => ({ id: w.key, en: w.en, uz: w.uz, example: w.example })), results,
    res: { pending: res.some(r => r.pending), streak: (res[res.length - 1] || {}).streak, streakUp: r0.streakUp }
  });
  location.replace('results.html');
}

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && $('#reveal')) { e.preventDefault(); $('#reveal').click(); }
  else if (e.key === 'ArrowRight' && $('#yes')) $('#yes').click();
  else if (e.key === 'ArrowLeft' && $('#no')) $('#no').click();
});
load();
