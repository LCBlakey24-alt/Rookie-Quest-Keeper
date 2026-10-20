'use strict';
// Explicit, local-only release signing assistant for the Windows portable 0.4.x series.
// No keys or campaign data are sent to GitHub, OneDrive or a remote signing service.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const { readPackage, decodeApp } = require('../signedProgramPackage');
const trust = require('../programTrust.json');

const KEY_ID = 'fd256e001f6c9086';
const BOOTSTRAP = '0.4.0';
const DEFAULT_ELECTRON = '44.6.0';
const CONFIG_NAME = 'guided-signing-paths.json';
const REQUIRED = ['main.js', 'preload.js', 'package.json', path.join('renderer', 'index.html')];

function isWithin(location, parent) {
  const relative = path.relative(path.resolve(parent).toLowerCase(), path.resolve(location).toLowerCase());
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function plainPath(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function findStageRoot(selected) {
  const root = path.resolve(plainPath(selected));
  const candidates = [root, path.join(root, 'desktop'), path.join(root, 'Keeper-Application-For-Signing'), path.join(root, 'Keeper-Application-For-Signing', 'desktop')];
  const match = candidates.find(dir => REQUIRED.every(f => {
    try { return fs.statSync(path.join(dir, f)).isFile(); } catch { return false; }
  }));
  if (!match) throw new Error('Could not find main.js, preload.js, package.json and renderer/index.html. Extract the GitHub Keeper-Application-For-Signing ZIP first.');
  return match;
}
function detectOneDrive() {
  const roots = [process.env.OneDrive, process.env.OneDriveConsumer, path.join(os.homedir(), 'OneDrive')].filter(Boolean);
  const sub = path.join('Documents', 'DND', '02 Rookie Quest', 'Rookie Quest Keeper', 'Updates', 'Program Updates');
  for (const root of roots) {
    const result = path.join(root, sub);
    try { if (fs.statSync(result).isDirectory()) return result; } catch {}
  }
  return '';
}
function localConfigPath() {
  const local = process.env.LOCALAPPDATA;
  if (!local) return null;
  return path.join(local, 'RookieQuestKeeper', CONFIG_NAME);
}
function readConfig(file) {
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { keyFile: typeof d.keyFile === 'string' ? d.keyFile : '', outputRoot: typeof d.outputRoot === 'string' ? d.outputRoot : '' };
  } catch { return { keyFile: '', outputRoot: '' }; }
}
function validateProtectedKey(keyPath, repositoryRoot, destination) {
  const resolved = fs.realpathSync(keyPath);
  if (!fs.statSync(resolved).isFile()) throw new Error('Signing key must be a protected file.');
  const oneDriveRoots = [process.env.OneDrive, process.env.OneDriveConsumer].filter(Boolean);
  if (isWithin(resolved, repositoryRoot) || isWithin(resolved, destination) || oneDriveRoots.some(root => isWithin(resolved, root))) {
    throw new Error('The protected signing key must be outside Git, the output folder and OneDrive.');
  }
  return resolved;
}
function getSha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function runSigner(args, cwd) {
  const child = spawnSync(process.execPath, [path.join(__dirname, 'sign-local-program.js'), ...args], { cwd, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 });
  if (child.error || child.status !== 0) throw new Error('Local signing failed: ' + (child.stderr || child.error?.message || child.stdout || 'unknown error').trim());
  return child.stdout.trim();
}
async function askRequired(reader, message, prior = '') {
  const answer = plainPath(await reader.question(message + (prior ? ` [Enter to use ${prior}]` : '') + ': '));
  if (!answer && prior) return prior;
  if (!answer) throw new Error('A location is required. No files changed.');
  return answer;
}
async function main() {
  if (process.platform !== 'win32') throw new Error('Use this helper on the Windows laptop that owns the original protected signing key.');
  if (!trust[KEY_ID]) throw new Error('Pinned bootstrap signing key is missing.');
  const repoRoot = path.resolve(__dirname, '..', '..');
  const configFile = localConfigPath();
  const config = configFile ? readConfig(configFile) : { keyFile: '', outputRoot: '' };
  const reader = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log('\nROOKIE QUEST KEEPER - LOCAL UPDATE SIGNING (0.4.x)');
    console.log('Use only a reviewed, successful GitHub Actions Keeper-Application-For-Signing artifact.');
    console.log('The key stays encrypted on this Windows account. Your campaign data is not touched.\n');
    const stageSelection = await askRequired(reader, 'Path to extracted Keeper-Application-For-Signing folder');
    const stageRoot = findStageRoot(stageSelection);
    const stagePackage = JSON.parse(fs.readFileSync(path.join(stageRoot, 'package.json'), 'utf8'));
    const runtime = stagePackage.devDependencies?.electron || stagePackage.dependencies?.electron;
    if (runtime !== DEFAULT_ELECTRON) throw new Error(`This is an incompatible Electron runtime (${runtime}). Stop and prepare a new trusted bootstrap instead.`);
    const version = (await askRequired(reader, 'New 0.4.x release version (example 0.4.6)')).trim();
    if (!/^0\.4\.(?:[1-9]\d*)$/.test(version)) throw new Error('This helper is only for the existing 0.4.x portable Windows edition, not the separate 0.5.0 installer.');
    const outputRoot = path.resolve(await askRequired(reader, 'OneDrive Program Updates folder', config.outputRoot || detectOneDrive()));
    if (!fs.statSync(outputRoot).isDirectory() || fs.lstatSync(outputRoot).isSymbolicLink()) throw new Error('Choose an existing, normal OneDrive Program Updates folder.');
    const keyInput = await askRequired(reader, 'Existing Windows-protected signing-key FILE (not its contents)', config.keyFile);
    const keyFile = validateProtectedKey(keyInput, repoRoot, outputRoot);
    const outputDir = path.join(outputRoot, `${version} - Signed Program Update`);
    if (fs.existsSync(outputDir)) throw new Error('That version folder already exists. Nothing will be overwritten.');
    if (isWithin(outputDir, stageRoot) || isWithin(stageRoot, outputDir)) throw new Error('Signing output must be separate from staged source files.');
    console.log('\nCHECK BEFORE SIGNING');
    console.log(`Staged files : ${stageRoot}`);
    console.log(`Release      : ${version} (Windows portable 0.4.0 bootstrap; Electron ${DEFAULT_ELECTRON})`);
    console.log(`Save package : ${outputDir}`);
    console.log('No program install or campaign modification will be performed.');
    const confirmation = (await reader.question(`Type SIGN ${version} to approve these exact files: `)).trim();
    if (confirmation !== `SIGN ${version}`) { console.log('Cancelled. Nothing was signed.'); return; }
    // Continuity is checked locally against the bootstrap-pinned public key before writing anything.
    console.log('\nChecking protected signing key...');
    console.log(runSigner([keyFile, KEY_ID, 'check'], repoRoot));
    fs.mkdirSync(outputDir, { recursive: false });
    console.log('Creating signed update...');
    runSigner([keyFile, KEY_ID, 'app', stageRoot, outputDir, version, BOOTSTRAP, DEFAULT_ELECTRON], repoRoot);
    // Re-read every payload part and verify signature AND hashes, not just the descriptor signature.
    const descriptor = path.join(outputDir, `Keeper-${version}.rqkprogram`);
    const verified = readPackage(descriptor, trust);
    if (verified.manifest.kind !== 'app' || verified.manifest.version !== version || verified.manifest.electron !== DEFAULT_ELECTRON) throw new Error('Final update manifest did not match the approved release.');
    const verifiedFiles = decodeApp(verified.payload);
    const report = {
      version, bootstrap_min: BOOTSTRAP, key_id: KEY_ID, verified_at: new Date().toISOString(),
      descriptor_sha256: getSha(descriptor), verified_app_files: verifiedFiles.length,
      parts: verified.manifest.parts.map(part => ({ name: part.name, size: part.size, sha256: part.sha256 })),
      note: 'Publisher signature and payload hashes verified locally; source review, GitHub CI and laptop functional tests remain separate release checks.'
    };
    fs.writeFileSync(path.join(outputDir, 'VERIFICATION.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    fs.writeFileSync(path.join(outputDir, 'READ-ME-FIRST.txt'), `Rookie Quest Keeper ${version} - signed LOCAL program update\r\n\r\nOnly install after the selected source commit has green CI and has been reviewed.\r\nMake sure the whole folder is kept on this device in OneDrive.\r\nIn Keeper: Updates & Backups > Program Updates > Select program update file\r\nChoose Keeper-${version}.rqkprogram in THIS folder, then Install Program Update.\r\nKeeper verifies all payload parts and creates a campaign/media snapshot.\r\nDo not select this file in Campaign Content Updates.\r\nKeep the previous working application and backups until tested.\r\n\r\nSee VERIFICATION.json for this package's signed file hashes.\r\n`, { flag: 'wx' });
    if (configFile) {
      fs.mkdirSync(path.dirname(configFile), { recursive: true });
      fs.writeFileSync(configFile, JSON.stringify({ keyFile, outputRoot }, null, 2), { mode: 0o600 });
    }
    console.log(`\nDONE: signed ${version}, checked signature + every payload part.`);
    console.log(`OneDrive output: ${outputDir}`);
    console.log('Next: sync OneDrive; install inside Keeper after reviewing CI.');
  } finally { reader.close(); }
}
if (require.main === module) {
  main().catch(error => { console.error('\nSTOPPED: ' + error.message); console.error('No running Keeper application or campaign data was changed.'); process.exitCode = 1; });
}
module.exports = { isWithin, plainPath, findStageRoot, readConfig, localConfigPath, detectOneDrive };
