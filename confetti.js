(function () {
  'use strict';

  /* ───────────────────────────────────────────────────── */
  /*  🎉 AZWORD CONFETTI — Canvas particle burst engine    */
  /*     Global API: window.AzConfetti                      */
  /*       .burst(opts?)       — center / hero             */
  /*       .star(x,y,opts?)    — custom origin (e.g button)*/
  /*       .preset(name)       — 'success'/'victory'/'coin'*/
  /* ───────────────────────────────────────────────────── */

  var canvas = null;
  var ctx = null;
  var particles = [];
  var running = false;
  var rafId = null;
  var lastTs = 0;
  var width = 0;
  var height = 0;
  var DPR = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) ||
    function (fn) { return setTimeout(fn, 16); };
  var caf = (typeof window !== 'undefined' && window.cancelAnimationFrame) ||
    function (id) { clearTimeout(id); };

  // ──────────────────── COLOR PALETTES ────────────────────
  var PALETTE = {
    primary: ['#7c3aed', '#8b5cf6', '#6366f1', '#ec4899', '#f472b6'],
    success: ['#10b981', '#34d399', '#6ee7b7', '#7c3aed', '#60a5fa'],
    victory: ['#fbbf24', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6'],
    coin: ['#fbbf24', '#facc15', '#fde047', '#eab308', '#fcd34d'],
    love: ['#f43f5e', '#ec4899', '#db2777', '#fda4af', '#f9a8d4']
  };

  // ────────────────────── SHAPES ──────────────────────────
  function drawShape(c, p) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.r);
    c.globalAlpha = p.alpha;
    c.fillStyle = p.color;
    switch (p.shape) {
      case 'circle':
        c.beginPath();
        c.arc(0, 0, p.size, 0, Math.PI * 2);
        c.fill();
        break;
      case 'rect':
        c.fillRect(-p.size * 0.5, -p.size * 0.75, p.size, p.size * 1.5);
        break;
      case 'triangle':
        c.beginPath();
        c.moveTo(0, -p.size);
        c.lineTo(p.size * 0.9, p.size * 0.8);
        c.lineTo(-p.size * 0.9, p.size * 0.8);
        c.closePath();
        c.fill();
        break;
      case 'star':
        drawStar(c, 0, 0, 5, p.size, p.size * 0.48);
        c.fill();
        break;
      case 'ring':
        c.lineWidth = Math.max(1.5, p.size * 0.22);
        c.strokeStyle = p.color;
        c.beginPath();
        c.arc(0, 0, p.size, 0, Math.PI * 2);
        c.stroke();
        break;
    }
    c.restore();
  }

  function drawStar(c, cx, cy, spikes, outer, inner) {
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;
    c.beginPath();
    c.moveTo(cx, cy - outer);
    for (var i = 0; i < spikes; i++) {
      var x1 = cx + Math.cos(rot) * outer;
      var y1 = cy + Math.sin(rot) * outer;
      c.lineTo(x1, y1);
      rot += step;
      var x2 = cx + Math.cos(rot) * inner;
      var y2 = cy + Math.sin(rot) * inner;
      c.lineTo(x2, y2);
      rot += step;
    }
    c.lineTo(cx, cy - outer);
    c.closePath();
  }

  // ──────────────────── SETUP CANVAS ─────────────────────
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'az-confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;' +
      'z-index:2147483647;pointer-events:none;' +
      'overflow:hidden;display:block;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }

  function resize() {
    if (!canvas || !ctx) return;
    width = window.innerWidth;
    height = window.innerHeight;
    DPR = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * DPR);
    canvas.height = Math.round(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // ──────────────────── PARTICLE FACTORY ──────────────────
  var SHAPES = ['circle', 'rect', 'triangle', 'star', 'ring'];

  function spawnParticle(originX, originY, opts) {
    opts = opts || {};
    var paletteName = opts.palette || 'primary';
    var palette = PALETTE[paletteName] || PALETTE.primary;
    var speed = (opts.speed || 6) + Math.random() * (opts.speedJitter || 5);
    var angleBase = opts.angle != null ? opts.angle : (-Math.PI / 2);
    var spread = opts.spread != null ? opts.spread : Math.PI;
    var angle = angleBase + (Math.random() - 0.5) * spread;
    var size = 4 + Math.random() * 5;
    var grav = opts.gravity != null ? opts.gravity : 0.18;
    var drag = opts.drag != null ? opts.drag : 0.985;
    var shapes = opts.shapes || SHAPES;

    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.28,
      alpha: 1,
      decay: 0.008 + Math.random() * 0.008,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      gravity: grav,
      drag: drag,
      life: 0,
      maxLife: 2600 + Math.random() * 1400
    };
  }

  // ──────────────────── TICK / RENDER ─────────────────────
  function step(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(50, ts - lastTs);
    lastTs = ts;
    var dts = dt / 16.67; // normalise to ~60fps unit

    ctx && ctx.clearRect(0, 0, width, height);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity * dts;
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.r += p.vr * dts;
      p.life += dt;
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));

      if (p.alpha <= 0.01 ||
          p.x < -80 || p.x > width + 80 ||
          p.y > height + 120) {
        particles.splice(i, 1);
        continue;
      }
      drawShape(ctx, p);
    }

    if (particles.length === 0) {
      running = false;
      if (rafId) caf(rafId);
      rafId = null;
      lastTs = 0;
      // Fade out 1 frame after end
      if (ctx) ctx.clearRect(0, 0, width, height);
      return;
    }

    rafId = raf(step);
  }

  function startLoopIfNeeded() {
    if (!running) {
      running = true;
      lastTs = 0;
      rafId = raf(step);
    }
  }

  // ──────────────────── PUBLIC API ────────────────────────
  function burst(opts) {
    ensureCanvas();
    opts = opts || {};
    var count = opts.count || (opts.big ? 220 : 120);
    var cx = opts.x != null ? opts.x : window.innerWidth / 2;
    var cy = opts.y != null ? opts.y : window.innerHeight / 2.6;
    for (var i = 0; i < count; i++) {
      particles.push(spawnParticle(cx, cy, opts));
    }
    // Slight delay to stagger the burst
    if (opts.stagger) {
      setTimeout(function () {
        for (var j = 0; j < Math.round(count * 0.5); j++) {
          particles.push(spawnParticle(cx, cy, opts));
        }
        startLoopIfNeeded();
      }, opts.staggerDelay || 90);
    }
    startLoopIfNeeded();
  }

  function star(originX, originY, opts) {
    ensureCanvas();
    opts = opts || {};
    var count = opts.count || 45;
    var merged = Object.assign({}, opts, {
      angle: opts.angle != null ? opts.angle : (-Math.PI / 2),
      spread: opts.spread != null ? opts.spread : Math.PI * 0.9,
      speed: opts.speed || 5,
      speedJitter: opts.speedJitter || 4
    });
    for (var i = 0; i < count; i++) {
      particles.push(spawnParticle(originX, originY, merged));
    }
    startLoopIfNeeded();
  }

  function preset(name) {
    switch (name) {
      case 'success':
        burst({ palette: 'success', count: 160, stagger: true });
        break;
      case 'victory':
        burst({ palette: 'victory', count: 260, big: true, stagger: true });
        break;
      case 'coin':
        burst({ palette: 'coin', count: 140, speed: 8, gravity: 0.22 });
        break;
      case 'love':
        burst({ palette: 'love', count: 150 });
        break;
      case 'study-correct':
        // Small focused burst
        var cx = window.innerWidth / 2;
        var cy = window.innerHeight / 2.4;
        star(cx, cy, { count: 60, palette: 'success', speed: 6 });
        break;
      default:
        burst();
    }
  }

  // ──────────────────── EXPORTS ───────────────────────────
  window.AzConfetti = {
    burst: burst,
    star: star,
    preset: preset,
    PALETTE: PALETTE,
    /** Aliases for simplicity */
    success: function () { preset('success'); },
    victory: function () { preset('victory'); },
    coin: function () { preset('coin'); }
  };

  // Auto-hide after 5s idle (cleanup check)
  setInterval(function () {
    if (canvas && !running && canvas.style.display !== 'none') {
      // Do not hide — re-clear just in case
      try { if (ctx) ctx.clearRect(0, 0, width, height); } catch (e) { /* ignore */ }
    }
  }, 6000);
})();
