/* AzWord · Service Worker
   - HTML sahifalar: avval tarmoq, internet bo'lmasa — keshdan (oflayn rejim)
   - JS/CSS/rasm: keshdan darhol beriladi va fonda yangilanadi
   - Firebase SDK va shriftlar (versiyali URL): kesh birinchi
   - /api/* va Firestore so'rovlari keshlanmaydi
   Yangi versiya chiqarganda VERSION ni oshiring. */
const VERSION = 'azword-v6';
const SHELL = [
  'index.html', 'dashboard.html', 'folders.html', 'folder.html', 'book.html', 'study.html', 'results.html',
  'flashcards.html', 'quick-quiz.html', 'quiz.html', 'review.html', 'vocabulary.html', 'stats.html', 'streak.html',
  'achievements.html', 'leaderboard.html', 'shop.html', 'profile.html', 'settings.html', 'ai.html', '404.html',
  'css/app.css', 'favicon.svg', 'manifest.json', 'icon-192.png',
  'js/firebase.js', 'js/core.js', 'js/ui.js', 'js/data.js', 'js/game.js', 'js/icons.js', 'js/icon-paths.js',
  'js/prefs.js', 'js/fx.js', 'js/widgets.js', 'js/session.js', 'js/ai.js'
];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/|cdnjs\.cloudflare\.com\/)/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || (await cache.match('dashboard.html')) || Response.error();
  }
}
async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}
async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    if (request.mode === 'navigate' || request.destination === 'document') {
      event.respondWith(networkFirst(request));
      return;
    }
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (CDN.test(request.url)) event.respondWith(cacheFirst(request));
});

/* Eslatma bildirishnomasi bosilganda ilovani ochish */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('dashboard.html');
    })
  );
});
