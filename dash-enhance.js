(function () {
  'use strict';

  /* ───────────────────────────────────────────────────── */
  /*  ✨ AZWORD DASH ENHANCER — Progress Ring + Animated   */
  /*                        Counter + Smart Greeting       */
  /* ───────────────────────────────────────────────────── */
  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) ||
    function (fn) { return setTimeout(fn, 16); };
  var reduceMotion = !!(typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

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
    enhanceAll: enhanceAll,

    /* ─────────────── 5. WEEK STREAK HEATMAP ─────────────── */
    renderWeekStreak: function (container, weekData) {
      if (!container) container = document.getElementById('week-bars');
      if (!container) return;
      var days = ['D', 'S', 'Ch', 'P', 'J', 'Sh', 'Y'];
      var todayIdx = (new Date().getDay() + 6) % 7;
      if (!weekData) {
        weekData = [];
        for (var i = 0; i < 7; i++) {
          var base = 0.15;
          if (i < todayIdx - 1) base = 1;
          else if (i === todayIdx - 1) base = 0.75;
          else if (i === todayIdx) base = 0.45;
          weekData.push(base);
        }
      }
      container.innerHTML = '';
      weekData.forEach(function (val, i) {
        var cls = 'az-legend-missed';
        if (val >= 0.9) cls = 'az-legend-done';
        else if (val > 0.15) cls = 'az-legend-partial';
        var isToday = i === todayIdx;
        var h = Math.max(8, Math.round(val * 100));
        var barWrap = document.createElement('div');
        barWrap.className = 'az-week-bar' + (isToday ? ' az-today' : '');
        barWrap.style.animationDelay = (i * 80) + 'ms';
        var col = document.createElement('div');
        col.className = 'az-week-bar-col ' + cls + (isToday && val > 0.85 ? ' today' : '');
        col.style.height = h + '%';
        col.setAttribute('title', days[i] + ': ' + Math.round(val * 100) + '%');
        var label = document.createElement('div');
        label.className = 'az-week-bar-label';
        label.textContent = days[i];
        barWrap.appendChild(col);
        barWrap.appendChild(label);
        container.appendChild(barWrap);
      });
      var doneCount = weekData.filter(function (v) { return v >= 0.9; }).length;
      var totEl = document.getElementById('week-streak-total');
      if (totEl) {
        var start = 0;
        var dur = 900;
        var t0 = null;
        function step(now) {
          if (!t0) t0 = now;
          var t = Math.min((now - t0) / dur, 1);
          var cur = Math.round(start + (doneCount - start) * (1 - Math.pow(1 - t, 3)));
          totEl.textContent = cur;
          if (t < 1) raf(step);
        }
        raf(step);
      }
    },

    /* ─────────────── 6. TIMEFRAME SWITCHER ─────────────── */
    switchTimeframe: function (tf, btn) {
      document.querySelectorAll('.az-tf-tab').forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      if (btn) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
      }
      document.querySelectorAll('[data-tf-set]').forEach(function (set) {
        var counter = set.querySelector('[data-role="az-counter"]');
        if (!counter) return;
        var attr = 'data-tf-' + tf;
        var to = Number(counter.getAttribute(attr));
        if (isNaN(to)) return;
        counter.dataset.to = to;
        animateCount(counter, to, { duration: 700 });
      });
      window.AzSound && window.AzSound.play('click');
    },

    /* ─────────────── 7. SMART CONTINUE LAST FOLDER ──────── */
    continueLastFolder: function () {
      var lastFolder = null;
      try {
        lastFolder = JSON.parse(localStorage.getItem('az:lastFolder') || 'null');
      } catch (e) {}
      if (lastFolder) {
        try {
          sessionStorage.setItem('az:openFolder', JSON.stringify(lastFolder));
        } catch (e) {}
      }
      window.location.href = 'study.html';
    },

    /* ─────────────── 8. AI COACH ────────────────────────── */
    openAICoach: function () {
      window.AzSound && window.AzSound.play('click');
      window.location.href = 'study.html?ai=coach';
    },

    /* ─────────────── 9. UPDATE TODAY GOAL ───────────────── */
    updateTodayGoal: function (done, total) {
      total = total || 30;
      done = Math.min(done, total);
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      var elDone = document.getElementById('goal-done');
      var elTotal = document.getElementById('goal-total');
      var elFill = document.getElementById('goal-fill');
      var elFillLg = document.getElementById('goal-fill-lg') || document.getElementById('goal-fill');
      var elPct = document.getElementById('goal-pct-label');
      var elEta = document.getElementById('goal-eta');
      if (elDone) animateCount(elDone, done, { duration: 900 });
      if (elTotal) elTotal.textContent = total;
      if (elFillLg) setTimeout(function () { elFillLg.style.width = pct + '%'; }, 120);
      if (elPct) animateCount(elPct, pct, { duration: 1000, suffix: '%' });
      if (elEta) {
        var left = Math.max(0, total - done);
        var mins = Math.max(1, Math.round(left * 0.6));
        elEta.textContent = '~' + mins + ' daqiqa';
      }
      var ringEl = document.getElementById('goal-ring');
      if (ringEl && ringEl.__azRingUpdate) {
        setTimeout(function () { ringEl.__azRingUpdate(pct, 1100); }, 150);
      }
    },

    /* ─────────────── 10. SET CONTINUE FOLDER LABEL ──────── */
    setContinueFolderLabel: function (name) {
      var el = document.getElementById('continue-folder-name');
      if (el) el.textContent = name || "O'rganishni boshlash";
      var hm = document.getElementById('hm-continue-folder');
      if (hm) hm.textContent = name || "O'rganishni boshlash";
    },

    /* ─────────────── 11. TOGGLE ADVANCED STATS ──────────── */
    toggleAdvancedStats: function (forceState) {
      var btn = document.getElementById('az-adv-toggle');
      var body = document.getElementById('az-adv-body');
      if (!btn || !body) return;
      var open;
      if (typeof forceState === 'boolean') open = forceState;
      else open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        body.hidden = false;
        // trigger rings/counters first time on reveal
        requestAnimationFrame(function () {
          body.querySelectorAll('[data-role="az-ring"]').forEach(function (r) {
            if (!r.__azRingInited) { renderProgressRing(r); r.__azRingInited = true; }
          });
          body.querySelectorAll('[data-role="az-counter"]').forEach(function (c) {
            if (!c.dataset.initedOnReveal) {
              c.dataset.initedOnReveal = '1';
              var to = Number(c.getAttribute('data-to'));
              if (!isNaN(to) && to > 0) animateCount(c, to);
            }
          });
        });
        btn.querySelector('span:nth-child(2)').textContent = "Batafsil statistikani yashirish";
      } else {
        // allow transition, then hide
        body.style.maxHeight = body.scrollHeight + 'px';
        requestAnimationFrame(function () {
          body.style.maxHeight = '';
          setTimeout(function () { body.hidden = true; }, reduceMotion ? 0 : 350);
        });
        btn.querySelector('span:nth-child(2)').textContent = "Batafsil statistikani ko'rsatish";
      }
      try { localStorage.setItem('az:advStatsOpen', String(open)); } catch (e) {}
      window.AzSound && window.AzSound.play('click');
    },

    /* ─────────────── 12. RENDER SIDEBAR MINI WIDGETS ────── */
    renderSidebarWeekStreak: function (weekData) {
      var container = document.getElementById('sb-week-bars');
      if (!container) return;
      var todayIdx = (new Date().getDay() + 6) % 7;
      if (!weekData) {
        weekData = [];
        for (var i = 0; i < 7; i++) {
          var base = 0.2;
          if (i < todayIdx - 1) base = 1;
          else if (i === todayIdx - 1) base = 0.75;
          else if (i === todayIdx) base = 0.45;
          weekData.push(base);
        }
      }
      container.innerHTML = '';
      weekData.forEach(function (val, i) {
        var cls = 'az-day-miss';
        if (val >= 0.9) cls = 'az-day-done';
        else if (val > 0.2) cls = 'az-day-part';
        var isToday = i === todayIdx;
        var bar = document.createElement('div');
        bar.className = 'sb-week-bar';
        if (isToday) bar.classList.add('az-day-today');
        else bar.classList.add(cls);
        bar.style.setProperty('--bar', String(Math.max(0.2, val)));
        container.appendChild(bar);
        requestAnimationFrame(function () {
          setTimeout(function () { bar.classList.add('az-animated'); }, reduceMotion ? 0 : (i * 60 + 120));
        });
      });
    },

    /* ─────────────── 13. UPDATE HERO KPI VALUES (Pills) ── */
    updateHeroKpis: function (kpi) {
      kpi = kpi || {};
      function set(id, val) {
        var el = document.getElementById(id);
        if (!el) return;
        if (typeof val === 'number') animateCount(el, val, { duration: 900 });
        else el.textContent = String(val);
      }
      set('kpi-words-total', kpi.words);
      set('kpi-time-total',  kpi.hours);
      set('kpi-acc-total',   kpi.accuracy);
    },

    /* ─────────────── 14. UPDATE SIDEBAR LEVEL XP ────────── */
    updateSidebarLevel: function (opts) {
      opts = opts || {};
      var stars = opts.stars != null ? opts.stars : 0;
      var levelEl = document.getElementById('sbw-level');
      var xpCurEl = document.getElementById('sbw-xp-current');
      var xpTotEl = document.getElementById('sbw-xp-total');
      var xpFill  = document.getElementById('sbw-xp-fill');
      var qcStreakEl = document.getElementById('qc-streak-num');
      if (qcStreakEl) {
        var d = opts.streakDays != null ? opts.streakDays : (Number(localStorage.getItem('az:streakDays')) || 0);
        animateCount(qcStreakEl, d, { duration: 700 });
      }
      var level = Math.floor(stars / 500) + 1;
      var xpCur = stars % 500;
      var xpTot = 500;
      var pct = Math.round((xpCur / xpTot) * 100);
      if (levelEl) levelEl.textContent = 'LVL ' + level;
      if (xpCurEl) animateCount(xpCurEl, xpCur, { duration: 800 });
      if (xpTotEl) xpTotEl.textContent = xpTot;
      if (xpFill) setTimeout(function () { xpFill.style.width = pct + '%'; }, 250);
    },

    /* ─────────────── 15. SIDEBAR ACCORDION TOGGLE ───────── */
    toggleSidebarAccordion: function (key, forceState) {
      var acc = document.querySelector('.sb-accordion[data-sb-acc="' + key + '"]');
      if (!acc) return;
      var toggle = acc.querySelector('.sb-acc-toggle');
      var body = acc.querySelector('.sb-acc-body');
      if (!toggle || !body) return;
      var open;
      if (typeof forceState === 'boolean') open = forceState;
      else open = !acc.classList.contains('is-open');
      if (open) {
        acc.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        body.hidden = false;
        try { localStorage.setItem('az:sbAcc:' + key, '1'); } catch (e) {}
      } else {
        acc.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        setTimeout(function () { if (!acc.classList.contains('is-open')) body.hidden = true; }, reduceMotion ? 0 : 360);
        try { localStorage.setItem('az:sbAcc:' + key, '0'); } catch (e) {}
      }
      window.AzSound && window.AzSound.play('click');
    },

    /* ─────────────── 16. INIT SIDEBAR ACCORDIONS ────────── */
    initSidebarAccordions: function () {
      var accs = document.querySelectorAll('.sb-accordion');
      accs.forEach(function (acc) {
        var key = acc.getAttribute('data-sb-acc');
        if (!key) return;
        var toggle = acc.querySelector('.sb-acc-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', function () {
          window.AzDash.toggleSidebarAccordion(key);
        });
        var open = null;
        try { open = localStorage.getItem('az:sbAcc:' + key); } catch (e) {}
        if (open === null) {
          open = acc.getAttribute('data-open-default') === 'true' ? '1' : '0';
        }
        if (open === '1') {
          window.AzDash.toggleSidebarAccordion(key, true);
        }
      });
    },

    /* ─────────────── 17. SIDEBAR ANNOUNCEMENTS ──────────── */
    setSidebarAnnouncements: function (key, items) {
      var list = document.getElementById('sba-' + key + '-ann');
      if (!list) return;
      list.innerHTML = '';
      items = items || [];
      items.forEach(function (item, i) {
        if (!item.text) return;
        var type = item.type || key;
        var el = document.createElement('div');
        el.className = 'sb-acc-ann-item type-' + type;
        el.style.animationDelay = (i * 70) + 'ms';
        var timeHtml = item.time ? '<span class="sb-ann-time">' + item.time + '</span>' : '';
        el.innerHTML =
          '<span class="sb-ann-emoji">' + (item.emoji || '📢') + '</span>' +
          '<div class="sb-ann-text">' + item.text + timeHtml + '</div>';
        list.appendChild(el);
      });
      window.AzDash.setSidebarBadge(key, items.length, items.some(function (it) { return it.unread; }));
    },

    /* ─────────────── 18. SIDEBAR BADGE UPDATE ───────────── */
    setSidebarBadge: function (key, count, hasUnread) {
      var badge = document.getElementById('sba-' + key + '-badge');
      var dot = document.getElementById('sba-' + key + '-dot');
      if (badge) {
        if (count > 0) {
          badge.textContent = String(count);
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
      if (dot) {
        dot.style.display = hasUnread ? 'block' : 'none';
      }
    }
  };

  /* ─────────────── 11. AUTO INIT ENHANCEMENTS ─────────── */
  function autoInitHero() {
    // -1) SIDEBAR ACCORDIONS init (data-open-default + localStorage)
    try { window.AzDash.initSidebarAccordions(); } catch (e) {}

    // 0) ADVANCED STATS toggle + event wiring
    var advBtn = document.getElementById('az-adv-toggle');
    if (advBtn) {
      advBtn.addEventListener('click', function () { window.AzDash.toggleAdvancedStats(); });
      try {
        if (localStorage.getItem('az:advStatsOpen') === 'true') {
          setTimeout(function () { window.AzDash.toggleAdvancedStats(true); }, 350);
        }
      } catch (e) {}
    }
    // qc-report button → opens advanced
    var qcRep = document.getElementById('qc-report-btn');
    if (qcRep) {
      qcRep.addEventListener('click', function () {
        window.AzDash.toggleAdvancedStats(true);
        document.getElementById('az-adv-body') &&
          document.getElementById('az-adv-body').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // 1) Smart greeting — new minimal HM IDs first, fallback to old ones
    var gNameEl = document.getElementById('hero-welcome-name') || document.getElementById('greeting-name') || document.getElementById('hm-name');
    var displayName = 'Do\'stim';
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem('az:lastFolder') || 'null'); } catch (e) {}
    if (raw) window.AzDash.setContinueFolderLabel(raw.name || null);
    else window.AzDash.setContinueFolderLabel("O'rganishni boshlash");

    if (gNameEl) {
      try {
        var profile = JSON.parse(localStorage.getItem('az:profile') || 'null');
        if (profile && profile.name) displayName = profile.name;
        else if (window.auth && window.auth.currentUser && window.auth.currentUser.displayName) {
          displayName = window.auth.currentUser.displayName || displayName;
        } else {
          var stored = sessionStorage.getItem('az:userName') || localStorage.getItem('userName');
          if (stored) displayName = stored;
        }
      } catch (e) {}
    }
    // HM-contextual setSmartGreeting
    setSmartGreeting({
      name: displayName,
      welcomeName: displayName.split(' ')[0] || displayName,
      greetingId: 'hero-greeting',
      welcomeId:  'hero-welcome-name',
      subtitleId: 'hero-subtitle',
      emojiId:    'hero-emoji'
    });
    // Run again on HM nodes (if exist)
    setSmartGreeting({
      name: displayName,
      welcomeName: displayName.split(' ')[0] || displayName,
      greetingId: 'hm-greeting',
      welcomeId:  'hm-name',
      subtitleId: 'hm-subtitle',
      emojiId:    'hm-emoji',
      welcomeWrapId: null
    });

    // 2) Week streak — old & sidebar mini
    window.AzDash.renderWeekStreak();
    window.AzDash.renderSidebarWeekStreak();

    // 3) Today goal — old ring + new thin HM bar
    var todayWords = 18;
    var total = 30;
    try {
      var stats = JSON.parse(localStorage.getItem('az:todayStats') || 'null');
      if (stats && typeof stats.wordsLearned === 'number') todayWords = stats.wordsLearned;
      if (stats && typeof stats.dailyGoal === 'number') total = stats.dailyGoal;
    } catch (e) {}
    window.AzDash.updateTodayGoal(todayWords, total);
    // Thin bar update (HM minimal)
    var hmDone = document.getElementById('hm-goal-done');
    var hmTot  = document.getElementById('hm-goal-total');
    var hmPct  = document.getElementById('hm-goal-pct-val');
    var hmFill = document.getElementById('hm-goal-fill');
    var pct = Math.min(100, Math.round((todayWords / total) * 100));
    if (hmDone) animateCount(hmDone, todayWords, { duration: 900 });
    if (hmTot)  hmTot.textContent = total;
    if (hmPct)  animateCount(hmPct, pct, { duration: 1000, suffix: '%' });
    if (hmFill) setTimeout(function () { hmFill.style.width = pct + '%'; }, 200);
  }

  var _origEnhance = enhanceAll;
  enhanceAll = function () {
    _origEnhance();
    autoInitHero();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitHero, { once: true });
  } else if (!window.__AzHeroInited) {
    window.__AzHeroInited = true;
    autoInitHero();
  }
})();
