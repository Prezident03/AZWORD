/* ═══════════════════════════════════════════════
   AzWord · EFFECTS PACK · Level 2 + 3
   ✔  Success Modal    (folder complete)
   📣  Smart Notifications (streak, AI tips)
   🗂️  Empty States (universal CSS component)
   📊  Weekly Report (dashboard card)
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ──────── CSS INJECTION ──────── */
  function injectCSS() {
    if (document.getElementById('az-effects-css')) return;
    const s = document.createElement('style');
    s.id = 'az-effects-css';
    s.textContent = `
/* ══════════ SUCCESS MODAL ══════════ */
#az-success-overlay {
  position: fixed;
  inset: 0;
  z-index: 99997;
  background: radial-gradient(circle at 50% 40%, rgba(124,58,237,0.28), rgba(8,6,18,0.75) 60%);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-slow, 450ms) var(--ease-standard);
}
#az-success-overlay.az-show { opacity: 1; pointer-events: auto; }
#az-success-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 36px 28px 28px;
  background: linear-gradient(160deg, #1a1625, #0f0d1a 70%);
  border: 1.5px solid rgba(124,58,237,0.35);
  border-radius: var(--radius-2xl, 30px);
  text-align: center;
  transform: scale(.86) translateY(24px);
  opacity: 0;
  transition: transform var(--dur-slow, 450ms) var(--ease-emphasis),
              opacity var(--dur-normal, 280ms) var(--ease-standard);
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04),
    0 40px 80px rgba(0,0,0,0.55),
    0 0 160px rgba(124,58,237,0.25);
}
#az-success-overlay.az-show #az-success-card {
  transform: scale(1) translateY(0);
  opacity: 1;
}
#az-success-card::before {
  content: '';
  position: absolute;
  inset: -40% -20% auto -20%;
  height: 260px;
  background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.24), transparent 70%);
  pointer-events: none;
}
.az-success-ring {
  position: relative;
  width: 108px; height: 108px;
  margin: 0 auto 20px;
  display: flex; align-items: center; justify-content: center;
}
.az-success-ring svg { position: absolute; inset: 0; }
.az-success-check {
  position: relative;
  z-index: 2;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #22d3ee);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  transform: scale(0) rotate(-30deg);
  box-shadow: 0 8px 30px rgba(16,185,129,0.45), 0 0 0 6px rgba(16,185,129,0.1);
  transition: transform var(--dur-slow, 450ms) var(--ease-bounce, cubic-bezier(.34,1.56,.64,1));
}
#az-success-overlay.az-show .az-success-check {
  transform: scale(1) rotate(0);
  transition-delay: 150ms;
}
.az-success-title {
  font-family: var(--font-display, 'Space Grotesk', sans-serif);
  font-size: 1.68rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 6px;
  background: linear-gradient(120deg, #fff 30%, #c4b5fd);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.az-success-sub {
  font-size: 0.88rem;
  color: var(--text-muted, #9ca3af);
  margin: 0 0 20px;
}
.az-success-xp {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: var(--radius-pill, 99px);
  background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(236,72,153,0.12));
  border: 1px solid rgba(124,58,237,0.35);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.02rem;
  color: var(--text-main);
  margin-bottom: 22px;
  transform: translateY(8px);
  opacity: 0;
  transition: all var(--dur-normal, 280ms) var(--ease-standard);
}
#az-success-overlay.az-show .az-success-xp {
  transform: translateY(0); opacity: 1;
  transition-delay: 380ms;
}
.az-success-xp .az-star {
  color: #fbbf24;
  filter: drop-shadow(0 0 6px rgba(251,191,36,0.5));
}
.az-success-actions { display: flex; gap: 10px; }
.az-s-btn {
  flex: 1;
  padding: 12px 14px;
  border-radius: var(--radius-lg, 18px);
  border: 1px solid var(--border, #2e2845);
  background: var(--bg-deep, #0f0d1a);
  color: var(--text-main);
  font-family: var(--font-body, 'Inter', sans-serif);
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  transition: all var(--dur-fast, 180ms) var(--ease-standard);
}
.az-s-btn:hover { background: #252033; transform: translateY(-1px); }
.az-s-btn.az-primary {
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 24px rgba(124,58,237,0.4);
}
.az-s-btn.az-primary:hover { box-shadow: 0 14px 30px rgba(124,58,237,0.5); }

/* ══════════ SMART TOASTS ══════════ */
.az-toast-col {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 99990;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  pointer-events: none;
}
.az-smart-toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: linear-gradient(160deg, #1a1625, #0f0d1a);
  border: 1.5px solid var(--border-light, rgba(124,58,237,0.25));
  border-radius: var(--radius-xl, 22px);
  box-shadow: 0 18px 40px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.08);
  transform: translateX(120%);
  opacity: 0;
  transition: transform var(--dur-normal, 280ms) var(--ease-emphasis),
              opacity var(--dur-fast, 180ms) ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}
.az-smart-toast::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary, #7c3aed), var(--accent-pink, #ec4899));
}
.az-smart-toast.az-visible { transform: translateX(0); opacity: 1; }
.az-smart-toast.az-streak::before { background: linear-gradient(180deg, #f97316, #ef4444); }
.az-smart-toast.az-ai::before     { background: linear-gradient(180deg, #3b82f6, #8b5cf6); }
.az-smart-toast.az-gold::before   { background: linear-gradient(180deg, #f59e0b, #f97316); }
.az-st-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm, 10px);
  background: rgba(124,58,237,0.14);
  border: 1px solid rgba(124,58,237,0.3);
  color: var(--primary-light, #a78bfa);
  display: flex; align-items: center; justify-content: center;
}
.az-smart-toast.az-streak .az-st-icon { background: rgba(249,115,22,0.14); border-color: rgba(249,115,22,0.32); color: #fb923c; }
.az-smart-toast.az-ai     .az-st-icon { background: rgba(59,130,246,0.14); border-color: rgba(59,130,246,0.32); color: #60a5fa; }
.az-smart-toast.az-gold   .az-st-icon { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.32); color: #fbbf24; }
.az-st-body { min-width: 0; }
.az-st-title { font-family: var(--font-display); font-weight: 700; font-size: 0.88rem; color: var(--text-main); margin-bottom: 2px; }
.az-st-sub { font-size: 0.76rem; color: var(--text-muted, #9ca3af); line-height: 1.35; }
.az-st-action {
  padding: 6px 12px;
  border-radius: var(--radius-sm, 10px);
  border: 1px solid var(--border, #2e2845);
  background: var(--bg-deep, #0f0d1a);
  color: var(--primary-light);
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-fast);
}
.az-st-action:hover { background: rgba(124,58,237,0.16); border-color: rgba(124,58,237,0.35); transform: translateY(-1px); }

/* ══════════ EMPTY STATES ══════════ */
.az-empty-state {
  padding: 52px 20px;
  text-align: center;
  border-radius: var(--radius-xl, 22px);
  background: linear-gradient(180deg, rgba(124,58,237,0.04), transparent 60%);
  border: 1px dashed var(--border, #2e2845);
}
.az-empty-icn {
  width: 62px; height: 62px;
  margin: 0 auto 16px;
  border-radius: var(--radius-xl);
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(124,58,237,0.16), rgba(236,72,153,0.1));
  color: var(--primary-light);
  position: relative;
}
.az-empty-icn::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  border: 1px solid rgba(124,58,237,0.14);
  opacity: .7;
}
.az-empty-ttl {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-main);
  margin: 0 0 4px;
}
.az-empty-sub {
  font-size: 0.82rem;
  color: var(--text-muted, #9ca3af);
  margin: 0 auto 20px;
  max-width: 320px;
  line-height: 1.55;
}
.az-empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: var(--radius-lg, 18px);
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  color: #fff;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 0.84rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(124,58,237,0.35);
  transition: all var(--dur-fast);
}
.az-empty-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(124,58,237,0.45); }

/* ══════════ WEEKLY REPORT CARD ══════════ */
.az-weekly-card {
  position: relative;
  padding: 22px;
  border-radius: var(--radius-2xl, 30px);
  background:
    radial-gradient(ellipse at 100% 0%, rgba(236,72,153,0.18), transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(59,130,246,0.14), transparent 55%),
    linear-gradient(160deg, #15121f, #0f0d1a 70%);
  border: 1.5px solid var(--border-light, rgba(124,58,237,0.22));
  overflow: hidden;
}
.az-weekly-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), transparent 40%);
  pointer-events: none;
}
.az-wk-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  position: relative;
  z-index: 1;
}
.az-wk-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: rgba(59,130,246,0.14);
  border: 1px solid rgba(59,130,246,0.25);
  color: #93c5fd;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.az-wk-title {
  font-family: var(--font-display);
  font-size: 1.22rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 4px 0 0;
}
.az-wk-sub { font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; }
.az-wk-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  position: relative;
  z-index: 1;
}
.az-wk-stat {
  padding: 14px 12px;
  border-radius: var(--radius-lg, 18px);
  background: rgba(10, 8, 20, 0.55);
  border: 1px solid var(--border, #2e2845);
  text-align: center;
  transition: all var(--dur-fast);
}
.az-wk-stat:hover { transform: translateY(-2px); border-color: rgba(124,58,237,0.35); }
.az-wk-val {
  font-family: var(--font-display);
  font-size: 1.38rem;
  font-weight: 800;
  background: linear-gradient(120deg, #fff, #c4b5fd);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
  line-height: 1;
}
.az-wk-lbl {
  margin-top: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
  letter-spacing: 0.2px;
  text-transform: uppercase;
}
.az-wk-bar-trend {
  margin-top: 18px;
  position: relative;
  z-index: 1;
}
.az-wk-trend-lbl {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}
.az-wk-trend-lbl .az-up { color: #10b981; }
.az-wk-trend-lbl .az-down { color: #ef4444; }
.az-wk-bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  align-items: end;
  height: 58px;
}
.az-wk-bar {
  width: 100%;
  background: linear-gradient(180deg, var(--primary-light, #a78bfa), var(--primary, #7c3aed));
  border-radius: 6px 6px 3px 3px;
  transform-origin: 50% 100%;
  transform: scaleY(0);
  transition: transform var(--dur-normal, 280ms) var(--ease-emphasis);
  position: relative;
}
.az-weekly-card.az-animated .az-wk-bar { transform: scaleY(var(--bar, 0.3)); }
.az-wk-bar.az-today {
  background: linear-gradient(180deg, #f472b6, #ec4899);
  box-shadow: 0 0 0 2px rgba(236,72,153,0.18);
}
.az-wk-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-top: 6px;
  font-size: 0.62rem;
  color: var(--text-dim, #6b7280);
  font-weight: 600;
  text-align: center;
}
`;
    document.head.appendChild(s);
  }

  const SVG = {
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    star:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    fire:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    brain: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>',
    bell:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    folder:'<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    cal:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    play:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>'
  };

  /* ════════════════════════════════════
     1. FOLDER SUCCESS MODAL
     ════════════════════════════════════ */
  function showFolderComplete(opts = {}) {
    injectCSS();
    const title = opts.title || 'Great Job!';
    const sub = opts.sub   || 'Siz folderni muvaffaqiyatli yakunladingiz!';
    const xp  = opts.xp    || 250;
    const folderName = opts.folder || '';
    const onPrimary = opts.onPrimary || function () { location.href = 'dashboard.html'; };
    const onSecondary = opts.onSecondary || function () { location.href = 'shop.html'; };

    const overlay = document.createElement('div');
    overlay.id = 'az-success-overlay';
    overlay.innerHTML = `
      <div id="az-success-card" role="alertdialog" aria-label="Yutuq">
        <div class="az-success-ring">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="az-s-ring" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stop-color="#7c3aed"/>
                <stop offset="50%" stop-color="#ec4899"/>
                <stop offset="100%" stop-color="#22d3ee"/>
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="url(#az-s-ring)" stroke-width="4"
                    stroke-linecap="round"
                    stroke-dasharray="326.7" stroke-dashoffset="326.7"
                    style="transition: stroke-dashoffset ${reduceMotion ? '0ms' : '900ms'} cubic-bezier(.16,1,.3,1) 220ms"/>
          </svg>
          <div class="az-success-check">${SVG.check}</div>
        </div>
        <h2 class="az-success-title">${title}</h2>
        <p class="az-success-sub">${sub}${folderName ? ' <strong style="color:#c4b5fd">"' + folderName + '"</strong>' : ''}</p>
        <div class="az-success-xp"><span class="az-star">${SVG.star}</span><span>+${xp} XP</span></div>
        <div class="az-success-actions">
          <button class="az-s-btn az-secondary" data-act="secondary">Do'konga o'tish</button>
          <button class="az-s-btn az-primary" data-act="primary">Davom etish</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    // Animate ring
    requestAnimationFrame(() => {
      overlay.classList.add('az-show');
      const ring = overlay.querySelector('circle[stroke-dashoffset]');
      if (ring) ring.style.strokeDashoffset = '0';
      // Confetti
      if (typeof window.Confetti === 'function' || window.AzConfetti) {
        try {
          (window.runConfetti || (() => {}))('big');
        } catch (e) {}
      }
    });
    // Wire buttons
    overlay.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (e.target === overlay || t) closeS();
      if (t && t.dataset.act === 'primary') setTimeout(onPrimary, 150);
      if (t && t.dataset.act === 'secondary') setTimeout(onSecondary, 150);
    });
    document.addEventListener('keydown', escClose, true);
    function escClose(e) {
      if (e.key === 'Escape') { closeS(); document.removeEventListener('keydown', escClose, true); }
    }
    function closeS() {
      overlay.classList.remove('az-show');
      setTimeout(() => overlay.parentNode && overlay.parentNode.removeChild(overlay), reduceMotion ? 0 : 500);
    }
  }

  /* ════════════════════════════════════
     2. SMART TOASTS (streak / ai / gold)
     ════════════════════════════════════ */
  function getToastCol() {
    injectCSS();
    let col = document.querySelector('.az-toast-col');
    if (!col) {
      col = document.createElement('div');
      col.className = 'az-toast-col';
      document.body.appendChild(col);
    }
    return col;
  }

  function showSmartToast(opts = {}) {
    injectCSS();
    const type = opts.type || 'info'; // info | streak | ai | gold
    const icon = opts.icon || (type === 'streak' ? SVG.fire : type === 'ai' ? SVG.brain : type === 'gold' ? SVG.star : SVG.bell);
    const title = opts.title || 'Sarlavha';
    const sub = opts.sub || '';
    const actionText = opts.actionText;
    const actionFn = opts.action;
    const duration = opts.duration || 5200;
    const col = getToastCol();
    const t = document.createElement('div');
    t.className = `az-smart-toast az-${type}`;
    t.innerHTML = `
      <div class="az-st-icon">${icon}</div>
      <div class="az-st-body">
        <div class="az-st-title">${title}</div>
        ${sub ? `<div class="az-st-sub">${sub}</div>` : ''}
      </div>
      ${actionText ? `<button class="az-st-action" role="button">${actionText}</button>` : ''}
    `;
    col.appendChild(t);
    const actBtn = t.querySelector('.az-st-action');
    if (actBtn) {
      actBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { actionFn && actionFn(); } finally { removeToast(); }
      });
    }
    t.addEventListener('click', removeToast);
    requestAnimationFrame(() => t.classList.add('az-visible'));
    let tm = setTimeout(removeToast, duration);
    function removeToast() {
      clearTimeout(tm);
      t.classList.remove('az-visible');
      setTimeout(() => t.parentNode && t.parentNode.removeChild(t), reduceMotion ? 0 : 320);
    }
    return { dismiss: removeToast };
  }

  /* Auto-run smart notifications on dashboard load */
  function autoScheduleSmart() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _schedule, { once: true });
    } else _schedule();
    function _schedule() {
      const isDash = location.pathname.endsWith('dashboard.html') || location.pathname.endsWith('/') || location.pathname === '/' || location.pathname.endsWith('index.html');
      if (!isDash) return;
      const today = new Date().toDateString();
      // 1) Streak reminder — once per day
      const lastStreakNotif = localStorage.getItem('az:lastStreakNotif');
      const lastStudyDay = localStorage.getItem('az:lastStudyDay');
      if (lastStreakNotif !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        setTimeout(() => {
          if (lastStudyDay && lastStudyDay !== yesterday && lastStudyDay !== today) {
            showSmartToast({
              type: 'streak',
              title: 'Streak uzildi! 😢',
              sub: 'Kecha o\'qimadingiz. Bugun boshlashning vaqti keldi!',
              actionText: 'Davom et',
              action: () => { if (window.AzDash && AzDash.continueLastFolder) AzDash.continueLastFolder(); else location.href='study.html'; }
            });
          } else {
            const streakDays = Number(localStorage.getItem('az:streakDays') || 7);
            showSmartToast({
              type: 'streak',
              title: `🔥 ${streakDays} kunlik streak!`,
              sub: 'Ajoyib! O\'zingizni davom ettiring — streakni saqlab qoling.',
              actionText: 'O\'qishni boshlash',
              action: () => { if (window.AzDash && AzDash.continueLastFolder) AzDash.continueLastFolder(); else location.href='study.html'; }
            });
          }
          localStorage.setItem('az:lastStreakNotif', today);
        }, 4200);
      }
      // 2) AI recommendation — preferred study time
      setTimeout(() => {
        const prefTime = localStorage.getItem('az:preferredTime') || '20:00';
        const h = new Date().getHours();
        const prefH = parseInt(prefTime.split(':')[0], 10);
        if (Math.abs(h - prefH) <= 2 && localStorage.getItem('az:lastAiNotif') !== today) {
          showSmartToast({
            type: 'ai',
            title: 'AI taklifi',
            sub: `Siz odatda ${prefTime} da o'qiysiz. Tayyormisiz?`,
            actionText: 'Ha, tayyorman',
            action: () => location.href = 'study.html?ai=coach'
          });
          localStorage.setItem('az:lastAiNotif', today);
        }
      }, 9000);
    }
  }

  /* ════════════════════════════════════
     3. EMPTY STATE HELPER
     ════════════════════════════════════ */
  function makeEmptyState(opts = {}) {
    injectCSS();
    const icon = opts.icon || SVG.folder;
    const title = opts.title || 'Hali hech narsa yo\'q';
    const sub = opts.sub || 'Yangi narsa yaratish yoki o\'rganishni boshlash uchun quyidagi tugmani bosing.';
    const cta = opts.cta;
    const onCta = opts.onClick;
    const wrap = document.createElement('div');
    wrap.className = 'az-empty-state';
    wrap.innerHTML = `
      <div class="az-empty-icn">${icon}</div>
      <h3 class="az-empty-ttl">${title}</h3>
      <p class="az-empty-sub">${sub}</p>
      ${cta ? `<button class="az-empty-cta">${SVG.play}<span>${cta}</span></button>` : ''}
    `;
    if (cta && onCta) {
      wrap.querySelector('.az-empty-cta').addEventListener('click', onCta);
    }
    return wrap;
  }

  /* ════════════════════════════════════
     4. WEEKLY REPORT CARD
     ════════════════════════════════════ */
  function makeWeeklyReportCard(opts = {}) {
    injectCSS();
    const weekDates = [];
    const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      weekDates.push({
        key: days[(d.getDay() + 6) % 7],
        isToday: i === 0
      });
    }
    const wordsLearned = opts.words != null ? opts.words : 183;
    const hours = opts.hours != null ? opts.hours : 9;
    const accuracy = opts.accuracy != null ? opts.accuracy : 92;
    const trendPct = opts.trendPct || 18;
    const trendUp = (opts.trend ?? trendPct) >= 0;
    const bars = opts.bars || [0.5, 0.72, 0.35, 0.9, 0.6, 0.85, 0.42];

    const card = document.createElement('div');
    card.className = 'az-weekly-card';
    card.innerHTML = `
      <div class="az-wk-head">
        <div>
          <span class="az-wk-tag">${SVG.cal} WEEKLY REPORT</span>
          <h3 class="az-wk-title">Bu hafta</h3>
          <p class="az-wk-sub">${days[(new Date().getDay()+6)%7]}dan — ${days[(new Date().getDay()+12)%7]}gacha</p>
        </div>
      </div>
      <div class="az-wk-stats">
        <div class="az-wk-stat"><div class="az-wk-val" data-counter="${wordsLearned}">${wordsLearned}</div><div class="az-wk-lbl">So'z</div></div>
        <div class="az-wk-stat"><div class="az-wk-val" data-counter="${hours}">${hours}</div><div class="az-wk-lbl">Soat</div></div>
        <div class="az-wk-stat"><div class="az-wk-val" data-counter="${accuracy}">${accuracy}<span style="font-size:.65em;margin-left:2px;">%</span></div><div class="az-wk-lbl">Aniqlik</div></div>
      </div>
      <div class="az-wk-bar-trend">
        <div class="az-wk-trend-lbl">
          <span>Haftalik faollik</span>
          <span class="${trendUp ? 'az-up' : 'az-down'}">
            ${trendUp ? '▲' : '▼'} ${Math.abs(trendPct)}% o'zgarish
          </span>
        </div>
        <div class="az-wk-bars">
          ${weekDates.map((d, i) => `<div class="az-wk-bar ${d.isToday ? 'az-today' : ''}" style="--bar:${bars[i]}"></div>`).join('')}
        </div>
        <div class="az-wk-days">${weekDates.map(d => `<div>${d.key}${d.isToday ? '' : ''}</div>`).join('')}</div>
      </div>
    `;
    requestAnimationFrame(() => {
      setTimeout(() => card.classList.add('az-animated'), reduceMotion ? 0 : 120);
    });
    return card;
  }

  /* Inject weekly report into dashboard if the target hook exists */
  function autoInjectWeeklyReport() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _inject, { once: true });
    } else _inject();
    function _inject() {
      const target = document.querySelector('[data-weekly-hook]') || (document.querySelector('.az-analytics-wrap') && document.querySelector('.az-analytics-wrap').parentNode);
      if (!target || document.querySelector('.az-weekly-card')) return;
      const card = makeWeeklyReportCard();
      target.parentNode && target.parentNode.insertBefore(card, target.nextSibling ? target.nextSibling : null);
    }
  }

  /* ──────── AUTO INIT ──────── */
  autoScheduleSmart();
  autoInjectWeeklyReport();

  /* ──────── EXPORT ──────── */
  window.AzEffects = {
    showFolderComplete,
    showSmartToast,
    makeEmptyState,
    makeWeeklyReportCard
  };
})();
