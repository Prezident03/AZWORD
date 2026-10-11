/* AzWord · 5 bosqichli o'rganish
   1 Tanishish → 2 Variantlar → 3 Bo'laklash → 4 Moslashtirish → 5 Yozish
   Xato qilingan so'zlar oxirida qisqa "mustahkamlash" bosqichidan o'tadi
   (natija o'zgarmaydi — xato xato bo'lib qoladi). */
import { initPage } from '../core.js';
import { completeSession } from '../data.js';
import { sourceFromParams, sourceHome, normalizeAnswer } from '../game.js';
import { icon } from '../icons.js';
import { $, html, raw, ic, setHTML, esc, params, shuffle, confirmDialog, toastError, withLoading, errorState, emptyState } from '../ui.js';
import { playSound, confetti, speak, canSpeak, vibrate, preloadSpeech } from '../fx.js';
import { getPrefs } from '../prefs.js';
import { aiTranslate } from '../ai.js';
import { resolveSource, loadSession, finishPayload, storeResult } from '../session.js';
import { saveLast } from '../widgets.js';

const STAGES = [
  { id: 1, name: 'Tanishish', icon: 'book-marked' },
  { id: 2, name: 'Variantlar', icon: 'list' },
  { id: 3, name: "Bo'laklash", icon: 'puzzle' },
  { id: 4, name: 'Moslashtirish', icon: 'link' },
  { id: 5, name: 'Yozish', icon: 'pen-line' }
];
const MATCH_CHUNK = 6;

const src0 = resolveSource(params(), sourceFromParams);
if (!src0) { location.replace('folders.html'); await new Promise(() => {}); }
const { user } = await initPage({ title: "O'rganish", shell: false });

$('#exit').innerHTML = icon('x', 22);
let session, words = [], src, home;
const results = {};
let stage = 1, idx = 0, finished = false, retry = null;
const startedAt = Date.now();
let busy = false;
let leaving = false;

async function start() {
  try {
    const size = Number(getPrefs().sessionSize) || 12;
    session = await loadSession(user.uid, src0, { size });
  } catch (e) {
    errorState($('#card'), start);
    return;
  }
  src = session.src;
  home = sourceHome(src);
  words = session.words;
  preloadSpeech(words.map(w => w.en));
  preloadSpeech(words.map(w => w.example).filter(Boolean));
  $('#meta-title').textContent = session.title || "O'rganish";
  document.title = `${session.title || "O'rganish"} · AzWord`;
  if (words.length < 2) {
    if (!session.container) { try { localStorage.removeItem('az:last'); } catch (e) { /* ignore */ } home = 'folders.html'; }
    setHTML('card', emptyState({
      iconName: 'file-text', title: words.length ? "Kamida 2 ta so'z kerak" : "Bu yerda hali so'z yo'q",
      sub: "O'rganishni boshlash uchun bo'limga so'zlar qo'shing.",
      action: html`<a class="btn btn-primary" href="${home}">Orqaga qaytish</a>`
    }));
    $('#actions').innerHTML = '';
    return;
  }
  saveLast(src0, session.title, session.subtitle);
  words.forEach(w => { results[w.id] = { mistakes: [] }; });
  render();
}

