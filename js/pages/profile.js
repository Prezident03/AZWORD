import { initPage, logout } from '../core.js';
import { auth, db, updateProfile, sendPasswordResetEmail, doc, setDoc } from '../firebase.js';
import { updateProfileDoc, listMyFolders, listShop, leaderboardData } from '../data.js';
import { levelInfo, streakState } from '../game.js';
import { icon, iconName, starIcon } from '../icons.js';
import { $, html, raw, ic, setHTML, ring, animateRings, avatar, fmtNum, fmtDate, toast, toastError, withLoading, confirmDialog } from '../ui.js';

const ctx = await initPage({ title: 'Profil', active: 'profile' });
const { user } = ctx;
let u = ctx.u;
let badgeItem = null;

async function loadEquipped() {
  const eq = u.equippedItems || {};
  if (!Object.keys(eq).length) return;
  try {
    const shop = await listShop();
    badgeItem = shop.find(s => s.id === eq.badge) || null;
    const frame = shop.find(s => s.id === eq.avatar);
    if (frame && frame.color) u = { ...u, frameColor: frame.color };
    renderHead();
  } catch (e) { /* ignore */ }
}

function renderHead() {
  const lv = levelInfo(u.stars);
  const name = u.displayName || user.displayName || (user.email || '').split('@')[0];
  setHTML('head', html`<div class="profile-head">
    <label class="avatar-edit" title="Rasmni o'zgartirish">
      ${avatar({ ...u, displayName: name }, 'avatar-xl')}
      <span class="avatar-cam">${ic('camera', 15)}</span>
      <input type="file" accept="image/*" id="photo" hidden>
    </label>
    <div class="grow">
      <h1 class="page-title" style="word-break:break-word">${name}</h1>
      <div class="small muted">${user.email || ''}</div>
      <div class="row wrap mt-2">
        <span class="badge badge-primary">${ic('award', 12)} ${lv.level}-daraja</span>
        ${badgeItem ? html`<span class="badge badge-warning">${ic(iconName(badgeItem.emoji, 'medal'), 12)} ${badgeItem.name}</span>` : ''}
        ${u.createdAt ? html`<span class="badge">${ic('calendar', 12)} ${fmtDate(u.createdAt)} dan beri</span>` : ''}
      </div>
    </div>
    ${ring(lv.pct, { size: 96, stroke: 9, label: `${lv.level}`, sub: `${lv.xp}/${lv.need} XP` })}
  </div>
  ${u.photoBase64 ? html`<button class="btn btn-ghost btn-sm mt-3" id="rm-photo">${ic('trash-2', 15)} Rasmni olib tashlash</button>` : ''}`);
  animateRings($('#head'));
  $('#photo').onchange = onPhoto;
  const rm = $('#rm-photo');
  if (rm) rm.onclick = removePhoto;
}

async function renderStats() {
  const st = streakState(u);
  let folders = 0;
  try { folders = (await listMyFolders(user.uid)).length; } catch (e) { /* ignore */ }
  const items = [
    [raw(starIcon(22)), 'tone-soft', u.stars, 'Yulduz (XP)'],
    [ic('coins', 22), 'tone-emerald', u.coins, 'Tanga'],
    [ic('flame', 22), 'tone-orange', st.current, 'Joriy streak'],
    [ic('trophy', 22), 'tone-amber', u.longestStreak || st.current, 'Eng uzun streak'],
    [ic('graduation-cap', 22), 'tone-violet', u.wordsMastered, "O'zlashtirilgan so'z"],
    [ic('layers', 22), 'tone-blue', u.sessionsCount, "Mashg'ulotlar"],
    [ic('medal', 22), 'tone-pink', (u.achievements || []).length, 'Yutuqlar'],
    [ic('folder', 22), 'tone-cyan', folders, "Mening bo'limlarim"]
  ];
  setHTML('stats', html`${items.map(([i, t, v, l]) => html`<div class="card card-sm stat"><span class="tile-icon sm ${t}">${i}</span><div><div class="stat-value" style="font-size:1.25rem">${fmtNum(v || 0)}</div><div class="stat-label">${l}</div></div></div>`)}`);
}

