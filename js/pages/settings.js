import { initPage, logout } from '../core.js';
import { updateProfileDoc, allWordStats, listProgress, recentLogs } from '../data.js';
import { dailyGoal } from '../game.js';
import { $, html, raw, ic, setHTML, toast, toastError, confirmDialog } from '../ui.js';
import { getPrefs, setPrefs } from '../prefs.js';
import { speak, canSpeak, playSound, TTS_VOICES, resetSpeech } from '../fx.js';

const ctx = await initPage({ title: 'Sozlamalar', active: 'settings' });
const { user } = ctx;
let u = ctx.u;
const p = getPrefs();

const sw = (id, on) => raw(`<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></label>`);
const opt = (v, label, cur) => raw(`<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`);
const group = (iconName, title, rows) => html`<section><h2 class="section-title mb-3">${ic(iconName, 18)} ${title}</h2><div class="card">${rows}</div></section>`;
const row = (name, desc, control) => html`<div class="setting-row"><div class="setting-info"><div class="setting-name">${name}</div>${desc ? html`<div class="setting-desc">${desc}</div>` : ''}</div>${control}</div>`;

const goal = dailyGoal(u);
setHTML('groups', html`
  ${group('palette', "Ko'rinish", html`
    ${row('Mavzu', "Qorong'i, yorug' yoki qurilma sozlamasiga mos", html`<div class="tabs" id="theme">
      <button class="tab ${p.theme === 'dark' ? 'active' : ''}" data-v="dark">${ic('moon', 15)} Qorong'i</button>
      <button class="tab ${p.theme === 'light' ? 'active' : ''}" data-v="light">${ic('sun', 15)} Yorug'</button>
      <button class="tab ${p.theme === 'system' ? 'active' : ''}" data-v="system">${ic('smartphone', 15)} Avto</button></div>`)}
    ${row('Animatsiya va konfetti', "O'chirilsa, ilova tezroq va sokinroq ishlaydi", sw('effects', p.effects))}
  `)}
  ${group('volume', 'Ovoz va talaffuz', html`
    ${row('Ovoz effektlari', "To'g'ri/noto'g'ri javob ovozlari", sw('sound', p.sound))}
    ${row('Avtomatik talaffuz', "Yangi so'z ko'rsatilganda o'qib beradi", sw('autoSpeak', p.autoSpeak))}
    ${row('Ovoz turi', "Tabiiy AI ovoz — haqiqiy odamdek, ona tilida so'zlashuvchi talaffuzi (internet kerak)", html`<div class="tabs" id="engine">
      <button class="tab ${p.voiceEngine !== 'browser' ? 'active' : ''}" data-v="ai">${ic('sparkles', 15)} Tabiiy</button>
      <button class="tab ${p.voiceEngine === 'browser' ? 'active' : ''}" data-v="browser">${ic('smartphone', 15)} Brauzer</button></div>`)}
    ${row('Ovoz', 'Amerika talaffuzi', html`<select class="select" id="voice" style="width:auto">${TTS_VOICES.map(v => opt(v.id, `${v.name} (${v.desc})`, p.voice))}</select>`)}
    ${row('Talaffuz', 'Britaniya yoki Amerika talaffuzi', html`<select class="select" id="accent" style="width:auto">${opt('en-GB', 'Britaniya (UK)', p.accent)}${opt('en-US', 'Amerika (US)', p.accent)}</select>`)}
    ${row("O'qish tezligi", '', html`<select class="select" id="rate" style="width:auto">${opt(0.7, 'Sekin', p.voiceRate)}${opt(0.9, "O'rtacha", p.voiceRate)}${opt(1.05, 'Tez', p.voiceRate)}</select>`)}
    ${canSpeak() ? row('Sinab ko\'rish', '', html`<button class="btn btn-sm" id="test-voice">${ic('volume', 15)} Tinglash</button>`) : row("Talaffuz mavjud emas", "Brauzeringiz ovozli o'qishni qo'llab-quvvatlamaydi", '')}
  `)}
  ${group('target', "O'rganish", html`
    ${row('Kunlik maqsad', "Har kuni o'rganiladigan so'zlar soni", html`<select class="select" id="goal" style="width:auto">${[10, 20, 30, 50, 100].map(v => opt(v, `${v} ta so'z`, goal))}</select>`)}
    ${row("Mashg'ulot hajmi", "Bitta o'rganish mashg'ulotidagi so'zlar", html`<select class="select" id="size" style="width:auto">${[6, 8, 12, 20, 30].map(v => opt(v, `${v} ta`, p.sessionSize))}</select>`)}
  `)}
  ${group('bell', 'Eslatma', html`
    ${row('Kunlik eslatma', "Belgilangan vaqtda hali o'qimagan bo'lsangiz, bildirishnoma keladi (ilova ochiq yoki fonda bo'lganda)", sw('reminder', p.reminder))}
    ${row('Eslatma vaqti', '', html`<input type="time" class="input" id="rtime" value="${p.reminderTime}" style="width:auto">`)}
  `)}
  ${group('shield', "Ma'lumotlar", html`
    ${row("Ma'lumotlarimni yuklab olish", "Lug'at, progress va tarix (JSON)", html`<button class="btn btn-sm" id="export">${ic('download', 15)} Yuklab olish</button>`)}
    ${row('Keshni tozalash', "Ilova eski ko'rinishda qolsa — yangilaydi", html`<button class="btn btn-sm" id="clear">${ic('refresh', 15)} Tozalash</button>`)}
    ${row('Hisobdan chiqish', user.email || '', html`<button class="btn btn-sm btn-danger" id="logout">${ic('log-out', 15)} Chiqish</button>`)}
  `)}
  <p class="xs dim center">AzWord · Ingliz so'zlarini o'rganish platformasi</p>
`);

$('#voice').closest('.setting-row').id = 'ai-voice-row';
$('#accent').closest('.setting-row').id = 'accent-row';
$('#ai-voice-row').hidden = p.voiceEngine === 'browser';
$('#accent-row').hidden = p.voiceEngine !== 'browser';

const save = (patch, msg = 'Saqlandi') => { setPrefs(patch); toast(msg, 'success', 1600); };
document.querySelectorAll('#theme .tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('#theme .tab').forEach(x => x.classList.toggle('active', x === b));
  save({ theme: b.dataset.v }, 'Mavzu o\'zgartirildi');
});
['effects', 'sound', 'autoSpeak'].forEach(id => { $('#' + id).onchange = (e) => { save({ [id]: e.target.checked }); if (id === 'sound' && e.target.checked) playSound('correct'); }; });
$('#accent').onchange = (e) => save({ accent: e.target.value });
$('#rate').onchange = (e) => save({ voiceRate: Number(e.target.value) });
$('#size').onchange = (e) => save({ sessionSize: Number(e.target.value) });
const SAMPLE = 'Hello! Nice to meet you. Learning new words every day is easy.';
const tv = $('#test-voice'); if (tv) tv.onclick = () => speak(SAMPLE);
document.querySelectorAll('#engine .tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('#engine .tab').forEach(x => x.classList.toggle('active', x === b));
  const ai = b.dataset.v === 'ai';
  $('#ai-voice-row').hidden = !ai;
  $('#accent-row').hidden = ai;
  if (ai) resetSpeech();
  save({ voiceEngine: b.dataset.v });
  speak(SAMPLE);
});
$('#voice').onchange = (e) => { save({ voice: e.target.value }); speak(SAMPLE); };