/* ── Umumiy chizish ── */
function totalSteps() { return words.length * 4 + Math.ceil(words.length / MATCH_CHUNK); }
function doneSteps() {
  const m = Math.ceil(words.length / MATCH_CHUNK);
  if (stage <= 3) return (stage - 1) * words.length + idx;
  if (stage === 4) return 3 * words.length + idx;
  return 3 * words.length + m + idx;
}
function renderHeader() {
  const pct = retry ? 100 : Math.round((doneSteps() / totalSteps()) * 100);
  $('#bar').style.width = pct + '%';
  if (retry) $('#meta-count').textContent = `Mustahkamlash ${retry.i + 1}/${retry.list.length}`;
  else if (stage === 4) $('#meta-count').textContent = `Guruh ${idx + 1}/${Math.ceil(words.length / MATCH_CHUNK)}`;
  else $('#meta-count').textContent = `${idx + 1} / ${words.length}`;
  $('#steps').innerHTML = STAGES.map(s => `<span class="stage-step${s.id === stage && !retry ? ' active' : ''}${s.id < stage || retry ? ' done' : ''}">${icon(s.id < stage || retry ? 'check' : s.icon, 13)}<span>${s.name}</span></span>`).join('');
}
function setActions(content) { setHTML('actions', content); }
function primary(label, onClick, { disabled = false, id = 'next' } = {}) {
  setActions(html`<button class="btn btn-ghost btn-lg" id="skip" title="O'tkazib yuborish">${ic('skip', 18)}</button>
    <button class="btn btn-primary btn-lg grow" id="${id}" ${disabled ? raw('disabled') : ''}>${label}</button>`);
  $('#' + id).onclick = onClick;
  $('#skip').onclick = skip;
  $('#skip').hidden = stage === 1 || !!retry;
}
function enableNext() { const b = $('#next'); if (b) { b.disabled = false; b.focus({ preventScroll: true }); } }
function mistake(wordId, st = stage) {
  if (retry) return;
  const r = results[wordId];
  if (r && !r.mistakes.includes(st)) r.mistakes.push(st);
}
function card(content) {
  const c = $('#card');
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  setHTML(c, content);
}
function current() { return retry ? retry.list[retry.i].word : words[idx]; }

function render() {
  if (finished) return;
  renderHeader();
  const s = retry ? retry.list[retry.i].stage : stage;
  if (s === 1) return stage1();
  if (s === 2) return stage2();
  if (s === 3) return stage3();
  if (s === 4) return stage4();
  return stage5();
}

function next() {
  if (busy) return;
  if (retry) {
    retry.i++;
    if (retry.i >= retry.list.length) return finish();
    return render();
  }
  if (stage === 4) {
    idx++;
    if (idx >= Math.ceil(words.length / MATCH_CHUNK)) { stage = 5; idx = 0; }
    return render();
  }
  idx++;
  if (idx >= words.length) {
    idx = 0;
    stage++;
    if (stage > 5) return startRetry();
  }
  render();
}
function skip() {
  const w = current();
  if (stage === 4) { words.slice(idx * MATCH_CHUNK, idx * MATCH_CHUNK + MATCH_CHUNK).forEach(x => mistake(x.id, 4)); }
  else if (w) mistake(w.id);
  next();
}

/* ── 1. Tanishish ── */
function stage1() {
  const w = current();
  card(html`
    <span class="badge badge-primary">${ic('sparkles', 12)} Yangi so'z</span>
    <div class="word-big">${w.en}</div>
    <div class="word-meta">${w.ipa ? html`<span class="badge">${w.ipa}</span>` : ''}${w.pos ? html`<span class="badge badge-info">${w.pos}</span>` : ''}</div>
    <div class="word-trans">${w.uz}</div>
    ${canSpeak() ? html`<button class="speak-btn" id="say">${ic('volume', 17)} Tinglash</button>` : ''}
    ${w.example ? html`<div class="example">"${w.example}"<div class="example-tr" id="ex-tr" hidden></div>
      <div class="mt-2"><button class="btn btn-ghost btn-sm" id="tr-btn">${ic('languages', 15)} Tarjima qilish</button></div></div>` : ''}
  `);
  const say = $('#say');
  if (say) say.onclick = () => sayWord(w.en, say);
  const tr = $('#tr-btn');
  if (tr) tr.onclick = () => withLoading(tr, async () => {
    try {
      const t = await aiTranslate(w.example);
      const box = $('#ex-tr'); box.textContent = t; box.hidden = false; tr.remove();
    } catch (e) { toastError(e.message); }
  });
  if (getPrefs().autoSpeak) setTimeout(() => sayWord(w.en, say), 350);
  primary(raw(`Tushundim ${icon('arrow-right', 18)}`), next);
}
function sayWord(text, btn) {
  if (btn) btn.classList.add('speaking');
  speak(text, { onend: () => btn && btn.classList.remove('speaking') });
}

