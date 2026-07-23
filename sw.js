// Minimalny service worker — wymagany przez przeglądarki, żeby strona była "instalowalna" jako PWA.
// Nie robimy agresywnego cache'owania, bo dane meczów mają być zawsze aktualne (fetch do /api/state).

const CACHE_NAME = 'turniej-u-siary-v1';
const SHELL_ASSETS = ['/', '/index.html', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
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
  // Nie cache'ujemy wywołań API — zawsze świeże dane z serwera.
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
