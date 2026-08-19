/* Rookie Quest Keeper PWA service worker.
 *
 * The shell/static cache is global because it contains only public application
 * code. Campaign API data lives in the account-scoped IndexedDB layer. Campaign
 * media uses a separate account-scoped Cache Storage name supplied by the app.
 */

const SHELL_CACHE = 'rqk-shell-v3';
const STATIC_CACHE = 'rqk-static-v3';
const APP_SHELL = [
  '/',
  '/asset-manifest.json',
  '/site.webmanifest',
  '/brand/rqk-logo-mini.svg',
  '/brand/rqk-logo-mini.png',
];
let activeMediaCacheName = '';

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
    await cache.addAll(APP_SHELL).catch(() => undefined);
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
    activeMediaCacheName = /^rqk-media-v\d+-[a-z0-9]+$/i.test(requested) ? requested : '';
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

async function matchActiveMedia(request) {
  if (!activeMediaCacheName) return null;
  try {
    const cache = await caches.open(activeMediaCacheName);
    return await cache.match(request, { ignoreVary: true });
  } catch {
    return null;
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response?.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('/', response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    // A same-origin downloaded PDF/file may be opened as a navigation. Check
    // the active account's media cache before falling back to the React shell.
    const media = await matchActiveMedia(request);
    if (media) return media;
    const shell = await caches.match('/');
    if (shell) return shell;
    return new Response(
      '<!doctype html><html><body style="font-family:system-ui;background:#070713;color:#fff;padding:24px"><h1>Rookie Quest Keeper</h1><p>You are offline and the app shell is not cached on this device yet. Reconnect once, open Rookie, then it can launch offline.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function networkFirstMedia(request) {
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque') && activeMediaCacheName) {
      const cache = await caches.open(activeMediaCacheName);
      cache.put(request, response.clone()).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await matchActiveMedia(request);
    if (cached) return cached;
    // Public shell images such as the Rookie logo may live in the static cache.
    const publicCached = await caches.match(request);
    return publicCached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then(response => {
      if (response?.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => null);
  return cached || update || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API data remains outside the service worker. It is handled by the
  // account-scoped IndexedDB read cache so mutations can never look successful.
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isMediaRequest(request, url)) {
    event.respondWith(networkFirstMedia(request));
    return;
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
