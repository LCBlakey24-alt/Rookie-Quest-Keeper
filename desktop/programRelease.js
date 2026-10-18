'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readPackage, decodeApp, verifyInstalled } = require('./signedProgramPackage');
const { newerVersion } = require('./portableProgramUpdate');

function atomicJson(file, data) {
  const temp = file + '.' + crypto.randomBytes(8).toString('hex') + '.pending';
  try {
    fs.writeFileSync(temp, JSON.stringify(data), { flag: 'wx' });
    fs.renameSync(temp, file);
  } finally { fs.rmSync(temp, { force: true }); }
}

function releasePaths(userData) {
  const root = path.join(userData, 'program-updates');
  return { root, active: path.join(root, 'active-app.json'), releases: path.join(root, 'releases') };
}

function stageAppPackage(file, keys, compatibility, userData) {
  const update = readPackage(file, keys, compatibility);
  if (update.manifest.kind !== 'app') throw new Error('Expected an application update.');
  const files = decodeApp(update.payload);
  const { releases } = releasePaths(userData);
  fs.mkdirSync(releases, { recursive: true });
  const id = crypto.randomBytes(16).toString('hex');
  const folder = path.join(releases, id);
  fs.mkdirSync(folder);
  try {
    fs.writeFileSync(path.join(folder, 'payload.gz'), update.payload, { flag: 'wx' });
    fs.writeFileSync(path.join(folder, 'envelope.json'), JSON.stringify(update.envelope), { flag: 'wx' });
    for (const f of files) {
      const dest = path.join(folder, ...f.name.split('/'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(f.base64, 'base64'), { flag: 'wx' });
    }
    verifyInstalled(folder, update.envelope, keys);
    return { id, folder, version: update.manifest.version };
  } catch (error) { fs.rmSync(folder, { recursive: true, force: true }); throw error; }
}

function readActive(userData) {
  const { active } = releasePaths(userData);
  try { return JSON.parse(fs.readFileSync(active, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

function activateApp(userData, staged) {
  const { active } = releasePaths(userData);
  const old = readActive(userData);
  if (old && old.state !== 'healthy') throw new Error('Finish or recover the previous update before installing another.');
  atomicJson(active, { id: staged.id, version: staged.version, previous: old?.id || null, state: 'pending' });
}

function selectApp(userData, keys, compatibility) {
  const paths = releasePaths(userData);
  let entry = readActive(userData);
  if (!entry) return null;
  if (!/^[a-f0-9]{32}$/.test(entry.id) || !['pending', 'trying', 'healthy'].includes(entry.state)
      || (entry.previous != null && !/^[a-f0-9]{32}$/.test(entry.previous))) throw new Error('Invalid installed program selection.');
  // An update that never reported a visible, loaded window gets rolled back on
  // the next start. No campaign files or database migrations are reverted here.
  if (entry.state === 'trying') {
    atomicJson(path.join(paths.root, 'last-app-result.json'), { state: 'rolled_back', version: entry.version,
      reason: 'The updated app did not confirm a successful first start. Keeper returned to the previous program.' });
    entry = entry.previous ? { id: entry.previous, state: 'healthy', previous: null } : null;
    if (entry) atomicJson(paths.active, entry);
    else fs.unlinkSync(paths.active);
    if (!entry) return null;
  }
  const folder = path.join(paths.releases, entry.id);
  const envelope = JSON.parse(fs.readFileSync(path.join(folder, 'envelope.json'), 'utf8'));
  const manifest = verifyInstalled(folder, envelope, keys);
  if (compatibility.bootstrapVersion && !newerVersion(manifest.version, compatibility.bootstrapVersion)) return null;
  if (manifest.electron !== compatibility.electron || manifest.platform !== compatibility.platform || manifest.arch !== compatibility.arch) throw new Error('Installed app runtime is incompatible.');
  if (entry.state === 'pending') atomicJson(paths.active, { ...entry, state: 'trying' });
  return { folder, version: manifest.version, markHealthy() {
    const current = readActive(userData);
    if (current?.id === entry.id && current.state === 'trying') atomicJson(paths.active, { ...current, state: 'healthy' });
    try { atomicJson(path.join(paths.root, 'last-app-result.json'), { state: 'installed', version: manifest.version }); } catch { /* Activation is already committed; a status write must not undo it. */ }
  } };
}

function readLastAppResult(userData) {
  try { return JSON.parse(fs.readFileSync(path.join(releasePaths(userData).root, 'last-app-result.json'), 'utf8')); }
  catch { return null; }
}

module.exports = { atomicJson, releasePaths, stageAppPackage, readActive, activateApp, selectApp, readLastAppResult };