/* Ism */
setHTML('edit-title', html`${ic('user', 18)} Hisob ma'lumotlari`);
$('#name').value = u.displayName || user.displayName || '';
$('#email').textContent = user.email || '';
$('#name-form').onsubmit = (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  if (!name) return toastError("Ism bo'sh bo'lmasin");
  withLoading(e.submitter, async () => {
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      await updateProfileDoc(user.uid, { displayName: name });
      u = { ...u, displayName: name };
      await setDoc(doc(db, 'leaderboard', user.uid), leaderboardData(u)).catch(() => {});
      ctx.setUser(u);
      renderHead();
      toast('Ism saqlandi');
    } catch (err) { toastError("Saqlab bo'lmadi"); }
  });
};

/* Parol (faqat email/parol bilan kirganlar uchun) */
const hasPassword = (auth.currentUser.providerData || []).some(p => p.providerId === 'password');
if (!hasPassword) $('#pw-row').hidden = true;
$('#reset-pw').onclick = (e) => withLoading(e.currentTarget, async () => {
  try { await sendPasswordResetEmail(auth, user.email); toast('Havola emailingizga yuborildi'); }
  catch (err) { toastError('Yuborib bo\'lmadi. Keyinroq urinib ko\'ring.'); }
});

/* Rasm: 200px asosiy va 64px kichik nusxa (reyting uchun) */
function resize(img, max, quality) {
  const c = document.createElement('canvas');
  const side = Math.min(img.width, img.height);
  c.width = c.height = Math.max(1, Math.min(max, side));
  c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
async function onPhoto(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!/^image\//.test(file.type)) return toastError('Faqat rasm fayl tanlang');
  if (file.size > 8 * 1024 * 1024) return toastError("Rasm 8 MB dan kichik bo'lsin");
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = async () => {
    URL.revokeObjectURL(url);
    const photoBase64 = resize(img, 200, 0.8);
    const photoThumb = resize(img, 64, 0.7);
    try {
      await updateProfileDoc(user.uid, { photoBase64, photoThumb });
      u = { ...u, photoBase64, photoThumb };
      await setDoc(doc(db, 'leaderboard', user.uid), leaderboardData(u)).catch(() => {});
      ctx.setUser(u);
      renderHead();
      toast('Rasm yangilandi');
    } catch (err) { toastError("Rasmni saqlab bo'lmadi"); }
  };
  img.onerror = () => toastError("Rasmni o'qib bo'lmadi");
  img.src = url;
}
async function removePhoto() {
  if (!await confirmDialog({ title: "Rasmni olib tashlash", message: 'Profil rasmingiz o\'chiriladi.', confirmText: "O'chirish", danger: true })) return;
  try {
    await updateProfileDoc(user.uid, { photoBase64: '', photoThumb: '' });
    u = { ...u, photoBase64: '', photoThumb: '' };
    await setDoc(doc(db, 'leaderboard', user.uid), leaderboardData(u)).catch(() => {});
    ctx.setUser(u);
    renderHead();
  } catch (e) { toastError("O'chirib bo'lmadi"); }
}

/* Havolalar */
const links = [
  ['settings.html', 'settings', 'Sozlamalar', "Mavzu, ovoz, kunlik maqsad, eslatma"],
  ['achievements.html', 'medal', 'Yutuqlar', `${(u.achievements || []).length} ta ochilgan`],
  ['stats.html', 'bar-chart', 'Statistika', 'Grafiklar va qiyin so\'zlar'],
  ['shop.html', 'shopping-bag', "Do'kon", `${fmtNum(u.coins)} tanga`],
  ['leaderboard.html', 'trophy', 'Reyting', 'Haftalik va umumiy reyting']
];
if (ctx.isAdmin) links.push(['admin.html', 'shield', 'Admin panel', 'Kontent va foydalanuvchilarni boshqarish']);
setHTML('links', raw(links.map(([h, i, t, s]) => `<a class="list-row clickable" href="${h}" style="color:inherit;text-decoration:none"><span class="tile-icon sm tone-soft">${icon(i, 18)}</span><div class="list-main"><div class="list-title">${t}</div><div class="list-sub">${s}</div></div>${icon('chevron-right', 18)}</a>`).join('')
  + `<button class="list-row clickable" id="logout" style="width:100%;border:0;background:none;font:inherit;color:var(--danger-light);text-align:left"><span class="tile-icon sm" style="background:var(--danger-soft);color:var(--danger-light)">${icon('log-out', 18)}</span><div class="list-main"><div class="list-title">Chiqish</div></div></button>`));
$('#logout').onclick = async () => { if (await confirmDialog({ title: 'Hisobdan chiqish', message: 'Haqiqatan ham chiqmoqchimisiz?', confirmText: 'Chiqish' })) logout(); };

renderHead();
renderStats();
loadEquipped();