/* ── 2. Variantlar ── */
function options(w, field, n = 4) {
  const seen = new Set([normalizeAnswer(w[field])]);
  const pool = shuffle(words.filter(x => x.id !== w.id));
  const out = [w[field]];
  for (const x of pool) {
    if (out.length >= n) break;
    const k = normalizeAnswer(x[field]);
    if (!seen.has(k)) { seen.add(k); out.push(x[field]); }
  }
  return shuffle(out);
}
function stage2() {
  const w = current();
  const opts = options(w, 'en');
  card(html`
    <div class="q-label">Bu so'zning inglizchasini toping</div>
    <div class="word-mid">${w.uz}</div>
    <div class="options" id="opts">${opts.map((o, i) => html`<button class="option" data-v="${o}"><span class="opt-key">${i + 1}</span><span>${o}</span></button>`)}</div>
  `);
  primary(raw(`Davom etish ${icon('arrow-right', 18)}`), next, { disabled: true });
  let answered = false;
  document.querySelectorAll('#opts .option').forEach(btn => btn.onclick = () => {
    if (answered) return;
    answered = true;
    const ok = normalizeAnswer(btn.dataset.v) === normalizeAnswer(w.en);
    document.querySelectorAll('#opts .option').forEach(b => {
      b.disabled = true;
      if (normalizeAnswer(b.dataset.v) === normalizeAnswer(w.en)) b.classList.add('correct');
      else if (b !== btn) b.classList.add('dim');
    });
    if (ok) { playSound('correct'); vibrate(20); speak(w.en); }
    else { btn.classList.add('wrong'); playSound('wrong'); vibrate([30, 40, 30]); mistake(w.id); }
    enableNext();
  });
}

/* ── 3. Bo'laklash ── */
function splitPieces(word) {
  const s = word.trim();
  if (s.includes(' ') && s.split(/\s+/).length <= 5) return s.split(/\s+/);
  const n = s.length;
  const parts = n <= 3 ? [s[0], s.slice(1)] : n <= 6 ? [s.slice(0, Math.ceil(n / 2)), s.slice(Math.ceil(n / 2))]
    : n <= 10 ? [s.slice(0, Math.round(n / 3)), s.slice(Math.round(n / 3), Math.round((2 * n) / 3)), s.slice(Math.round((2 * n) / 3))]
    : [s.slice(0, Math.round(n / 4)), s.slice(Math.round(n / 4), Math.round(n / 2)), s.slice(Math.round(n / 2), Math.round((3 * n) / 4)), s.slice(Math.round((3 * n) / 4))];
  return parts.filter(Boolean);
}
function stage3() {
  const w = current();
  const target = w.en.trim();
  const isPhrase = target.includes(' ');
  let pieces = shuffle(splitPieces(target).map((p, i) => ({ p, i })));
  if (pieces.length > 1 && pieces.every((x, k) => x.i === k)) pieces.reverse();
  const picked = [];
  card(html`
    <div class="q-label">So'zni bo'laklardan yig'ing</div>
    <div class="word-mid">${w.uz}</div>
    <div class="assembled" id="asm">_</div>
    <div class="pieces" id="pieces">${pieces.map((x, k) => html`<button class="piece" data-k="${k}">${x.p}</button>`)}</div>
    <button class="btn btn-ghost btn-sm" id="undo" hidden>${ic('undo', 15)} Orqaga</button>
  `);
  primary(raw(`Davom etish ${icon('arrow-right', 18)}`), next, { disabled: true });
  let solved = false;
  const asm = $('#asm');
  const show = () => { asm.textContent = picked.length ? picked.map(k => pieces[k].p).join(isPhrase ? ' ' : '') : '_'; $('#undo').hidden = !picked.length || solved; };
  document.querySelectorAll('#pieces .piece').forEach(b => b.onclick = () => {
    if (solved || b.disabled) return;
    b.disabled = true;
    picked.push(Number(b.dataset.k));
    playSound('click');
    show();
    if (picked.length === pieces.length) {
      const got = picked.map(k => pieces[k].p).join(isPhrase ? ' ' : '');
      if (normalizeAnswer(got) === normalizeAnswer(target)) {
        solved = true;
        asm.className = 'assembled ok';
        asm.innerHTML = esc(got) + ' ' + icon('check', 22);
        playSound('correct'); speak(target);
        $('#undo').hidden = true;
        enableNext();
      } else {
        asm.className = 'assembled bad';
        playSound('wrong'); vibrate([30, 40, 30]);
        mistake(w.id);
        setTimeout(() => {
          picked.length = 0;
          asm.className = 'assembled';
          document.querySelectorAll('#pieces .piece').forEach(x => { x.disabled = false; });
          show();
        }, 900);
      }
    }
  });
  $('#undo').onclick = () => {
    const k = picked.pop();
    if (k === undefined) return;
    document.querySelector(`#pieces .piece[data-k="${k}"]`).disabled = false;
    show();
  };
}

