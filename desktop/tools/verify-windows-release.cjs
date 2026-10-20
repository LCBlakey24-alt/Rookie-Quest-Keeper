'use strict';

// This complements Windows Authenticode verification; hashes do not establish
// publisher trust. Only run publication after BOTH verification steps succeed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const YAML = require('yaml');

function localAsset(name) {
  if (typeof name !== 'string') throw new Error('Missing release asset name.');
  let decoded;
  try { decoded = decodeURIComponent(name); } catch { throw new Error('Invalid release asset encoding.'); }
  if (!decoded || decoded === '.' || decoded === '..' || /[\\/:\x00-\x1f]/.test(decoded)) {
    throw new Error('Release assets must be local filenames.');
  }
  return decoded;
}

function verifyWindowsRelease(directory, publisher, version) {
  if (typeof publisher !== 'string' || !publisher.trim()) throw new Error('An approved Windows publisher is required.');
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('A stable release version is required.');
  const readFile = name => {
    const filename = path.join(directory, name);
    if (!fs.lstatSync(filename).isFile()) throw new Error(`Release asset must be a regular file: ${name}`);
    return fs.readFileSync(filename);
  };
  const manifest = YAML.parse(readFile('latest.yml').toString('utf8'), { uniqueKeys: true });
  if (manifest?.version !== version || !Array.isArray(manifest.files) || manifest.files.length !== 1) {
    throw new Error('Update manifest must describe exactly this version and one Windows installer.');
  }
  const entry = manifest.files[0];
  const installer = localAsset(entry.url);
  if (!installer.endsWith('.exe') || /portable/i.test(installer) || localAsset(manifest.path) !== installer) {
    throw new Error('Update manifest must point to the installed edition only.');
  }
  const payload = readFile(installer);
  const sha512 = crypto.createHash('sha512').update(payload).digest('base64');
  if (entry.sha512 !== sha512 || manifest.sha512 !== sha512 || entry.size !== payload.length) {
    throw new Error('Update manifest size or SHA-512 does not match the installer.');
  }
  const updateConfig = YAML.parse(readFile('win-unpacked/resources/app-update.yml').toString('utf8'), { uniqueKeys: true });
  const publishers = Array.isArray(updateConfig?.publisherName) ? updateConfig.publisherName : [updateConfig?.publisherName];
  if (publishers.length !== 1 || publishers[0] !== publisher) throw new Error('Packaged updater does not pin exactly the approved Windows publisher.');
  if (updateConfig.provider !== 'github' || updateConfig.owner !== 'LCBlakey24-alt' || updateConfig.repo !== 'Rookie-Quest-Keeper'
    || (updateConfig.host !== undefined && updateConfig.host !== 'github.com')
    || (updateConfig.protocol !== undefined && updateConfig.protocol !== 'https')
    || updateConfig.private === true || Object.hasOwn(updateConfig, 'token')) {
    throw new Error('Packaged updater must use the official Keeper release feed.');
  }
  const assets = [installer, `${installer}.blockmap`, 'latest.yml'];
  const hashes = Object.fromEntries(assets.map(name => [name, crypto.createHash('sha256').update(readFile(name)).digest('hex')]));
  return { version, publisher, assets, sha256: hashes };
}

if (require.main === module) {
  const directory = path.resolve(process.argv[2] || 'dist');
  const result = verifyWindowsRelease(directory, process.argv[3], require('../package.json').version);
  fs.writeFileSync(path.join(directory, 'release-verification.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  console.log(`Verified ${result.assets.length} release assets for Keeper ${result.version}.`);
}

module.exports = { verifyWindowsRelease };
