(function () {
  'use strict';

  /* ───────────────────────────────────────────────────── */
  /*  ✨ AZWORD CURSOR ENHANCER                             */
  /*   #19  Cursor Glow Trailing (soft dot trail)          */
  /*   #2   Mouse Follow Light (radial glow on hoverable)  */
  /* ───────────────────────────────────────────────────── */

  // ──────────────────── DETECT CAPABILITY ──────────────────
  var isTouchDevice = (typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  var hasFinePointer = (typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches);

  var canRun = !isTouchDevice && hasFinePointer && (typeof document !== 'undefined');
  if (!canRun) {
    document.documentElement.classList.add('az-no-cursor-glow');
    return;
  }

  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };

  // ───────────────────── SHARED STATE ──────────────────────
  var mouse = { x: -9999, y: -9999, visible: false };
  var trail = [
    { x: -9999, y: -9999 },
    { x: -9999, y: -9999 },
    { x: -9999, y: -9999 }
  ];

  // ────────────────────────── #19 ──────────────────────────
  //    CURSOR GLOW TRAIL — 3 yumshoq gradient blobs
  // ─────────────────────────────────────────────────────────
  function buildCursorTrail() {
    var wrap = document.createElement('div');
    wrap.id = 'az-cursor-trail';
    wrap.setAttribute('aria-hidden', 'true');

    var colors = [
      ['#7c3aed', '#ec4899'],
      ['#6366f1', '#8b5cf6'],
      ['#ec4899', '#f472b6']
    ];
    var sizes = [18, 14, 10];
    var opacities = [0.35, 0.28, 0.22];

    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('span');
      dot.className = 'az-trail-dot';
      dot.dataset.idx = String(i);
      dot.style.cssText =
        'width:' + sizes[i] + 'px;' +
        'height:' + sizes[i] + 'px;' +
        'border-radius:999px;' +
        'position:fixed;' +
        'top:0;left:0;' +
        'z-index:99999;' +
        'pointer-events:none;' +
        'opacity:0;' +
        'background:radial-gradient(circle at 30% 30%, ' + colors[i][0] + ' 0%, ' + colors[i][1] + ' 60%, transparent 100%);' +
        'filter:blur(' + (i === 0 ? '2px' : '1.5px') + ');' +
        'mix-blend-mode:screen;' +
        'will-change:transform,opacity;' +
        'transform:translate3d(-9999px,-9999px,0) scale(0.6);' +
        'transition:opacity 0.25s ease-out, transform 0.15s ease-out;';
      wrap.appendChild(dot);
    }
    document.body.appendChild(wrap);
    return wrap;
  }

  // ────────────────────────── #2 ──────────────────────────
  //    MOUSE FOLLOW LIGHT — card hover radial gradient
  // ─────────────────────────────────────────────────────────
  var GLOW_SELECTOR = [
    '.folder-card',
    '.folder-card-add',
    '.az-stat-card',
    '.hero-card',
    '.hero-secondary-card',
    '.az-hero',
    '.modal',
    '.result-item',
    '.lb-item',
    '.shop-item',
    '.profile-card',
    '.achievement-card',
    '.btn-primary',
    '.btn-add',
    '.btn-study',
    '.btn-success',
    '.btn-streak',
    '.match-btn',
    '.option-btn'
  ].join(',');

  function buildFollowLight() {
    var l = document.createElement('div');
    l.id = 'az-follow-light';
    l.setAttribute('aria-hidden', 'true');
    l.style.cssText =
      'position:fixed;' +
      'top:0;left:0;' +
      'width:380px;height:380px;' +
      'margin-left:-190px;margin-top:-190px;' +
      'border-radius:999px;' +
      'pointer-events:none;' +
      'z-index:99998;' +
      'opacity:0;' +
      'background:radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(99,102,241,0.10) 35%, rgba(236,72,153,0.05) 55%, transparent 70%);' +
      'mix-blend-mode:screen;' +
      'filter:blur(14px);' +
      'will-change:transform,opacity;' +
      'transform:translate3d(-9999px,-9999px,0) scale(0.85);' +
      'transition:opacity 0.32s cubic-bezier(.2,.7,.2,1), transform 0.2s ease-out;';
    document.body.appendChild(l);
    return l;
  }

  // ──────────────────── SET CSS VARS ON ROOT ───────────────
  function updateRootPointer(x, y) {
    document.documentElement.style.setProperty('--az-mx', x + 'px');
    document.documentElement.style.setProperty('--az-my', y + 'px');
  }

  // ────────────────────── DOM READY ────────────────────────
  var trailWrap = null;
  var followLight = null;
  var trailDots = [];
  var currentGlowEl = null;

  function init() {
    document.documentElement.classList.add('az-cursor-glow-on');
    trailWrap = buildCursorTrail();
    followLight = buildFollowLight();
    trailDots = trailWrap ? Array.prototype.slice.call(trailWrap.querySelectorAll('.az-trail-dot')) : [];

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave, { passive: true });
    window.addEventListener('mouseenter', onEnter, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });

    raf(tick);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.visible = true;
    updateRootPointer(mouse.x, mouse.y);

    // Follow light hover detection — elementFromPoint
    try {
      var el = document.elementFromPoint(mouse.x, mouse.y);
      var glowTarget = el ? el.closest(GLOW_SELECTOR) : null;
      if (glowTarget !== currentGlowEl) {
        currentGlowEl = glowTarget;
        if (followLight) {
          if (glowTarget) {
            followLight.style.opacity = '1';
            followLight.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) scale(1)';
          } else {
            followLight.style.opacity = '0';
            followLight.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) scale(0.85)';
          }
        }
      } else if (glowTarget && followLight) {
        followLight.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0) scale(1)';
      }
    } catch (err) { /* ignore */ }
  }

  function onLeave() {
    mouse.visible = false;
    if (followLight) {
      followLight.style.opacity = '0';
      followLight.style.transform = 'translate3d(-9999px,-9999px,0) scale(0.85)';
    }
  }

  function onEnter() { mouse.visible = true; }

  function onScroll() {
    // Hovered card scroll paytida yo'qolishi mumkin
    if (currentGlowEl && !document.body.contains(currentGlowEl)) {
      currentGlowEl = null;
      if (followLight) followLight.style.opacity = '0';
    }
  }

  // ───────────────────── ANIMATION LOOP ────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    // 1) Mouse pozitsiyasini 3 ta trail nuqtaga lerp bilan burish
    //    Har bir keyingi nuqta sekinroq ergashadi
    if (mouse.visible) {
      trail[0].x = lerp(trail[0].x, mouse.x, 0.35);
      trail[0].y = lerp(trail[0].y, mouse.y, 0.35);
      trail[1].x = lerp(trail[1].x, trail[0].x, 0.28);
      trail[1].y = lerp(trail[1].y, trail[0].y, 0.28);
      trail[2].x = lerp(trail[2].x, trail[1].x, 0.22);
      trail[2].y = lerp(trail[2].y, trail[1].y, 0.22);
    }

    // 2) Apply to dots
    for (var i = 0; i < trailDots.length; i++) {
      var dot = trailDots[i];
      var t = trail[i];
      if (mouse.visible) {
        dot.style.opacity = String(0.35 - i * 0.06);
        dot.style.transform =
          'translate3d(' + (t.x - (18 - i * 4) / 2) + 'px,' +
          (t.y - (18 - i * 4) / 2) + 'px,0) scale(' + (1 - i * 0.12) + ')';
      } else {
        dot.style.opacity = '0';
      }
    }

    raf(tick);
  }

  // ──────────────────────── BOOT ───────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
