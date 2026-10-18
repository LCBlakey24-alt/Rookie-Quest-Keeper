'use strict';

// Usage: node tools/build-program-package.js app|portable input output version bootstrapMin electronVersion
// Signing material is supplied by the release environment, never by a package.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { hash, safeAppPath, MAX_PART, decodeApp } = require('../signedProgramPackage');

function build({ kind, input, output, version, bootstrapMin, electron, privateKey, keyId, partBytes = MAX_PART }) {
  if (!privateKey || !keyId) throw new Error('A protected Ed25519 release signing key is required.');
  if (!Number.isSafeInteger(partBytes) || partBytes < 1 || partBytes > MAX_PART) throw new Error('Invalid part size.');
  let payload;
  if (kind === 'app') {
    const files = [];
    function walk(folder, prefix = '') {
      for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        const name = prefix + item.name;
        if (item.isDirectory() && (name === 'renderer' || name.startsWith('renderer/'))) walk(path.join(folder, item.name), name + '/');
        else if (item.isFile() && safeAppPath(name) && !/\.test\.js$/.test(name)
            && !['bootstrap.js', 'programTrust.json'].includes(name)) {
          let bytes = fs.readFileSync(path.join(folder, item.name));
          if (name === 'package.json') bytes = Buffer.from(JSON.stringify({ ...JSON.parse(bytes), version }));
          files.push({ name, base64: bytes.toString('base64'), sha256: hash(bytes) });
        }
      }
    }
    walk(input);
    payload = zlib.gzipSync(Buffer.from(JSON.stringify({ files })), { level: 9 });
    decodeApp(payload);
  } else if (kind === 'portable') payload = fs.readFileSync(input);
  else throw new Error('Expected app or portable package.');
  fs.mkdirSync(output, { recursive: true });
  const parts = [];
  for (let offset = 0; offset < payload.length; offset += partBytes) {
    const bytes = payload.subarray(offset, offset + partBytes);
    const name = `Keeper-${version}-${parts.length + 1}.rqkpart`;
    fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx' });
    parts.push({ name, size: bytes.length, sha256: hash(bytes) });
  }
  const manifest = JSON.stringify({ format: 'rqk-program-update', schema: 1, kind, version,
    bootstrap_min: bootstrapMin, platform: 'win32', arch: 'x64', data_schema: 1,
    electron, size: payload.length, sha256: hash(payload), parts });
  const envelope = { key_id: keyId, manifest, signature: crypto.sign(null, Buffer.from(manifest), privateKey).toString('base64') };
  fs.writeFileSync(path.join(output, `Keeper-${version}.rqkprogram`), JSON.stringify(envelope), { flag: 'wx' });
  return { bytes: payload.length, parts: parts.length };
}

if (require.main === module) {
  const [kind, input, output, version, bootstrapMin, electron] = process.argv.slice(2);
  console.log(build({ kind, input, output, version, bootstrapMin, electron,
    privateKey: process.env.RQK_PROGRAM_SIGNING_KEY, keyId: process.env.RQK_PROGRAM_KEY_ID }));
}
module.exports = { build };
