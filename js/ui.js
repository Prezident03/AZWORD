/* AzWord · UI yordamchilari: xavfsiz HTML, toast, modal, tasdiqlash oynasi va formatlash */
import { icon } from './icons.js';

/* ── Xavfsiz HTML ───────────────────────────────────────────
   html`...` — barcha ${qiymat}lar avtomatik escape qilinadi.
   Ishonchli (o'zimiz yasagan) HTML'ni raw() bilan o'rang. */
const RAW = Symbol('raw');
export function raw(str) { return { [RAW]: true, value: String(str ?? '') }; }
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function renderValue(v) {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (typeof v === 'object' && v[RAW]) return v.value;
  return esc(v);
}
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return raw(out);
}
export function setHTML(el, content) {
  const node = typeof el === 'string' ? document.getElementById(el) : el;
  if (!node) return null;
  node.innerHTML = content && content[RAW] ? content.value : renderValue(content);
  return node;
}
export const ic = (name, size) => raw(icon(name, size));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ── Toast ───────────────────────────────────────────────── */
let stack;
export function toast(message, type = 'success', ms = 2800) {
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const ico = type === 'error' ? 'alert-triangle' : type === 'info' ? 'info' : 'circle-check';
  t.innerHTML = icon(ico, 18) + '<span></span>';
  t.querySelector('span').textContent = message;
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add('leaving');
    setTimeout(() => t.remove(), 220);
  }, ms);
}
export const toastError = (msg) => toast(msg, 'error', 3800);

/* ── Modal ──────────────────────────────────────────────────
   const m = openModal({ title, body: html`...`, footer: html`...`, size: 'lg' });
   m.el — modal elementi, m.close() — yopish. */
