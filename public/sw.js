const CACHE='tl247-shell-v2';
const ASSETS=['/','/index.html','/manifest.webmanifest','/styles/brand.css','/scripts/app.js','/assets/brand/OFFICIAL_LOGO.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  if((r.headers.get('accept')||'').includes('text/html')) e.respondWith(fetch(r).catch(()=>caches.match('/index.html')));
  else e.respondWith(caches.match(r).then(m=>m||fetch(r).then(resp=>{
    const cp=resp.clone();
    if(resp.ok&&(r.url.includes('/assets/')||r.url.endsWith('.css')||r.url.endsWith('/scripts/app.js'))) caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});
    return resp;
  })));
});
