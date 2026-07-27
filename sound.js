/* ═══════════════════════════════════════════════
   AzWord · Premium Sound Engine (Web Audio API)
   Global · No external files · Auto-hover triggers
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;

  function getCtx() {
    if (!ctx && AudioCtx) ctx = new AudioCtx();
    return ctx;
  }

  // Resume on first user gesture (browser autoplay policy)
  function unlock() {
    const c = getCtx();
    if (c && c.state === 'suspended') { c.resume(); }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  }
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  /* ─── Sound presets ─── */
  const presets = {
    click: {
      type: 'sine',
      freqStart: 600,
      freqEnd: 600,
      dur: 0.08,
      gain: 0.08
    },
    hover: {
      type: 'sine',
      freqStart: 900,
      freqEnd: 900,
      dur: 0.04,
      gain: 0.035
    },
    correct: {
      type: 'sine',
      freqStart: 880,
      freqEnd: 1320,
      dur: 0.3,
      gain: 0.22
    },
    wrong: {
      type: 'sawtooth',
      freqStart: 300,
      freqEnd: 150,
      dur: 0.2,
      gain: 0.15
    },
    coin: [
      { type: 'sine', freq: 1047, dur: 0.22, gain: 0.18, delay: 0 },
      { type: 'sine', freq: 1319, dur: 0.22, gain: 0.18, delay: 0.08 }
    ],
    victory: [
      { freq: 523,  dur: 0.3, gain: 0.2, delay: 0    },
      { freq: 659,  dur: 0.3, gain: 0.2, delay: 0.12 },
      { freq: 784,  dur: 0.3, gain: 0.2, delay: 0.24 },
      { freq: 1047, dur: 0.35,gain: 0.2, delay: 0.36 }
    ],
    achievement: [
      { freq: 784,  type: 'sine',     dur: 0.4, gain: 0.16, delay: 0    },
      { freq: 988,  type: 'sine',     dur: 0.4, gain: 0.16, delay: 0.1  },
      { freq: 1175, type: 'sine',     dur: 0.4, gain: 0.16, delay: 0.2  },
      { freq: 1568, type: 'triangle', dur: 0.5, gain: 0.16, delay: 0.3  }
    ],
    toggle_on: {
      type: 'triangle',
      freqStart: 500,
      freqEnd: 800,
      dur: 0.09,
      gain: 0.1
    },
    toggle_off: {
      type: 'sine',
      freqStart: 600,
      freqEnd: 350,
      dur: 0.09,
      gain: 0.1
    }
  };

  function playTone(p) {
    const c = getCtx();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = p.type || 'sine';
      const t0 = c.currentTime + (p.delay || 0);
      const fStart = p.freqStart !== undefined ? p.freqStart : p.freq;
      const fEnd = p.freqEnd !== undefined ? p.freqEnd : p.freq;
      o.frequency.setValueAtTime(fStart, t0);
      if (fEnd !== fStart) {
        o.frequency.exponentialRampToValueAtTime(Math.max(1, fEnd), t0 + p.dur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p.gain, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);
      o.start(t0);
      o.stop(t0 + p.dur + 0.02);
    } catch (e) {}
  }

  function playChord(notes) {
    const c = getCtx();
    if (!c) return;
    notes.forEach(n => playTone(n));
  }

  /* ─── Public API ─── */
  window.AzSound = {
    play(name) {
      if (reduceMotion || name === 'hover' && window._azHoverThrottle && Date.now() - window._azHoverThrottle < 35) return;
      if (name === 'hover') window._azHoverThrottle = Date.now();

      const p = presets[name];
      if (!p) return;
      if (Array.isArray(p)) playChord(p);
      else playTone(p);
    },
    toggle(state) {
      this.play(state ? 'toggle_on' : 'toggle_off');
    }
  };

  // Legacy alias (used in study.html)
  window.playSound = (t) => window.AzSound.play(t);

  /* ─── Auto hover triggers ─── */
  const HOVER_SELECTOR = 'button, .btn, .nav-logo, .folder-card, .achievement-card, .shop-item, .leader-row, a, .option-btn, .match-btn, .piece-btn, .toggle-switch';

  function bindAutoSounds() {
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest(HOVER_SELECTOR);
      if (!el) return;
      if (el.dataset.soundHover === 'false') return;
      window.AzSound.play('hover');
    }, { passive: true });

    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button, .btn, a[href], .folder-card, .shop-item, .piece-btn, .option-btn, .match-btn');
      if (!btn || btn.dataset.soundClick === 'false') return;
      window.AzSound.play('click');
    }, { passive: true });

    // Toggle switch sound
    document.addEventListener('change', (e) => {
      if (e.target.matches('.toggle-switch input[type="checkbox"]')) {
        window.AzSound.toggle(e.target.checked);
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAutoSounds, { once: true });
  } else {
    bindAutoSounds();
  }
})();
