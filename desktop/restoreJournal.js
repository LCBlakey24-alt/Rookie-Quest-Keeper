'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const JOURNAL_DIR = 'workspace-restore-journal';
const RECEIPT_FILE = 'intent.json';
const MAX_RECEIPT_BYTES = 4096;
const BACKUP_ID = /^snapshot-[0-9]{13}-[a-f0-9]{8}$/;
const RESTORE_ID = /^restore-[0-9]{13}-[a-f0-9]{16}$/;
const RECEIPT_KEYS = ['created_at', 'id', 'safety_backup_id', 'version'];

function recoveryError(detail, cause) {
  return new Error(`Keeper's pending workspace restore needs recovery. ${detail} Keep the application data folder and backups; do not clear saved data.`, { cause });
}

function validReceipt(receipt) {
  const keys = receipt?.preserve_browser === true
    ? [...RECEIPT_KEYS, 'preserve_browser'].sort()
    : RECEIPT_KEYS;
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)
      || Object.keys(receipt).sort().join('|') !== keys.join('|')
      || receipt.version !== 1 || typeof receipt.id !== 'string' || !RESTORE_ID.test(receipt.id)
      || typeof receipt.safety_backup_id !== 'string' || !BACKUP_ID.test(receipt.safety_backup_id)
      || typeof receipt.created_at !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(receipt.created_at)) return false;
  const time = Date.parse(receipt.created_at);
  return Number.isFinite(time) && new Date(time).toISOString() === receipt.created_at;
}

function journalPath(userData) {
  return path.join(userData, JOURNAL_DIR);
}

function readPendingWorkspaceRestore(userData) {
  const directory = journalPath(userData);
  let info;
  try { info = fs.lstatSync(directory); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw recoveryError('The recovery record could not be inspected.', error);
  }
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw recoveryError('The recovery record is not an ordinary directory.');
  }
  const filename = path.join(directory, RECEIPT_FILE);
  let descriptor;
  try {
    // A crash before the final rename must not be mistaken for an absent
    // record. Media activation is allowed only after begin returns a receipt.
    const entries = fs.readdirSync(directory);
    if (entries.length !== 1 || entries[0] !== RECEIPT_FILE) {
      throw new Error('The restore record is incomplete or has unexpected files.');
    }
    const fileInfo = fs.lstatSync(filename);
    if (!fileInfo.isFile() || fileInfo.isSymbolicLink() || fileInfo.size < 1
        || fileInfo.size > MAX_RECEIPT_BYTES) throw new Error('Invalid restore record file.');
    descriptor = fs.openSync(filename, 'r');
    if (!fs.fstatSync(descriptor).isFile()) throw new Error('Invalid restore record file.');
    // Bound the read as well as the size check, in case another process changes
    // a file between inspection and opening it.
    const bytes = Buffer.alloc(MAX_RECEIPT_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > MAX_RECEIPT_BYTES) throw new Error('Restore record is too large.');
    const receipt = JSON.parse(bytes.subarray(0, length).toString('utf8'));
    if (!validReceipt(receipt)) throw new Error('Unsupported or damaged restore record.');
    return Object.freeze(receipt);
  } catch (error) {
    throw recoveryError('The recovery record is incomplete, unreadable or damaged.', error);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function beginWorkspaceRestore(userData, safetyBackupId) {
  if (typeof safetyBackupId !== 'string' || !BACKUP_ID.test(safetyBackupId)) {
    throw recoveryError('A verified before-restore backup reference is required.');
  }
  fs.mkdirSync(userData, { recursive: true });
  const directory = journalPath(userData);
  try {
    // Exclusive directory creation also prevents two processes from replacing
    // each other's intent. rename(file, destination) alone can overwrite files.
    fs.mkdirSync(directory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      const pending = readPendingWorkspaceRestore(userData);
      throw recoveryError(`Restore ${pending.id} is already pending. Recover it before starting another restore.`);
    }
    throw recoveryError('The recovery record could not be created. No restore was started.', error);
  }
  const receipt = {
    version: 1,
    id: `restore-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`,
    safety_backup_id: safetyBackupId,
    created_at: new Date().toISOString(),
  };
  const pending = path.join(directory, 'pending.json');
  let descriptor;
  try {
    descriptor = fs.openSync(pending, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(receipt)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(pending, path.join(directory, RECEIPT_FILE));
    return Object.freeze(receipt);
  } catch (error) {
    // Remove only our uncommitted file and empty directory. Never recursively
    // delete a committed/unexpected recovery record while handling an error.
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* Preserve the original error. */ }
      descriptor = undefined;
    }
    try { fs.unlinkSync(pending); } catch { /* An incomplete record fails closed. */ }
    try { fs.rmdirSync(directory); } catch { /* Never discard unexpected files. */ }
    throw recoveryError('The recovery record could not be saved. No restore was started.', error);
  }
}

