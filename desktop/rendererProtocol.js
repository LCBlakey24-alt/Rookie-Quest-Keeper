'use strict';

const fs = require('fs');
const path = require('path');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

function rendererResponse(root, requestUrl) {
  const url = new URL(requestUrl);
  if (url.protocol !== 'rqk:' || url.hostname !== 'desktop') return new Response('Not found', {status:404});
  let relative;
  try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); }
  catch { return new Response('Invalid path', {status:400}); }
  // Treat URL paths as paths, never drive letters, UNC paths or ADS names.
  if (relative.includes('\\') || relative.includes(':') || relative.includes('\0')
      || relative.split('/').some(part => part === '..')) return new Response('Invalid path', {status:400});
  const base = path.resolve(root);
  const file = path.resolve(base, relative);
  if (file !== base && !file.startsWith(base + path.sep)) return new Response('Not found', {status:404});
  const extension = path.extname(file).toLowerCase();
  let selected = file;
  if (!relative || !extension || (!TYPES[extension] && !fs.existsSync(file) && !relative.startsWith('static/'))) {
    selected = path.join(base,'index.html');
  }
  try {
    if (!fs.statSync(selected).isFile()) return new Response('Not found', {status:404});
    // Node/libuv supports extended Windows paths. Chromium's file URL loader
    // can fail beyond MAX_PATH when releases live deep inside OneDrive.
    // Serve bytes directly, with explicit MIME types, without a file: redirect.
    return new Response(fs.readFileSync(selected), {headers:{
      'Content-Type': TYPES[path.extname(selected).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return new Response('Not found', {status:404});
    throw error;
  }
}

module.exports = {rendererResponse};
