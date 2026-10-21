'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { beginWorkspaceRestore, readPendingWorkspaceRestore, finishWorkspaceRestore, preserveBrowserOnRecovery } = require('../restoreJournal');

const BACKUP = 'snapshot-1792500000000-deadbeef';
const OTHER_BACKUP = 'snapshot-1792500000001-cafebabe';
const directory = root => path.join(root, 'workspace-restore-journal');
const receiptFile = root => path.join(directory(root), 'intent.json');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-restore-journal-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('restore intent survives a fresh process and contains only recovery references', t => {
  const root = fixture(t);
  assert.equal(readPendingWorkspaceRestore(root), null);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  assert.deepEqual(Object.keys(receipt).sort(), ['created_at', 'id', 'safety_backup_id', 'version']);
  assert.equal(receipt.safety_backup_id, BACKUP);
  assert.match(receipt.id, /^restore-[0-9]{13}-[a-f0-9]{16}$/);
  const output = execFileSync(process.execPath, ['-e',
    'const journal=require(process.argv[1]);process.stdout.write(JSON.stringify(journal.readPendingWorkspaceRestore(process.argv[2])));',
    require.resolve('../restoreJournal'), root], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), receipt);
  assert.deepEqual(fs.readdirSync(directory(root)), ['intent.json']);
});

test('a second restore cannot overwrite the pending safety backup reference', t => {
  const root = fixture(t);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const before = fs.readFileSync(receiptFile(root));
  assert.throws(() => beginWorkspaceRestore(root, OTHER_BACKUP), /already pending/);
  assert.deepEqual(fs.readFileSync(receiptFile(root)), before);
  assert.deepEqual(readPendingWorkspaceRestore(root), receipt);
});

test('invalid backup and completion IDs cannot create or erase recovery state', t => {
  const root = fixture(t);
  assert.throws(() => beginWorkspaceRestore(root, '../private'), /verified before-restore backup/);
  assert.deepEqual(fs.readdirSync(root), []);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const before = fs.readFileSync(receiptFile(root));
  assert.throws(() => finishWorkspaceRestore(root, '../private'), /reference is invalid/);
  assert.throws(() => finishWorkspaceRestore(root, receipt.id.replace(/.$/, receipt.id.endsWith('0') ? '1' : '0')), /does not match/);
  assert.deepEqual(fs.readFileSync(receiptFile(root)), before);
});

test('only matching completion clears the intent and leaves snapshots untouched', t => {
  const root = fixture(t);
  const snapshot = path.join(root, 'workspace-backups', BACKUP, 'workspace.json');
  fs.mkdirSync(path.dirname(snapshot), { recursive: true });
  fs.writeFileSync(snapshot, 'synthetic campaign backup bytes');
  const receipt = beginWorkspaceRestore(root, BACKUP);
  finishWorkspaceRestore(root, receipt.id);
  assert.equal(readPendingWorkspaceRestore(root), null);
  assert.equal(fs.readFileSync(snapshot, 'utf8'), 'synthetic campaign backup bytes');
  assert.equal(beginWorkspaceRestore(root, OTHER_BACKUP).safety_backup_id, OTHER_BACKUP);
});

for (const [label, mutate] of [
  ['malformed JSON', (_receipt, file) => fs.writeFileSync(file, '{bad')],
  ['unsupported version', (receipt, file) => fs.writeFileSync(file, JSON.stringify({ ...receipt, version: 2 }))],
  ['unsafe backup reference', (receipt, file) => fs.writeFileSync(file, JSON.stringify({ ...receipt, safety_backup_id: '../secret' }))],
  ['unexpected fields', (receipt, file) => fs.writeFileSync(file, JSON.stringify({ ...receipt, workspace: 'do not store campaign data' }))],
  ['invalid date', (receipt, file) => fs.writeFileSync(file, JSON.stringify({ ...receipt, created_at: '2026-02-30T00:00:00.000Z' }))],
  ['invalid browser preservation flag', (receipt, file) => fs.writeFileSync(file, JSON.stringify({ ...receipt, preserve_browser: false }))],
  ['oversized receipt', (_receipt, file) => fs.writeFileSync(file, 'x'.repeat(4097))],
]) {
  test(`damaged ${label} fails closed and is not erased`, t => {
    const root = fixture(t);
    const receipt = beginWorkspaceRestore(root, BACKUP);
    mutate(receipt, receiptFile(root));
    const before = fs.readFileSync(receiptFile(root));
    assert.throws(() => readPendingWorkspaceRestore(root), /needs recovery/);
    assert.throws(() => beginWorkspaceRestore(root, OTHER_BACKUP), /needs recovery/);
    assert.throws(() => finishWorkspaceRestore(root, receipt.id), /needs recovery/);
    assert.deepEqual(fs.readFileSync(receiptFile(root)), before);
  });
}

