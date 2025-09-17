const CACHE = "tl247-appshell-v1";
const ASSETS = ["/","/index.html","/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); 
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  // Network-first for HTML; cache-first for versioned assets
  if (request.headers.get("accept")?.includes("text/html")) {
    e.respondWith(fetch(request).catch(()=>caches.match("/index.html")));
  } else {
    e.respondWith(
      caches.match(request).then(res => res || fetch(request).then(resp => {
        const copy = resp.clone();
        if (resp.ok && (request.url.includes("/assets/") || request.url.endsWith(".woff2")))
          caches.open(CACHE).then(c => c.put(request, copy)).catch(()=>{});
        return resp;
      }))
    );
  }
});
