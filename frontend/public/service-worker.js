/* Rookie Quest Keeper PWA service worker.
 *
 * The shell/static cache is global because it contains only public application
 * code. Campaign API data lives in the account-scoped IndexedDB layer. Campaign
 * media uses a separate account-scoped Cache Storage name supplied by the app.
 */

const SHELL_CACHE = 'rqk-shell-v5';
const STATIC_CACHE = 'rqk-static-v5';
const APP_SHELL = [
  '/',
  '/asset-manifest.json',
  '/site.webmanifest',
  '/brand/rookie-quest-keeper-main-logo.svg',
  '/brand/rqk-hex-logo-360.png',
  '/brand/rookie-quest-keeper-app-icon.svg',
  '/icons/keeper-192.png',
  '/icons/keeper-512.png',
  '/icons/keeper-maskable-512.png',
  '/favicon.png',
  '/apple-touch-icon.png',
];
// A worker serves every open tab. Keep each tab's account scope separate so
// a sign-in or sign-out in one tab cannot change another tab's media cache.
const mediaCacheNamesByClient = new Map();

async function precacheCurrentBuild(cache) {
  try {
    const response = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) return;
    const manifest = await response.json();
    const files = Object.values(manifest?.files || {})
      .filter(value => typeof value === 'string' && value.startsWith('/'))
      .filter(value => !value.startsWith('/api/'));
    const unique = [...new Set(files)];
    await Promise.all(unique.map(path => cache.add(path).catch(() => undefined)));
  } catch {
    // The fixed app shell still gives a useful fallback if a host does not
    // expose CRA's asset manifest for some reason.
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // One unavailable icon or other optional asset must not prevent the app
    // shell and remaining assets from being available offline.
    await Promise.all(APP_SHELL.map(path => cache.add(path).catch(() => undefined)));
    await precacheCurrentBuild(cache);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const names = await caches.keys();
    // Never remove rqk-media-* here. Those caches belong to explicit offline
    // campaign packs and are removed by the signed-in account's pack manager.
    await Promise.all(names.filter(name => name.startsWith('rqk-') && !name.startsWith('rqk-media-') && !keep.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'SET_MEDIA_CACHE') {
    const requested = String(event.data.cacheName || '');
    const clientId = event.source?.id;
    if (!clientId) return;
    if (/^rqk-media-v\d+-[a-z0-9]+$/i.test(requested)) {
      mediaCacheNamesByClient.set(clientId, requested);
    } else {
      mediaCacheNamesByClient.delete(clientId);
    }
  }
});

function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

function isMediaRequest(request, url) {
  if (['image', 'audio', 'video'].includes(request.destination)) return true;
  return /\.(?:png|jpe?g|webp|gif|svg|avif|ico|pdf|mp3|wav|ogg|m4a|mp4|webm)(?:$|[?#])/i.test(url.href);
}

function isStaticRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (['style', 'script', 'font', 'manifest'].includes(request.destination)) return true;
  return /\.(?:js|css|woff2?|ttf|json)$/i.test(url.pathname);
}

async function mediaCacheForClient(clientId) {
  const known = mediaCacheNamesByClient.get(clientId);
  if (known || !clientId || !self.clients?.get || typeof MessageChannel === 'undefined') return known || '';
  // Workers may be stopped and restarted while a tab remains open. Ask that
  // tab for its current scope instead of guessing from other cached accounts.
  try {
    const client = await self.clients.get(clientId);
    if (!client) return '';
    return await new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(''); }, 500);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        const name = String(event.data?.cacheName || '');
        resolve(/^rqk-media-v\d+-[a-z0-9]+$/i.test(name) ? name : '');
      };
      client.postMessage({ type: 'GET_MEDIA_CACHE' }, [channel.port2]);
    });
  } catch {
    return '';
  }
}

async function matchActiveMedia(request, cacheName, clientId) {
  cacheName = cacheName || await mediaCacheForClient(clientId);
  if (!cacheName) return null;
  try {
    const cache = await caches.open(cacheName);
    return await cache.match(request, { ignoreVary: true });
  } catch {
    return null;
  }
}

async function networkFirstNavigation(request, cacheName, clientId) {
  try {
    const response = await fetch(request);
    if (response?.ok && response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    // A same-origin downloaded PDF/file may be opened as a navigation. Check
    // the active account's media cache before falling back to the React shell.
    const media = await matchActiveMedia(request, cacheName, clientId);
    if (media) return media;
    const shell = await (await caches.open(SHELL_CACHE)).match('/');
    if (shell) return shell;
    return new Response(
      '<!doctype html><html><body style="font-family:system-ui;background:#070713;color:#fff;padding:24px"><h1>Rookie Quest Keeper</h1><p>You are offline and the app shell is not cached on this device yet. Reconnect once, open Rookie, then it can launch offline.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function networkFirstMedia(request, cacheName, clientId) {
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque') && cacheName) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await matchActiveMedia(request, cacheName, clientId);
    if (cached) return cached;
    // Public shell images such as the Rookie logo may live in the static cache.
    const shellCache = await caches.open(SHELL_CACHE);
    const staticCache = await caches.open(STATIC_CACHE);
    const publicCached = await shellCache.match(request) || await staticCache.match(request);
    return publicCached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const shellCache = await caches.open(SHELL_CACHE);
  // Current runtime requests are written into STATIC_CACHE, while the install
  // step deliberately precaches every hashed build asset into SHELL_CACHE.
  // Check both: an older open tab may still need its previous hashed chunk
  // immediately after a new deployment removes that file from the origin.
  const cached = await cache.match(request) || await shellCache.match(request);
  const update = fetch(request)
    .then(response => {
      if (response?.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const cacheName = mediaCacheNamesByClient.get(event.clientId) || '';

  // API data remains outside the service worker. It is handled by the
  // account-scoped IndexedDB read cache so mutations can never look successful.
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request, cacheName, event.clientId));
    return;
  }

  if (isMediaRequest(request, url)) {
    event.respondWith(networkFirstMedia(request, cacheName, event.clientId));
    return;
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
