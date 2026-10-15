const CACHE='rqs-shell-v15';
const SHELL=['/','/manifest.webmanifest','/icon.svg','/assets/app.css','/assets/app.js','/assets/viewer.js','/assets/software-viewer.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
