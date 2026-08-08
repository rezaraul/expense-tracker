const CACHE="expense-v5-shared-1";
const ASSETS=["./","index.html","styles.css","app.js","manifest.json","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).catch(()=>caches.match("index.html"))))});