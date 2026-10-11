/* AzWord · Diktant: so'zni eshitib harfma-harf yozish, keyin uning misol gapini yozish.
   Har bir so'z uchun 2 qadam: 1) so'z  2) misol gap (bo'lsa).
   Xato harf yoki yordam (harf ochish / javobni ko'rsatish) ishlatilsa — so'z "yordam bilan" hisoblanadi. */
import { initPage } from '../core.js';
import { completeSession } from '../data.js';
import { sourceFromParams, sourceHome } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, params, shuffle, confirmDialog, errorState, emptyState } from '../ui.js';
import { playSound, speak, canSpeak, vibrate } from '../fx.js';
import { aiGloss } from '../ai.js';
import { resolveSource, loadSession, finishPayload, storeResult } from '../session.js';

const P = params();
const src0 = resolveSource(P, sourceFromParams);
if (!src0) { location.replace('quiz.html'); await new Promise(() => {}); }
const { user } = await initPage({ title: 'Diktant', shell: false });
$('#exit').innerHTML = icon('x', 22);

const COUNT = 10;
const MAX_SENTENCE = 140;
const SLOW = 0.55;
const STAGE_WORD = 9, STAGE_SENTENCE = 10;
const isTypable = (ch) => /[\p{L}\p{N}]/u.test(ch);
const low = (ch) => ch.toLocaleLowerCase('en');

let session, home, words = [], steps = [], si = 0;
let cur = null; // joriy qadam holati
let leaving = false, finishing = false;
const results = {};
const startedAt = Date.now();

async function start() {
  try { session = await loadSession(user.uid, src0, { size: 0, withStats: false }); }
  catch (e) { errorState($('#card'), start); return; }
  home = sourceHome(session.src);
  $('#meta-title').textContent = 'Diktant · ' + (session.title || '');
  if (!canSpeak() || !session.words.length) {
    setHTML('card', emptyState({
      iconName: 'headphones',
      title: !canSpeak() ? "Brauzeringiz ovozli o'qishni qo'llamaydi" : "Bu mavzuda so'zlar yo'q",
      sub: !canSpeak() ? "Diktant uchun Chrome, Edge yoki Safari'dan foydalaning." : '',
      action: html`<a class="btn" href="${home}">Orqaga</a>`
    }));
    return;
  }
  words = shuffle(session.words).slice(0, COUNT);
  for (const w of words) {
    results[w.id] = { mistakes: [] };
    steps.push({ w, kind: 'word', text: w.en.trim() });
    const ex = String(w.example || '').trim();
    if (ex && ex.length <= MAX_SENTENCE && /\p{L}/u.test(ex)) steps.push({ w, kind: 'sentence', text: ex });
  }
  show();
}

