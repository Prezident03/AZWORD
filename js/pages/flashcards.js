/* AzWord · Flashcard — kartani bosib aylantirish, suring yoki tugmalar bilan baholash */
import { initPage } from '../core.js';
import { completeSession } from '../data.js';
import { sourceFromParams, sourceHome } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, params, shuffle, confirmDialog, errorState, emptyState } from '../ui.js';
import { playSound, speak, canSpeak, vibrate, preloadSpeech } from '../fx.js';
import { getPrefs } from '../prefs.js';
import { resolveSource, loadSession, finishPayload, storeResult } from '../session.js';

const src0 = resolveSource(params(), sourceFromParams);
if (!src0) { location.replace('quiz.html'); await new Promise(() => {}); }
const { user } = await initPage({ title: 'Flashcard', shell: false });
$('#exit').innerHTML = icon('x', 22);

let session, deck = [], i = 0, home, leaving = false;
const verdict = {}; // id -> 'yes' | 'maybe' | 'no'
const startedAt = Date.now();

async function start() {
  try { session = await loadSession(user.uid, src0, { size: 30 }); }
  catch (e) { errorState($('#stage'), start); return; }
  home = sourceHome(session.src);
  $('#meta-title').textContent = session.title || 'Flashcard';
  deck = shuffle(session.words);
  preloadSpeech(deck.map(w => w.en));
  if (!deck.length) {
    setHTML('stage', html`<div class="card">${emptyState({ iconName: 'copy', title: "So'zlar yo'q", action: html`<a class="btn" href="${home}">Orqaga</a>` })}</div>`);
    $('#fc-help').hidden = true;
    return;
  }
  setHTML('actions', html`
    <button class="btn btn-danger btn-lg grow" data-v="no">${ic('x', 18)} Bilmayman</button>
    <button class="btn btn-lg" data-v="maybe" title="Qiyin">${ic('alert-triangle', 18)}</button>
    <button class="btn btn-success btn-lg grow" data-v="yes">${ic('check', 18)} Bilaman</button>`);
  document.querySelectorAll('#actions [data-v]').forEach(b => b.onclick = () => commit(b.dataset.v));
  show();
}

function show() {
  $('#bar').style.width = Math.round((i / deck.length) * 100) + '%';
  $('#meta-count').textContent = `${Math.min(i + 1, deck.length)} / ${deck.length}`;
  if (i >= deck.length) return finish();
  const w = deck[i];
  const stage = $('#stage');
  setHTML(stage, html`<div class="fc-card fade-up" id="fc" tabindex="0" role="button" aria-label="Kartani aylantirish">
    <span class="fc-stamp yes" id="st-yes">Bilaman</span><span class="fc-stamp no" id="st-no">Bilmayman</span>
    <div class="fc-inner">
      <div class="fc-face">
        <div class="word-big">${w.en}</div>
        ${w.ipa ? html`<div class="badge">${w.ipa}</div>` : ''}
        ${canSpeak() ? html`<button class="speak-btn" id="say">${ic('volume', 17)} Tinglash</button>` : ''}
        <div class="fc-hint">Tarjimani ko'rish uchun bosing</div>
      </div>
      <div class="fc-face fc-back">
        <div class="word-mid" style="color:var(--primary-light)">${w.uz}</div>
        ${w.example ? html`<div class="example">"${w.example}"</div>` : ''}
        <div class="fc-hint">Yana bosing — so'zga qaytish</div>
      </div>
    </div>
  </div>`);
  const card = $('#fc');
  const say = $('#say');
  if (say) say.onclick = (e) => { e.stopPropagation(); speak(w.en); };
  if (getPrefs().autoSpeak) setTimeout(() => speak(w.en), 250);
  bindSwipe(card);
}

function bindSwipe(card) {
  let sx = 0, sy = 0, dx = 0, drag = false, moved = false;
  const yes = $('#st-yes'), no = $('#st-no');
  const down = (x, y) => { drag = true; moved = false; sx = x; sy = y; dx = 0; card.classList.add('no-anim'); };
  const move = (x, y) => {
    if (!drag) return;
    dx = x - sx;
    if (Math.abs(dx) < 8 && Math.abs(y - sy) < 8) return;
    moved = true;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    const t = Math.min(1, Math.abs(dx) / 120);
    yes.style.opacity = dx > 0 ? t : 0;
    no.style.opacity = dx < 0 ? t : 0;
  };
  const up = () => {
    if (!drag) return;
    drag = false;
    card.classList.remove('no-anim');
    if (Math.abs(dx) > 100) { commit(dx > 0 ? 'yes' : 'no'); return; }
    card.style.transform = '';
    yes.style.opacity = 0; no.style.opacity = 0;
    if (!moved) flip();
  };
  card.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; card.setPointerCapture(e.pointerId); down(e.clientX, e.clientY); });
  card.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', up);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter') flip(); });
}
function flip() { const c = $('#fc'); if (c) { c.classList.toggle('flipped'); playSound('click'); } }

function commit(v) {
  const w = deck[i];
  if (!w) return;
  verdict[w.id] = v;
  const c = $('#fc');
  if (c) {
    c.style.transform = v === 'yes' ? 'translateX(140%) rotate(18deg)' : v === 'no' ? 'translateX(-140%) rotate(-18deg)' : 'translateY(40px) scale(.94)';
    c.style.opacity = '0';
  }
  playSound(v === 'no' ? 'wrong' : 'click');
  if (v === 'no') vibrate(25);
  i++;
  setTimeout(show, 220);
}

let finishing = false;
async function finish() {
  if (finishing) return;
  finishing = true;
  $('#fc-help').hidden = true;
  setHTML('actions', '');
  setHTML('stage', raw('<div class="spinner"></div>'));
  const results = {};
  deck.forEach(w => { results[w.id] = { mistakes: verdict[w.id] === 'yes' ? [] : [7] }; });
  const payload = finishPayload({ src: session.src, words: deck, results, startedAt, mode: 'flashcards' });
  let res = {};
  try { res = await completeSession(user.uid, payload); } catch (e) { console.warn(e); }
  storeResult({ mode: 'flashcards', title: session.title, subtitle: session.subtitle, src: src0, home, words: payload.words, results, res: { ...res, user: undefined } });
  leaving = true;
  location.replace('results.html');
}

document.addEventListener('keydown', (e) => {
  if (!deck.length || i >= deck.length) return;
  if (e.key === ' ') { e.preventDefault(); flip(); }
  else if (e.key === 'ArrowRight') commit('yes');
  else if (e.key === 'ArrowLeft') commit('no');
  else if (e.key === 'ArrowDown') commit('maybe');
});
$('#exit').onclick = async () => {
  if (!i || i >= deck.length) return location.assign(home || 'quiz.html');
  if (await confirmDialog({ title: 'Chiqasizmi?', message: 'Natijalar saqlanmaydi.', confirmText: 'Chiqish', cancelText: 'Davom etish', danger: true })) { leaving = true; location.assign(home); }
};
addEventListener('beforeunload', (e) => { if (!leaving && i > 0 && i < deck.length) { e.preventDefault(); e.returnValue = ''; } });

start();
