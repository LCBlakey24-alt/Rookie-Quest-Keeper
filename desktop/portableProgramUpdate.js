'use strict';

// A portable EXE cannot replace itself while running. Keeper verifies and
// stages the new EXE, then a detached Windows helper swaps it after shutdown.
// Campaign data is never a target of the program-file swap.
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const MAX_UPDATE_BYTES = 750 * 1024 * 1024;
const MIN_UPDATE_BYTES = 10 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const VERSION_PATTERN = /^Rookie[- ]Quest[- ]Keeper[- ]Portable[- ](\d+)\.(\d+)\.(\d+)(?:[- _.][a-zA-Z0-9 _.()-]{0,80})?\.exe$/i;

function parsePortableVersion(fileName) {
  const match = String(fileName || '').match(VERSION_PATTERN);
  return match ? [match[1], match[2], match[3]].map(Number).join('.') : null;
}

function parseVersion(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function newerVersion(candidate, current) {
  const next = parseVersion(candidate);
  const existing = parseVersion(current);
  if (!next || !existing) return false;
  for (let part = 0; part < 3; part++) {
    if (next[part] !== existing[part]) return next[part] > existing[part];
  }
  return false;
}

function portableExePath(root, env = process.env, platform = process.platform) {
  if (!root || platform !== 'win32') return null;
  // Supplied by electron-builder's portable wrapper. Never infer the target
  // from a filename or process.execPath (which points at extracted Electron).
  const raw = env.PORTABLE_EXECUTABLE_FILE;
  if (!raw || !path.isAbsolute(raw)) return null;
  const exePath = path.resolve(raw);
  if (path.dirname(exePath).toLowerCase() !== path.resolve(root).toLowerCase()) return null;
  if (path.extname(exePath).toLowerCase() !== '.exe') return null;
  try { if (!fs.lstatSync(exePath).isFile()) return null; }
  catch { return null; }
  return exePath;
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const reader = fs.createReadStream(filePath);
    reader.on('error', reject);
    reader.on('data', chunk => hash.update(chunk));
    reader.on('end', () => resolve(hash.digest('hex')));
  });
}

async function hasPortablePeHeader(filePath) {
  const file = await fsp.open(filePath, 'r');
  try {
    const start = Buffer.alloc(64);
    if ((await file.read(start, 0, 64, 0)).bytesRead !== 64 || start.toString('ascii', 0, 2) !== 'MZ') return false;
    const offset = start.readUInt32LE(0x3c);
    if (offset < 64 || offset > 4096) return false;
    const signature = Buffer.alloc(4);
    return (await file.read(signature, 0, 4, offset)).bytesRead === 4 &&
      signature.equals(Buffer.from([0x50, 0x45, 0, 0]));
  } finally { await file.close(); }
}

async function inspectPortableUpdate(filePath, currentVersion, runningExe) {
  const selected = path.resolve(filePath);
  const version = parsePortableVersion(path.basename(selected));
  if (!version) throw new Error('Choose a Rookie Quest Keeper Portable .exe, not a campaign pack or unrelated program.');
  if (!newerVersion(version, currentVersion)) throw new Error('Choose a program update newer than this Keeper version.');
  if (selected.toLowerCase() === String(runningExe || '').toLowerCase()) {
    throw new Error('Choose a downloaded update, not the currently running Keeper program.');
  }
  const info = await fsp.lstat(selected);
  if (!info.isFile() || info.size < MIN_UPDATE_BYTES || info.size > MAX_UPDATE_BYTES) {
    throw new Error('That file is not a supported Keeper Windows program update.');
  }
  if (!(await hasPortablePeHeader(selected))) throw new Error('That file is not a valid Windows executable.');
  return {
    file_path: selected, file_name: path.basename(selected), version,
    size_bytes: info.size, sha256: await sha256File(selected),
  };
}

