'use strict';

// Run on the release owner's Windows account only. The release private key
// stays in a DPAPI-protected file outside GitHub and OneDrive.
// Usage: node tools/publish-signed-program.js VERSION PROTECTED_KEY_FILE
//        "PATH/TO/Updates/Program Updates" [STAGED_DESKTOP_DIRECTORY]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { readPackage, decodeApp, version: validVersion } = require('../signedProgramPackage');
const { newerVersion } = require('../portableProgramUpdate');
const PUBLISHER_KEYS = require('../programTrust.json');

const requiredFiles = [
  'main.js', 'preload.js', 'package.json', 'programTrust.json',
  'signedProgramPackage.js', 'renderer/index.html',
  'tools/sign-local-program.js', 'tools/build-program-package.js',
];

function under(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}

function fileAt(root, relative) {
  return path.join(root, ...relative.split('/'));
}

function fileOrThrow(p) {
  if (!fs.lstatSync(p).isFile() || fs.lstatSync(p).isSymbolicLink()) {
    throw new Error('Expected a regular, non-linked file: ' + p);
  }
}

function validateInputs({ source, protectedKeyFile, updatesFolder, releaseVersion }, keys) {
  if (!validVersion(releaseVersion)) throw new Error('Version must be X.Y.Z (for example, 0.4.4).');
  const src = fs.realpathSync(source);
  const key = fs.realpathSync(protectedKeyFile);
  const dest = fs.realpathSync(updatesFolder);
  if (path.basename(dest).toLowerCase() !== 'program updates'
      || path.basename(path.dirname(dest)).toLowerCase() !== 'updates') {
    throw new Error('Destination must be the existing OneDrive Updates/Program Updates folder.');
  }
  if (!fs.lstatSync(src).isDirectory() || fs.lstatSync(src).isSymbolicLink()
      || !fs.lstatSync(dest).isDirectory() || fs.lstatSync(dest).isSymbolicLink()) {
    throw new Error('Expected normal local directories, not links.');
  }
  fileOrThrow(key);
  if (under(src, key) || under(dest, key) || /(?:^|[\\/])onedrive(?:[\\/]| - )/i.test(key)) {
    throw new Error('Protected signing key must remain outside source, GitHub and OneDrive.');
  }
  if (under(src, dest) || under(dest, src)) {
    throw new Error('Source and OneDrive update destination must be separate.');
  }
  for (const required of requiredFiles) fileOrThrow(fileAt(src, required));
  const localKeys = JSON.parse(fs.readFileSync(fileAt(src, 'programTrust.json'), 'utf8'));
  if (JSON.stringify(localKeys) !== JSON.stringify(keys)) {
    throw new Error('Release tool and staged application do not agree on pinned publisher keys.');
  }
  const keyIds = Object.keys(keys);
  if (keyIds.length !== 1) throw new Error('Expected exactly one pinned release signing key.');
  const p = JSON.parse(fs.readFileSync(fileAt(src, 'package.json'), 'utf8'));
  const bootstrap = p.version;
  const electron = p.devDependencies && p.devDependencies.electron;
  if (!validVersion(bootstrap) || !validVersion(electron)
      || !newerVersion(releaseVersion, bootstrap)) {
    throw new Error('Release version, bootstrap version or Electron version is unsupported.');
  }
  const final = path.join(dest, 'Keeper-' + releaseVersion);
  const descriptor = 'Keeper-' + releaseVersion + '.rqkprogram';
  // Existing OneDrive releases may use descriptive folder names rather than Keeper-X.Y.Z.
  // Never create a second package for an already staged version.
  for (const entry of fs.readdirSync(dest, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase() === descriptor.toLowerCase()) {
      throw new Error('A package for this version is already present in OneDrive; refusing a duplicate.');
    }
    if (entry.isDirectory() && fs.existsSync(path.join(dest, entry.name, descriptor))) {
      throw new Error('A package for this version is already present in OneDrive; refusing a duplicate.');
    }
  }
  if (fs.existsSync(final)) throw new Error('An update folder with this version already exists; nothing will be overwritten.');
  return { src, key, dest, final, bootstrap, electron, keyId: keyIds[0] };
}

