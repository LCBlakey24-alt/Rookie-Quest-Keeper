import { getAuthToken } from '@/lib/auth';
import { getOfflineCacheScope } from '@/offline/offlineApiCache';

const MEDIA_CACHE_VERSION = 1;
const MEDIA_FIELD_NAMES = new Set([
  'image_url', 'imageUrl', 'image',
  'attachment_url', 'attachmentUrl',
  'map_url', 'mapUrl',
  'background_url', 'backgroundUrl',
  'background_image', 'backgroundImage',
  'portrait_url', 'portraitUrl', 'portrait',
  'token_url', 'tokenUrl',
  'avatar_url', 'avatarUrl',
  'thumbnail_url', 'thumbnailUrl',
  'audio_url', 'audioUrl',
  'video_url', 'videoUrl',
  'file_url', 'fileUrl',
]);

function scopeHash(scope = '') {
  let hash = 2166136261;
  for (let i = 0; i < scope.length; i += 1) {
    hash ^= scope.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getOfflineMediaCacheName(scope = getOfflineCacheScope()) {
  const value = String(scope || '');
  if (!value || value === 'anonymous' || value === 'unknown') return '';
  return `rqk-media-v${MEDIA_CACHE_VERSION}-${scopeHash(value)}`;
}

function normaliseMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.href;
  } catch {
    return '';
  }
}

function looksLikeMediaUrl(value) {
  const raw = String(value || '').trim();
  return /\.(?:png|jpe?g|webp|gif|svg|avif|ico|pdf|mp3|wav|ogg|m4a|mp4|webm)(?:[?#].*)?$/i.test(raw);
}

export function extractOfflineMediaUrls(...values) {
  const urls = new Set();
  const seen = new Set();

  const visit = (value, fieldName = '', depth = 0) => {
    if (value == null || depth > 12) return;
    if (typeof value === 'string') {
      if (MEDIA_FIELD_NAMES.has(fieldName) || looksLikeMediaUrl(value)) {
        const normalised = normaliseMediaUrl(value);
        if (normalised) urls.add(normalised);
      }
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, fieldName, depth + 1));
      return;
    }
    Object.entries(value).forEach(([key, child]) => visit(child, key, depth + 1));
  };

  values.forEach(value => visit(value));
  return Array.from(urls);
}

function requestForMedia(url) {
  const parsed = new URL(url, window.location.origin);
  const sameOrigin = parsed.origin === window.location.origin;
  const token = sameOrigin ? getAuthToken() : '';
  return new Request(parsed.href, {
    method: 'GET',
    mode: sameOrigin ? 'same-origin' : 'no-cors',
    credentials: sameOrigin ? 'same-origin' : 'omit',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-cache',
  });
}

export async function cacheOfflineMediaUrls(urls = [], options = {}) {
  if (typeof caches === 'undefined') return { saved: [], failed: [] };
  const cacheName = getOfflineMediaCacheName();
  if (!cacheName) return { saved: [], failed: Array.from(new Set(urls.filter(Boolean))) };
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const uniqueUrls = Array.from(new Set(urls.map(normaliseMediaUrl).filter(Boolean)));
  const cache = await caches.open(cacheName);
  const saved = [];
  const failed = [];

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const url = uniqueUrls[index];
    onProgress({ completed: index, total: uniqueUrls.length, label: `Media ${index + 1} of ${uniqueUrls.length}`, url });
    try {
      const request = requestForMedia(url);
      const response = await fetch(request);
      if (!response || (!response.ok && response.type !== 'opaque')) throw new Error(`HTTP ${response?.status || 0}`);
      await cache.put(url, response.clone());
      saved.push(url);
    } catch {
      failed.push(url);
    }
  }

  onProgress({ completed: uniqueUrls.length, total: uniqueUrls.length, label: 'Media complete' });
  return { saved, failed };
}

export async function removeOfflineMediaUrls(urls = [], protectedUrls = []) {
  if (typeof caches === 'undefined') return;
  const cacheName = getOfflineMediaCacheName();
  if (!cacheName) return;
  const cache = await caches.open(cacheName);
  const protectedSet = new Set(protectedUrls.map(normaliseMediaUrl).filter(Boolean));
  const removable = Array.from(new Set(urls.map(normaliseMediaUrl).filter(url => url && !protectedSet.has(url))));
  await Promise.all(removable.map(url => cache.delete(url).catch(() => false)));
}

export async function clearOfflineMediaCache() {
  if (typeof caches === 'undefined') return;
  const cacheName = getOfflineMediaCacheName();
  if (cacheName) await caches.delete(cacheName);
}