const openModals = [];
export function openModal({ title = '', body = '', footer = null, size = '', onClose = null, dismissible = true } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal ${size ? 'modal-' + size : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><div class="modal-title"></div>${dismissible ? `<button class="icon-btn" data-close aria-label="Yopish">${icon('x', 18)}</button>` : ''}</div>
    <div class="modal-body"></div>
    ${footer !== null ? '<div class="modal-foot"></div>' : ''}
  </div>`;
  backdrop.querySelector('.modal-title').textContent = title;
  setHTML(backdrop.querySelector('.modal-body'), body);
  if (footer !== null) setHTML(backdrop.querySelector('.modal-foot'), footer);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  const prevFocus = document.activeElement;
  requestAnimationFrame(() => backdrop.classList.add('open'));

  let closed = false;
  const ctrl = {
    el: backdrop.querySelector('.modal'),
    close(result) {
      if (closed) return;
      closed = true;
      backdrop.classList.remove('open');
      const i = openModals.indexOf(ctrl);
      if (i >= 0) openModals.splice(i, 1);
      if (!openModals.length) document.body.style.overflow = '';
      setTimeout(() => backdrop.remove(), 220);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (onClose) onClose(result);
    },
    $: (sel) => backdrop.querySelector(sel)
  };
  openModals.push(ctrl);
  if (dismissible) {
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) ctrl.close(); });
    backdrop.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => ctrl.close()));
  }
  setTimeout(() => {
    const f = backdrop.querySelector('[autofocus], input:not([type=hidden]), textarea, select, .modal-foot .btn-primary');
    if (f) f.focus();
  }, 60);
  return ctrl;
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openModals.length) {
    const top = openModals[openModals.length - 1];
    if (top.el.closest('.modal-backdrop').querySelector('[data-close]')) top.close();
  }
});

/* Tasdiqlash oynasi (window.confirm o'rniga) */
export function confirmDialog({ title = 'Ishonchingiz komilmi?', message = '', confirmText = 'Tasdiqlash', cancelText = 'Bekor qilish', danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal({
      title,
      body: html`<p class="muted">${message}</p>`,
      footer: html`<button class="btn btn-ghost" data-act="no">${cancelText}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${confirmText}</button>`,
      onClose: () => { if (!answered) resolve(false); }
    });
    m.$('[data-act="no"]').onclick = () => { answered = true; resolve(false); m.close(); };
    m.$('[data-act="yes"]').onclick = () => { answered = true; resolve(true); m.close(); };
    setTimeout(() => m.$('[data-act="yes"]').focus(), 80);
  });
}

/* Bitta maydonli kiritish oynasi */
export function promptDialog({ title, label = '', value = '', placeholder = '', confirmText = 'Saqlash', maxLength = 60 } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title,
      body: html`<div class="field"><label class="label">${label}</label>
        <input class="input" id="prompt-input" maxlength="${maxLength}" placeholder="${placeholder}" value="${value}"></div>`,
      footer: html`<button class="btn btn-ghost" data-close>Bekor qilish</button><button class="btn btn-primary" data-ok>${confirmText}</button>`,
      onClose: () => { if (!done) resolve(null); }
    });
    const input = m.$('#prompt-input');
    const ok = () => { const v = input.value.trim(); if (!v) { input.classList.add('is-error'); input.focus(); return; } done = true; resolve(v); m.close(); };
    m.$('[data-ok]').onclick = ok;
    m.$('[data-close]').onclick = () => m.close();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
  });
}

/* ── Tugma yuklanish holati ─────────────────────────────── */
export async function withLoading(btn, fn) {
  if (!btn) return fn();
  if (btn.classList.contains('loading')) return;
  btn.classList.add('loading');
  btn.disabled = true;
  try { return await fn(); }
  finally { btn.classList.remove('loading'); btn.disabled = false; }
}

/* ── Holat bloklari ─────────────────────────────────────── */
export function emptyState({ iconName = 'folder', title, sub = '', action = null }) {
  return html`<div class="empty">
    <div class="empty-icon">${ic(iconName, 30)}</div>
    <div class="empty-title">${title}</div>
    ${sub ? html`<div class="empty-sub">${sub}</div>` : ''}
    ${action || ''}
  </div>`;
}
export function errorState(container, onRetry, message) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  const offline = navigator.onLine === false;
  setHTML(el, html`<div class="empty">
    <div class="empty-icon" style="background:var(--danger-soft);color:var(--danger-light)">${ic(offline ? 'wifi-off' : 'alert-triangle', 30)}</div>
    <div class="empty-title">${offline ? "Internet aloqasi yo'q" : "Ma'lumotni yuklab bo'lmadi"}</div>
    <div class="empty-sub">${message || (offline ? "Ulanishni tekshirib, qayta urinib ko'ring." : "Server bilan bog'lanishda xatolik. Qayta urinib ko'ring.")}</div>
    ${onRetry ? html`<button class="btn btn-sm" data-retry>${ic('refresh', 16)} Qayta urinish</button>` : ''}
  </div>`);
  if (onRetry) el.querySelector('[data-retry]').onclick = onRetry;
}
export function skeletonCards(n = 3, cls = 'skel-card') {
  return raw(Array.from({ length: n }, () => `<div class="skel ${cls}"></div>`).join(''));
}
export function loadingBlock() { return raw('<div class="loading-block"><div class="spinner"></div></div>'); }

/* ── Formatlash ─────────────────────────────────────────── */
export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US').replaceAll(',', ' ');
}
export function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
export const MONTHS_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
export const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
export function fmtDate(ts) {
  const d = toDate(ts);
  if (!d) return '';
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
export function timeAgo(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hozirgina';
  if (s < 3600) return Math.floor(s / 60) + ' daqiqa oldin';
  if (s < 86400) return Math.floor(s / 3600) + ' soat oldin';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' kun oldin';
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}
export function plural(n, word) { return `${fmtNum(n)} ta ${word}`; }

/* Sonni animatsiya bilan o'stirish */
export function countUp(el, to, { duration = 900, suffix = '' } = {}) {
  if (!el) return;
  const target = Number(to) || 0;
  if (document.documentElement.classList.contains('no-motion') || target === 0) { el.textContent = fmtNum(target) + suffix; return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmtNum(Math.round(target * eased)) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Aylana progress (SVG) */
let ringId = 0;
export function ring(pct, { size = 96, stroke = 9, label = null, sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const id = 'rg' + (++ringId);
  return raw(`<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset=".6" stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="url(#${id})" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c - (c * p) / 100}"/>
    </svg>
    <div class="ring-label"><div><div style="font-size:${Math.round(size / 4.2)}px;line-height:1">${esc(label ?? Math.round(p) + '%')}</div>${sub ? `<div class="xs muted" style="font-weight:600;margin-top:2px">${esc(sub)}</div>` : ''}</div></div>
  </div>`);
}
/* DOM'ga qo'shilgandan keyin chaqiriladi — halqalarni to'ldiradi */
export function animateRings(root = document) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('.ring-bar[data-target]').forEach(c => { c.style.strokeDashoffset = c.dataset.target; });
  }));
}
export function progressBar(pct, cls = '') {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return raw(`<div class="progress ${cls}"><span style="width:${p}%"></span></div>`);
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function params() { return new URLSearchParams(location.search); }

/* Avatar HTML: rasm yoki bosh harf */
export function avatar(user, cls = '') {
  const name = (user && (user.displayName || user.email)) || '?';
  const frame = user && user.frameColor ? ` style="--frame:${esc(user.frameColor)}"` : '';
  const framed = user && user.frameColor ? ' framed' : '';
  if (user && user.photoBase64 && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(user.photoBase64)) {
    return raw(`<div class="avatar ${cls}${framed}"${frame}><img src="${esc(user.photoBase64)}" alt=""></div>`);
  }
  return raw(`<div class="avatar ${cls}${framed}"${frame}>${esc(name.trim().charAt(0).toUpperCase() || '?')}</div>`);
}

/* Tashqi rasm URL'ini xavfsiz qilish (faqat http/https/data:image) */
export function safeImg(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (/^https:\/\//i.test(s) || /^data:image\//i.test(s) || /^[a-z0-9_\-/]+\.(png|jpe?g|webp|svg|gif)$/i.test(s)) return s;
  return '';
}

/* Rasmni kvadrat qilib kichraytirish (data URL qaytaradi) */
export function thumbFromDataUrl(src, size = 64, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = Math.max(1, Math.min(size, side));
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}
