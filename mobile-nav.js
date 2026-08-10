/* ═══════════════════════════════════════════════════════════════════
   AzWord — Mobile Bottom Navigation (reusable)
   Har bir sahifaga qo'shiladi:
     <script src="mobile-nav.js" defer></script>
   Splash screen kerak bo'lgan sahifada (odatda faqat dashboard.html):
     <script src="mobile-nav.js" defer data-splash="true"></script>
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* document.currentScript faqat script SINXRON ishlayotganda to'g'ri
     qiymat qaytaradi — shuning uchun uni darhol, DOMContentLoaded'dan
     OLDIN o'qib olamiz (keyinroq null bo'lib qoladi). */
  var THIS_SCRIPT = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf('mobile-nav.js') !== -1) return scripts[i];
    }
    return null;
  })();

  /* ─── 1. TAB TA'RIFI — 5 ta asosiy bo'lim ─── */
  var TABS = [
    {
      match: ['dashboard.html', '', 'index.html'],
      href: 'dashboard.html',
      label: 'Home',
      icon: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
    },
    {
      match: ['folders.html', 'book.html', 'folder.html', 'vocabulary.html', 'learn.html'],
      href: 'folders.html',
      label: 'Learn',
      icon: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
    },
    {
      match: ['quiz.html', 'flashcards.html', 'study.html', 'practice.html', 'results.html'],
      href: 'quiz.html',
      label: 'Practice',
      icon: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
    },
    {
      match: ['leaderboard.html', 'streak.html'],
      href: 'leaderboard.html',
      label: 'Rank',
      icon: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>'
    },
    {
      match: ['profile.html', 'settings.html', 'achievements.html', 'shop.html', 'stats.html'],
      href: 'profile.html',
      label: 'Profile',
      icon: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>'
    }
  ];

  function currentPage() {
    var path = window.location.pathname.split('/').pop();
    return path || 'dashboard.html';
  }

  function buildNav() {
    var page = currentPage();
    var nav = document.createElement('nav');
    nav.className = 'az-bottom-nav';
    nav.setAttribute('aria-label', 'Asosiy navigatsiya');

    TABS.forEach(function (tab) {
      var isActive = tab.match.indexOf(page) !== -1;
      var a = document.createElement('a');
      a.className = 'az-bn-item' + (isActive ? ' active' : '');
      a.href = tab.href;
      a.setAttribute('aria-label', tab.label);
      a.innerHTML =
        '<span class="az-bn-icon-wrap">' + tab.icon + '</span>' +
        '<span class="az-bn-label">' + tab.label + '</span>';
      a.addEventListener('click', function () {
        if (window.AzSound && typeof window.AzSound.play === 'function') {
          window.AzSound.play('click');
        }
      });
      nav.appendChild(a);
    });

    document.body.classList.add('has-bottom-nav');
    document.body.appendChild(nav);
  }

  /* ─── 2. SPLASH SCREEN — faqat data-splash="true" bo'lgan sahifada,
           va faqat sessiyada bir marta ko'rsatiladi ─── */
  function showSplashIfNeeded() {
    if (!THIS_SCRIPT || THIS_SCRIPT.getAttribute('data-splash') !== 'true') return;
    if (window.innerWidth > 768) return;
    if (sessionStorage.getItem('az_splash_shown') === 'true') return;

    sessionStorage.setItem('az_splash_shown', 'true');

    var splash = document.createElement('div');
    splash.className = 'az-splash';
    splash.innerHTML =
      '<div class="az-splash-logo">Az</div>' +
      '<div class="az-splash-word">AzWord</div>' +
      '<div class="az-splash-tag">So\'z yodlang. Dunyongizni kengaytiring.</div>' +
      '<div class="az-splash-bar"></div>';
    document.body.appendChild(splash);
    document.body.style.overflow = 'hidden';

    var hide = function () {
      splash.classList.add('az-splash-hide');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 450);
    };
    setTimeout(hide, 1100);
  }

  function init() {
    if (document.querySelector('.az-bottom-nav')) return;
    buildNav();
    showSplashIfNeeded();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
