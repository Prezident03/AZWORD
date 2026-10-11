import { initPage } from '../core.js';
import { listAchievements, claimAchievements } from '../data.js';
import { achievementValue, achievementReady, ACH_TYPES } from '../game.js';
import { iconName, starIcon } from '../icons.js';
import { $, html, raw, ic, setHTML, ring, animateRings, emptyState, errorState, skeletonCards, fmtNum, toast } from '../ui.js';
import { playSound, confetti } from '../fx.js';

const ctx = await initPage({ title: 'Yutuqlar', active: 'achievements' });
const { user } = ctx;
let u = ctx.u;
let all = [];
let tab = 'all';

async function load() {
  setHTML('grid', skeletonCards(6));
  try { all = await listAchievements(); }
  catch (e) { errorState('grid', load, e, e); return; }
  const ready = all.filter(a => !(u.achievements || []).includes(a.id) && achievementReady(a, u));
  if (ready.length) {
    const got = await claimAchievements(user.uid, ready);
    if (got.length) {
      u = {
        ...u,
        achievements: [...(u.achievements || []), ...got.map(a => a.id)],
        stars: (u.stars || 0) + got.reduce((s, a) => s + (a.starReward || 0), 0),
        coins: (u.coins || 0) + got.reduce((s, a) => s + (a.coinReward || 0), 0)
      };
      ctx.setUser(u);
      playSound('achievement');
      confetti({ count: 120 });
      toast(`${got.length} ta yangi yutuq ochildi!`);
    }
  }
  render();
}

function render() {
  const have = new Set(u.achievements || []);
  const unlocked = all.filter(a => have.has(a.id)).length;
  const pct = all.length ? Math.round((unlocked / all.length) * 100) : 0;
  setHTML('summary', html`${ring(pct, { size: 100, stroke: 10, label: `${unlocked}`, sub: `/ ${all.length}` })}
    <div><h1 class="page-title">Yutuqlar</h1><p class="muted mt-1">${unlocked} ta yutuq ochildi. Har bir yutuq XP va tanga olib keladi.</p></div>`);
  animateRings($('#summary'));
  const tabs = [['all', 'Hammasi', all.length], ['open', 'Ochilgan', unlocked], ['locked', 'Qulflangan', all.length - unlocked]];
  setHTML('tabs', raw(tabs.map(([k, l, n]) => `<button class="tab${k === tab ? ' active' : ''}" data-t="${k}">${l} <span class="tab-count">${n}</span></button>`).join('')));
  document.querySelectorAll('#tabs .tab').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });

  const list = all.filter(a => tab === 'all' || (tab === 'open' ? have.has(a.id) : !have.has(a.id)));
  if (!list.length) {
    setHTML('grid', html`<div class="card" style="grid-column:1/-1">${emptyState({ iconName: 'medal', title: all.length ? "Bu bo'limda hech narsa yo'q" : "Hozircha yutuqlar qo'shilmagan" })}</div>`);
    return;
  }
  setHTML('grid', html`${list.map(a => {
    const open = have.has(a.id);
    const val = achievementValue(a, u);
    const target = Number(a.threshold) || 1;
    const p = Math.min(100, Math.round((val / target) * 100));
    return html`<div class="card item-card ${open ? 'unlocked' : 'locked'}">
      ${open ? html`<span class="badge badge-success corner">${ic('check', 12)} Olindi</span>` : ''}
      <div class="item-icon">${ic(open ? iconName(a.emoji, 'award') : 'lock', 32)}</div>
      <div class="card-title">${a.name}</div>
      <div class="item-desc">${a.description || (ACH_TYPES[a.type] ? `${ACH_TYPES[a.type].label}: ${fmtNum(target)}` : '')}</div>
      ${open ? '' : html`<div style="width:100%"><div class="progress progress-sm"><span style="width:${p}%"></span></div><div class="xs dim mt-1">${fmtNum(Math.min(val, target))} / ${fmtNum(target)}</div></div>`}
      <div class="row small" style="gap:12px">
        ${a.starReward ? html`<span class="row" style="gap:4px">${raw(starIcon(14))} +${a.starReward}</span>` : ''}
        ${a.coinReward ? html`<span class="price">${ic('coins', 14)} +${a.coinReward}</span>` : ''}
      </div>
    </div>`;
  })}`);
}
load();