function defaultSigner(options) {
  if (process.platform !== 'win32') throw new Error('Publisher signing must run on the Windows release-owner account.');
  const args = [path.join(__dirname, 'sign-local-program.js'), options.key, options.keyId];
  if (options.mode === 'check') args.push('check');
  else args.push('app', options.src, options.output, options.version, options.bootstrap, options.electron);
  execFileSync(process.execPath, args, { stdio: 'inherit', windowsHide: true, timeout: 180000 });
}

function inspectPackage(folder, v, keys, bootstrap, electron) {
  const descriptor = path.join(folder, 'Keeper-' + v + '.rqkprogram');
  fileOrThrow(descriptor);
  const result = readPackage(descriptor, keys, {
    currentVersion: bootstrap, bootstrapVersion: bootstrap,
    platform: 'win32', arch: 'x64', electron,
  });
  if (result.manifest.kind !== 'app' || result.manifest.version !== v) {
    throw new Error('Signed package is not the expected application update.');
  }
  decodeApp(result.payload);
  return { descriptor, parts: result.manifest.parts.map(part => part.name) };
}

function publish({ source, protectedKeyFile, updatesFolder, releaseVersion }, { signer = defaultSigner, keys = PUBLISHER_KEYS } = {}) {
  const { src, key, dest, final, bootstrap, electron, keyId } =
    validateInputs({ source, protectedKeyFile, updatesFolder, releaseVersion }, keys);
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-signed-release-'));
  let incoming;
  try {
    // Fail on lost/incorrect DPAPI key BEFORE writing a release.
    signer({ mode: 'check', key, keyId });
    signer({ mode: 'sign', src, key, keyId, output: scratch,
      version: releaseVersion, bootstrap, electron });
    const pkg = inspectPackage(scratch, releaseVersion, keys, bootstrap, electron);
    // A uniquely named incoming folder avoids replacing prior packages.
    // Part files are copied before the signed descriptor.
    incoming = path.join(dest, '.Keeper-' + releaseVersion + '-publishing-' + require('crypto').randomBytes(6).toString('hex'));
    fs.mkdirSync(incoming);
    for (const name of pkg.parts) fs.copyFileSync(path.join(scratch, name), path.join(incoming, name), fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(pkg.descriptor, path.join(incoming, path.basename(pkg.descriptor)), fs.constants.COPYFILE_EXCL);
    inspectPackage(incoming, releaseVersion, keys, bootstrap, electron);
    if (fs.existsSync(final)) throw new Error('The release destination appeared while publishing; refusing to overwrite it.');
    fs.renameSync(incoming, final);
    incoming = null;
    return final;
  } finally {
    if (incoming && fs.existsSync(incoming)) fs.rmSync(incoming, { recursive: true, force: true });
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const [releaseVersion, protectedKeyFile, updatesFolder, source = path.resolve(__dirname, '..')] = process.argv.slice(2);
  if (!releaseVersion || !protectedKeyFile || !updatesFolder) {
    console.error('Usage: node tools/publish-signed-program.js VERSION PROTECTED_KEY_FILE "PATH_TO_UPDATES/Program Updates" [STAGED_DESKTOP_FOLDER]');
    process.exitCode = 2;
  } else {
    try {
      const installed = publish({ source, protectedKeyFile, updatesFolder, releaseVersion });
      console.log('Signed update published to: ' + installed);
      console.log('Let OneDrive finish syncing every file before installing. In Keeper: Updates & Backups > Install Program Update.');
      console.log('No running EXE or campaign data was modified.');
    } catch (err) {
      console.error('Publication failed safely: ' + err.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { validateInputs, inspectPackage, publish };
