(function () {
  'use strict';

  /* ───────────────────────────────────────────────────── */
  /*  ✨ AZWORD DASH ENHANCER — Progress Ring + Animated   */
  /*                        Counter + Smart Greeting       */
  /* ───────────────────────────────────────────────────── */
  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) ||
    function (fn) { return setTimeout(fn, 16); };

  /* ─────────────── 1. PROGRESS RING (Apple Fitness) ───── */
  function renderProgressRing(target, opts) {
    if (!target) return;
    opts = opts || {};
    var size = opts.size || Number(target.getAttribute('data-size')) || 120;
    var stroke = opts.stroke || Number(target.getAttribute('data-stroke')) || 10;
    var percent = opts.percent != null ? opts.percent : Number(target.getAttribute('data-percent')) || 0;
    var color = opts.color || target.getAttribute('data-color') || 'url(#az-ring-grad-primary)';
    var trackColor = opts.trackColor || target.getAttribute('data-track') || 'rgba(255,255,255,0.08)';
    var rounded = opts.rounded !== false;
    var animateFromZero = opts.animateFromZero !== false;
    var animMs = opts.duration || 1200;
    var label = target.getAttribute('data-label') || '';
    var subtitle = target.getAttribute('data-sub') || '';

    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;

    target.innerHTML = '';
    target.setAttribute('aria-label', label + ' ' + percent + '%');
    target.style.width = size + 'px';
    target.style.height = size + 'px';
    target.classList.add('az-ring');

    var defsEl = document.getElementById('az-ring-defs') || null;
    if (!defsEl) {
      var svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgDefs.setAttribute('id', 'az-ring-defs');
      svgDefs.setAttribute('width', '0');
      svgDefs.setAttribute('height', '0');
      svgDefs.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      svgDefs.innerHTML = '' +
        '<defs>' +
        '  <linearGradient id="az-ring-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '    <stop offset="0%" stop-color="#7c3aed"/>' +
        '    <stop offset="50%" stop-color="#6366f1"/>' +
        '    <stop offset="100%" stop-color="#ec4899"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="az-ring-grad-success" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '    <stop offset="0%" stop-color="#10b981"/>' +
        '    <stop offset="100%" stop-color="#34d399"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="az-ring-grad-streak" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '    <stop offset="0%" stop-color="#f97316"/>' +
        '    <stop offset="100%" stop-color="#fbbf24"/>' +
        '  </linearGradient>' +
        '  <linearGradient id="az-ring-grad-ai" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '    <stop offset="0%" stop-color="#3b82f6"/>' +
        '    <stop offset="100%" stop-color="#60a5fa"/>' +
        '  </linearGradient>' +
        '  <filter id="az-ring-glow" x="-50%" y="-50%" width="200%" height="200%">' +
        '    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>' +
        '    <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '  </filter>' +
        '</defs>';
      document.body.appendChild(svgDefs);
    }

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.overflow = 'visible';

    var track = document.createElementNS(svgNS, 'circle');
    track.setAttribute('cx', size / 2);
    track.setAttribute('cy', size / 2);
    track.setAttribute('r', r);
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', trackColor);
    track.setAttribute('stroke-width', stroke);
    svg.appendChild(track);

    var prog = document.createElementNS(svgNS, 'circle');
    prog.setAttribute('cx', size / 2);
    prog.setAttribute('cy', size / 2);
    prog.setAttribute('r', r);
    prog.setAttribute('fill', 'none');
    prog.setAttribute('stroke', color);
    prog.setAttribute('stroke-width', stroke);
    prog.setAttribute('stroke-linecap', rounded ? 'round' : 'butt');
    prog.setAttribute('transform', 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')');
    prog.setAttribute('stroke-dasharray', String(c));
    prog.setAttribute('filter', 'url(#az-ring-glow)');
    svg.appendChild(prog);

    target.appendChild(svg);

    var innerWrap = document.createElement('div');
    innerWrap.className = 'az-ring-inner';
    var valueSpan = document.createElement('span');
    valueSpan.className = 'az-ring-value';
    valueSpan.textContent = animateFromZero ? '0' : percent;
    innerWrap.appendChild(valueSpan);
    if (subtitle) {
      var sub = document.createElement('small');
      sub.className = 'az-ring-sub';
      sub.textContent = subtitle;
      innerWrap.appendChild(sub);
    }
    target.appendChild(innerWrap);

    var startValue = animateFromZero ? 0 : percent;
    var startTime = null;
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function step(now) {
      if (!startTime) startTime = now;
      var elapsed = now - startTime;
      var t = Math.min(elapsed / animMs, 1);
      var eased = easeOutCubic(t);
      var current = startValue + (percent - startValue) * eased;
      var dashOffset = c - (c * (current / 100));
      prog.setAttribute('stroke-dashoffset', String(dashOffset));
      valueSpan.textContent = Math.round(current);
      if (t < 1) raf(step);
    }
    raf(step);

    target.__azRingUpdate = function (newPercent, duration) {
      startTime = null;
      var fromVal = Number(valueSpan.textContent) || 0;
      animMs = duration || animMs;
      percent = newPercent;
      function step2(now) {
        if (!startTime) startTime = now;
        var elapsed = now - startTime;
        var t = Math.min(elapsed / animMs, 1);
        var eased = easeOutCubic(t);
        var cur = fromVal + (newPercent - fromVal) * eased;
        var dashOffset = c - (c * (cur / 100));
        prog.setAttribute('stroke-dashoffset', String(dashOffset));
        valueSpan.textContent = Math.round(cur);
        if (t < 1) raf(step2);
      }
      raf(step2);
    };
  }

  /* ─────────────── 2. ANIMATED COUNTER — 12,840 + ↑18% ── */
  function animateCount(target, to, opts) {
    if (!target) return;
    opts = opts || {};
    var duration = opts.duration || 1500;
    var prefix = opts.prefix || target.getAttribute('data-prefix') || '';
    var suffix = opts.suffix || target.getAttribute('data-suffix') || '';
    var decimals = Number(opts.decimals != null ? opts.decimals : target.getAttribute('data-decimals')) || 0;
    var start = Number(opts.from != null ? opts.from : 0);
    var startTime = null;
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

    function format(num) {
      var fixed = num.toFixed(decimals);
      if (decimals === 0) {
        fixed = String(Math.round(num));
      }
      var parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return prefix + parts.join('.') + suffix;
    }

    function step(now) {
      if (!startTime) startTime = now;
      var elapsed = now - startTime;
      var t = Math.min(elapsed / duration, 1);
      var eased = easeOutExpo(t);
      var current = start + (to - start) * eased;
      target.textContent = format(current);
      if (t < 1) raf(step);
    }
    target.textContent = format(start);
    raf(step);
  }

  /* ─────────────── 3. SMART GREETING + WELCOME FADE-IN ─ */
  function setSmartGreeting(nameOpts) {
    nameOpts = nameOpts || {};
    var hour = new Date().getHours();
    var greetingEl = nameOpts.greetingEl || document.getElementById(nameOpts.greetingId || 'hero-greeting');
    var subtitleEl = nameOpts.subtitleEl || document.getElementById(nameOpts.subtitleId || 'hero-subtitle');
    var name = nameOpts.name || 'Do\'st';
    var welcomeName = nameOpts.welcomeName || nameOpts.name;
    var emojiEl = nameOpts.emojiEl || document.getElementById(nameOpts.emojiId || 'hero-emoji');
    var welcomeEl = nameOpts.welcomeEl || document.getElementById(nameOpts.welcomeId || 'hero-welcome-name');

    var time = 'Hayrli tong,';
    var emoji = '🌅';
    if (hour >= 5 && hour < 12) { time = 'Hayrli tong,'; emoji = '🌅'; }
    else if (hour >= 12 && hour < 16) { time = 'Hayrli kun,'; emoji = '☀️'; }
    else if (hour >= 16 && hour < 20) { time = 'Hayrli kech,'; emoji = '🌆'; }
    else { time = 'Hayrli tun,'; emoji = '🌙'; }

    if (greetingEl) greetingEl.textContent = time;
    if (emojiEl) { emojiEl.textContent = emoji; emojiEl.setAttribute('aria-label', ''); }
    if (welcomeEl) welcomeEl.textContent = welcomeName;

    var welcomeBox = nameOpts.welcomeWrap || document.getElementById(nameOpts.welcomeWrapId || 'hero-welcome-box');
    if (welcomeBox) {
      welcomeBox.classList.add('az-welcome-visible');
    }

    if (subtitleEl) {
      var subtitles = [
        'Davom ettirish — eng qiyin, ammo eng muhim narsa.',
        'Bugun bitta yangi so\'z ham yetarli — davom eting!',
        'Tushuncha takrorlashda yashanadi. Qani boshladik!',
        'Siz oldinga qarayapsiz — va bu juda yaxshi!',
        'Ma\'rifat emas, balki uni qo\'llashdir — natija beradi.',
      ];
      subtitleEl.textContent = subtitles[(hour + name.length) % subtitles.length];
    }
  }

  /* ─────────────── 4. EXPORTS / AUTO INIT ─────────────── */
  function enhanceAll() {
    document.querySelectorAll('[data-role="az-ring"]').forEach(function (el) {
      renderProgressRing(el);
    });
    document.querySelectorAll('[data-role="az-counter"]').forEach(function (el) {
      var to = Number(el.getAttribute('data-to'));
      if (!isNaN(to)) animateCount(el, to);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll);
  } else {
    enhanceAll();
  }

  window.AzDash = {
    renderProgressRing: renderProgressRing,
    animateCount: animateCount,
    setSmartGreeting: setSmartGreeting,
    enhanceAll: enhanceAll
  };
})();