$('#goal').onchange = async (e) => {
  const v = Number(e.target.value);
  try {
    const settings = { ...(u.settings || {}), dailyGoal: v };
    await updateProfileDoc(user.uid, { settings });
    u = { ...u, settings };
    ctx.setUser(u);
    toast(`Kunlik maqsad: ${v} ta so'z`);
  } catch (err) { toastError("Saqlab bo'lmadi"); }
};

$('#reminder').onchange = async (e) => {
  if (e.target.checked) {
    if (!('Notification' in window)) { e.target.checked = false; return toastError("Brauzeringiz bildirishnomalarni qo'llab-quvvatlamaydi"); }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { e.target.checked = false; return toastError('Bildirishnomaga ruxsat berilmadi. Brauzer sozlamalaridan yoqing.'); }
  }
  save({ reminder: e.target.checked }, e.target.checked ? 'Eslatma yoqildi' : "Eslatma o'chirildi");
};
$('#rtime').onchange = (e) => save({ reminderTime: e.target.value || '19:00' }, `Eslatma vaqti: ${e.target.value}`);

$('#export').onclick = async (e) => {
  const btn = e.currentTarget;
  btn.classList.add('loading');
  try {
    const [words, progress, logs] = await Promise.all([allWordStats(user.uid), listProgress(user.uid), recentLogs(user.uid, 500)]);
    const plain = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v)));
    const data = plain({ exportedAt: new Date().toISOString(), profile: { email: user.email, displayName: u.displayName, stars: u.stars, coins: u.coins, streakDays: u.streakDays, longestStreak: u.longestStreak }, words, progress, studyLog: logs });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `azword-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (err) { toastError("Yuklab olib bo'lmadi"); }
  btn.classList.remove('loading');
};
$('#clear').onclick = async () => {
  if (!await confirmDialog({ title: 'Keshni tozalash', message: "Ilova fayllari qayta yuklanadi. Hisobingiz va natijalaringiz saqlanib qoladi.", confirmText: 'Tozalash' })) return;
  try {
    if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k);
    if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  } catch (err) { /* ignore */ }
  location.reload();
};
$('#logout').onclick = async () => { if (await confirmDialog({ title: 'Hisobdan chiqish', message: 'Haqiqatan ham chiqmoqchimisiz?', confirmText: 'Chiqish' })) logout(); };
