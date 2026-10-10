import { initPage } from '../core.js';
import { weeklyLeaders, allTimeLeaders, listShop } from '../data.js';
import { weekKey, weekRange, weeklyStars } from '../game.js';
import { iconName, starIcon } from '../icons.js';
import { $, html, raw, ic, setHTML, emptyState, errorState, loadingBlock, fmtNum, esc } from '../ui.js';

const { user, u } = await initPage({ title: 'Reyting', active: 'leaderboard' });
let tab = 'weekly';
let shop = [];
const { monday, sunday } = weekRange();
const MON = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
const range = `${monday.getDate()}-${MON[monday.getMonth()]} — ${sunday.getDate()}-${MON[sunday.getMonth()]}`;

function av(p, cls = '') {
  const frame = shop.find(s => s.id === (p.equipped || {}).avatar);
  const style = frame && frame.color ? ` style="--frame:${esc(frame.color)}"` : '';
  const framed = frame && frame.color ? ' framed' : '';
  const name = p.displayName || '?';
  const inner = p.photoThumb && /^data:image\//.test(p.photoThumb) ? `<img src="${esc(p.photoThumb)}" alt="">` : esc(name.charAt(0).toUpperCase());
  return raw(`<div class="avatar ${cls}${framed}"${style}>${inner}</div>`);
}
function badge(p) {
  const b = shop.find(s => s.id === (p.equipped || {}).badge);
  return b ? html`<span class="badge badge-warning" title="${b.name}">${ic(iconName(b.emoji, 'medal'), 12)}</span>` : '';
}

async function load() {
  $('#sub').textContent = tab === 'weekly' ? `Shu hafta: ${range}. Har dushanba yangilanadi.` : 'Barcha vaqtlar bo\'yicha eng ko\'p XP to\'plaganlar';
  setHTML('list', loadingBlock());
  setHTML('podium', '');
  let rows;
  try {
    if (!shop.length) shop = await listShop().catch(() => []);
    rows = tab === 'weekly' ? await weeklyLeaders(weekKey()) : await allTimeLeaders(100);
  } catch (e) { errorState('list', load); return; }
  const score = (r) => (tab === 'weekly' ? r.weeklyStars : r.stars) || 0;
  const myScore = tab === 'weekly' ? weeklyStars(u) : (u.stars || 0);
  const myIdx = rows.findIndex(r => r.id === user.uid);
  setHTML('me', html`<div class="card card-sm row mb-4 lb-me">
    ${av({ ...u, photoThumb: u.photoThumb, equipped: u.equippedItems })}
    <div class="grow"><div class="bold">Sizning o'rningiz</div><div class="xs muted">${myIdx >= 0 ? `${myIdx + 1}-o'rin` : myScore ? 'Reytingda hali yo\'qsiz' : "XP to'plang va reytingga kiring"}</div></div>
    <span class="row bold" style="gap:6px">${raw(starIcon(16))} ${fmtNum(myScore)}</span></div>`);

  if (!rows.length) {
    setHTML('list', emptyState({ iconName: 'trophy', title: tab === 'weekly' ? "Bu hafta hali hech kim XP to'plamagan" : "Hali reyting bo'sh", sub: 'Birinchi bo\'ling — mavzuni o\'rganing va XP to\'plang!', action: html`<a class="btn btn-primary" href="folders.html">O'rganishni boshlash</a>` }));
    return;
  }
  const top = rows.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  setHTML('podium', html`${order.map(r => {
    const rank = rows.indexOf(r) + 1;
    return html`<div class="podium-item p${rank}">
      <div class="podium-rank">${rank === 1 ? ic('crown', 22) : ''} ${rank}</div>
      ${av(r, rank === 1 ? 'avatar-lg' : '')}
      <div class="bold small truncate" style="max-width:100%">${r.displayName || 'Foydalanuvchi'} ${badge(r)}</div>
      <div class="row small" style="gap:4px">${raw(starIcon(14))} ${fmtNum(score(r))}</div>
    </div>`;
  })}`);
  if (top.length < 3) $('#podium').style.gridTemplateColumns = `repeat(${top.length}, 1fr)`;
  else $('#podium').style.gridTemplateColumns = '';
  const rest = rows.slice(3, 50);
  setHTML('list', rest.length ? html`<div class="list">${rest.map((r, i) => html`<div class="list-row ${r.id === user.uid ? 'lb-me' : ''}">
    <span class="list-num">${i + 4}</span>${av(r, 'avatar-sm')}
    <div class="list-main truncate"><span class="list-title">${r.displayName || 'Foydalanuvchi'}</span> ${badge(r)} ${r.id === user.uid ? html`<span class="badge badge-primary">Siz</span>` : ''}</div>
    <span class="row bold small" style="gap:4px">${raw(starIcon(14))} ${fmtNum(score(r))}</span></div>`)}</div>` : '');
  $('#list').hidden = !rest.length;
}
document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => {
  tab = b.dataset.t;
  document.querySelectorAll('#tabs .tab').forEach(x => x.classList.toggle('active', x === b));
  $('#list').hidden = false;
  load();
});
load();