/* ── Qadamni chizish ──────────────────────────────────────── */
function show() {
  if (si >= steps.length) return finish();
  const step = steps[si];
  const chars = Array.from(step.text);
  cur = { step, chars, typable: chars.map(isTypable), filled: chars.map(() => null), pos: 0, wrongHere: 0, mistakes: 0, helped: false, done: false };
  skipFixed();
  const wordNo = words.indexOf(step.w) + 1;
  $('#bar').style.width = Math.round((si / steps.length) * 100) + '%';
  $('#meta-count').textContent = `${wordNo} / ${words.length}`;

  const sentence = step.kind === 'sentence';
  const c = $('#card');
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  setHTML(c, html`
    <div class="dict-head">
      <span class="badge ${sentence ? 'badge-primary' : 'badge-success'}">${ic(sentence ? 'message' : 'pen-line', 12)} ${sentence ? 'Gapni yozing' : "So'zni yozing"}</span>
      <div class="dict-hint">${sentence
        ? html`<span class="muted">So'z:</span> <b>${step.w.en}</b> <span class="muted">— ${step.w.uz}</span>`
        : html`<span class="word-trans">${step.w.uz}</span>`}</div>
    </div>
    <div class="dict-listen">
      <button class="speak-big dict-play" id="play" aria-label="Qayta eshitish" title="Qayta eshitish (Ctrl+Space)">${ic('volume', 34)}</button>
      <button class="speak-btn" id="slow" title="Sekin eshitish">${ic('headphones', 17)} Sekin</button>
    </div>
    <div class="dict-slots${sentence ? ' sm' : ''}" id="slots">
      <div id="slot-list" class="dict-slot-list"></div>
      <input class="dict-input" id="ti" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" aria-label="Javobni yozing">
    </div>
    <div class="feedback" id="fb"></div>
    <div id="after" class="dict-after"></div>`);
  renderSlots();
  renderActions();

  const ti = $('#ti');
  ti.addEventListener('input', onInput);
  ti.addEventListener('keydown', onKey);
  $('#slots').addEventListener('click', () => ti.focus());
  $('#play').onclick = () => { say(); ti.focus(); };
  $('#slow').onclick = () => { say(SLOW); ti.focus(); };
  setTimeout(() => { if (cur && cur.step === step) say(); }, 350);
  ti.focus({ preventScroll: true });
}

function renderSlots() {
  const { chars, typable, filled, pos, step, done } = cur;
  const sentence = step.kind === 'sentence';
  /* So'zlarni bo'shliq bo'yicha guruhlaymiz — qator o'rtasida uzilmasin */
  const groups = [];
  let g = [], wordStart = true;
  chars.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (g.length) groups.push(g); g = []; wordStart = true; return; }
    let cls = 'dict-slot', inner = '';
    if (!typable[i]) { cls += ' fixed'; inner = esc1(ch); }
    else if (filled[i]) { cls += ' ' + filled[i]; inner = esc1(ch); }
    else {
      if (i === pos && !done) cls += ' cur';
      /* 1-videodagidek: gapda har bir so'zning birinchi harfi xira ko'rinadi */
      if (sentence && wordStart) inner = `<span class="ph">${esc1(ch)}</span>`;
    }
    if (typable[i]) wordStart = false;
    g.push(`<span class="${cls}" data-i="${i}">${inner}</span>`);
  });
  if (g.length) groups.push(g);
  $('#slot-list').innerHTML = groups.map(x => `<span class="dict-word">${x.join('')}</span>`).join('');
}
const esc1 = (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch);

function renderActions() {
  if (cur.done) {
    setHTML('actions', html`<button class="btn btn-primary btn-lg grow" id="next">${si + 1 >= steps.length ? 'Yakunlash' : 'Davom etish'} ${ic('arrow-right', 18)}</button>`);
    $('#next').onclick = next;
    return;
  }
  setHTML('actions', html`
    <button class="btn btn-ghost btn-lg" id="letter" title="Keyingi harfni ochish (Ctrl+Enter)">${ic('lightbulb', 18)} <span class="hide-xs">Harf</span></button>
    <button class="btn btn-lg grow" id="reveal" title="Javobni ko'rsatish">${ic('eye', 18)} ${cur.step.kind === 'sentence' ? "Gapni ko'rsat" : "So'zni ko'rsat"}</button>`);
  $('#letter').onclick = () => { revealLetter(); $('#ti').focus(); };
  $('#reveal').onclick = revealAll;
}

function say(rate) {
  const { step } = cur;
  speak(step.text, { rate: rate || (step.kind === 'sentence' ? 0.85 : 0.8) });
  const b = $('#play');
  if (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
}

/* ── Yozish ───────────────────────────────────────────────── */
function skipFixed() {
  while (cur.pos < cur.chars.length && !cur.typable[cur.pos]) cur.pos++;
}

function onInput(e) {
  const v = e.target.value;
  e.target.value = '';
  for (const ch of Array.from(v)) {
    if (cur.done) break;
    if (isTypable(ch)) typeChar(ch);
  }
}

function onKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (cur.done) next();
    else if (e.ctrlKey || e.metaKey) revealLetter();
  } else if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault(); say();
  }
}

function typeChar(ch) {
  const i = cur.pos;
  const expected = cur.chars[i];
  if (low(ch) === low(expected)) {
    cur.filled[i] = cur.wrongHere >= 3 ? 'help' : 'ok';
    cur.wrongHere = 0;
    cur.pos++;
    skipFixed();
    renderSlots();
    if (cur.pos >= cur.chars.length) complete();
    return;
  }
  /* Xato harf: qizil ko'rsatib, o'chiramiz. 3 marta ketma-ket xato bo'lsa — harf o'zi ochiladi */
  cur.mistakes++;
  cur.wrongHere++;
  vibrate(25);
  const el = $(`#slot-list [data-i="${i}"]`);
  if (el) {
    el.className = 'dict-slot bad';
    el.textContent = ch;
    setTimeout(() => { if (cur && !cur.filled[i] && cur.pos === i) renderSlots(); }, 380);
  }
  if (cur.wrongHere >= 3) setTimeout(() => { if (cur && cur.pos === i && !cur.done) revealLetter(); }, 420);
}

function revealLetter() {
  if (cur.done) return;
  cur.helped = true;
  cur.filled[cur.pos] = 'help';
  cur.wrongHere = 0;
  cur.pos++;
  skipFixed();
  renderSlots();
  if (cur.pos >= cur.chars.length) complete();
}

function revealAll() {
  if (cur.done) return;
  cur.helped = true;
  cur.chars.forEach((ch, i) => { if (cur.typable[i] && !cur.filled[i]) cur.filled[i] = 'help'; });
  cur.pos = cur.chars.length;
  renderSlots();
  complete();
}

