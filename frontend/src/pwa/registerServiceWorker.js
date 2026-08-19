import { getOfflineMediaCacheName } from '@/offline/offlineMediaCache';

const UPDATE_READY_EVENT = 'rqk:pwa-update-ready';
const OFFLINE_READY_EVENT = 'rqk:pwa-offline-ready';
const INSTALL_AVAILABLE_EVENT = 'rqk:pwa-install-available';

let pendingInstallPrompt = null;
let refreshingForUpdate = false;

function dispatch(name, detail = {}) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

function mediaCacheMessage() {
  return { type: 'SET_MEDIA_CACHE', cacheName: getOfflineMediaCacheName() || '' };
}

function syncMediaCacheScope(registration) {
  const message = mediaCacheMessage();
  try { navigator.serviceWorker?.controller?.postMessage(message); } catch {}
  try { registration?.active?.postMessage(message); } catch {}
  try { registration?.waiting?.postMessage(message); } catch {}
}

export function getPendingInstallPrompt() {
  return pendingInstallPrompt;
}

export async function promptInstall() {
  const prompt = pendingInstallPrompt;
  if (!prompt) return false;
  prompt.prompt();
  const result = await prompt.userChoice.catch(() => null);
  pendingInstallPrompt = null;
  return result?.outcome === 'accepted';
}

export function applyWaitingServiceWorker() {
  navigator.serviceWorker?.getRegistration?.().then(registration => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }).catch(() => {});
}

export function registerPwaServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  const syncCurrentScope = () => {
    navigator.serviceWorker.getRegistration().then(syncMediaCacheScope).catch(() => {});
  };

  // If a prior installation already controls this page, tell it the account
  // media cache immediately. React-rendered campaign images can then resolve
  // offline without waiting for the window load event.
  if (navigator.serviceWorker.controller) syncCurrentScope();

  window.addEventListener('rqk:auth-scope-changed', syncCurrentScope);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstallPrompt = event;
    dispatch(INSTALL_AVAILABLE_EVENT);
  });

  window.addEventListener('appinstalled', () => {
    pendingInstallPrompt = null;
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(registration => {
        syncMediaCacheScope(registration);
        if (registration.waiting && navigator.serviceWorker.controller) {
          dispatch(UPDATE_READY_EVENT, { registration });
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state !== 'installed') return;
            syncMediaCacheScope(registration);
            if (navigator.serviceWorker.controller) {
              dispatch(UPDATE_READY_EVENT, { registration });
            } else {
              dispatch(OFFLINE_READY_EVENT, { registration });
            }
          });
        });
      })
      .catch(() => {
        // PWA support is progressive enhancement. The web app remains usable
        // even if registration is blocked by the browser or environment.
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    syncCurrentScope();
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });
}

export const PWA_EVENTS = {
  UPDATE_READY_EVENT,
  OFFLINE_READY_EVENT,
  INSTALL_AVAILABLE_EVENT,
};
