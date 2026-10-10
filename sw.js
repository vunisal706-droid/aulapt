const CACHE='aulapt-v7-b2610102004';
const ASSETS=['./','./index.html','./manifest.json','./LOGO.jpg','./favicon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{})))));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();if(r.ok&&(e.request.url.startsWith(self.location.origin)||e.request.url.includes('fonts.g')))caches.open(CACHE).then(x=>x.put(e.request,c));return r;})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