/* ── 4. Moslashtirish ── */
function stage4() {
  const group = retry ? [current()] : words.slice(idx * MATCH_CHUNK, idx * MATCH_CHUNK + MATCH_CHUNK);
  if (retry) {
    const others = shuffle(words.filter(x => x.id !== group[0].id)).slice(0, 3);
    group.push(...others);
  }
  const left = shuffle(group), right = shuffle(group);
  card(html`
    <div class="q-label">Inglizcha va o'zbekcha juftliklarni toping</div>
    <div class="match" id="match">
      <div class="match-col">${left.map(w => html`<button class="match-btn" data-id="${w.id}" data-side="en">${w.en}</button>`)}</div>
      <div class="match-col">${right.map(w => html`<button class="match-btn" data-id="${w.id}" data-side="uz">${w.uz}</button>`)}</div>
    </div>
  `);
  primary(raw(`Davom etish ${icon('arrow-right', 18)}`), next, { disabled: true });
  let sel = null, matched = 0;
  document.querySelectorAll('#match .match-btn').forEach(b => b.onclick = () => {
    if (b.classList.contains('matched')) return;
    if (!sel) { sel = b; b.classList.add('selected'); if (b.dataset.side === 'en') speak(group.find(x => x.id === b.dataset.id).en); return; }
    if (sel === b) { b.classList.remove('selected'); sel = null; return; }
    if (sel.dataset.side === b.dataset.side) { sel.classList.remove('selected'); sel = b; b.classList.add('selected'); return; }
    const a = sel; sel = null;
    a.classList.remove('selected');
    if (a.dataset.id === b.dataset.id) {
      a.classList.add('matched'); b.classList.add('matched'); a.disabled = b.disabled = true;
      matched++; playSound('correct');
      if (matched === group.length) { playSound('victory'); enableNext(); }
    } else {
      a.classList.add('wrong'); b.classList.add('wrong'); playSound('wrong'); vibrate(30);
      const en = a.dataset.side === 'en' ? a : b;
      mistake(en.dataset.id, 4);
      setTimeout(() => { a.classList.remove('wrong'); b.classList.remove('wrong'); }, 450);
    }
  });
}

/* ── 5. Yozish ── */
function blankExample(example, word) {
  if (!example) return '';
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'ig');
  return re.test(example) ? example.replace(re, '_____') : '';
}
function stage5() {
  const w = current();
  const ex = blankExample(w.example, w.en.trim());
  let hints = 0, solved = false, tries = 0;
  card(html`
    <div class="q-label">Inglizcha yozing</div>
    <div class="word-mid">${w.uz}</div>
    ${ex ? html`<div class="example">"${ex}"</div>` : ''}
    <input class="input input-lg type-input" id="type" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Javobingiz..." aria-label="Javob">
    <div class="feedback" id="fb"></div>
    <button class="btn btn-ghost btn-sm" id="hint">${ic('lightbulb', 15)} Yordam</button>
  `);
  const input = $('#type'), fb = $('#fb');
  setActions(html`<button class="btn btn-ghost btn-lg" id="skip" title="O'tkazib yuborish">${ic('skip', 18)}</button>
    <button class="btn btn-primary btn-lg grow" id="check">Tekshirish</button>`);
  $('#skip').hidden = !!retry;
  $('#skip').onclick = skip;
  const check = () => {
    if (solved) return next();
    const val = input.value;
    if (!val.trim()) { input.focus(); return; }
    if (normalizeAnswer(val) === normalizeAnswer(w.en)) {
      solved = true;
      input.classList.remove('bad'); input.classList.add('ok'); input.readOnly = true;
      fb.className = 'feedback ok'; fb.textContent = "To'g'ri!";
      playSound('correct'); speak(w.en);
      if (!hints && !results[w.id].mistakes.length && Math.random() < 0.3) confetti({ count: 40 });
      $('#hint').hidden = true;
      $('#check').innerHTML = `Davom etish ${icon('arrow-right', 18)}`;
      $('#check').focus();
    } else {
      tries++;
      mistake(w.id);
      input.classList.remove('bad'); void input.offsetWidth; input.classList.add('bad');
      playSound('wrong'); vibrate([30, 40, 30]);
      fb.className = 'feedback bad';
      fb.textContent = tries >= 2 ? `To'g'ri javob: ${w.en}` : "Noto'g'ri, yana urinib ko'ring";
      input.select();
    }
  };
  $('#check').onclick = check;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
  input.addEventListener('input', () => input.classList.remove('bad'));
  $('#hint').onclick = () => {
    hints++;
    mistake(w.id);
    const target = w.en.trim();
    const n = Math.min(target.length - 1, hints * Math.max(1, Math.ceil(target.length / 4)));
    input.value = target.slice(0, n);
    input.focus();
    fb.className = 'feedback'; fb.textContent = `Boshlanishi: ${target.slice(0, n)}...`;
  };
  setTimeout(() => input.focus(), 60);
}

