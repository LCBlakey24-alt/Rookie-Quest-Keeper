// This is a local sample workspace, never a server authentication bypass.
export const PREVIEW_HOST = 'rookie-quest-keeper-git-rqk-1-0-s-14f145-lewis-blakeys-projects.vercel.app';
export const PREVIEW_USER = 'Preview player';
export const PREVIEW_TOKEN = 'rqk-local-preview-only';
export const PREVIEW_STORAGE_KEY = 'rqk.previewWorkspace.v1';

export function isLocalPreview(hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return hostname.toLowerCase() === PREVIEW_HOST;
}

export function resetPreviewWorkspace() {
  if (!isLocalPreview()) return;
  localStorage.removeItem(PREVIEW_STORAGE_KEY);
  window.location.assign('/home');
}
