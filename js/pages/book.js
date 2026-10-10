import { initPage } from '../core.js';
import { getBook, listTopics, listProgress, listWords } from '../data.js';
import { $, html, raw, ic, setHTML, emptyState, errorState, skeletonCards, progressBar, fmtNum, params } from '../ui.js';
import { coverHtml, bookProgress, topicCard, topicProgress, peekWords, saveLast } from '../widgets.js';

const bookId = params().get('id');
if (!bookId) { location.replace('folders.html'); await new Promise(() => {}); }
const { user } = await initPage({ title: 'Kitob', active: 'learn', back: 'folders.html' });
setHTML('topics-title', html`${ic('list', 18)} Mavzular`);

async function load() {
  setHTML('head', raw('<div class="skel" style="height:180px;border-radius:24px"></div>'));
  setHTML('topics', skeletonCards(6));
  let book, topics, progress;
  try {
    [book, topics, progress] = await Promise.all([getBook(bookId), listTopics('book', bookId), listProgress(user.uid).catch(() => ({}))]);
  } catch (e) { errorState('topics', load); setHTML('head', ''); return; }
  if (!book) {
    setHTML('head', '');
    setHTML('topics', html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'book', title: 'Kitob topilmadi', sub: "Kitob o'chirilgan yoki havola noto'g'ri.", action: html`<a class="btn" href="folders.html">Kitoblarga qaytish</a>` })}</div>`);
    return;
  }
  document.title = `${book.title || 'Kitob'} · AzWord`;
  document.getElementById('topbar-title').textContent = book.title || 'Kitob';
  const prog = bookProgress(book, progress);
  const totalWords = book.wordCount || topics.reduce((s, t) => s + (t.wordCount || 0), 0);
  setHTML('head', html`<div class="card card-lg card-glow fade-up" style="display:grid;grid-template-columns:140px 1fr;gap:24px;align-items:center">
    <div class="book-cover" style="width:140px">${coverHtml(book.imageUrl, 'book')}</div>
    <div>
      <span class="badge badge-primary">${ic('book', 12)} Kitob</span>
      <h1 class="page-title mt-2">${book.title || 'Kitob'}</h1>
      ${book.description ? html`<p class="muted mt-1">${book.description}</p>` : ''}
      <div class="row wrap mt-3 small muted">
        <span class="row" style="gap:6px">${ic('list', 16)} ${topics.length} mavzu</span>
        <span class="row" style="gap:6px">${ic('book-open', 16)} ${fmtNum(totalWords)} so'z</span>
        <span class="row" style="gap:6px">${ic('graduation-cap', 16)} ${fmtNum(prog.mastered)} o'zlashtirildi</span>
      </div>
      <div class="mt-3" style="max-width:420px">${progressBar(prog.pct)}<div class="xs dim mt-1">${prog.pct}% · ${prog.topicsDone}/${topics.length} mavzu to'liq</div></div>
    </div>
  </div>`);
  if (innerWidth < 600) $('#head .card').style.gridTemplateColumns = '96px 1fr';

  if (!topics.length) {
    setHTML('topics', html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'list', title: "Hozircha mavzular yo'q", sub: "Bu kitobga tez orada mavzular qo'shiladi." })}</div>`);
    return;
  }
  setHTML('topics', raw(topics.map((t, i) => {
    const src = { kind: 'book', containerId: bookId, topicId: t.id };
    return topicCard(src, t, topicProgress(src, progress), i).value;
  }).join('')));
  const box = $('#topics');
  box.querySelectorAll('[data-start]').forEach(a => a.addEventListener('click', () => {
    const t = topics.find(x => x.id === a.dataset.start);
    saveLast({ kind: 'book', containerId: bookId, topicId: t.id }, t.title, book.title);
  }));
  box.querySelectorAll('[data-peek]').forEach(b => b.addEventListener('click', () => {
    const t = topics.find(x => x.id === b.dataset.peek);
    peekWords(t.title || 'Mavzu', () => listWords({ kind: 'book', containerId: bookId, topicId: t.id }));
  }));
}
load();