/* ── Mustahkamlash va yakun ── */
function startRetry() {
  const list = [];
  words.forEach(w => {
    const r = results[w.id];
    if (r.mistakes.length) {
      if (r.mistakes.some(s => s === 2 || s === 4)) list.push({ word: w, stage: 2 });
      list.push({ word: w, stage: 5 });
    }
  });
  if (!list.length) return finish();
  retry = { list, i: 0 };
  card(html`<div class="empty-icon" style="background:var(--warning-soft);color:var(--warning-light)">${ic('repeat', 30)}</div>
    <div class="word-mid">Mustahkamlash</div>
    <p class="muted" style="max-width:360px">${list.length} ta mashq bilan xato qilgan so'zlaringizni yana bir bor takrorlaymiz.</p>`);
  $('#steps').innerHTML = '';
  setActions(html`<button class="btn btn-primary btn-lg grow" id="go">Boshlash ${ic('arrow-right', 18)}</button>`);
  $('#go').onclick = render;
  $('#go').focus();
}

async function finish() {
  if (finished) return;
  finished = true;
  $('#bar').style.width = '100%';
  card(html`<div class="spinner"></div><p class="muted">Natijalar saqlanmoqda...</p>`);
  setActions('');
  const payload = finishPayload({ src, words, results, startedAt, mode: 'study' });
  let res;
  try { res = await completeSession(user.uid, payload); }
  catch (e) {
    console.error(e);
    finished = false;
    card(html`<div class="empty-icon" style="background:var(--danger-soft);color:var(--danger-light)">${ic('alert-triangle', 30)}</div>
      <div class="word-mid">Natijani saqlab bo'lmadi</div><p class="muted">Internet aloqasini tekshirib, qayta urinib ko'ring.</p>`);
    setActions(html`<button class="btn btn-primary btn-lg grow" id="again">${ic('refresh', 18)} Qayta urinish</button>`);
    $('#again').onclick = finish;
    return;
  }
  storeResult({
    mode: 'study', title: session.title, subtitle: session.subtitle, src: src0, home,
    words: payload.words, results, res: { ...res, user: undefined }, user: res.user ? { streakDays: res.user.streakDays } : null
  });
  location.replace('results.html');
}

/* ── Klaviatura ── */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (/^[1-4]$/.test(e.key)) { const b = document.querySelectorAll('#opts .option')[Number(e.key) - 1]; if (b) b.click(); }
  else if (e.key === 'Enter') { const b = $('#next') || $('#go') || $('#check'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  else if (e.key === ' ' && $('#say')) { e.preventDefault(); $('#say').click(); }
});

$('#exit').onclick = async () => {
  if (finished || !words.length || (stage === 1 && idx === 0)) return location.assign(home || 'folders.html');
  const ok = await confirmDialog({ title: "Mashg'ulotdan chiqasizmi?", message: "Joriy mashg'ulotdagi natijalar saqlanmaydi.", confirmText: 'Chiqish', cancelText: 'Davom etish', danger: true });
  if (ok) { leaving = true; location.assign(home); }
};
addEventListener('beforeunload', (e) => { if (!finished && !leaving && words.length && (stage > 1 || idx > 0)) { e.preventDefault(); e.returnValue = ''; } });

start();
