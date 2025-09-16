const CACHE='bet-exposure-v7';
const ASSETS=['./','./index.html','./styles.css','./app.js','./parser.js','./normalize.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>self.clients.claim());
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))}});
