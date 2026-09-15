export const STALE_ASSET_RELOAD_KEY = 'rqk.chunk-reload-attempted';

const STALE_ASSET_PATTERN = /Loading (?:CSS )?chunk \d+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i;

export function isStaleAssetError(errorLike) {
  const message = String(errorLike?.message || errorLike?.reason?.message || errorLike?.reason || errorLike || '');
  return STALE_ASSET_PATTERN.test(message);
}

export function isFailedStylesheetAsset(event) {
  const target = event?.target;
  if (!target || String(target.tagName || '').toUpperCase() !== 'LINK') return false;
  const rel = String(target.rel || '').toLowerCase();
  const href = String(target.href || '');
  return rel.includes('stylesheet') && /\/static\/css\/[^?#]+\.css(?:[?#]|$)/i.test(href);
}

function hasReloadAttempt(runtime) {
  try {
    return runtime.sessionStorage?.getItem(STALE_ASSET_RELOAD_KEY) === '1';
  } catch {
    return Boolean(runtime.__rqkStaleAssetReloadAttempted);
  }
}

function markReloadAttempt(runtime) {
  try {
    runtime.sessionStorage?.setItem(STALE_ASSET_RELOAD_KEY, '1');
  } catch {
    runtime.__rqkStaleAssetReloadAttempted = true;
  }
}

export function attemptStaleAssetReload(errorLike, runtime = typeof window === 'undefined' ? null : window) {
  if (!runtime || (!isStaleAssetError(errorLike) && !isFailedStylesheetAsset(errorLike))) return false;
  if (hasReloadAttempt(runtime)) return false;

  markReloadAttempt(runtime);
  runtime.location?.reload?.();
  return true;
}

export function installStaleAssetRecovery(runtime = typeof window === 'undefined' ? null : window) {
  if (!runtime?.addEventListener) return () => {};

  const onError = event => {
    if (isFailedStylesheetAsset(event) || isStaleAssetError(event?.error || event?.message)) {
      attemptStaleAssetReload(event, runtime);
    }
  };
  const onUnhandledRejection = event => {
    attemptStaleAssetReload(event?.reason, runtime);
  };

  // Resource-load errors such as a missing CRA CSS chunk do not bubble, so the
  // error listener must use capture mode.
  runtime.addEventListener('error', onError, true);
  runtime.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    runtime.removeEventListener?.('error', onError, true);
    runtime.removeEventListener?.('unhandledrejection', onUnhandledRejection);
  };
}