function complete() {
  cur.done = true;
  const { step } = cur;
  const clean = !cur.mistakes && !cur.helped;
  if (!clean) results[step.w.id].mistakes.push(step.kind === 'sentence' ? STAGE_SENTENCE : STAGE_WORD);
  const fb = $('#fb');
  if (clean) { fb.className = 'feedback ok'; fb.textContent = "To'g'ri! Yordamsiz."; playSound('correct'); vibrate(20); }
  else if (cur.helped) { fb.className = 'feedback bad'; fb.textContent = 'Yordam bilan bajarildi'; playSound('click'); }
  else { fb.className = 'feedback'; fb.style.color = 'var(--warning-light)'; fb.textContent = `Bajarildi · ${cur.mistakes} ta xato harf`; playSound('click'); }
  $('#slots').classList.add('done');
  setTimeout(() => { if (cur && cur.step === step) speak(step.text, { rate: 0.9 }); }, 250);
  if (step.kind === 'sentence') showGloss(step);
  renderActions();
  $('#ti').focus({ preventScroll: true });
}

/* ── Gap tarjimasi (AI, qurilmada keshlanadi) ──────────────── */
const GLOSS_KEY = 'az:gloss';
function glossCache() { try { return JSON.parse(localStorage.getItem(GLOSS_KEY) || '{}'); } catch (e) { return {}; } }
function saveGloss(text, val) {
  try {
    const c = glossCache();
    c[text] = val;
    const keys = Object.keys(c);
    if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete c[k]);
    localStorage.setItem(GLOSS_KEY, JSON.stringify(c));
  } catch (e) { /* ignore */ }
}

async function showGloss(step) {
  const box = $('#after');
  setHTML(box, html`<div class="xs dim">${ic('sparkles', 13)} Tarjima yuklanmoqda...</div>`);
  let g = glossCache()[step.text];
  if (!g) {
    try { const r = await aiGloss(step.text); g = { text: r.text, words: r.words || [] }; saveGloss(step.text, g); }
    catch (e) { g = null; }
  }
  if (!cur || cur.step !== step) return;
  if (!g) { setHTML(box, ''); return; }
  const tokens = step.text.split(/\s+/).filter(Boolean);
  const meanings = alignGloss(tokens, g.words);
  setHTML(box, html`
    <div class="gloss">${tokens.map((t, k) => html`<span class="gloss-w"><b>${t}</b><span>${meanings[k] || ' '}</span></span>`)}</div>
    <div class="example-tr">${g.text}</div>`);
}
/* AI qaytargan so'zlarni gapdagi so'zlarga moslashtiramiz (tinish belgilarisiz solishtirib) */
function alignGloss(tokens, list) {
  const norm = (s) => String(s || '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}']/gu, '').replace(/’/g, "'");
  const out = [];
  let j = 0;
  for (const t of tokens) {
    const n = norm(t);
    let k = j;
    while (k < list.length && k < j + 3 && norm(list[k].en) !== n) k++;
    if (k < list.length && norm(list[k].en) === n) { out.push(list[k].uz); j = k + 1; }
    else out.push('');
  }
  return out;
}

/* ── Keyingi / yakun ──────────────────────────────────────── */
function next() {
  if (!cur || !cur.done) return;
  si++;
  show();
}

async function finish() {
  if (finishing) return;
  finishing = true;
  cur = null;
  $('#bar').style.width = '100%';
  setHTML('card', raw('<div class="spinner"></div>'));
  setHTML('actions', '');
  const mode = 'dictation';
  const payload = finishPayload({ src: session.src, words, results, startedAt, mode });
  let res = {};
  try { res = await completeSession(user.uid, payload); } catch (e) { console.warn(e); }
  storeResult({ mode, title: session.title, subtitle: session.subtitle, src: src0, home, words: payload.words, results, res: { ...res, user: undefined } });
  leaving = true;
  location.replace('results.html');
}

document.addEventListener('keydown', (e) => {
  if (e.target && e.target.id === 'ti') return;
  if (e.key === 'Enter' && cur && cur.done) { e.preventDefault(); next(); }
  else if (e.key === ' ' && (e.ctrlKey || e.metaKey) && cur) { e.preventDefault(); say(); }
});
$('#exit').onclick = async () => {
  if (!si || si >= steps.length) return location.assign(home || 'quiz.html');
  if (await confirmDialog({ title: 'Chiqasizmi?', message: 'Diktant natijasi saqlanmaydi.', confirmText: 'Chiqish', cancelText: 'Davom etish', danger: true })) { leaving = true; location.assign(home); }
};
addEventListener('beforeunload', (e) => { if (!leaving && si > 0 && si < steps.length) { e.preventDefault(); e.returnValue = ''; } });

start();
