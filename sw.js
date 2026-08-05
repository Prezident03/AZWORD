/* ═══════════════════════════════════════════════════════
   AzWord · Service Worker
   Sayt qobig'ini (HTML/CSS/JS/logo) keshlaydi, shunda internet
   bo'lmasa ham ilova ochiladi. Firestore ma'lumotlari (so'zlar,
   papkalar) esa firebase.js ichidagi persistentLocalCache orqali
   alohida keshlanadi.
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'azword-shell-v1';

const APP_SHELL = [
  'index.html',
  'dashboard.html',
  'folders.html',
  'folder.html',
  'flashcards.html',
  'quiz.html',
  'results.html',
  'vocabulary.html',
  'study.html',
  'stats.html',
  'streak.html',
  'achievements.html',
  'leaderboard.html',
  'shop.html',
  'profile.html',
  'settings.html',
  'ai.html',
  'book.html',
  'upload.html',
  'style.css',
  'premium-pages.css',
  'brand.js',
  'confetti.js',
  'cursor-glow.js',
  'dash-enhance.js',
  'effects.js',
  'firebase.js',
  'generate-words.js',
  'icons.js',
  'parallax.js',
  'ripple.js',
  'search.js',
  'sidebar.js',
  'sound.js',
  'transition.js',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      /* Ba'zi fayllar topilmasa ham o'rnatish to'xtamasin */
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Faqat GET so'rovlar va o'zimiz bilan bir manbadan (Firestore/Google API'ga tegmaymiz)
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('dashboard.html'));

      // Stale-while-revalidate: kesh bo'lsa darrov qaytar, fonda yangilaydi
      return cached || network;
    })
  );
});
