/* AzWord · Tezkor kviz (10 savol) va "Tinglab tushunish" rejimi (?mode=listen) */
import { initPage } from '../core.js';
import { completeSession } from '../data.js';
import { sourceFromParams, sourceHome, normalizeAnswer } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, params, shuffle, confirmDialog, errorState, emptyState } from '../ui.js';
import { playSound, speak, canSpeak, vibrate } from '../fx.js';
import { resolveSource, loadSession, finishPayload, storeResult } from '../session.js';

const P = params();
const listen = P.get('mode') === 'listen';
const src0 = resolveSource(P, sourceFromParams);
if (!src0) { location.replace('quiz.html'); await new Promise(() => {}); }
const { user } = await initPage({ title: listen ? 'Tinglab tushunish' : 'Tezkor kviz', shell: false });
$('#exit').innerHTML = icon('x', 22);

const COUNT = 10;
let session, pool = [], quiz = [], i = 0, home, leaving = false, locked = false;
const results = {};
const startedAt = Date.now();

async function start() {
  try { session = await loadSession(user.uid, src0, { size: 0, withStats: false }); }
  catch (e) { errorState($('#card'), start); return; }
  home = sourceHome(session.src);
  $('#meta-title').textContent = (listen ? 'Tinglash · ' : 'Kviz · ') + (session.title || '');
  pool = session.words;
  if (pool.length < 2 || (listen && !canSpeak())) {
    setHTML('card', emptyState({
      iconName: listen ? 'headphones' : 'zap',
      title: listen && !canSpeak() ? "Brauzeringiz ovozli o'qishni qo'llamaydi" : "Kviz uchun kamida 2 ta so'z kerak",
      action: html`<a class="btn" href="${home}">Orqaga</a>`
    }));
    return;
  }
  quiz = shuffle(pool).slice(0, Math.min(COUNT, pool.length));
  quiz.forEach(w => { results[w.id] = { mistakes: [] }; });
  ask();
}

function options(w) {
  const seen = new Set([normalizeAnswer(w.uz)]);
  const out = [w.uz];
  for (const x of shuffle(pool)) {
    if (out.length >= 4) break;
    const k = normalizeAnswer(x.uz);
    if (x.id !== w.id && !seen.has(k)) { seen.add(k); out.push(x.uz); }
  }
  return shuffle(out);
}

function ask() {
  $('#bar').style.width = Math.round((i / quiz.length) * 100) + '%';
  $('#meta-count').textContent = `${Math.min(i + 1, quiz.length)} / ${quiz.length}`;
  if (i >= quiz.length) return finish();
  locked = false;
  const w = quiz[i];
  const opts = options(w);
  const c = $('#card');
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  setHTML(c, html`
    <div class="q-label">${listen ? "Eshiting va ma'nosini toping" : "Bu so'z nimani anglatadi?"}</div>
    ${listen
      ? html`<button class="speak-big" id="play" aria-label="Qayta eshitish">${ic('volume', 40)}</button><div class="xs dim">Qayta eshitish uchun bosing</div>`
      : html`<div class="word-big">${w.en}</div>`}
    <div class="options" id="opts">${opts.map((o, k) => html`<button class="option" data-v="${o}"><span class="opt-key">${k + 1}</span><span>${o}</span></button>`)}</div>
    <div class="feedback" id="fb"></div>`);
  setHTML('actions', html`<button class="btn btn-ghost btn-lg grow" id="skip">${ic('skip', 18)} O'tkazib yuborish</button>`);
  $('#skip').onclick = () => answer(null);
  if (listen) { const say = () => speak(w.en, { rate: 0.85 }); $('#play').onclick = say; setTimeout(say, 300); }
  document.querySelectorAll('#opts .option').forEach(b => b.onclick = () => answer(b));
}

function answer(btn) {
  if (locked) return;
  locked = true;
  const w = quiz[i];
  const ok = btn && normalizeAnswer(btn.dataset.v) === normalizeAnswer(w.uz);
  document.querySelectorAll('#opts .option').forEach(b => {
    b.disabled = true;
    if (normalizeAnswer(b.dataset.v) === normalizeAnswer(w.uz)) b.classList.add('correct');
    else if (b !== btn) b.classList.add('dim');
  });
  const fb = $('#fb');
  if (ok) { playSound('correct'); vibrate(20); fb.className = 'feedback ok'; fb.textContent = "To'g'ri!"; }
  else {
    if (btn) btn.classList.add('wrong');
    playSound('wrong'); vibrate([30, 40, 30]);
    results[w.id].mistakes.push(listen ? 8 : 6);
    fb.className = 'feedback bad';
    fb.textContent = `${w.en} — ${w.uz}`;
  }
  if (!listen) speak(w.en);
  setTimeout(() => { i++; ask(); }, ok ? 850 : 1700);
}

let finishing = false;
async function finish() {
  if (finishing) return;
  finishing = true;
  setHTML('card', raw('<div class="spinner"></div>'));
  setHTML('actions', '');
  const mode = listen ? 'listening' : 'quiz';
  const payload = finishPayload({ src: session.src, words: quiz, results, startedAt, mode });
  let res = {};
  try { res = await completeSession(user.uid, payload); } catch (e) { console.warn(e); }
  storeResult({ mode, title: session.title, subtitle: session.subtitle, src: src0, home, words: payload.words, results, res: { ...res, user: undefined } });
  leaving = true;
  location.replace('results.html');
}

document.addEventListener('keydown', (e) => {
  if (/^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('#opts .option')[Number(e.key) - 1]; if (b) b.click(); }
  else if (e.key === ' ' && $('#play')) { e.preventDefault(); $('#play').click(); }
});
$('#exit').onclick = async () => {
  if (!i || i >= quiz.length) return location.assign(home || 'quiz.html');
  if (await confirmDialog({ title: 'Chiqasizmi?', message: 'Kviz natijasi saqlanmaydi.', confirmText: 'Chiqish', cancelText: 'Davom etish', danger: true })) { leaving = true; location.assign(home); }
};
addEventListener('beforeunload', (e) => { if (!leaving && i > 0 && i < quiz.length) { e.preventDefault(); e.returnValue = ''; } });

start();
