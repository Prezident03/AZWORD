/* ═══════════════════════════════════════════════
   AzWord · Premium Parallax Scroll Engine
   GPU-optimized · lerp smoothed · mobile-aware
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (reduceMotion || isMobile) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let ticking = false;
  let scrollY = window.scrollY;
  let viewportH = window.innerHeight;

  /* ──── 1. Floating Background Orbs (auto-injected) ──── */
  function injectOrbs() {
    if (document.getElementById('az-parallax-orbs')) return;
    const wrap = document.createElement('div');
    wrap.id = 'az-parallax-orbs';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <div class="px-orb px-orb-1" data-parallax-depth="0.18"></div>
      <div class="px-orb px-orb-2" data-parallax-depth="0.28"></div>
      <div class="px-orb px-orb-3" data-parallax-depth="0.12"></div>
    `;
    document.body.appendChild(wrap);
  }

  /* ──── 2. Mark eligible sections automatically ──── */
  function autoMark() {
    const heroSelectors = [
      '.stats-header', '.profile-header', '.dash-hero',
      '.streak-header', '.achievements-header', '.leaderboard-header',
      '.shop-header', '.folder-header', '.results-header',
      '.study-wrap .study-progress', '.page-header'
    ];
    heroSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!el.dataset.parallaxDepth) el.dataset.parallaxDepth = '0.08';
        el.classList.add('px-section');
      });
    });

    const cards = document.querySelectorAll('.ov-card, .chart-card, .hw-item, .fs-item, .folder-card, .achievement-card, .leader-row, .shop-item');
    cards.forEach((el, i) => {
      if (!el.dataset.parallaxDepth) {
        const depths = ['0.025', '0.035', '0.045', '0.03', '0.04'];
        el.dataset.parallaxDepth = depths[i % depths.length];
      }
    });
  }

  /* ──── 3. Smooth transform state ──── */
  const transforms = new WeakMap();

  function update() {
    scrollY = window.scrollY;
    const elements = document.querySelectorAll('[data-parallax-depth]');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > viewportH + 200) return;

      const depth = parseFloat(el.dataset.parallaxDepth) || 0.05;
      const centerY = rect.top + rect.height / 2 - viewportH / 2;
      const baseShift = -centerY * depth;

      const state = transforms.get(el) || { current: 0, target: 0 };
      state.target = baseShift;
      state.current += (state.target - state.current) * 0.12;
      transforms.set(el, state);

      el.style.transform = `translate3d(0, ${state.current.toFixed(3)}px, 0)`;
      el.style.willChange = 'transform';
    });

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }

  /* ──── 4. Viewport-enter fade (scroll reveal) ──── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('px-in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  function observeReveal() {
    document.querySelectorAll(
      '.ov-card, .chart-card, .hw-item, .fs-item, .folder-card, .achievement-card, .leader-row, .shop-item'
    ).forEach((el, i) => {
      el.classList.add('px-reveal');
      el.style.transitionDelay = `${(i % 6) * 60}ms`;
      io.observe(el);
    });
  }

  /* ──── Init ──── */
  function init() {
    injectOrbs();
    autoMark();
    observeReveal();
    viewportH = window.innerHeight;
    update();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', () => {
      viewportH = window.innerHeight;
      requestTick();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
