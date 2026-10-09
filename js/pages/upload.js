import { initPage } from '../core.js';
import { getFolder, listWords, addWords, myWordSet } from '../data.js';
import { $, $$, html, ic, setHTML, params, toast, toastError, withLoading } from '../ui.js';
import { parseFile, parseText } from '../parse.js';
import { aiExample } from '../ai.js';

const folderId = params().get('id');
if (!folderId) { location.replace('folders.html?tab=mine'); await new Promise(() => {}); }
const ctx = await initPage({ title: "So'zlarni yuklash", active: 'learn', back: `folder.html?id=${encodeURIComponent(folderId || '')}` });
const { user, isAdmin } = ctx;
const src = { kind: 'folder', containerId: folderId, topicId: null };

const folder = await getFolder(folderId).catch(() => null);
if (!folder || !(folder.uid === user.uid || (folder.isAdmin && isAdmin))) {
  setHTML(document.querySelector('main'), html`<div class="card card-lg"><div class="empty"><div class="empty-icon">${ic('lock', 30)}</div>
    <div class="empty-title">Bu bo'limga so'z qo'shib bo'lmaydi</div><div class="empty-sub">Faqat o'zingizning bo'limlaringizga so'z yuklay olasiz.</div>
    <a class="btn" href="folders.html?tab=mine">Bo'limlarim</a></div></div>`);
  throw new Error('no access');
}
$('#folder-name').textContent = `"${folder.name}" bo'limiga so'z qo'shish`;
$('#cancel').href = `folder.html?id=${encodeURIComponent(folderId)}`;

let parsed = [];
let existingHere = new Set(), existingMine = new Set();
Promise.all([listWords(src), myWordSet(user.uid)]).then(([ws, mine]) => {
  existingHere = new Set(ws.map(w => String(w.en).toLowerCase().trim()));
  existingMine = mine;
  if (parsed.length) renderPreview();
}).catch(() => {});

/* Rejim: fayl / matn */
$$('#mode .tab').forEach(b => b.onclick = () => {
  $$('#mode .tab').forEach(x => x.classList.toggle('active', x === b));
  $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.m; });
});

function showErr(msg) { const e = $('#err'); e.textContent = msg || ''; e.classList.toggle('show', !!msg); }

async function handleFile(file) {
  showErr('');
  try {
    parsed = await parseFile(file);
    if (!parsed.length) return showErr("Faylda so'z topilmadi. Formatni tekshiring.");
    renderPreview();
  } catch (e) { showErr(e.message); }
}
const drop = $('#drop');
$('#file').onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; };
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
$('#parse-text').onclick = () => {
  showErr('');
  parsed = parseText($('#text').value);
  if (!parsed.length) return showErr("So'z topilmadi. Har bir qatorda inglizcha va o'zbekcha so'zni ajratib yozing.");
  renderPreview();
};

function renderPreview() {
  $('#preview').hidden = false;
  setHTML('preview-title', html`${ic('list', 18)} ${parsed.length} ta so'z topildi`);
  setHTML('rows', html`<div class="list">${parsed.map((w, i) => {
    const here = existingHere.has(w.en.toLowerCase());
    const elsewhere = !here && existingMine.has(w.en.toLowerCase());
    return html`<label class="list-row" style="cursor:pointer">
      <input type="checkbox" data-i="${i}" ${here ? '' : 'checked'} style="width:18px;height:18px;accent-color:var(--primary)">
      <span class="list-num">${i + 1}</span>
      <div class="list-main"><div class="list-title">${w.en} <span class="muted" style="font-weight:400">— ${w.uz}</span></div>
        ${w.example ? html`<div class="xs dim" style="font-style:italic">${w.example}</div>` : ''}</div>
      ${here ? html`<span class="badge badge-warning">bu bo'limda bor</span>` : elsewhere ? html`<span class="badge">boshqa bo'limda bor</span>` : ''}
    </label>`;
  })}</div>`);
  $$('#rows input[type=checkbox]').forEach(c => { c.checked = !existingHere.has(parsed[Number(c.dataset.i)].en.toLowerCase()); c.onchange = updateSave; });
  updateSave();
  $('#preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function picked() { return $$('#rows input[type=checkbox]').filter(c => c.checked).map(c => parsed[Number(c.dataset.i)]); }
function updateSave() {
  const n = picked().length;
  setHTML('save', html`${ic('check', 18)} ${n} ta so'zni saqlash`);
  $('#save').disabled = !n;
}

$('#save').onclick = (e) => withLoading(e.currentTarget, async () => {
  const list = picked().map(w => ({ ...w }));
  if (!list.length) return;
  if ($('#ai-fill').checked) {
    const need = list.filter(w => !w.example).slice(0, 25);
    let done = 0;
    for (const w of need) {
      try { w.example = await aiExample(w.en, w.uz); } catch (err) { if (err.status === 429 || err.status === 401) break; }
      done++;
      setHTML('save', html`AI misol yozmoqda... ${done}/${need.length}`);
    }
  }
  try {
    const n = await addWords(src, list);
    toast(`${n} ta so'z qo'shildi`);
    setTimeout(() => location.assign(`folder.html?id=${encodeURIComponent(folderId)}`), 700);
  } catch (err) { toastError("Saqlab bo'lmadi: " + (err.code === 'permission-denied' ? "ruxsat yo'q" : err.message)); }
});