test('an interrupted incomplete intent is retained for review rather than treated as absent', t => {
  const root = fixture(t);
  fs.mkdirSync(directory(root));
  const pending = path.join(directory(root), 'pending.json');
  fs.writeFileSync(pending, 'interrupted write');
  assert.throws(() => readPendingWorkspaceRestore(root), /incomplete, unreadable or damaged/);
  assert.throws(() => beginWorkspaceRestore(root, BACKUP), /needs recovery/);
  assert.equal(fs.readFileSync(pending, 'utf8'), 'interrupted write');
});

for (const operation of ['writeFileSync', 'fsyncSync', 'renameSync']) {
  test(`failed ${operation} never authorizes media activation or removes an existing snapshot`, t => {
    const root = fixture(t);
    const protectedFile = path.join(root, 'existing-campaign.json');
    fs.writeFileSync(protectedFile, 'keep exactly');
    const original = fs[operation];
    fs[operation] = () => { throw Object.assign(new Error('simulated disk failure'), { code: 'ENOSPC' }); };
    try { assert.throws(() => beginWorkspaceRestore(root, BACKUP), /could not be saved/); }
    finally { fs[operation] = original; }
    assert.equal(readPendingWorkspaceRestore(root), null);
    assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'keep exactly');
  });
}

test('failed completion rename retains the pending intent for startup recovery', t => {
  const root = fixture(t);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const original = fs.renameSync;
  fs.renameSync = () => { throw Object.assign(new Error('file locked'), { code: 'EACCES' }); };
  try { assert.throws(() => finishWorkspaceRestore(root, receipt.id), /could not be marked complete/); }
  finally { fs.renameSync = original; }
  assert.deepEqual(readPendingWorkspaceRestore(root), receipt);
});

test('locked completed-record cleanup does not reintroduce a pending transaction', t => {
  const root = fixture(t);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const original = fs.rmSync;
  fs.rmSync = () => { throw Object.assign(new Error('file locked'), { code: 'EACCES' }); };
  try { finishWorkspaceRestore(root, receipt.id); }
  finally { fs.rmSync = original; }
  assert.equal(readPendingWorkspaceRestore(root), null);
  assert.equal(fs.existsSync(path.join(root, `.completed-${receipt.id}`, 'intent.json')), true);
});

test('a linked journal directory is never followed or changed', t => {
  const root = fixture(t);
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-journal-external-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const marker = path.join(external, 'keep.json');
  fs.writeFileSync(marker, 'untouched external file');
  try { fs.symlinkSync(external, directory(root), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('Symlink privileges unavailable.'); return; }
    throw error;
  }
  assert.throws(() => readPendingWorkspaceRestore(root), /not an ordinary directory/);
  assert.throws(() => beginWorkspaceRestore(root, BACKUP), /needs recovery/);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'untouched external file');
});

test('browser preservation survives a fresh process and matching completion', t => {
  const root = fixture(t);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const marked = preserveBrowserOnRecovery(root, receipt.id);
  assert.equal(marked.id, receipt.id);
  assert.equal(marked.safety_backup_id, BACKUP);
  assert.equal(marked.preserve_browser, true);
  const output = execFileSync(process.execPath, ['-e',
    'const journal=require(process.argv[1]);process.stdout.write(JSON.stringify(journal.readPendingWorkspaceRestore(process.argv[2])));',
    require.resolve('../restoreJournal'), root], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), marked);
  assert.deepEqual(preserveBrowserOnRecovery(root, receipt.id), marked, 'marking is idempotent');
  finishWorkspaceRestore(root, receipt.id);
  assert.equal(readPendingWorkspaceRestore(root), null);
});

test('wrong browser preservation references never change the pending intent', t => {
  const root = fixture(t);
  const receipt = beginWorkspaceRestore(root, BACKUP);
  const original = fs.readFileSync(receiptFile(root));
  assert.throws(() => preserveBrowserOnRecovery(root, '../bad'), /reference is invalid/);
  const otherId = receipt.id.replace(/.$/, receipt.id.endsWith('0') ? '1' : '0');
  assert.throws(() => preserveBrowserOnRecovery(root, otherId), /does not match/);
  assert.deepEqual(fs.readFileSync(receiptFile(root)), original);
});

for (const operation of ['writeFileSync', 'fsyncSync', 'renameSync']) {
  test(`failed preservation ${operation} blocks unmarked browser recovery`, t => {
    const root = fixture(t);
    const receipt = beginWorkspaceRestore(root, BACKUP);
    const original = fs[operation];
    fs[operation] = () => { throw Object.assign(new Error('simulated mark failure'), { code: 'ENOSPC' }); };
    try { assert.throws(() => preserveBrowserOnRecovery(root, receipt.id), /Automatic recovery is blocked/); }
    finally { fs[operation] = original; }
    assert.throws(() => readPendingWorkspaceRestore(root), /needs recovery/);
    assert.throws(() => finishWorkspaceRestore(root, receipt.id), /needs recovery/);
    assert.ok(fs.readdirSync(directory(root)).some(name => name === 'blocked-intent.json' || name === 'pending.json'));
  });
}
