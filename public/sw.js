const CACHE = 'tl247-appshell-v1';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if ((req.headers.get('accept')||'').includes('text/html')) {
    e.respondWith(fetch(req).catch(()=>caches.match('/index.html')));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => {
      const copy = resp.clone();
      if (resp.ok && (req.url.includes('/assets/') || req.url.endsWith('.woff2'))) {
        caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      }
      return resp;
    })));
  }
});
