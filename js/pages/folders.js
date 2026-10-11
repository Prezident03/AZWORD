import { initPage } from '../core.js';
import { listBooks, listPublicFolders, listMyFolders, listProgress, deleteContainerDeep } from '../data.js';
import { sourceQuery } from '../game.js';
import { icon } from '../icons.js';
import { $, $$, html, raw, ic, setHTML, emptyState, errorState, skeletonCards, confirmDialog, toast, toastError, params } from '../ui.js';
import { getLast, bookCard, bookProgress, publicFolderCard, myFolderCard, bindCardLinks, folderDialog, popMenu } from '../widgets.js';

const { user } = await initPage({ title: "O'rganish", active: 'learn' });
setHTML('new-folder', html`${ic('folder-plus', 17)} Yangi bo'lim`);

/* Tablar (URL bilan sinxron) */
function showTab(tab) {
  $$('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  history.replaceState(null, '', tab === 'books' ? 'folders.html' : `folders.html?tab=${tab}`);
}
$$('#tabs .tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
const startTab = params().get('tab');
if (['topics', 'mine'].includes(startTab)) showTab(startTab);

/* Davom ettirish kartasi */
const last = getLast();
if (last) {
  setHTML('continue', html`<a class="card card-link card-glow row mb-4" href="study.html?${raw(sourceQuery(last))}">
    <span class="tile-icon">${ic('play', 22)}</span>
    <div class="grow"><div class="xs muted">Davom ettirish</div><div class="card-title truncate">${last.title || 'Oxirgi mavzu'}</div>${last.subtitle ? html`<div class="xs dim truncate">${last.subtitle}</div>` : ''}</div>
    ${ic('chevron-right', 20)}
  </a>`);
}

let progress = {};
let mine = [];
async function load() {
  setHTML('books', skeletonCards(6));
  setHTML('topics', skeletonCards(6));
  setHTML('mine', skeletonCards(3));
  try { progress = await listProgress(user.uid); } catch (e) { progress = {}; }

  listBooks().then(books => {
    setHTML('books', books.length
      ? raw(books.map(b => bookCard(b, bookProgress(b, progress)).value).join(''))
      : html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'book', title: "Hozircha kitoblar yo'q", sub: "Tez orada yangi kitoblar qo'shiladi." })}</div>`);
  }).catch(() => errorState('books', load));

  listPublicFolders().then(list => {
    setHTML('topics', list.length
      ? raw(list.map(f => publicFolderCard(f).value).join(''))
      : html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'library', title: "Hozircha umumiy bo'limlar yo'q", sub: "Tez orada mavzular bo'yicha bo'limlar qo'shiladi." })}</div>`);
  }).catch(() => errorState('topics', load));

  loadMine();
}

async function loadMine() {
  try { mine = await listMyFolders(user.uid); } catch (e) { errorState('mine', loadMine, e, e); return; }
  const box = $('#mine');
  if (!mine.length) {
    setHTML(box, html`<div class="card" style="grid-column:1/-1">${emptyState({
      iconName: 'folder-plus', title: "Hali shaxsiy bo'lim yo'q",
      sub: "Bo'lim yarating va so'zlarni qo'lda, Excel/Word faylidan yoki AI yordamida qo'shing.",
      action: html`<button class="btn btn-primary" data-new>${ic('plus', 16)} Bo'lim yaratish</button>`
    })}</div>`);
  } else {
    setHTML(box, raw(mine.map(f => myFolderCard(f, progress[`folder_${f.id}__`]).value).join('')
      + `<button class="add-card" data-new>${icon('plus', 26)}<span>Yangi bo'lim</span></button>`));
    bindCardLinks(box);
    box.querySelectorAll('[data-menu]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const f = mine.find(x => x.id === btn.dataset.menu);
      popMenu(btn, [
        { icon: 'play', label: "O'rganish", onClick: () => { location.href = 'study.html?id=' + encodeURIComponent(f.id); } },
        { icon: 'edit', label: 'Tahrirlash', onClick: async () => { if (await folderDialog(user.uid, f, mine.map(x => x.name))) loadMine(); } },
        { icon: 'trash-2', label: "O'chirish", danger: true, onClick: () => remove(f) }
      ]);
    }));
  }
  box.querySelector('[data-new]').onclick = newFolder;
}

async function newFolder() {
  const r = await folderDialog(user.uid, null, mine.map(f => f.name));
  if (r) location.href = 'folder.html?id=' + encodeURIComponent(r.id);
}
async function remove(f) {
  const ok = await confirmDialog({ title: "Bo'limni o'chirish", message: `"${f.name}" bo'limi va undagi ${f.wordCount || 0} ta so'z butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`, confirmText: "O'chirish", danger: true });
  if (!ok) return;
  try { await deleteContainerDeep('folder', f.id); toast("Bo'lim o'chirildi"); loadMine(); }
  catch (e) { toastError("O'chirib bo'lmadi. Qayta urinib ko'ring."); }
}

$('#new-folder').onclick = () => { showTab('mine'); newFolder(); };
if (params().get('new') === '1') { showTab('mine'); setTimeout(newFolder, 200); }
load();
