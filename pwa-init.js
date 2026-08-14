/* ═══════════════════════════════════════════════════════
   AzWord · PWA init
   Har bir sahifaga bitta <script src="pwa-init.js"> qo'shish
   yetarli — bu fayl o'zi:
     1) <link rel="manifest"> va theme-color'ni <head>ga qo'shadi
     2) Service Worker'ni ro'yxatdan o'tkazadi (sw.js)
     3) Internet uzilgan/qaytganda tepada kichik banner ko'rsatadi
   ═══════════════════════════════════════════════════════ */
(function () {
  // ── 1. Manifest + theme-color (agar sahifada hali yo'q bo'lsa) ──
  if (!document.querySelector('link[rel="manifest"]')) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#7c3aed';
    document.head.appendChild(meta);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    var appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = 'icon-192.png';
    document.head.appendChild(appleIcon);
  }

  // ── 2. Service Worker ro'yxatdan o'tkazish ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('AzWord SW registration failed:', err);
      });
    });
  }

  // ── 3. Online / Offline banner ──
  function initNetworkBanner() {
    var banner = document.createElement('div');
    banner.id = 'az-net-banner';
    banner.innerHTML =
      '<span class="az-net-dot"></span>' +
      '<span class="az-net-text"></span>';

    var style = document.createElement('style');
    style.textContent =
      '#az-net-banner{position:fixed;top:0;left:50%;transform:translate(-50%,-130%);' +
      'z-index:9999;display:flex;align-items:center;gap:7px;' +
      'padding:8px 16px;border-radius:0 0 14px 14px;' +
      'font-family:"Inter",sans-serif;font-size:0.8rem;font-weight:600;' +
      'background:rgba(20,17,35,0.96);backdrop-filter:blur(14px);' +
      'border:1px solid rgba(255,255,255,0.08);border-top:none;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.35);' +
      'transition:transform 320ms cubic-bezier(.2,.8,.2,1);' +
      'pointer-events:none;}' +
      '#az-net-banner.show{transform:translate(-50%,0);}' +
      '#az-net-banner.offline{color:#fca5a5;}' +
      '#az-net-banner.online{color:#86efac;}' +
      '.az-net-dot{width:7px;height:7px;border-radius:50%;background:currentColor;' +
      'box-shadow:0 0 8px currentColor;flex-shrink:0;}' +
      '.az-net-dot.pulse{animation:azNetPulse 1.4s ease-in-out infinite;}' +
      '@keyframes azNetPulse{0%,100%{opacity:1}50%{opacity:0.35}}';
    document.head.appendChild(style);
    document.body.appendChild(banner);

    var textEl = banner.querySelector('.az-net-text');
    var dotEl = banner.querySelector('.az-net-dot');
    var hideTimer = null;

    function showOffline() {
      clearTimeout(hideTimer);
      banner.className = 'show offline';
      dotEl.classList.add('pulse');
      textEl.textContent = 'Offline — internet yo\'q';
    }

    function showOnline(afterOffline) {
      clearTimeout(hideTimer);
      banner.className = 'show online';
      dotEl.classList.remove('pulse');
      textEl.textContent = afterOffline ? 'Qayta ulandi \u2713' : 'Onlayn';
      hideTimer = setTimeout(function () {
        banner.classList.remove('show');
      }, 2200);
    }

    var wasOffline = !navigator.onLine;
    if (wasOffline) showOffline();

    window.addEventListener('offline', function () {
      wasOffline = true;
      showOffline();
    });
    window.addEventListener('online', function () {
      showOnline(wasOffline);
      wasOffline = false;
    });
  }

  if (document.body) {
    initNetworkBanner();
  } else {
    document.addEventListener('DOMContentLoaded', initNetworkBanner);
  }
})();
