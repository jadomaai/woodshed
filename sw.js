// Woodshed service worker — caches the app shell + all tool pages so the app
// works offline once it's been opened at least once. Bump CACHE_NAME whenever
// any precached file changes, so returning visitors pick up the update.
const CACHE_NAME = 'woodshed-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './tools/chord-circle.html',
  './tools/interval-patterns.html',
  './tools/fretwise.html',
  './tools/sight-reading.html',
  './tools/autumn-leaves-shape-to-song.html',
  './tools/autumn-leaves-position-shapes.html',
  './tools/autumn-leaves-position-estring.html',
  './lib/vexflow.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-first for same-origin requests (app shell + tools), so the app is
// fully usable offline after first load. Cross-origin requests (Google Fonts
// etc.) are left to the network as-is — every tool already falls back to a
// system font stack, so a missed font fetch offline just means a plainer look,
// not a broken page.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // Navigating while offline to something not yet cached: fall back to the app shell.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
    })
  );
});
