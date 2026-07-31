/* ═══════════════════════════════════════════════════════════
   AzWord — Premium Sidebar (reusable component)
   Har bir sahifaga qo'shiladi: <script type="module" src="sidebar.js"></script>
   Eski navbar'ni avtomatik o'chiradi va premium sidebar'ni inject qiladi.
   ═══════════════════════════════════════════════════════════ */

import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, collection, getDocs, query, where,
  orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const ADMIN_EMAIL = "abdurasul1406z@gmail.com";

/* ─── 1. SIDEBAR HTML TEMPLATE ─── */
function buildSidebarHTML(currentPage) {
  const navItem = (href, svgIcon, label, extra = '') => {
    const active = currentPage === href ? ' active' : '';
    const hidden = extra.includes('style="display:none"') ? ' style="display:none"' : '';
    return `<a class="nav-item${active}" href="${href}"${hidden !== '' ? hidden : ''}>
      ${svgIcon}
      ${label}
      ${extra.replace('style="display:none"', '')}
    </a>`;
  };

  return `
<div class="sidebar-overlay" id="sb-overlay" onclick="window.AzSidebar.close()"></div>

<aside class="sidebar" id="az-sidebar">
  <a class="sidebar-logo" href="dashboard.html">
    <img src="logo.png" alt="AzWord" style="height:28px;width:auto;display:block">
  </a>

  <div class="sidebar-user" onclick="window.location.href='profile.html'">
    <div class="sb-avatar" id="sb-avatar">A</div>
    <div class="sb-user-info">
      <div class="sb-user-name" id="sb-user-name">Yuklanmoqda...</div>
      <div class="sb-user-sub" id="sb-user-email"></div>
    </div>
  </div>

  <nav class="sidebar-nav">
    <div class="nav-label">Asosiy</div>
    <a class="nav-item${currentPage === 'dashboard.html' ? ' active' : ''}" href="dashboard.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      Dashboard
    </a>

    <div class="nav-label">Kashf qilish</div>
    <a class="nav-item${currentPage === 'ai.html' ? ' active' : ''}" href="ai.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      AI Assistant
      <span class="nav-item-badge nav-new-pill">NEW</span>
    </a>
    <a class="nav-item${currentPage === 'vocabulary.html' ? ' active' : ''}" href="vocabulary.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
      Vocabulary
    </a>
    <a class="nav-item${currentPage === 'flashcards.html' ? ' active' : ''}" href="flashcards.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      Flashcards
    </a>
    <a class="nav-item${currentPage === 'stats.html' ? ' active' : ''}" href="stats.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      Statistics
    </a>
    <a class="nav-item${currentPage === 'streak.html' ? ' active' : ''}" href="streak.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
      Streak
    </a>
    <a class="nav-item${currentPage === 'achievements.html' ? ' active' : ''}" href="achievements.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>
      Achievements
    </a>
    <a class="nav-item${currentPage === 'shop.html' ? ' active' : ''}" href="shop.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      Shop
    </a>
    <a class="nav-item${currentPage === 'leaderboard.html' ? ' active' : ''}" href="leaderboard.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
      Leaderboard
    </a>

    <div class="nav-label">Hisob</div>
    <a class="nav-item${currentPage === 'profile.html' ? ' active' : ''}" href="profile.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
      Profile
    </a>
    <a class="nav-item${currentPage === 'settings.html' ? ' active' : ''}" href="settings.html">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      Settings
    </a>
    <button class="nav-item nav-item-logout" id="sb-logout-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Log out
    </button>
    <a class="nav-item nav-item-admin" href="admin.html" id="sb-admin-nav" style="display:none">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      Admin panel
    </a>
  </nav>

  <!-- Level/XP Widget -->
  <div class="sbw-level-widget">
    <div class="sbw-lvl-row">
      <span class="sbw-level-badge" id="sbw-level">LVL 1</span>
      <span class="sbw-xp-text"><strong id="sbw-xp-current">0</strong>/<span id="sbw-xp-total">500</span> XP</span>
    </div>
    <div class="sbw-xp-bar">
      <div class="sbw-xp-fill" id="sbw-xp-fill" style="width:0%"></div>
    </div>
  </div>

  <!-- Week Streak Mini -->
  <div class="sbw-level-widget" style="padding:10px 14px;">
    <div class="sbw-lvl-row" style="margin-bottom:6px">
      <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600">Haftalik streak</span>
      <span style="font-family:'Space Grotesk',sans-serif;font-size:0.82rem;font-weight:700;color:#fb923c" id="sb-streak-num">0</span>
    </div>
    <div class="sb-week-bars" id="sb-week-bars"></div>
  </div>

  <!-- AI Coach Card -->
  <div class="sb-ai-coach-card" onclick="window.location.href='ai.html'">
    <div class="sb-aicc-stars" aria-hidden="true">✦ ✧ ✦</div>
    <div class="sb-aicc-badge-row">
      <div class="sb-aicc-robot" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
          <defs>
            <radialGradient id="aiccRad2" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.9"/>
              <stop offset="60%" stop-color="#7c3aed" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#4c1d95" stop-opacity="0.85"/>
            </radialGradient>
          </defs>
          <rect x="12" y="18" width="40" height="34" rx="12" fill="url(#aiccRad2)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
          <rect x="24" y="12" width="16" height="10" rx="3" fill="#7c3aed" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/>
          <line x1="32" y1="6" x2="32" y2="12" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="4" r="2.5" fill="#fbbf24"/>
          <circle cx="24" cy="34" r="3.2" fill="#60a5fa"/>
          <circle cx="40" cy="34" r="3.2" fill="#60a5fa"/>
          <circle cx="24" cy="34" r="1.4" fill="#fff"/>
          <circle cx="40" cy="34" r="1.4" fill="#fff"/>
          <path d="M24 43 Q32 49 40 43" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <span class="sb-aicc-beta">BETA</span>
    </div>
    <div class="sb-aicc-title">AI Coach</div>
    <p class="sb-aicc-text">Get personalized study plan & smart recommendations.</p>
    <button class="sb-aicc-cta" type="button">
      <span>Try AI Coach</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>

  <!-- Mobile menu button (hidden on desktop) -->
  <button class="mobile-menu-btn" id="sb-mobile-btn" style="display:none">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
  </button>
</aside>
`;
}

