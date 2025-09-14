// v1.0 – idempotent SW
const CACHE = 'tl247-cache-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Network-first for navigations & JSON; cache-first for static assets
  const isHTML = req.mode === 'navigate';
  const isJSON = req.headers.get('accept')?.includes('application/json');
  if (isHTML || isJSON) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return r;
    }).catch(() => caches.match(req)));
  } else {
    e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});
