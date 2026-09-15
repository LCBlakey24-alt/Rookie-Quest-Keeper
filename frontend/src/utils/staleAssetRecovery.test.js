import {
  STALE_ASSET_RELOAD_KEY,
  attemptStaleAssetReload,
  installStaleAssetRecovery,
  isFailedStylesheetAsset,
  isStaleAssetError,
} from './staleAssetRecovery';

function fakeRuntime() {
  const listeners = new Map();
  const storage = new Map();
  return {
    listeners,
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    location: { reload: jest.fn() },
    addEventListener: jest.fn((name, handler, options) => listeners.set(`${name}:${String(options || '')}`, handler)),
    removeEventListener: jest.fn(),
  };
}

test('recognises stale JavaScript and CSS chunk failures', () => {
  expect(isStaleAssetError(new Error('Loading chunk 42 failed.'))).toBe(true);
  expect(isStaleAssetError(new Error('Loading CSS chunk 7022 failed.'))).toBe(true);
  expect(isStaleAssetError(new Error('ordinary form error'))).toBe(false);
});

test('recognises failed CRA stylesheet resources', () => {
  expect(isFailedStylesheetAsset({
    target: { tagName: 'LINK', rel: 'stylesheet', href: 'https://rookiequestkeeper.com/static/css/7022.old.chunk.css' },
  })).toBe(true);
  expect(isFailedStylesheetAsset({
    target: { tagName: 'IMG', rel: '', href: 'https://rookiequestkeeper.com/static/css/7022.old.chunk.css' },
  })).toBe(false);
});

test('reloads at most once for a stale asset', () => {
  const runtime = fakeRuntime();
  expect(attemptStaleAssetReload(new Error('Loading CSS chunk 7 failed.'), runtime)).toBe(true);
  expect(runtime.location.reload).toHaveBeenCalledTimes(1);
  expect(runtime.sessionStorage.getItem(STALE_ASSET_RELOAD_KEY)).toBe('1');

  expect(attemptStaleAssetReload(new Error('Loading CSS chunk 8 failed.'), runtime)).toBe(false);
  expect(runtime.location.reload).toHaveBeenCalledTimes(1);
});

test('installed listener catches non-bubbling stylesheet failures in capture mode', () => {
  const runtime = fakeRuntime();
  installStaleAssetRecovery(runtime);

  expect(runtime.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);
  const onError = runtime.listeners.get('error:true');
  onError({
    target: { tagName: 'LINK', rel: 'stylesheet', href: 'https://rookiequestkeeper.com/static/css/4916.missing.chunk.css' },
  });

  expect(runtime.location.reload).toHaveBeenCalledTimes(1);
});
