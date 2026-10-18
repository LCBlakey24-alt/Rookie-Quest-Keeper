'use strict';

// The envelope signs the exact manifest bytes. Keys are shipped in the bootstrap,
// never read from a downloaded package or from writable application data.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { newerVersion } = require('./portableProgramUpdate');
const MAX_PART = 90 * 1024 * 1024;
const MAX_PAYLOAD = 750 * 1024 * 1024;
const MAX_EXPANDED = 512 * 1024 * 1024;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const version = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) && value.split('.').every(n => Number.isSafeInteger(Number(n)));

function regularFile(file, max) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > max) throw new Error('Unsafe or oversized update file.');
  return fs.readFileSync(file);
}

function verifyEnvelope(envelope, keys, compatibility) {
  if (!envelope || typeof envelope.manifest !== 'string' || envelope.manifest.length > 1024 * 1024
      || typeof envelope.signature !== 'string' || !keys[envelope.key_id]) throw new Error('Unknown update publisher.');
  const publicKey = crypto.createPublicKey(keys[envelope.key_id]);
  if (publicKey.asymmetricKeyType !== 'ed25519' || !crypto.verify(null, Buffer.from(envelope.manifest), publicKey, Buffer.from(envelope.signature, 'base64'))) {
    throw new Error('Program update signature is invalid.');
  }
  const m = JSON.parse(envelope.manifest);
  if (m.format !== 'rqk-program-update' || m.schema !== 1 || !['app', 'portable'].includes(m.kind)
      || !version(m.version) || !version(m.bootstrap_min) || m.platform !== 'win32' || m.arch !== 'x64'
      || m.data_schema !== 1 || !Number.isSafeInteger(m.size) || m.size < 1 || m.size > MAX_PAYLOAD
      || !/^[a-f0-9]{64}$/.test(m.sha256) || !Array.isArray(m.parts) || !m.parts.length || m.parts.length > 16) {
    throw new Error('Unsupported program package.');
  }
  if (compatibility) {
    if (!newerVersion(m.version, compatibility.currentVersion)) throw new Error('Choose a newer program version.');
    if (newerVersion(m.bootstrap_min, compatibility.bootstrapVersion)
        || m.platform !== compatibility.platform || m.arch !== compatibility.arch
        || (m.kind === 'app' && m.electron !== compatibility.electron)) throw new Error('This update requires a different bootstrap or Windows runtime.');
  }
  let total = 0;
  const names = new Set();
  for (const p of m.parts) {
    if (!p || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.rqkpart$/.test(p.name)
        || names.has(p.name.toLowerCase()) || !Number.isSafeInteger(p.size) || p.size < 1 || p.size > MAX_PART
        || !/^[a-f0-9]{64}$/.test(p.sha256)) throw new Error('Unsafe program update part.');
    names.add(p.name.toLowerCase()); total += p.size;
  }
  if (total !== m.size) throw new Error('Update part sizes do not match.');
  return m;
}

function readPackage(file, keys, compatibility) {
  const envelope = JSON.parse(regularFile(file, 2 * 1024 * 1024).toString('utf8'));
  const manifest = verifyEnvelope(envelope, keys, compatibility);
  const buffers = manifest.parts.map(p => {
    const bytes = regularFile(path.join(path.dirname(file), p.name), MAX_PART);
    if (bytes.length !== p.size || hash(bytes) !== p.sha256) throw new Error('Update part missing, changed or not fully synced: ' + p.name);
    return bytes;
  });
  const payload = Buffer.concat(buffers);
  if (payload.length !== manifest.size || hash(payload) !== manifest.sha256) throw new Error('Reassembled program failed verification.');
  return { envelope, manifest, payload };
}

function safeAppPath(name) {
  return typeof name === 'string' && name.length < 240
    && /^(?:[A-Za-z0-9_-]+\.js|package\.json|renderer\/[A-Za-z0-9_./@()+ -]+)$/.test(name)
    && !name.split('/').some(p => !p || p === '.' || p === '..' || p.endsWith('.') || p.endsWith(' ') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p));
}

function decodeApp(payload) {
  const data = JSON.parse(zlib.gunzipSync(payload, { maxOutputLength: MAX_EXPANDED }).toString('utf8'));
  if (!data || !Array.isArray(data.files) || data.files.length > 10000) throw new Error('Invalid app bundle.');
  const seen = new Set();
  let total = 0;
  for (const f of data.files) {
    if (!safeAppPath(f.name) || seen.has(f.name.toLowerCase()) || typeof f.base64 !== 'string') throw new Error('Unsafe or duplicate app path.');
    seen.add(f.name.toLowerCase());
    const bytes = Buffer.from(f.base64, 'base64');
    total += bytes.length;
    if (total > MAX_EXPANDED || hash(bytes) !== f.sha256) throw new Error('Invalid app file digest.');
  }
  for (const name of ['main.js', 'preload.js', 'package.json', 'renderer/index.html']) if (!seen.has(name)) throw new Error('App bundle is incomplete.');
  return data.files;
}

function verifyInstalled(folder, envelope, keys) {
  const m = verifyEnvelope(envelope, keys);
  const payload = regularFile(path.join(folder, 'payload.gz'), MAX_PAYLOAD);
  if (m.kind !== 'app' || payload.length !== m.size || hash(payload) !== m.sha256) throw new Error('Installed program signature mismatch.');
  for (const f of decodeApp(payload)) {
    if (hash(regularFile(path.join(folder, ...f.name.split('/')), MAX_EXPANDED)) !== f.sha256) throw new Error('Installed app files changed.');
  }
  return m;
}

module.exports = { MAX_PART, MAX_PAYLOAD, hash, version, regularFile, verifyEnvelope, readPackage, safeAppPath, decodeApp, verifyInstalled };
