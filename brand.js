/* ═══════════════════════════════════════════════
   AzWord · BRAND IDENTITY ENGINE v1.0
   Logo · Favicon · Splash Screen · Skeleton Loading
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ──────────────────────────────────────────────────────
     0. PWA SETUP — manifest + service worker
     brand.js har bir sahifada <head> ichida yuklanadi, shuning
     uchun shu yerga qo'shish 20 ta HTML faylni qo'lda o'zgartirishning
     o'rnini bosadi.
     ────────────────────────────────────────────────────── */
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = 'manifest.json';
    document.head.appendChild(manifestLink);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    themeMeta.content = '#7c3aed';
    document.head.appendChild(themeMeta);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* Service worker yo'q bo'lsa ham sayt oddiy ishlashda davom etadi */
      });
    });
  }

  /* ──────────────────────────────────────────────────────
     0a. OFFLINE INDICATOR — internet uzilganda/tiklanganda
     ekran tepasida slim banner ko'rsatadi. Firestore o'zi
     persistentLocalCache orqali oxirgi ma'lumotlarni ko'rsatishda
     davom etadi, bu banner shunchaki foydalanuvchiga holatni
     bildiradi (sw.js sahifa qobig'ini keshlagani uchun offline'da
     ham sahifa ochiladi).
     ────────────────────────────────────────────────────── */
  function injectOfflineCSS() {
    if (document.getElementById('az-offline-css')) return;
    const s = document.createElement('style');
    s.id = 'az-offline-css';
    s.textContent = `
#az-offline-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 16px calc(9px + env(safe-area-inset-top, 0px));
  padding-top: calc(9px + env(safe-area-inset-top, 0px));
  font-family: var(--font-body, 'Inter', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--streak, #f97316);
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transform: translateY(-100%);
  transition: transform 320ms cubic-bezier(.2,.8,.2,1);
}
#az-offline-bar.az-show { transform: translateY(0); }
#az-offline-bar.az-online {
  background: var(--success, #10b981);
}
#az-offline-bar svg { width: 15px; height: 15px; flex: none; }
`;
    document.head.appendChild(s);
  }

  function setupOfflineIndicator() {
    injectOfflineCSS();
    let bar = document.getElementById('az-offline-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'az-offline-bar';
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'polite');
      document.body.appendChild(bar);
    }

    const DOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>';
    const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

    let backOnlineTimer = null;

    function showOffline() {
      clearTimeout(backOnlineTimer);
      bar.classList.remove('az-online');
      bar.innerHTML = DOT + '<span>Internet yo\u02bboq — oxirgi saqlangan ma\u02bblumotlar ko\u02bbrsatilmoqda</span>';
      bar.classList.add('az-show');
    }

    function showBackOnline() {
      bar.classList.add('az-online');
      bar.innerHTML = CHECK + '<span>Internet tiklandi</span>';
      bar.classList.add('az-show');
      backOnlineTimer = setTimeout(() => bar.classList.remove('az-show'), 2200);
    }

    function hideBar() {
      bar.classList.remove('az-show');
    }

    window.addEventListener('offline', showOffline);
    window.addEventListener('online', () => {
      // Faqat avval offline banner ko'ringan bo'lsa "tiklandi" xabarini chiqar
      if (bar.classList.contains('az-show') && !bar.classList.contains('az-online')) {
        showBackOnline();
      } else {
        hideBar();
      }
    });

    // Sahifa ochilganda darhol holatni tekshirish
    if (!navigator.onLine) showOffline();
  }

  /* ──────────────────────────────────────────────────────
     0b. SHARED MOTION TOKENS — style.css dizayn tokenlari
     (--dur-fast, --dur-normal, --ease-standard va h.k.) bilan bir xil qiymatlar. ripple/confetti/transition/parallax/
     cursor-glow shu obyektdan foydalanadi, shunda barchasi bir xil
     vaqt oralig'i va easing bilan ishlaydi.
     ────────────────────────────────────────────────────── */
  window.AzMotion = {
    fast: 180,
    normal: 280,
    slow: 450,
    emphasis: 650,
    ease: 'cubic-bezier(.2,.8,.2,1)',         // --ease-standard
    easeEmphasis: 'cubic-bezier(.16,1,.3,1)', // --ease-emphasis
    easeBounce: 'cubic-bezier(.34,1.56,.64,1)' // --ease-bounce
  };

  /* ──────────────────────────────────────────────────────
     1. LOGO SVG MAKER — Monogram "Az" + Wordmark "AzWord"
     Colors: purple → rose → blue gradient (brand palette)
     ────────────────────────────────────────────────────── */
  const LOGO_SVG_DEFS = `
    <defs>
      <linearGradient id="az-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="50%" stop-color="#a855f7"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
      <linearGradient id="az-brand-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
      <filter id="az-brand-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

  function makeMonogram(size) {
    size = size || 32;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-label="AzWord logo">
  ${LOGO_SVG_DEFS}
  <!-- Rounded square shape with notch -->
  <rect x="2" y="2" width="60" height="60" rx="16" ry="16"
        fill="url(#az-brand-grad)"
        filter="url(#az-brand-glow)"/>
  <!-- Inner "A" (transparent negative) -->
  <g fill="none" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
    <!-- Letter A -->
    <path d="M20 46 L32 18 L44 46" />
    <path d="M24 38 L40 38" />
    <!-- Mini accent (z tail) -->
    <path d="M40 26 L50 26 L42 34 L50 34" />
  </g>
</svg>`.trim();
  }

  function makeWordmark(size) {
    size = size || 120;
    const h = size * 0.38;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" width="${size}" height="${h}" aria-label="AzWord">
  ${LOGO_SVG_DEFS}
  <g font-family="'Space Grotesk', 'Inter', system-ui, sans-serif" font-weight="800">
    <text x="54" y="68" font-size="58" fill="url(#az-brand-grad)" letter-spacing="-1.2">Az</text>
    <text x="150" y="68" font-size="58" fill="#f1eff6" letter-spacing="-0.6" font-weight="700">Word</text>
  </g>
  <!-- Underline accent -->
  <rect x="54" y="78" width="90" height="3.5" rx="2" fill="url(#az-brand-grad)" opacity="0.75"/>
</svg>`.trim();
  }

  function makeFullLogo(size) {
    size = size || 180;
    const h = size * 0.3;
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120" width="${size}" height="${h}" class="az-brand-full" aria-label="AzWord">
  ${LOGO_SVG_DEFS}
  <!-- Monogram -->
  <svg x="0" y="12" viewBox="0 0 64 64" width="88" height="88">
    <rect x="2" y="2" width="60" height="60" rx="16" ry="16"
          fill="url(#az-brand-grad)" filter="url(#az-brand-glow)"/>
    <g fill="none" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 46 L32 18 L44 46"/>
      <path d="M24 38 L40 38"/>
      <path d="M40 26 L50 26 L42 34 L50 34"/>
    </g>
  </svg>
  <!-- Wordmark -->
  <g font-family="'Space Grotesk', 'Inter', system-ui, sans-serif" transform="translate(110, 0)">
    <text x="0" y="60" font-size="54" font-weight="800" fill="url(#az-brand-grad)" letter-spacing="-1.2">Az</text>
    <text x="92" y="60" font-size="54" font-weight="700" fill="#f1eff6" letter-spacing="-0.4">Word</text>
    <rect x="0" y="70" width="170" height="3.5" rx="2" fill="url(#az-brand-grad)" opacity="0.7"/>
  </g>
</svg>`.trim();
  }

  /* ──────────────────────────────────────────────────────
     2. FAVICON INJECTION (animated SVG, no binary file)
     ────────────────────────────────────────────────────── */
  function injectFavicon() {
    const FAV_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 46 L32 18 L44 46"/>
    <path d="M24 38 L40 38"/>
    <path d="M40 26 L50 26 L42 34 L50 34"/>
  </g>
</svg>`).replace(/#/g, '%23');

    const types = [
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any' },
      { rel: 'apple-touch-icon', type: 'image/svg+xml', sizes: '180x180' }
    ];
    types.forEach(t => {
      let link = document.querySelector(`link[rel="${t.rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = t.rel;
        link.type = t.type;
        if (t.sizes) link.setAttribute('sizes', t.sizes);
        document.head.appendChild(link);
      }
      link.href = 'data:image/svg+xml;charset=utf-8,' + FAV_SVG;
    });
    // Theme color for mobile
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = '#0e0b1f';
  }

  /* ──────────────────────────────────────────────────────
     3. SPLASH SCREEN (auto injects on first load)
     ────────────────────────────────────────────────────── */
  function injectSplashCSS() {
    if (document.getElementById('az-splash-css')) return;
    const s = document.createElement('style');
    s.id = 'az-splash-css';
    s.textContent = `
#az-splash {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: radial-gradient(ellipse at 50% 40%, #1a1130 0%, #0e0b1f 60%, #090714 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 32px;
  transition: opacity 520ms cubic-bezier(.2,.8,.2,1), visibility 520ms;
}
#az-splash.az-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
#az-splash .az-splash-logo {
  animation: az-splash-pop 1s cubic-bezier(.16, 1, .3, 1) both;
  filter: drop-shadow(0 10px 40px rgba(124, 58, 237, 0.5));
}
#az-splash .az-splash-mark {
  animation: az-splash-fade .8s .25s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes az-splash-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes az-splash-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* ── Loading ring (Apple-like spinner) ── */
.az-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg,
      transparent 0deg,
      rgba(167, 139, 250, 0.15) 60deg,
      rgba(236, 72, 153, 0.4) 200deg,
      #a855f7 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px));
  animation: az-spin 900ms linear infinite;
}
@keyframes az-spin { to { transform: rotate(360deg); } }

/* ── SKELETON shimmer (universal) ── */
.az-sk {
  position: relative;
  background: linear-gradient(90deg,
    rgba(124, 58, 237, 0.05) 0%,
    rgba(124, 58, 237, 0.12) 50%,
    rgba(124, 58, 237, 0.05) 100%);
  background-size: 200% 100%;
  border-radius: var(--radius-sm, 10px);
  overflow: hidden;
  animation: az-shimmer 1.5s ease-in-out infinite;
  color: transparent !important;
}
.az-sk::after { content: '\\00a0'; }
.az-sk-circle { border-radius: 50% !important; }
.az-sk-line { height: 14px; margin-bottom: 10px; }
.az-sk-line.half { width: 55%; }
.az-sk-line.third { width: 35%; }
@keyframes az-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
    document.head.appendChild(s);
  }

  function showSplash() {
    injectSplashCSS();
    if (document.getElementById('az-splash') || reduceMotion) return;
    const splash = document.createElement('div');
    splash.id = 'az-splash';
    splash.setAttribute('role', 'status');
    splash.setAttribute('aria-label', 'AzWord yuklanmoqda');
    splash.innerHTML = `
      <div class="az-splash-logo">${makeMonogram(92)}</div>
      <div class="az-splash-mark">${makeWordmark(200)}</div>
      <div class="az-spinner" aria-hidden="true"></div>
    `;
    // Inject as early as possible
    if (document.body) document.body.appendChild(splash);
    else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(splash), { once: true });

    // Hide after window.load + MIN 750ms so it doesn't flash
    let t0 = performance.now();
    function hide() {
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, 750 - elapsed);
      setTimeout(() => {
        splash.classList.add('az-hidden');
        setTimeout(() => splash.remove(), 800);
      }, wait);
    }
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide, { once: true });
  }

  /* ──────────────────────────────────────────────────────
     4. SKELETON LOADING HELPER
     Usage:   AzBrand.skeleton(document.querySelector('#card'), {lines: 4})
     ────────────────────────────────────────────────────── */
  function makeSkeleton(target, opts) {
    if (!target) return null;
    opts = opts || {};
    const lines = opts.lines || 3;
    const circle = opts.circle || false;
    const html = [];
    if (circle) html.push('<div class="az-sk az-sk-circle" style="width:' + (opts.circleSize || 48) + 'px;height:' + (opts.circleSize || 48) + 'px;margin-bottom:16px"></div>');
    for (let i = 0; i < lines; i++) {
      const cls = (i === lines - 1) ? 'az-sk az-sk-line half' : 'az-sk az-sk-line';
      html.push('<div class="' + cls + '"></div>');
    }
    target.innerHTML = html.join('');
    target.classList.add('az-skeleton-wrap');
    return {
      remove() {
        target.querySelectorAll('.az-sk').forEach(n => n.remove());
        target.classList.remove('az-skeleton-wrap');
      }
    };
  }

  /* ──────────────────────────────────────────────────────
     5. AUTO REPLACE LOGO PLACEHOLDERS
     Any element with data-role="az-logo" will get the SVG.
     Usage: <span data-role="az-logo" data-size="40" data-type="mono"></span>
            data-type: monogram | wordmark | full  (default: wordmark)
     ────────────────────────────────────────────────────── */
  function autoReplaceLogos() {
    document.querySelectorAll('[data-role="az-logo"]').forEach(el => {
      const size = el.getAttribute('data-size') || 120;
      const type = el.getAttribute('data-type') || 'wordmark';
      if (type === 'monogram' || type === 'mono') el.innerHTML = makeMonogram(Number(size));
      else if (type === 'full') el.innerHTML = makeFullLogo(Number(size));
      else el.innerHTML = makeWordmark(Number(size));
    });
  }

  /* ──────────────────────────────────────────────────────
     PUBLIC API
     ────────────────────────────────────────────────────── */
  window.AzBrand = {
    makeMonogram,
    makeWordmark,
    makeFullLogo,
    skeleton: makeSkeleton,
    showSplash,
    replaceLogos: autoReplaceLogos
  };

  /* ──────────────────────────────────────────────────────
     AUTO RUN
     ────────────────────────────────────────────────────── */
  // Favicon + splash always run (before paint)
  injectFavicon();
  injectSplashCSS();
  injectOfflineCSS();
  // Only show splash on fresh navigation (NOT internal SPA-ish transitions)
  const navType = performance && performance.getEntriesByType('navigation')[0];
  const isNav = !navType || navType.type === 'navigate';
  const notTransition = !sessionStorage.getItem('az:page-transition');
  if (isNav && notTransition) showSplash();

  // Logos + offline indicator on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoReplaceLogos();
      setupOfflineIndicator();
    }, { once: true });
  } else {
    autoReplaceLogos();
    setupOfflineIndicator();
  }

  // Clear transition flag after 50ms so next navigation may splash again
  setTimeout(() => sessionStorage.removeItem('az:page-transition'), 50);
})();