function powerShellHelper({ oldPid, target, staged, backup, expectedHash, expectedVersion, journal, temporaryTarget }) {
  // Paths are passed as base64 JSON data, not interpolated PowerShell code.
  const payload = Buffer.from(JSON.stringify({
    oldPid, target, staged, backup, expectedHash, expectedVersion, journal, temporaryTarget,
  }), 'utf8').toString('base64');
  return [
    "$ErrorActionPreference = 'Stop'",
    "$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + payload + "')) | ConvertFrom-Json",
    "$oldMoved = $false",
    "$updated = $false",
    "function Save-Result([string]$state, [string]$reason) {",
    "  $result = @{state=$state; version=$p.expectedVersion; time=[DateTime]::UtcNow.ToString('o'); reason=$reason} | ConvertTo-Json -Compress",
    "  [System.IO.File]::WriteAllText($p.journal, $result, [Text.Encoding]::UTF8)",
    "}",
    "try {",
    "  $gone = $false",
    "  for ($i=0; $i -lt 240; $i++) {",
    "    if (-not (Get-Process -Id $p.oldPid -ErrorAction SilentlyContinue)) { $gone = $true; break }",
    "    Start-Sleep -Milliseconds 500",
    "  }",
    "  if (-not $gone) { throw 'The previous Keeper process did not close in time.' }",
    "  $digest = (Get-FileHash -LiteralPath $p.staged -Algorithm SHA256).Hash.ToLowerInvariant()",
    "  if ($digest -ne $p.expectedHash) { throw 'Staged program checksum changed after verification.' }",
    "  Copy-Item -LiteralPath $p.staged -Destination $p.temporaryTarget -ErrorAction Stop",
    "  $copiedHash = (Get-FileHash -LiteralPath $p.temporaryTarget -Algorithm SHA256).Hash.ToLowerInvariant()",
    "  if ($copiedHash -ne $p.expectedHash) { throw 'Copied program checksum did not match.' }",
    "  $moved = $false",
    "  for ($i=0; $i -lt 120; $i++) {",
    "    try {",
    "      Move-Item -LiteralPath $p.target -Destination $p.backup -ErrorAction Stop",
    "      $moved = $true",
    "      $oldMoved = $true",
    "      break",
    "    } catch { Start-Sleep -Seconds 1 }",
    "  }",
    "  if (-not $moved) { throw 'Windows or OneDrive is still using the current Keeper EXE. No replacement made.' }",
    "  Move-Item -LiteralPath $p.temporaryTarget -Destination $p.target -ErrorAction Stop",
    "  $updated = $true",
    "  Save-Result 'installed' ''",
    "  Start-Process -FilePath $p.target -WorkingDirectory (Split-Path -Parent $p.target)",
    "} catch {",
    "  $message = $_.Exception.Message",
    "  if ($oldMoved -and -not $updated) {",
    "    try {",
    "      if (Test-Path -LiteralPath $p.target) { Remove-Item -LiteralPath $p.target -Force }",
    "      Copy-Item -LiteralPath $p.backup -Destination $p.target -ErrorAction Stop",
    "    } catch { $message += '; automatic rollback failed: ' + $_.Exception.Message }",
    "  }",
    "  try { Save-Result 'failed' $message } catch {}",
    "} finally {",
    "  try { if (Test-Path -LiteralPath $p.temporaryTarget) { Remove-Item -LiteralPath $p.temporaryTarget -Force } } catch {}",
    "  try { if (Test-Path -LiteralPath $p.staged) { Remove-Item -LiteralPath $p.staged -Force } } catch {}",
    "}",
  ].join('\n');
}

async function stagePortableUpdate({ selection, expectedSha256, runningExe, userData, currentVersion }) {
  if (!runningExe) throw new Error('Keeper could not locate its portable Windows EXE. Nothing was changed.');
  const expected = String(expectedSha256 || '').trim().toLowerCase();
  if (!SHA256_PATTERN.test(expected)) {
    throw new Error('Paste the 64-character SHA-256 checksum supplied with the trusted update download.');
  }
  const verified = await inspectPortableUpdate(selection.file_path, currentVersion, runningExe);
  if (expected !== verified.sha256 || selection.sha256 !== verified.sha256 || selection.version !== verified.version) {
    throw new Error('Update verification failed: file and trusted checksum do not match.');
  }
  const updateRoot = path.join(userData, 'program-updates');
  const archiveRoot = path.join(updateRoot, 'previous-programs');
  await fsp.mkdir(archiveRoot, { recursive: true });
  const stamp = Date.now() + '-' + crypto.randomBytes(5).toString('hex');
  const staged = path.join(updateRoot, 'staged-' + stamp + '.exe');
  const backup = path.join(archiveRoot, 'Keeper-before-' + currentVersion + '-' + stamp + '.exe');
  const journal = path.join(updateRoot, 'last-install.json');
  const scriptPath = path.join(updateRoot, 'finish-update-' + stamp + '.ps1');
  const temporaryTarget = path.join(path.dirname(runningExe), '.rqk-program-update-' + stamp + '.tmp');
  try {
    await fsp.copyFile(selection.file_path, staged, fs.constants.COPYFILE_EXCL);
    if ((await sha256File(staged)) !== expected) {
      throw new Error('The staged program does not match the trusted update checksum.');
    }
    await fsp.writeFile(scriptPath, powerShellHelper({
      oldPid: process.pid, target: runningExe, staged, backup, expectedHash: expected,
      expectedVersion: verified.version, journal, temporaryTarget,
    }), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    await fsp.rm(staged, { force: true }).catch(() => {});
    await fsp.rm(scriptPath, { force: true }).catch(() => {});
    throw error;
  }
  return { scriptPath, version: verified.version, sha256: verified.sha256, backup };
}

async function launchPortableUpdate(scriptPath, platform = process.platform) {
  if (platform !== 'win32') throw new Error('The program updater requires Windows.');
  const child = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath,
  ], { detached: true, windowsHide: true, stdio: 'ignore' });
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
  });
  child.unref();
  return true;
}

function readLastPortableUpdate(userData) {
  const filePath = path.join(userData, 'program-updates', 'last-install.json');
  try {
    const entry = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    if (['installed', 'failed'].includes(entry.state)) return entry;
  } catch { /* There may be no previous update. */ }
  return null;
}

module.exports = {
  parsePortableVersion, newerVersion, portableExePath, sha256File, hasPortablePeHeader,
  inspectPortableUpdate, powerShellHelper, stagePortableUpdate, launchPortableUpdate, readLastPortableUpdate,
};
