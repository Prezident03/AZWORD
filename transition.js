(function () {
  'use strict';

  document.documentElement.classList.add('pt-entering');

  const PT_OUT_MS = 380;
  const PT_IN_MS = 560;
  const STORAGE_KEY = 'pt_pending';
  const INTERNAL_RE = /^[a-zA-Z0-9_-]+\.html(#.*)?(\?.*)?$/;
  const LOG_ONCLICK_RE = /(window\.)?location\.href\s*=\s*["']([^"']+\.html[^"']*)["']/;

  let isNavigating = false;
  let overlay = null;
  let currentPage = location.pathname.split('/').pop() || 'index.html';

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'pt-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function lockScroll(locked) {
    const html = document.documentElement;
    const body = document.body;
    if (locked) {
      html.classList.add('pt-locked');
      body.classList.add('pt-locked');
    } else {
      html.classList.remove('pt-locked');
      body.classList.remove('pt-locked');
    }
  }

  function isInternal(url) {
    if (!url) return false;
    if (url.startsWith('#')) return false;
    if (url.startsWith('javascript:')) return false;
    if (url.startsWith('mailto:')) return false;
    if (url.startsWith('tel:')) return false;
    if (/^https?:\/\//i.test(url)) return false;
    if (INTERNAL_RE.test(url)) return true;
    const clean = url.split('?')[0].split('#')[0];
    return /\.html$/i.test(clean);
  }

  function playEnter() {
    const html = document.documentElement;
    const body = document.body;
    const ov = ensureOverlay();
    const wasPending = sessionStorage.getItem(STORAGE_KEY) === '1';
    sessionStorage.removeItem(STORAGE_KEY);

    html.classList.add('pt-entering');
    body.classList.add('pt-entering');
    lockScroll(true);

    if (wasPending) {
      ov.classList.remove('pt-out');
      void ov.offsetWidth;
      ov.classList.add('pt-in');
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove('pt-entering');
        html.classList.add('pt-entered');
        body.classList.remove('pt-entering');
        body.classList.add('pt-entered');
      });
    });

    const cleanupAfter = wasPending ? PT_IN_MS + 60 : 420;
    setTimeout(() => {
      ov.classList.remove('pt-in', 'pt-out');
      ov.style.cssText = '';
      html.classList.remove('pt-entering', 'pt-leaving');
      body.classList.remove('pt-entering', 'pt-leaving');
      lockScroll(false);
    }, cleanupAfter);
  }

  function navigateTo(url) {
    if (isNavigating) return;
    if (!isInternal(url)) {
      window.location.href = url;
      return;
    }
    const target = (url.split('/').pop() || '').split('#')[0].split('?')[0];
    if (target && target === currentPage) {
      window.location.href = url;
      return;
    }

    isNavigating = true;
    const html = document.documentElement;
    const body = document.body;
    const ov = ensureOverlay();

    lockScroll(true);

    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}

    html.classList.remove('pt-entered', 'pt-entering');
    body.classList.remove('pt-entered', 'pt-entering');
    void body.offsetWidth;
    html.classList.add('pt-leaving');
    body.classList.add('pt-leaving');

    ov.classList.remove('pt-in');
    void ov.offsetWidth;
    ov.classList.add('pt-out');

    setTimeout(() => {
      window.location.href = url;
    }, PT_OUT_MS);
  }

  function bindAnchorLinks() {
    document.addEventListener('click', function (e) {
      if (isNavigating) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (!isInternal(href)) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      e.preventDefault();
      navigateTo(href);
    }, true);
  }

  function replaceOnclickLocationRedirects() {
    const all = document.querySelectorAll('[onclick]');
    all.forEach((el) => {
      const attr = el.getAttribute('onclick') || '';
      const m = attr.match(LOG_ONCLICK_RE);
      if (!m) return;
      const url = m[2];
      if (!isInternal(url) && !/\.html/.test(url)) return;

      let prefix = attr.substring(0, m.index);
      let suffix = attr.substring(m.index + m[0].length);
      if (prefix.trim().endsWith(';')) prefix = prefix.slice(0, prefix.lastIndexOf(';')) + ';';
      if (suffix.trim().startsWith(';')) suffix = suffix.substring(1).trim();

      const newAttr = prefix + 'window.__ptNavigate("' + url + '"); return false;' + (suffix ? ' ' + suffix : '');
      try {
        el.setAttribute('onclick', newAttr);
      } catch (e) {}
    });
  }

  function patchLocationAssignment() {
    const originalAssign = Location.prototype.assign;
    const originalReplace = Location.prototype.replace;
    const setter = Object.getOwnPropertyDescriptor(Location.prototype, 'href') ||
                   Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');

    try {
      Location.prototype.assign = function (url) {
        if (typeof url === 'string' && isInternal(url) && !isNavigating) {
          navigateTo(url);
          return;
        }
        return originalAssign.call(this, url);
      };
      Location.prototype.replace = function (url) {
        if (typeof url === 'string' && isInternal(url) && !isNavigating) {
          navigateTo(url);
          return;
        }
        return originalReplace.call(this, url);
      };
    } catch (e) {}

    try {
      Object.defineProperty(window, 'location', {
        configurable: true,
        get() { return document.location; },
        set(val) {
          if (typeof val === 'string' && isInternal(val) && !isNavigating) {
            navigateTo(val);
          } else {
            document.location.href = val;
          }
        }
      });
    } catch (e) {}
  }

  function exposeGlobals() {
    window.__ptNavigate = navigateTo;
    window.navigateTo = navigateTo;
    window.pageTransition = {
      navigate: navigateTo,
      isNavigating: () => isNavigating,
      forceEnter: playEnter,
    };
  }

  function init() {
    ensureOverlay();
    exposeGlobals();
    bindAnchorLinks();
    replaceOnclickLocationRedirects();
    patchLocationAssignment();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', playEnter, { once: true });
    } else {
      playEnter();
    }

    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        setTimeout(playEnter, 0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
