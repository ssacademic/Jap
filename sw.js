/* नाम जप — offline cache.
   Registered automatically when the app is served over http(s).
   Bump CACHE on every release so returning visitors get the new files. */

const CACHE = 'nj-v5.2';
const SHELL = [
  './', './index.html',
  './css/style.css', './js/config.js', './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Audio is large and streamed — never cache it.
  if (/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) return;

  // App shell: cache first, so it opens with no network at all.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Fonts: serve from cache, refresh in the background.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
