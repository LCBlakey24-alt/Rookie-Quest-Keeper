// This is a local sample workspace, never a server authentication bypass.
export const PREVIEW_HOST = 'rookie-quest-keeper-git-rqk-1-0-s-14f145-lewis-blakeys-projects.vercel.app';
export const PREVIEW_USER = 'Preview player';
export const PREVIEW_TOKEN = 'rqk-local-preview-only';
export const PREVIEW_STORAGE_KEY = 'rqk.previewWorkspace.v1';
export const DEMO_SESSION_KEY = 'rqk.readOnlyDemo.v1';
export const DEMO_QUERY_PARAM = 'demo';

function browserRuntime() {
  return typeof window === 'undefined' ? null : window;
}

export function isReadOnlyDemo(runtime = browserRuntime()) {
  try {
    return runtime?.sessionStorage?.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function syncDemoSessionFromLocation(runtime = browserRuntime()) {
  if (!runtime?.location || !runtime?.sessionStorage) return false;

  let url;
  try {
    const fallbackOrigin = runtime.location.origin || 'https://preview.invalid';
    const href = runtime.location.href
      || `${fallbackOrigin}${runtime.location.pathname || '/'}${runtime.location.search || ''}${runtime.location.hash || ''}`;
    url = new URL(href, fallbackOrigin);
  } catch {
    return isReadOnlyDemo(runtime);
  }

  if (url.searchParams.get(DEMO_QUERY_PARAM) !== '1') return isReadOnlyDemo(runtime);

  try {
    runtime.sessionStorage.setItem(DEMO_SESSION_KEY, '1');
  } catch {
    return false;
  }

  // Keep Demo Mode active for this browser tab without leaving a sticky query
  // parameter in copied links or subsequent navigation.
  try {
    url.searchParams.delete(DEMO_QUERY_PARAM);
    runtime.history?.replaceState?.(runtime.history.state ?? null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // The session flag is the source of truth; URL cleanup is best-effort.
  }

  return true;
}

export function isLocalPreview(
  hostname = browserRuntime()?.location?.hostname || '',
  runtime = browserRuntime(),
) {
  return String(hostname || '').toLowerCase() === PREVIEW_HOST || isReadOnlyDemo(runtime);
}

export function exitReadOnlyDemo(runtime = browserRuntime()) {
  if (!runtime) return;
  try { runtime.sessionStorage?.removeItem(DEMO_SESSION_KEY); } catch {}
  // Never let an editable staging-preview workspace bleed into a public demo.
  try { runtime.localStorage?.removeItem(PREVIEW_STORAGE_KEY); } catch {}
  runtime.location?.assign?.('/auth');
}

export function resetPreviewWorkspace(runtime = browserRuntime()) {
  if (!runtime || isReadOnlyDemo(runtime)) return;
  if (!isLocalPreview(runtime.location?.hostname || '', runtime)) return;
  runtime.localStorage?.removeItem(PREVIEW_STORAGE_KEY);
  runtime.location?.assign?.('/home');
}
