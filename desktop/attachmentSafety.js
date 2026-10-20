'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Campaign content is data. OS launchers, shortcuts, scripts and HTML must
// never become a second application-install route via shell.openPath.
const EXTERNAL_MEDIA = new Set([
  '.pdf', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.webm',
]);
const WINDOWS_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

function safePart(part) {
  return Boolean(part && part !== '.' && part !== '..'
    && !/[<>:"\\|?*\x00-\x1f]/.test(part)
    && !/[. ]$/.test(part) && !WINDOWS_DEVICE.test(part));
}

function resolveAttachmentFile(attachmentsRoot, requestUrl) {
  let url;
  let relative;
  try {
    url = new URL(requestUrl);
    relative = decodeURIComponent(url.pathname).replace(/^\//, '');
  } catch { return null; }
  if (url.protocol !== 'rqk-attachment:' || url.username || url.password || url.port
      || url.search || url.hash || !/^[a-zA-Z0-9._-]{1,120}$/.test(url.hostname)
      || !safePart(url.hostname)) return null;
  const parts = relative.split('/');
  if (!parts.every(safePart)) return null;
  const base = path.resolve(attachmentsRoot);
  const pack = path.resolve(base, url.hostname);
  const candidate = path.resolve(pack, ...parts);
  if (!pack.startsWith(base + path.sep) || !candidate.startsWith(pack + path.sep)) return null;

  // A URL must not escape through an existing filesystem link or junction.
  // Every item below the media root must be an ordinary directory/file.
  try {
    const rootInfo = fs.lstatSync(base);
    if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return null;
    let current = base;
    for (const [index, part] of [url.hostname, ...parts].entries()) {
      current = path.join(current, part);
      const info = fs.lstatSync(current);
      if (info.isSymbolicLink()) return null;
      if (index === parts.length ? !info.isFile() : !info.isDirectory()) return null;
    }
    return candidate;
  } catch { return null; }
}

function canOpenAttachmentExternally(file) {
  return typeof file === 'string' && safePart(path.basename(file))
    && EXTERNAL_MEDIA.has(path.extname(file).toLowerCase());
}

module.exports = { resolveAttachmentFile, canOpenAttachmentExternally };
