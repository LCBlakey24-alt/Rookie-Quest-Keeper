/* Rookie Quest Keeper PWA service worker.
 *
 * Phase 1 deliberately caches only the application shell and same-origin static
 * assets. API requests are never cached here: campaign data needs a dedicated
 * offline data/sync layer so stale writes can never masquerade as successful
 * server updates.
 */

const SHELL_CACHE = 'rqk-shell-v1';
const STATIC_CACHE = 'rqk-static-v1';
const APP_SHELL = [
  '/',
  '/site.webmanifest',
  '/brand/rqk-logo-mini.svg',
  '/brand/rqk-logo-mini.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('rqk-') && !keep.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function isApiRequest(url) {
  return url.pathname === '/api' || url.pathname.startsWith('/api/');
}

function isStaticRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (['style', 'script', 'font', 'image', 'manifest'].includes(request.destination)) return true;
  return /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|json)$/i.test(url.pathname);
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
    const shell = await caches.match('/');
    if (shell) return shell;
    return new Response(
      '<!doctype html><html><body style="font-family:system-ui;background:#070713;color:#fff;padding:24px"><h1>Rookie Quest Keeper</h1><p>You are offline and the app shell is not cached on this device yet. Reconnect once, open Rookie, then it can launch offline.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
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

  // Never intercept API traffic in the app-shell phase.
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
