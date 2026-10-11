import { initPage } from '../core.js';
import {
  getFolder, listTopics, listWords, listProgress, addWords, updateWord, deleteWord, deleteContainerDeep, userRef
} from '../data.js';
import { getDoc } from '../firebase.js';
import { sourceQuery } from '../game.js';
import { iconName } from '../icons.js';
import {
  $, html, raw, ic, setHTML, emptyState, errorState, skeletonCards, progressBar, fmtNum, params, openModal,
  confirmDialog, toast, toastError, withLoading, debounce
} from '../ui.js';
import { coverHtml, topicCard, topicProgress, peekWords, saveLast, toneFor, folderDialog, popMenu } from '../widgets.js';
import { speak } from '../fx.js';
import { aiExample, aiWords } from '../ai.js';

const folderId = params().get('id');
if (!folderId) { location.replace('folders.html'); await new Promise(() => {}); }
const ctx = await initPage({ title: "Bo'lim", active: 'learn', back: 'folders.html' });
const { user, isAdmin } = ctx;

let folder = null;
let words = [];
let canEdit = false;
const src = { kind: 'folder', containerId: folderId, topicId: null };

async function load() {
  setHTML('head', raw('<div class="skel" style="height:170px;border-radius:24px"></div>'));
  setHTML('list', skeletonCards(3, 'skel-line'));
  try { folder = await getFolder(folderId); }
  catch (e) { setHTML('head', ''); errorState('list', load); return; }
  if (!folder) {
    setHTML('head', '');
    setHTML('list', html`<div class="card">${emptyState({ iconName: 'folder', title: "Bo'lim topilmadi", sub: "Bo'lim o'chirilgan yoki sizda unga ruxsat yo'q.", action: html`<a class="btn" href="folders.html">O'rganish sahifasiga qaytish</a>` })}</div>`);
    return;
  }
  canEdit = folder.isAdmin ? isAdmin : folder.uid === user.uid;
  document.title = `${folder.name || "Bo'lim"} · AzWord`;
  document.getElementById('topbar-title').textContent = folder.name || "Bo'lim";

  if (folder.isAdmin && (folder.topicCount || 0) > 0) return loadTopicsMode();
  return loadWordsMode();
}

/* ── Mavzular rejimi (umumiy bo'lim ichida mavzular bo'lsa) ── */
async function loadTopicsMode() {
  const [topics, progress] = await Promise.all([listTopics('folder', folderId), listProgress(user.uid).catch(() => ({}))]);
  renderHead({ topics: topics.length });
  setHTML('list-title', html`${ic('list', 18)} Mavzular`);
  if (!topics.length) { setHTML('list', html`<div class="card">${emptyState({ iconName: 'list', title: "Hozircha mavzular yo'q" })}</div>`); return; }
  const grid = document.createElement('div');
  grid.className = 'grid-auto';
  setHTML(grid, raw(topics.map((t, i) => {
    const s = { kind: 'folder', containerId: folderId, topicId: t.id };
    return topicCard(s, t, topicProgress(s, progress), i).value;
  }).join('')));
  $('#list').replaceChildren(grid);
  grid.querySelectorAll('[data-start]').forEach(a => a.addEventListener('click', () => {
    const t = topics.find(x => x.id === a.dataset.start);
    saveLast({ kind: 'folder', containerId: folderId, topicId: t.id }, t.title, folder.name);
  }));
  grid.querySelectorAll('[data-peek]').forEach(b => b.addEventListener('click', () => {
    const t = topics.find(x => x.id === b.dataset.peek);
    peekWords(t.title || 'Mavzu', () => listWords({ kind: 'folder', containerId: folderId, topicId: t.id }));
  }));
}

/* ── So'zlar rejimi ── */
async function loadWordsMode() {
  try { words = await listWords(src); } catch (e) { errorState('list', loadWordsMode, e, e); return; }
  let prog = null;
  try { prog = (await listProgress(user.uid))[`folder_${folderId}__`] || null; } catch (e) { /* ignore */ }
  renderHead({ prog });
  renderWords();
}

function renderHead({ topics = null, prog = null } = {}) {
  const isTopics = topics !== null;
  const count = isTopics ? `${topics} mavzu` : `${fmtNum(words.length)} ta so'z`;
  const q = sourceQuery(src);
  const canStudy = words.length >= 2;
  setHTML('head', html`<div class="card card-lg card-glow fade-up">
    <div class="row" style="gap:18px;align-items:flex-start">
      ${folder.isAdmin && folder.imageUrl
        ? html`<div class="book-cover" style="width:84px;aspect-ratio:1;flex-shrink:0">${coverHtml(folder.imageUrl, 'library')}</div>`
        : html`<span class="tile-icon ${toneFor(folder.id)}" style="width:64px;height:64px;border-radius:18px">${ic(iconName(folder.emoji, 'folder'), 30)}</span>`}
      <div class="grow">
        <span class="badge ${folder.isAdmin ? 'badge-info' : 'badge-primary'}">${folder.isAdmin ? html`${ic('library', 12)} Umumiy bo'lim` : html`${ic('user', 12)} Shaxsiy bo'lim`}</span>
        <h1 class="page-title mt-2" style="word-break:break-word">${folder.name || "Bo'lim"}</h1>
        <div class="small muted mt-1">${count}${prog ? ` · ${prog.masteredPct || 0}% o'zlashtirildi` : ''}</div>
        ${!isTopics && prog ? html`<div class="mt-2" style="max-width:380px">${progressBar(prog.masteredPct || 0)}</div>` : ''}
      </div>
      ${canEdit && !folder.isAdmin ? html`<button class="icon-btn" id="folder-menu" aria-label="Amallar">${ic('more', 20)}</button>` : ''}
    </div>
    ${isTopics ? '' : html`<div class="row wrap mt-4">
      <a class="btn btn-primary${canStudy ? '' : ' is-disabled'}" href="${canStudy ? 'study.html?' + q : '#'}" id="study-btn">${ic('play', 17)} O'rganish</a>
      <a class="btn${canStudy ? '' : ' is-disabled'}" href="${canStudy ? 'flashcards.html?' + q : '#'}">${ic('copy', 17)} Flashcard</a>
      <a class="btn${canStudy ? '' : ' is-disabled'}" href="${canStudy ? 'quick-quiz.html?' + q : '#'}">${ic('zap', 17)} Kviz</a>
      <a class="btn${canStudy ? '' : ' is-disabled'}" href="${canStudy ? 'dictation.html?' + q : '#'}">${ic('pen-line', 17)} Diktant</a>
      ${canEdit ? html`<span class="grow"></span>
        <button class="btn" id="add-word">${ic('plus', 17)} So'z qo'shish</button>
        <a class="btn" href="upload.html?id=${encodeURIComponent(folderId)}">${ic('upload', 17)} Fayldan</a>
        <button class="btn btn-gradient" id="ai-gen">${ic('sparkles', 17)} AI generator</button>` : ''}
    </div>
    ${!canStudy && words.length < 2 ? html`<p class="xs dim mt-2">O'rganishni boshlash uchun kamida 2 ta so'z kerak.</p>` : ''}`}
  </div>`);
  $('#head').querySelectorAll('.is-disabled').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  const sb = $('#study-btn');
  if (sb) sb.addEventListener('click', () => saveLast(src, folder.name));
  const add = $('#add-word'); if (add) add.onclick = () => wordDialog();
  const gen = $('#ai-gen'); if (gen) gen.onclick = aiGeneratorDialog;
  const menu = $('#folder-menu');
  if (menu) menu.onclick = () => popMenu(menu, [
    { icon: 'edit', label: 'Nomini o\'zgartirish', onClick: async () => { const r = await folderDialog(user.uid, folder, []); if (r) { folder = { ...folder, ...r }; load(); } } },
    { icon: 'trash-2', label: "Bo'limni o'chirish", danger: true, onClick: removeFolder }
  ]);
}

const search = $('#search');
search.addEventListener('input', debounce(renderWords, 120));
function renderWords() {
  setHTML('list-title', html`${ic('book-open', 18)} So'zlar <span class="badge">${words.length}</span>`);
  $('#search-wrap').hidden = words.length < 6;
  if (!words.length) {
    setHTML('list', html`<div class="card">${emptyState({
      iconName: 'file-text', title: "Hali so'z yo'q",
      sub: canEdit ? "Birinchi so'zingizni qo'shing yoki Excel/Word fayldan yuklang." : "Bu bo'limga hali so'z qo'shilmagan.",
      action: canEdit ? html`<button class="btn btn-primary" data-add>${ic('plus', 16)} So'z qo'shish</button>` : ''
    })}</div>`);
    const b = $('#list [data-add]'); if (b) b.onclick = () => wordDialog();
    return;
  }
  const q = search.value.trim().toLowerCase();
  const shown = q ? words.filter(w => (w.en || '').toLowerCase().includes(q) || (w.uz || '').toLowerCase().includes(q)) : words;
  if (!shown.length) { setHTML('list', html`<div class="card">${emptyState({ iconName: 'search', title: 'Hech narsa topilmadi', sub: `"${q}" bo'yicha so'z yo'q.` })}</div>`); return; }
  setHTML('list', html`<div class="card card-flush"><div class="list">${shown.map(w => html`<div class="list-row">
    <span class="list-num">${words.indexOf(w) + 1}</span>
    <div class="list-main">
      <div class="list-title">${w.en}${w.ipa ? html` <span class="xs dim">${w.ipa}</span>` : ''}${w.pos ? html` <span class="badge" style="height:18px">${w.pos}</span>` : ''}</div>
      <div class="list-sub">${w.uz}</div>
      ${w.example ? html`<div class="xs dim mt-1" style="font-style:italic">${w.example}</div>` : ''}
    </div>
    <button class="icon-btn" data-say="${w.id}" aria-label="Tinglash">${ic('volume', 18)}</button>
    ${canEdit ? html`<button class="icon-btn" data-edit="${w.id}" aria-label="Tahrirlash">${ic('edit', 17)}</button>
      <button class="icon-btn danger" data-del="${w.id}" aria-label="O'chirish">${ic('trash-2', 17)}</button>` : ''}
  </div>`)}</div></div>`);
  const list = $('#list');
  list.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(words.find(w => w.id === b.dataset.say).en));
  list.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => wordDialog(words.find(w => w.id === b.dataset.edit)));
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => removeWord(words.find(w => w.id === b.dataset.del)));
}

/* So'z qo'shish / tahrirlash */
function wordDialog(word = null) {
  const m = openModal({
    title: word ? "So'zni tahrirlash" : "Yangi so'z",
    body: html`<form id="wf">
      <div class="grid-2" style="gap:12px">
        <div class="field"><label class="label" for="wf-en">Inglizcha</label><input class="input" id="wf-en" maxlength="120" value="${word ? word.en : ''}" placeholder="apple" autocomplete="off" required></div>
        <div class="field"><label class="label" for="wf-uz">O'zbekcha</label><input class="input" id="wf-uz" maxlength="200" value="${word ? word.uz : ''}" placeholder="olma" autocomplete="off" required></div>
      </div>
      <div class="field">
        <div class="row-between"><label class="label" for="wf-ex">Misol gap (ixtiyoriy)</label>
          <button type="button" class="btn btn-ghost btn-sm" id="wf-ai">${ic('sparkles', 15)} AI bilan yozish</button></div>
        <textarea class="textarea" id="wf-ex" maxlength="400" placeholder="I eat an apple every day." style="min-height:80px">${word ? word.example || '' : ''}</textarea>
      </div>
      ${word ? '' : html`<p class="xs dim">Misol yozilmasa, AI uni avtomatik qo'shadi.</p>`}
    </form>`,
    footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button>
      ${word ? '' : html`<button class="btn" id="wf-more">Saqlash va yana</button>`}
      <button class="btn btn-primary" id="wf-save">Saqlash</button>`
  });
  const en = m.$('#wf-en'), uz = m.$('#wf-uz'), ex = m.$('#wf-ex');
  m.$('#wf-ai').onclick = (e) => withLoading(e.currentTarget, async () => {
    if (!en.value.trim()) { en.focus(); return toastError("Avval inglizcha so'zni kiriting"); }
    try { ex.value = await aiExample(en.value.trim(), uz.value.trim()); } catch (err) { toastError(err.message); }
  });
  const save = (again) => withLoading(m.$(again ? '#wf-more' : '#wf-save'), async () => {
    const data = { en: en.value.trim(), uz: uz.value.trim(), example: ex.value.trim() };
    if (!data.en) { en.classList.add('is-error'); en.focus(); return; }
    if (!data.uz) { uz.classList.add('is-error'); uz.focus(); return; }
    if (!word && words.some(w => (w.en || '').toLowerCase() === data.en.toLowerCase())) { toastError(`"${data.en}" bu bo'limda allaqachon bor`); return; }
    try {
      if (word) { await updateWord(src, word.id, { ...word, ...data }); toast("So'z yangilandi"); }
      else { await addWords(src, [data]); toast("So'z qo'shildi"); }
    } catch (err) { toastError("Saqlab bo'lmadi"); return; }
    await refreshWords();
    if (!word && !data.example) fillExample(data.en, data.uz);
    if (again) { en.value = ''; uz.value = ''; ex.value = ''; en.focus(); } else m.close();
  });
  m.$('#wf-save').onclick = () => save(false);
  if (!word) m.$('#wf-more').onclick = () => save(true);
  m.$('#wf').onsubmit = (e) => { e.preventDefault(); save(false); };
  [en, uz].forEach(i => i.addEventListener('input', () => i.classList.remove('is-error')));
}
async function refreshWords() {
  words = await listWords(src);
  folder.wordCount = words.length;
  renderHead();
  renderWords();
}
/* Misolni fonda AI bilan to'ldirish */
async function fillExample(en, uz) {
  try {
    const sentence = await aiExample(en, uz);
    const w = words.find(x => x.en === en);
    if (sentence && w && !w.example) {
      await updateWord(src, w.id, { ...w, example: sentence });
      w.example = sentence;
      renderWords();
    }
  } catch (e) { /* AI mavjud bo'lmasa — misolsiz qoladi */ }
}

async function removeWord(w) {
  const ok = await confirmDialog({ title: "So'zni o'chirish", message: `"${w.en}" so'zi bo'limdan o'chiriladi.`, confirmText: "O'chirish", danger: true });
  if (!ok) return;
  try { await deleteWord(src, w.id); toast("So'z o'chirildi"); await refreshWords(); }
  catch (e) { toastError("O'chirib bo'lmadi"); }
}
async function removeFolder() {
  const ok = await confirmDialog({ title: "Bo'limni o'chirish", message: `"${folder.name}" va undagi ${words.length} ta so'z butunlay o'chiriladi.`, confirmText: "O'chirish", danger: true });
  if (!ok) return;
  try { await deleteContainerDeep('folder', folderId); toast("Bo'lim o'chirildi"); location.replace('folders.html?tab=mine'); }
  catch (e) { toastError("O'chirib bo'lmadi"); }
}

/* ── AI so'z generatori ── */
async function aiGeneratorDialog() {
  let uses = 0;
  try { uses = Number((await getDoc(userRef(user.uid))).data()?.aiGeneratorUses) || 0; } catch (e) { /* ignore */ }
  const unlimited = isAdmin;
  if (!unlimited && uses <= 0) {
    const m = openModal({
      title: 'AI so\'z generatori',
      body: html`<div class="empty" style="padding:8px 0"><div class="empty-icon">${ic('sparkles', 30)}</div>
        <div class="empty-title">Urinishlar tugagan</div>
        <div class="empty-sub">AI istalgan mavzu bo'yicha tarjima va misollari bilan so'zlar yaratadi. Do'kondan 100 tangaga 20 marta foydalanish imkonini oling.</div></div>`,
      footer: html`<button class="btn btn-ghost" data-close>Yopish</button><a class="btn btn-primary" href="shop.html">${ic('shopping-bag', 16)} Do'konga o'tish</a>`
    });
    return m;
  }
  let generated = [];
  const m = openModal({
    title: 'AI so\'z generatori',
    size: 'lg',
    body: html`<div id="ag-form">
      <div class="alert alert-info mb-4">${ic('sparkles', 18)}<div>${unlimited ? 'Admin: cheklovsiz' : html`Qolgan urinishlar: <b>${uses}</b>. Har bir generatsiya 1 urinish sarflaydi.`}</div></div>
      <div class="field"><label class="label" for="ag-topic">Mavzu</label><input class="input" id="ag-topic" maxlength="80" placeholder="Masalan: sayohat, oshxona, biznes" value="${folder.name}"></div>
      <div class="grid-2" style="gap:12px">
        <div class="field"><label class="label" for="ag-level">Daraja</label><select class="select" id="ag-level">
          <option value="A1">A1 — boshlang'ich</option><option value="A2">A2 — elementar</option><option value="B1" selected>B1 — o'rta</option>
          <option value="B2">B2 — o'rtadan yuqori</option><option value="C1">C1 — yuqori</option><option value="C2">C2 — mukammal</option></select></div>
        <div class="field"><label class="label" for="ag-count">So'zlar soni</label><select class="select" id="ag-count">
          <option>10</option><option selected>15</option><option>20</option><option>30</option><option>40</option></select></div>
      </div>
    </div>
    <div id="ag-result" hidden></div>`,
    footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-gradient" id="ag-go">${ic('sparkles', 16)} Yaratish</button>`
  });
  const go = m.$('#ag-go');
  go.onclick = () => withLoading(go, async () => {
    if (generated.length) return saveGenerated();
    const topic = m.$('#ag-topic').value.trim();
    if (!topic) { m.$('#ag-topic').focus(); return toastError('Mavzuni kiriting'); }
    try {
      const res = await aiWords(topic, m.$('#ag-level').value, m.$('#ag-count').value);
      const existing = new Set(words.map(w => (w.en || '').toLowerCase()));
      generated = res.words.map(w => ({ ...w, dup: existing.has(w.en.toLowerCase()) }));
      m.$('#ag-form').hidden = true;
      const r = m.$('#ag-result');
      r.hidden = false;
      setHTML(r, html`<div class="row-between mb-3"><div class="small muted">${generated.length} ta so'z yaratildi${res.usesLeft !== null && res.usesLeft !== undefined ? ` · ${res.usesLeft} urinish qoldi` : ''}. Keraksizlarini olib tashlang.</div></div>
        <div class="card card-flush" style="max-height:46vh;overflow:auto"><div class="list">${generated.map((w, i) => html`<label class="list-row" style="cursor:pointer">
          <input type="checkbox" data-i="${i}" ${w.dup ? '' : raw('checked')} style="width:18px;height:18px;accent-color:var(--primary)">
          <div class="list-main"><div class="list-title">${w.en} ${w.dup ? html`<span class="badge badge-warning">bor</span>` : ''}</div><div class="list-sub">${w.uz}</div>
          ${w.example ? html`<div class="xs dim" style="font-style:italic">${w.example}</div>` : ''}</div></label>`)}</div></div>`);
      go.innerHTML = '';
      setHTML(go, html`${ic('check', 16)} Tanlanganlarni qo'shish`);
    } catch (err) { toastError(err.message); }
  });
  async function saveGenerated() {
    const picked = [...m.el.querySelectorAll('#ag-result input[type=checkbox]')].filter(c => c.checked).map(c => generated[Number(c.dataset.i)]);
    if (!picked.length) return toastError("Kamida bitta so'z tanlang");
    try {
      const n = await addWords(src, picked);
      toast(`${n} ta so'z qo'shildi`);
      m.close();
      await refreshWords();
    } catch (e) { toastError("Saqlab bo'lmadi"); }
  }
}

load();