function finishWorkspaceRestore(userData, receiptId) {
  if (typeof receiptId !== 'string' || !RESTORE_ID.test(receiptId)) {
    throw recoveryError('The restore completion reference is invalid.');
  }
  const pending = readPendingWorkspaceRestore(userData);
  if (!pending || pending.id !== receiptId) {
    throw recoveryError('The restore completion reference does not match the pending restore.');
  }
  const directory = journalPath(userData);
  const completed = path.join(userData, `.completed-${pending.id}`);
  try {
    // Completing the directory in one rename avoids a crash window where an
    // empty active journal could be mistaken for a damaged pending restore.
    fs.renameSync(directory, completed);
  } catch (error) {
    throw recoveryError('The recovery record could not be marked complete.', error);
  }
  // This contains only our completed receipt. A locked cleanup file must not
  // invalidate a successfully acknowledged browser save and media activation.
  try { fs.rmSync(completed, { recursive: true, force: true }); } catch { /* Harmless completed receipt. */ }
}

function preserveBrowserOnRecovery(userData, receiptId) {
  if (typeof receiptId !== 'string' || !RESTORE_ID.test(receiptId)) {
    throw recoveryError('The restore recovery reference is invalid.');
  }
  const previous = readPendingWorkspaceRestore(userData);
  if (!previous || previous.id !== receiptId) {
    throw recoveryError('The recovery reference does not match the pending restore.');
  }
  if (previous.preserve_browser === true) return previous;
  const receipt = { ...previous, preserve_browser: true };
  const directory = journalPath(userData);
  const intent = path.join(directory, RECEIPT_FILE);
  const blocked = path.join(directory, 'blocked-intent.json');
  const pending = path.join(directory, 'pending.json');
  let descriptor;
  try {
    // Remove the unmarked intent from normal recovery BEFORE beginning the
    // replacement. If disk-full/lock failures interrupt this operation,
    // startup must stop rather than overwrite a newer browser workspace.
    fs.renameSync(intent, blocked);
    descriptor = fs.openSync(pending, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(receipt)}\n`, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(pending, intent);
    fs.unlinkSync(blocked);
    return Object.freeze(receipt);
  } catch (error) {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* Preserve the original error. */ }
    }
    // An initial rename can fail because Windows has the intent file locked.
    // A separate exclusive marker still makes the directory fail closed. If
    // even that cannot be written, attempt the rename again as a last resort.
    if (fs.existsSync(intent) && !fs.existsSync(blocked) && !fs.existsSync(pending)) {
      let marker;
      try {
        marker = fs.openSync(blocked, 'wx', 0o600);
        fs.writeFileSync(marker, `${JSON.stringify(previous)}\n`, 'utf8');
        fs.fsyncSync(marker);
      } catch {
        try { fs.renameSync(intent, blocked); } catch { /* Surface recovery failure. */ }
      } finally {
        if (marker !== undefined) {
          try { fs.closeSync(marker); } catch { /* Preserve the original error. */ }
        }
      }
    }
    // Do not clean up blocked or pending files. Their presence is what stops
    // the unmarked old receipt authorizing browser rollback after a restart.
    throw recoveryError('The recovery record could not protect newer browser changes. Automatic recovery is blocked; review this restore before continuing.', error);
  }
}

module.exports = { beginWorkspaceRestore, readPendingWorkspaceRestore, finishWorkspaceRestore, preserveBrowserOnRecovery };
