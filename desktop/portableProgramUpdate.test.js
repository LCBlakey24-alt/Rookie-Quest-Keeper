'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const {
  parsePortableVersion, newerVersion, portableExePath, sha256File,
  hasPortablePeHeader, inspectPortableUpdate, powerShellHelper, stagePortableUpdate,
  readLastPortableUpdate,
} = require('./portableProgramUpdate');

function makePe(filePath) {
  const descriptor = fs.openSync(filePath, 'w');
  try {
    const header = Buffer.alloc(256);
    header.write('MZ', 0, 'ascii');
    header.writeUInt32LE(128, 0x3c);
    header.write('PE\0\0', 128, 'ascii');
    fs.writeSync(descriptor, header);
    fs.ftruncateSync(descriptor, 11 * 1024 * 1024);
  } finally {
    fs.closeSync(descriptor);
  }
}

test('only accepts Keeper portable file names and newer semver versions', () => {
  assert.equal(parsePortableVersion('Rookie Quest Keeper Portable 0.3.10.exe'), '0.3.10');
  assert.equal(parsePortableVersion('Rookie-Quest-Keeper-Portable-0.3.11-Testing.exe'), '0.3.11');
  assert.equal(parsePortableVersion('other.exe'), null);
  assert.equal(parsePortableVersion('Rookie Quest Keeper Portable 0.3.10.exe.txt'), null);
  assert.equal(newerVersion('0.3.10', '0.3.9'), true);
  assert.equal(newerVersion('0.4.0', '0.3.9'), true);
  assert.equal(newerVersion('0.3.9', '0.3.9'), false);
  assert.equal(newerVersion('0.3.8', '0.3.9'), false);
  assert.equal(newerVersion('0.3.beta', '0.3.9'), false);
});

test('does not guess or escape the portable executable folder', async t => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'rqk-target-'));
  t.after(async () => fsp.rm(tmp, { recursive: true, force: true }));
  const running = path.join(tmp, 'Rookie Quest Keeper Portable 0.3.9.exe');
  await fsp.writeFile(running, 'sample launcher');
  assert.equal(portableExePath(tmp, { PORTABLE_EXECUTABLE_FILE: running }, 'win32'), running);
  assert.equal(portableExePath(tmp, { PORTABLE_EXECUTABLE_FILE: path.join(os.tmpdir(), 'other.exe') }, 'win32'), null);
  assert.equal(portableExePath(tmp, {}, 'win32'), null);
  assert.equal(portableExePath(tmp, { PORTABLE_EXECUTABLE_FILE: running }, 'linux'), null);
});

test('rejects non-PE executables, previous versions and unsupported programs', async t => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'rqk-verify-'));
  t.after(async () => fsp.rm(tmp, { recursive: true, force: true }));
  const candidate = path.join(tmp, 'Rookie Quest Keeper Portable 0.3.10.exe');
  await fsp.writeFile(candidate, 'MZ - not a valid Windows executable');
  await assert.rejects(inspectPortableUpdate(candidate, '0.3.9', path.join(tmp, 'running.exe')), /not a supported/);
  makePe(candidate);
  assert.equal(await hasPortablePeHeader(candidate), true);
  const checked = await inspectPortableUpdate(candidate, '0.3.9', path.join(tmp, 'running.exe'));
  assert.equal(checked.version, '0.3.10');
  assert.match(checked.sha256, /^[a-f0-9]{64}$/);
  await assert.rejects(inspectPortableUpdate(candidate, '0.3.10', path.join(tmp, 'running.exe')), /newer/);
  await assert.rejects(inspectPortableUpdate(candidate, '0.3.9', candidate), /running Keeper/);
});

test('never stages a program whose independently supplied checksum is wrong', async t => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'rqk-staging-'));
  t.after(async () => fsp.rm(tmp, { recursive: true, force: true }));
  const candidate = path.join(tmp, 'Rookie Quest Keeper Portable 0.3.10.exe');
  makePe(candidate);
  const runningExe = path.join(tmp, 'Rookie Quest Keeper Portable 0.3.9.exe');
  await fsp.writeFile(runningExe, 'original program');
  const selection = await inspectPortableUpdate(candidate, '0.3.9', runningExe);
  const userData = path.join(tmp, 'RookieQuestKeeperData');
  await assert.rejects(stagePortableUpdate({
    selection, expectedSha256: 'a'.repeat(64), runningExe, userData, currentVersion: '0.3.9',
  }), /checksum/);
  assert.equal(await fsp.readFile(runningExe, 'utf8'), 'original program');
  const staged = await stagePortableUpdate({
    selection, expectedSha256: selection.sha256, runningExe, userData, currentVersion: '0.3.9',
  });
  assert.equal(await fsp.readFile(runningExe, 'utf8'), 'original program');
  assert.equal(staged.version, '0.3.10');
  assert.ok(fs.existsSync(staged.scriptPath));
  assert.match(await fsp.readFile(staged.scriptPath, 'utf8'), /Get-FileHash/);
  const script = await fsp.readFile(staged.scriptPath, 'utf8');
  const encoded = script.match(/FromBase64String\('([A-Za-z0-9+/=]+)'\)/)?.[1];
  assert.ok(encoded);
  const params = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  assert.equal(params.target, runningExe);
  assert.equal(params.expectedHash, selection.sha256);
  assert.match(params.backup, /previous-programs/);
  assert.ok(params.staged.startsWith(userData));
  assert.equal(await sha256File(params.staged), selection.sha256);
});

test('detached Windows helper includes integrity check, wait and rollback', () => {
  const script = powerShellHelper({
    oldPid: 123, target: 'C:\\Keeper\\Rookie.exe', staged: 'C:\\temp\\new.exe',
    backup: 'C:\\KeeperData\\previous.exe', expectedHash: 'a'.repeat(64),
    expectedVersion: '0.3.10', journal: 'C:\\KeeperData\\last-install.json',
    temporaryTarget: 'C:\\Keeper\\.rqk-new.tmp',
  });
  assert.match(script, /Get-Process -Id/);
  assert.match(script, /Get-FileHash/);
  assert.match(script, /Move-Item -LiteralPath \$p.target/);
  assert.match(script, /Copy-Item -LiteralPath \$p.backup -Destination \$p.target/);
  assert.match(script, /Start-Process -FilePath \$p.target/);
});

test('last-install status remains separate from saved campaign files', async t => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'rqk-journal-'));
  t.after(async () => fsp.rm(tmp, { recursive: true, force: true }));
  assert.equal(readLastPortableUpdate(tmp), null);
  const folder = path.join(tmp, 'program-updates');
  await fsp.mkdir(folder);
  await fsp.writeFile(path.join(folder, 'last-install.json'), JSON.stringify({ state: 'failed', reason: 'OneDrive locked the EXE' }));
  assert.equal(readLastPortableUpdate(tmp).state, 'failed');
  assert.equal(await fsp.readdir(tmp).then(x => x.join(',')), 'program-updates');
});