/* ─── 2. INJECT SIDEBAR ─── */
function injectSidebar() {
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

  // Remove old navbar if exists
  const oldNavbar = document.querySelector('.navbar');
  if (oldNavbar) oldNavbar.remove();

  // Build and insert sidebar
  const html = buildSidebarHTML(currentPage);
  document.body.insertAdjacentHTML('afterbegin', html);

  // Add body class for margin
  document.body.classList.add('has-premium-sidebar');

  // Wire up logout
  const logoutBtn = document.getElementById('sb-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await signOut(auth); } catch(e) {}
      window.location.href = 'index.html';
    });
  }

  // Mobile menu button
  const mobileBtn = document.getElementById('sb-mobile-btn');
  if (mobileBtn) {
    mobileBtn.style.display = 'none'; // hidden by default, shown via CSS on mobile
  }

  // Mobile sidebar toggle
  const sidebar = document.getElementById('az-sidebar');
  const overlay = document.getElementById('sb-overlay');
  if (sidebar && overlay) {
    // Create mobile menu button and prepend to body
    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'sb-mobile-toggle';
    mobileMenuBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>';
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
    // Insert mobile toggle at the top of main content
    const mainContent = document.querySelector('main') || document.querySelector('.simple-wrap') || document.querySelector('.folder-page') || document.querySelector('.results-wrap');
    if (mainContent) {
      mainContent.style.position = 'relative';
      mainContent.prepend(mobileMenuBtn);
    }
  }
}

/* ─── 3. LOAD USER DATA ─── */
async function loadSidebarUserData(user) {
  if (!user) return;

  const name = user.displayName || user.email.split('@')[0];
  const shortName = name.split(' ')[0] || name;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('sb-user-name', name);
  setText('sb-user-email', user.email);

  // Admin link
  if (user.email === ADMIN_EMAIL) {
    const adminNav = document.getElementById('sb-admin-nav');
    if (adminNav) adminNav.style.display = 'flex';
  }

  // Load user stats from Firestore
  try {
    const ud = await getDoc(doc(db, 'users', user.uid));
    if (ud.exists()) {
      const d = ud.data();
      const stars = d.stars || 0;
      const streak = d.streakDays || 0;

      // Avatar
      const avatarEl = document.getElementById('sb-avatar');
      if (avatarEl) {
        if (d.photoBase64) {
          avatarEl.innerHTML = `<img src="${d.photoBase64}" alt="avatar">`;
        } else {
          avatarEl.textContent = (d.displayName || user.email || 'A').charAt(0).toUpperCase();
        }
      }

      // Level/XP
      const level = Math.floor(stars / 500) + 1;
      const xpCur = stars % 500;
      const xpTot = 500;
      const pct = Math.round((xpCur / xpTot) * 100);
      setText('sbw-level', 'LVL ' + level);
      setText('sbw-xp-current', xpCur);
      setText('sbw-xp-total', xpTot);
      const xpFill = document.getElementById('sbw-xp-fill');
      if (xpFill) setTimeout(() => { xpFill.style.width = pct + '%'; }, 300);

      // Streak
      setText('sb-streak-num', streak);

      // Week bars
      renderSidebarWeekBars(streak);
    }
  } catch(e) { console.error('Sidebar user data error:', e); }
}

/* ─── 4. WEEK BARS (mini) ─── */
function renderSidebarWeekBars(streakDays) {
  const container = document.getElementById('sb-week-bars');
  if (!container) return;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekData = [];
  for (let i = 0; i < 7; i++) {
    let base = 0.2;
    if (i < todayIdx - 1) base = 1;
    else if (i === todayIdx - 1) base = 0.75;
    else if (i === todayIdx) base = 0.45;
    weekData.push(base);
  }
  container.innerHTML = '';
  weekData.forEach((val, i) => {
    let cls = 'az-day-miss';
    if (val >= 0.9) cls = 'az-day-done';
    else if (val > 0.2) cls = 'az-day-part';
    const isToday = i === todayIdx;
    const bar = document.createElement('div');
    bar.className = 'sb-week-bar';
    if (isToday) bar.classList.add('az-day-today');
    else bar.classList.add(cls);
    bar.style.setProperty('--bar', String(Math.max(0.2, val)));
    container.appendChild(bar);
    requestAnimationFrame(() => {
      setTimeout(() => { bar.classList.add('az-animated'); }, i * 60 + 120);
    });
  });
}

/* ─── 5. INIT ─── */
function init() {
  injectSidebar();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    loadSidebarUserData(user);
  });
}

/* ─── 6. EXPORT ─── */
window.AzSidebar = {
  open: () => {
    const sb = document.getElementById('az-sidebar');
    const ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.add('open');
    if (ov) ov.classList.add('open');
  },
  close: () => {
    const sb = document.getElementById('az-sidebar');
    const ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('open');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}