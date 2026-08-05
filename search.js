/* ═══════════════════════════════════════════════

   AzWord · GLOBAL SEARCH · Command Palette
   Ctrl/Cmd + K  →  Folders · Words · AI · Profile
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ──────── CSS INJECTION ──────── */
  function injectCSS() {
    if (document.getElementById('az-search-css')) return;
    const s = document.createElement('style');
    s.id = 'az-search-css';
    s.textContent = `
/* ══════════ SEARCH OVERLAY ══════════ */
#az-search-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: rgba(8, 6, 18, 0.55);
  backdrop-filter: blur(8px) saturate(160%);
  -webkit-backdrop-filter: blur(8px) saturate(160%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-normal, 280ms) var(--ease-standard, cubic-bezier(.2,.8,.2,1));
}
#az-search-overlay.az-open {
  opacity: 1;
  pointer-events: auto;
}

#az-search-panel {
  width: 100%;
  max-width: 680px;
  background: var(--bg-card, #1a1625);
  border: 1.5px solid var(--border-light, rgba(124,58,237,0.22));
  border-radius: var(--radius-2xl, 28px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 0 0 1px rgba(255,255,255,0.03),
    0 32px 80px rgba(0, 0, 0, 0.55),
    0 0 120px rgba(124, 58, 237, 0.18);
  overflow: hidden;
  transform-origin: 50% 0;
  transform: translateY(-14px) scale(.97);
  opacity: 0;
  transition: transform var(--dur-normal, 280ms) var(--ease-emphasis, cubic-bezier(.16,1,.3,1)),
              opacity var(--dur-fast, 180ms) var(--ease-standard);
}
#az-search-overlay.az-open #az-search-panel {
  transform: translateY(0) scale(1);
  opacity: 1;
}

/* ──────── SEARCH INPUT ──────── */
#az-search-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border, #2e2845);
  background: linear-gradient(180deg, rgba(124,58,237,0.04), transparent 70%);
}
#az-search-icon {
  color: var(--primary-light, #a78bfa);
  flex-shrink: 0;
  opacity: 0.9;
}
#az-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-main, #fff);
  font-size: 1.02rem;
  font-family: var(--font-body, 'Inter', sans-serif);
  font-weight: 500;
  line-height: 1.4;
  padding: 4px 2px;
  caret-color: var(--primary-light);
}
#az-search-input::placeholder { color: var(--text-dim, #6b7280); }
#az-search-shortcut {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 10px);
  background: var(--bg-deep, #0f0d1a);
  border: 1px solid var(--border, #2e2845);
  color: var(--text-muted, #9ca3af);
  font-size: 0.68rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-weight: 600;
  user-select: none;
  flex-shrink: 0;
}
kbd.az-k {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 18px;
  padding: 0 5px;
  border-radius: 5px;
  background: linear-gradient(180deg, #2a2440, #1a1625);
  border: 1px solid var(--border, #2e2845);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.3);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.68rem;
  color: var(--text-main);
}

/* ──────── SECTION TABS ──────── */
#az-search-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #2e2845);
  overflow-x: auto;
  scrollbar-width: none;
}
#az-search-tabs::-webkit-scrollbar { display: none; }
.az-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted, #9ca3af);
  border-radius: var(--radius-sm, 10px);
  font-family: var(--font-body, 'Inter', sans-serif);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur-fast, 180ms) var(--ease-standard);
}
.az-tab:hover { background: var(--bg-hover, #252033); color: var(--text-main); }
.az-tab.az-active {
  background: rgba(124,58,237,0.14);
  color: var(--primary-light, #a78bfa);
  box-shadow: inset 0 0 0 1px rgba(124,58,237,0.28);
}
.az-tab svg { opacity: 0.85; }
.az-tab .az-count {
  font-size: 0.68rem;
  padding: 1px 7px;
  border-radius: 99px;
  background: rgba(255,255,255,0.05);
  color: var(--text-dim, #6b7280);
  font-weight: 600;
}
.az-tab.az-active .az-count {
  background: rgba(124,58,237,0.25);
  color: var(--primary-light);
}

/* ──────── RESULTS LIST ──────── */
#az-search-list {
  max-height: 52vh;
  min-height: 200px;
  overflow-y: auto;
  padding: 8px;
}
.az-section-label {
  padding: 12px 12px 6px;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--text-dim, #6b7280);
  text-transform: uppercase;
}
.az-item {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md, 14px);
  cursor: pointer;
  position: relative;
  transition: all var(--dur-fast, 180ms) var(--ease-standard);
  margin-bottom: 2px;
}
.az-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(124,58,237,0.11), rgba(236,72,153,0.05));
  opacity: 0;
  transition: opacity var(--dur-fast, 180ms) ease;
  pointer-events: none;
}
.az-item:hover, .az-item.az-focused {
  transform: translateX(2px);
}
.az-item:hover::before, .az-item.az-focused::before { opacity: 1; }
.az-item.az-focused {
  box-shadow: inset 0 0 0 1px rgba(124,58,237,0.3);
}
.az-item-icon {
  width: 38px; height: 38px;
  border-radius: var(--radius-sm, 10px);
  background: var(--bg-deep, #0f0d1a);
  border: 1px solid var(--border, #2e2845);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all var(--dur-fast);
  position: relative;
  z-index: 1;
}
.az-item:hover .az-item-icon, .az-item.az-focused .az-item-icon {
  background: rgba(124,58,237,0.14);
  border-color: rgba(124,58,237,0.35);
  color: var(--primary-light);
  transform: scale(1.06);
}
.az-item-main { position: relative; z-index: 1; min-width: 0; }
.az-item-title {
  font-family: var(--font-display, 'Space Grotesk', sans-serif);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.az-item mark {
  background: linear-gradient(120deg, rgba(124,58,237,0.32), rgba(236,72,153,0.25));
  color: inherit;
  border-radius: 4px;
  padding: 0 2px;
  font-weight: 700;
}
.az-item-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.az-item-meta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-deep, #0f0d1a);
  border: 1px solid var(--border, #2e2845);
  font-size: 0.68rem;
  color: var(--text-dim, #6b7280);
  font-weight: 600;
  opacity: 0;
  transform: translateX(-6px);
  transition: all var(--dur-fast);
}
.az-item:hover .az-item-meta, .az-item.az-focused .az-item-meta {
  opacity: 1;
  transform: translateX(0);
}

/* ──────── EMPTY STATE ──────── */
.az-empty {
  padding: 44px 20px;
  text-align: center;
  color: var(--text-muted, #9ca3af);
}
.az-empty-icon {
  width: 52px; height: 52px;
  margin: 0 auto 14px;
  border-radius: var(--radius-xl);
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(124,58,237,0.14), rgba(236,72,153,0.08));
  color: var(--primary-light);
}
.az-empty-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-main);
  margin-bottom: 4px;
}
.az-empty-hint {
  font-size: 0.8rem;
  color: var(--text-dim, #6b7280);
}

/* ──────── FOOTER HINTS ──────── */
#az-search-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border, #2e2845);
  background: var(--bg-deep, #0f0d1a);
  font-size: 0.68rem;
  color: var(--text-dim, #6b7280);
}
.az-footer-group { display: inline-flex; align-items: center; gap: 12px; }
.az-footer-k { display: inline-flex; align-items: center; gap: 4px; }

/* ──────── QUICK LIST WHILE TYPING (no results) ──────── */
.az-ai-actions .az-item {
  background: linear-gradient(135deg, rgba(59,130,246,0.04), transparent);
}
`;
    document.head.appendChild(s);
  }

  /* ──────── STATIC DATA SOURCES ──────── */
  const QUICK_ACTIONS = [
    { section: 'ai', title: 'So\'zni tarjima qilish', sub: '"translate" + so\'z yozing', action: 'ai_translate', icon: 'translate' },
    { section: 'ai', title: 'Gap tushuntirish', sub: '"explain" + gap yozing', action: 'ai_explain', icon: 'book' },
    { section: 'ai', title: 'Viktorina yaratish', sub: 'Random 10 so\'zli quiz', action: 'ai_quiz', icon: 'brain' },
    { section: 'ai', title: 'Kunlik gaplar', sub: '"daily" — 5 ta gap', action: 'ai_daily', icon: 'cal' },
    { section: 'ai', title: 'Speaking practice', sub: 'AI bilan gaplashish', action: 'ai_speak', icon: 'mic' }
  ];

  const PROFILE_ITEMS = [
    { section: 'profile', title: 'Profil', sub: 'Shaxsiy ma\'lumotlar', url: 'profile.html', icon: 'user' },
    { section: 'profile', title: 'Statistika', sub: 'Barcha raqamlar', url: 'stats.html', icon: 'chart' },
    { section: 'profile', title: 'Streak kalendar', sub: 'Kunlik muvofaqqiyat', url: 'streak.html', icon: 'fire' },
    { section: 'profile', title: 'Yutuqlar', sub: 'Barcha achievements', url: 'achievements.html', icon: 'trophy' },
    { section: 'profile', title: 'Liderlar jadvali', sub: 'Top o\'quvchilar', url: 'leaderboard.html', icon: 'rank' },
    { section: 'profile', title: 'Do\'kon', sub: 'Skinlar va narsalar', url: 'shop.html', icon: 'shop' },
    { section: 'profile', title: 'Administrator', sub: 'Faqat adminlar uchun', url: 'admin.html', icon: 'shield' }
  ];

  const ICONS = {
    folder:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    word:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    user:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    chart:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    fire:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    trophy:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    rank:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>',
    shop:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    shield:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    brain:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>',
    translate: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    book:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    cal:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    mic:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>'
  };

  /* ──────── COLLECT LIVE DATA ──────── */
  function collectFolders() {
    try {
      const raw = localStorage.getItem('az:folders') || JSON.stringify([
        { id: 'ielts', name: 'IELTS Vocabulary', meta: '120 so\'z', progress: 83 },
        { id: 'basic', name: 'Basic English', meta: '60 so\'z', progress: 100 },
        { id: 'phrasal', name: 'Phrasal Verbs', meta: '80 so\'z', progress: 45 }
      ]);
      const arr = JSON.parse(raw);
      return arr.map(f => ({
        section: 'folder',
        title: f.name || f.title,
        sub: (f.wordCount || f.meta || '') + (f.progress ? ` · ${f.progress}%` : ''),
        url: 'folder.html#' + (f.id || f.name),
        icon: 'folder',
        data: f
      }));
    } catch (e) {
      return [];
    }
  }

  function collectWords() {
    try {
      const raw = localStorage.getItem('az:recentWords') || JSON.stringify([
        { w: 'ubiquitous', u: 'har tomonda mavjud' },
        { w: 'pragmatic',  u: 'amaliy, realistik' },
        { w: 'meticulous',  u: 'ehtiyotkor, toza' },
        { w: 'diligent',    u: 'mehnatparvar' },
        { w: 'resilient',   u: 'moslashuvchan' }
      ]);
      const arr = JSON.parse(raw);
      return arr.slice(0, 30).map(w => ({
        section: 'word',
        title: w.w || w.word,
        sub: w.u || w.uz || '',
        url: 'study.html?word=' + encodeURIComponent(w.w || w.word),
        icon: 'word',
        data: w
      }));
    } catch (e) { return []; }
  }

  /* ──────── STATE ──────── */
  const state = {
    open: false,
    tab: 'all', // all | folder | word | ai | profile
    query: '',
    items: [],
    filtered: [],
    focusIdx: -1
  };

  let panel, input, list, overlay, tabsEl;

  /* ──────── FILTER + HIGHLIGHT ──────── */
  function highlight(text, q) {
    if (!q) return text;
    const idx = String(text).toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      text.slice(0, idx) +
      '<mark>' + text.slice(idx, idx + q.length) + '</mark>' +
      text.slice(idx + q.length)
    );
  }

  function filterItems() {
    const q = state.query.trim().toLowerCase();
    let pool = state.items.slice();
    if (state.tab !== 'all') pool = pool.filter(i => i.section === state.tab);
    if (!q) {
      state.filtered = pool.slice(0, 20);
      return;
    }
    const specialAI = q.startsWith('ai:') || q.startsWith('?');
    if (specialAI) {
      state.filtered = QUICK_ACTIONS.slice().map(a => ({...a}));
      return;
    }
    state.filtered = pool.filter(i => {
      return (
        String(i.title).toLowerCase().includes(q) ||
        String(i.sub || '').toLowerCase().includes(q)
      );
    }).slice(0, 30);
  }

  /* ──────── RENDERING ──────── */
  const SECTION_META = {
    all:     { label: 'Hammasi',  icon: ICONS.chart, order: 0 },
    folder:  { label: 'Bo\'limlar', icon: ICONS.folder, order: 1 },
    word:    { label: 'So\'zlar',   icon: ICONS.word,   order: 2 },
    ai:      { label: 'AI',         icon: ICONS.brain,  order: 3 },
    profile: { label: 'Sahifalar',  icon: ICONS.user,   order: 4 }
  };

  function renderTabs() {
    const counts = { all: state.items.length };
    state.items.forEach(i => { counts[i.section] = (counts[i.section] || 0) + 1; });
    tabsEl.innerHTML = Object.keys(SECTION_META).map(key => {
      const m = SECTION_META[key];
      const count = counts[key] || 0;
      const active = state.tab === key ? 'az-active' : '';
      return `<button class="az-tab ${active}" data-tab="${key}" role="tab" aria-selected="${state.tab === key}">
        ${m.icon}<span>${m.label}</span><span class="az-count">${count}</span>
      </button>`;
    }).join('');
    tabsEl.querySelectorAll('.az-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.tab;
        renderTabs();
        renderResults();
        input && input.focus();
      });
    });
  }

  function renderResults() {
    filterItems();
    if (state.filtered.length === 0) {
      list.innerHTML = `
        <div class="az-empty">
          <div class="az-empty-icon">
            ${ICONS.shield || ICONS.brain}
          </div>
          <div class="az-empty-title">Natija topilmadi</div>
          <div class="az-empty-hint">Boshqa so'z yoki bo'lim sinab ko'ring. AI uchun <code style="background:rgba(124,58,237,0.14);padding:1px 6px;border-radius:5px">ai:</code> prefiksidan foydalaning.</div>
        </div>`;
      state.focusIdx = -1;
      return;
    }
    // Group if tab==='all'
    const bySection = {};
    if (state.tab === 'all') {
      state.filtered.forEach(it => {
        bySection[it.section] = bySection[it.section] || [];
        bySection[it.section].push(it);
      });
    }
    let html = '';
    let flat = [];
    const renderItem = (i) => {
      const idx = flat.length;
      flat.push(i);
      const focused = state.focusIdx === idx ? 'az-focused' : '';
      const meta = i.section === 'folder' ? 'Ochish' :
                   i.section === 'word'   ? 'O\'rganish' :
                   i.section === 'ai'     ? 'Start' : 'Go';
      return `<div class="az-item ${focused}" data-idx="${idx}" role="option" tabindex="-1">
        <div class="az-item-icon">${ICONS[i.icon] || ICONS.word}</div>
        <div class="az-item-main">
          <div class="az-item-title">${highlight(i.title, state.query.trim())}</div>
          <div class="az-item-sub">${highlight(i.sub || '', state.query.trim())}</div>
        </div>
        <div class="az-item-meta">
          <kbd class="az-k">↵</kbd> ${meta}
        </div>
      </div>`;
    };
    if (state.tab === 'all') {
      Object.keys(bySection).sort((a,b) => (SECTION_META[a].order - SECTION_META[b].order)).forEach(sec => {
        html += `<div class="az-section-label">${SECTION_META[sec].icon} ${SECTION_META[sec].label} · ${bySection[sec].length}</div>`;
        bySection[sec].forEach(i => html += renderItem(i));
      });
    } else {
      state.filtered.forEach(i => html += renderItem(i));
    }
    list.innerHTML = html;
    state._flat = flat;
    // Wire up item clicks
    list.querySelectorAll('.az-item').forEach(n => {
      n.addEventListener('mouseenter', () => {
        const idx = Number(n.dataset.idx);
        if (idx !== state.focusIdx) {
          state.focusIdx = idx;
          list.querySelectorAll('.az-item.az-focused').forEach(x => x.classList.remove('az-focused'));
          n.classList.add('az-focused');
        }
      });
      n.addEventListener('click', () => activate(Number(n.dataset.idx)));
    });
  }

  /* ──────── ACTIVATE SELECTION ──────── */
  function activate(idx) {
    const it = state._flat ? state._flat[idx] : state.filtered[idx];
    if (!it) return;
    window.AzSound && window.AzSound.play('click');
    close();
    // Wait for close animation to finish
    setTimeout(() => {
      if (it.url) {
        window.location.href = it.url;
      } else if (it.action) {
        runAIAction(it.action);
      } else if (typeof it.onSelect === 'function') {
        it.onSelect(it);
      }
    }, reduceMotion ? 0 : 160);
  }

  function runAIAction(action) {
    // Actions that require query => forward to study.html with ?ai_action=
    const base = 'study.html';
    const q = encodeURIComponent(state.query.replace(/^(ai:|\?)\s*/, '').trim());
    const params = [];
    if (action) params.push('ai_action=' + action);
    if (q) params.push('q=' + q);
    window.location.href = base + (params.length ? '?' + params.join('&') : '');
  }

  /* ──────── OPEN / CLOSE ──────── */
  function buildDOM() {
    injectCSS();
    overlay = document.createElement('div');
    overlay.id = 'az-search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Global search');
    overlay.innerHTML = `
      <div id="az-search-panel" role="document">
        <div id="az-search-head">
          <span id="az-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input id="az-search-input" type="text" autocomplete="off" spellcheck="false" placeholder="So'zlar, bo'limlar yoki AI buyruqlarni qidiring…" aria-label="Search"/>
          <span id="az-search-shortcut"><kbd class="az-k">ESC</kbd> yopish</span>
        </div>
        <div id="az-search-tabs" role="tablist"></div>
        <div id="az-search-list"></div>
        <div id="az-search-footer">
          <div class="az-footer-group">
            <span class="az-footer-k"><kbd class="az-k">↑</kbd><kbd class="az-k">↓</kbd> navigatsiya</span>
            <span class="az-footer-k"><kbd class="az-k">↵</kbd> tanlash</span>
          </div>
          <div class="az-footer-group">
            <span>Masalan: <strong style="color:var(--primary-light)">ai:</strong> translate hello</span>
          </div>
          <div class="az-footer-group">
            <span class="az-footer-k"><kbd class="az-k">N</kbd> yangi bo'lim</span>
            <span class="az-footer-k"><kbd class="az-k">S</kbd> study</span>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    panel = overlay.querySelector('#az-search-panel');
    input = overlay.querySelector('#az-search-input');
    list  = overlay.querySelector('#az-search-list');
    tabsEl= overlay.querySelector('#az-search-tabs');

    // Click outside to close
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close();
    });

    // Input events
    input.addEventListener('input', () => {
      state.query = input.value;
      state.focusIdx = 0;
      renderResults();
    });
    input.addEventListener('keydown', handleKeydown, true);
  }

  function handleKeydown(e) {
    const flat = state._flat || state.filtered;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!flat.length) return;
      state.focusIdx = (state.focusIdx + 1) % flat.length;
      syncFocus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!flat.length) return;
      state.focusIdx = state.focusIdx <= 0 ? flat.length - 1 : state.focusIdx - 1;
      syncFocus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.focusIdx === -1 && flat.length) state.focusIdx = 0;
      activate(state.focusIdx);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function syncFocus() {
    const all = list.querySelectorAll('.az-item');
    all.forEach(n => n.classList.remove('az-focused'));
    if (state.focusIdx >= 0 && all[state.focusIdx]) {
      all[state.focusIdx].classList.add('az-focused');
      all[state.focusIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function loadItems() {
    state.items = [].concat(
      collectFolders(),
      collectWords(),
      QUICK_ACTIONS.map(a => ({ ...a })),
      PROFILE_ITEMS.map(p => ({ ...p }))
    );
  }

  function open() {
    if (state.open) return;
    buildDOM();
    loadItems();
    renderTabs();
    state.query = '';
    state.tab = 'all';
    state.focusIdx = 0;
    renderResults();
    document.body.style.overflow = 'hidden';
    overlay.classList.add('az-open');
    state.open = true;
    // Tab transition then focus input
    requestAnimationFrame(() => input && input.focus());
  }

  function close() {
    if (!state.open || !overlay) return;
    overlay.classList.remove('az-open');
    document.body.style.overflow = '';
    state.open = false;
    if (input) input.blur();
    setTimeout(() => {
      if (overlay && overlay.parentNode && !state.open) {
        overlay.parentNode.removeChild(overlay);
        panel = input = list = tabsEl = overlay = null;
      }
    }, reduceMotion ? 0 : 400);
  }

  /* ──────── GLOBAL SHORTCUT: Ctrl/Cmd + K ──────── */
  document.addEventListener('keydown', (e) => {
    const mod = (e.ctrlKey || e.metaKey);
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (state.open) close(); else open();
    } else if (e.key === '/' && state.open !== true) {
      // "/" from nowhere opens the palette too
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      open();
    } else if (!mod && !e.altKey && !state.open) {
      // Harf-shortcutlar: faqat inputga yozilmayotganda va palette yopiq bo'lganda
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'n') {
        // N -> Yangi bo'lim/papka
        e.preventDefault();
        if (typeof window.openModal === 'function' && /dashboard\.html$/.test(location.pathname)) {
          window.openModal();
        } else {
          window.location.href = 'dashboard.html?new=1';
        }
      } else if (key === 's') {
        // S -> Study (so'z o'rganishni boshlash)
        e.preventDefault();
        window.location.href = 'vocabulary.html';
      }
    }
  }, true);

  /* ──────── EXPORT ──────── */
  window.AzSearch = {
    open, close,
    addItem(item) { state.items.push(item); if (state.open) renderTabs() && renderResults(); },
    refresh() { loadItems(); if (state.open) { renderTabs(); renderResults(); } }
  };
})();
