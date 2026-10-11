/* AzWord · Service Worker
   - HTML sahifalar: avval tarmoq, internet bo'lmasa — keshdan (oflayn rejim)
   - JS/CSS: avval tarmoq (eski va yangi kod aralashib qolmasin), internet bo'lmasa — keshdan
   - rasm va boshqa statik fayllar: keshdan darhol beriladi va fonda yangilanadi
   - Firebase SDK va shriftlar (versiyali URL): kesh birinchi
   - /api/* va Firestore so'rovlari keshlanmaydi
   Yangi versiya chiqarganda VERSION ni oshiring. */
const VERSION = 'azword-v9';
const SHELL = [
  'index.html', 'dashboard.html', 'folders.html', 'folder.html', 'book.html', 'study.html', 'results.html',
  'flashcards.html', 'quick-quiz.html', 'dictation.html', 'quiz.html', 'review.html', 'vocabulary.html', 'stats.html', 'streak.html',
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter((k) => k !== VERSION && !k.startsWith('az-tts'));
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    /* Eski versiya (azword-shell-*) keshidan ochilgan sahifalarni yangi kod bilan qayta yuklash */
    if (old.some((k) => k.startsWith('azword-shell'))) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((c) => c.navigate(c.url).catch(() => {}));
    }
  })());
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
/* JS/CSS: tarmoqdan (4 soniya kutiladi), bo'lmasa — keshdan */
async function networkFirstAsset(request) {
  const cache = await caches.open(VERSION);
  const net = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
  try {
    const res = await Promise.race([net, timeout]);
    if (res) return res;
    const cached = await cache.match(request);
    return cached || (await net);
  } catch (e) {
    const cached = await cache.match(request);
    return cached || Response.error();
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
    if (/\.(js|mjs|css)$/.test(url.pathname)) { event.respondWith(networkFirstAsset(request)); return; }
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
