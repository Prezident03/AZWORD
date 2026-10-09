import {
  auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup, updateProfile, sendPasswordResetEmail
} from '../firebase.js';
import { waitForUser, registerSW } from '../core.js';
import { loadUserDoc } from '../data.js';
import { icon } from '../icons.js';
import { $, $$, withLoading } from '../ui.js';
import '../prefs.js';

const next = (() => {
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(n) && !n.startsWith('index.html') ? n : 'dashboard.html';
})();

const ERRORS = {
  'auth/invalid-email': "Email manzil noto'g'ri kiritilgan.",
  'auth/user-not-found': "Email yoki parol noto'g'ri.",
  'auth/wrong-password': "Email yoki parol noto'g'ri.",
  'auth/invalid-credential': "Email yoki parol noto'g'ri.",
  'auth/invalid-login-credentials': "Email yoki parol noto'g'ri.",
  'auth/email-already-in-use': "Bu email bilan hisob allaqachon mavjud. Kirish bo'limidan foydalaning.",
  'auth/weak-password': "Parol juda oddiy — kamida 6 ta belgi kiriting.",
  'auth/too-many-requests': "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.",
  'auth/network-request-failed': "Internet aloqasini tekshiring.",
  'auth/popup-blocked': "Brauzer oynani blokladi. Popup'larga ruxsat bering.",
  'auth/user-disabled': "Bu hisob o'chirilgan."
};
const errorText = (e) => ERRORS[e && e.code] || "Xatolik yuz berdi. Qayta urinib ko'ring.";

function showError(msg) {
  const el = $('#auth-error');
  el.textContent = msg || '';
  el.classList.toggle('show', !!msg);
  $('#auth-ok').hidden = true;
}
function showOk(msg) {
  showError('');
  const el = $('#auth-ok');
  el.textContent = msg;
  el.hidden = false;
}

async function enter(user) {
  try { await loadUserDoc(user); } catch (e) { /* sahifada qayta urinadi */ }
  location.replace(next);
}

/* Agar allaqachon kirgan bo'lsa — darhol ichkariga */
let busy = false;
waitForUser().then((u) => {
  if (u && !busy) enter(u);
  else document.querySelector('.boot')?.classList.add('done');
});
registerSW();

/* Chap paneldagi afzalliklar */
$('#auth-feats').innerHTML = [
  ['layers', "5 bosqichli o'rganish: tanishish, variant, bo'laklash, moslashtirish, yozish"],
  ['repeat', "Aqlli takrorlash — unutilayotgan so'zlar o'z vaqtida qaytadi"],
  ['sparkles', 'AI yordamchi: misol gaplar, tarjima va savollarga javob'],
  ['trophy', 'Streak, yutuqlar va haftalik reyting']
].map(([i, t]) => `<div class="auth-feat"><span class="tile-icon sm tone-soft">${icon(i, 18)}</span><span>${t}</span></div>`).join('');

/* Tablar */
function switchTab(tab) {
  $$('.tab[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#form-login').hidden = tab !== 'login';
  $('#form-register').hidden = tab !== 'register';
  $('#auth-title').textContent = tab === 'login' ? 'Xush kelibsiz!' : 'Hisob yaratish';
  $('#auth-sub').textContent = tab === 'login' ? 'Davom etish uchun hisobingizga kiring' : "Bepul ro'yxatdan o'ting va o'rganishni boshlang";
  showError('');
  setTimeout(() => (tab === 'login' ? $('#login-email') : $('#reg-name')).focus(), 30);
}
$$('.tab[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
if (location.hash === '#register') switchTab('register');

/* Parolni ko'rsatish */
$$('[data-toggle-pass]').forEach(btn => {
  const input = document.getElementById(btn.dataset.togglePass);
  const render = () => { btn.innerHTML = icon(input.type === 'password' ? 'eye' : 'eye-off', 18); };
  render();
  btn.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; render(); });
});

/* Kirish */
$('#form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const pass = $('#login-password').value;
  if (!email || !pass) return showError('Email va parolni kiriting.');
  withLoading(e.submitter || $('#form-login .btn'), async () => {
    busy = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await enter(cred.user);
    } catch (err) { busy = false; showError(errorText(err)); }
  });
});

/* Ro'yxatdan o'tish */
$('#form-register').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim();
  const pass = $('#reg-password').value;
  if (!name || !email || !pass) return showError("Barcha maydonlarni to'ldiring.");
  if (pass.length < 6) return showError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
  withLoading(e.submitter || $('#form-register .btn'), async () => {
    busy = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await enter(cred.user);
    } catch (err) { busy = false; showError(errorText(err)); }
  });
});

/* Google */
$('#google-btn').addEventListener('click', (e) => withLoading(e.currentTarget, async () => {
  busy = true;
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    await enter(cred.user);
  } catch (err) {
    busy = false;
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') showError(errorText(err));
  }
}));

/* Parolni tiklash */
$('#forgot-link').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  if (!email) { showError('Avval email manzilingizni kiriting, so\'ng "Parolni unutdingizmi?" ni bosing.'); $('#login-email').focus(); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showOk(`${email} manziliga parolni tiklash havolasi yuborildi. Pochtangizni tekshiring.`);
  } catch (err) { showError(errorText(err)); }
});
