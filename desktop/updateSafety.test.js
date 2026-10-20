'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { requireVerifiedUpdateBackup } = require('./updateSafety');

const validBackup = {
  id: 'snapshot-1792500000000-deadbeef',
  reason: 'before-update',
  sha256: { 'workspace.json': 'a'.repeat(64) },
};

test('installed updater requires a saved workspace before proceeding', () => {
  let calls = 0;
  const create = () => { calls += 1; return validBackup; };
  for (const invalid of [null, '', '   ', undefined]) {
    assert.throws(() => requireVerifiedUpdateBackup(create, invalid), /saved campaign workspace/);
  }
  assert.equal(calls, 0);
});

test('installed updater accepts only a verified before-update snapshot', () => {
  const cases = [
    null,
    {},
    { ...validBackup, reason: 'manual' },
    { ...validBackup, id: 'outside-folder' },
    { ...validBackup, sha256: {} },
    { ...validBackup, sha256: { 'workspace.json': 'broken' } },
  ];
  for (const result of cases) {
    assert.throws(() => requireVerifiedUpdateBackup(() => result, '{}'), /verify the campaign backup/);
  }
});

test('valid backup returns its metadata without changing workspace content', () => {
  const raw = JSON.stringify({ version: 1, campaigns: [{ id: 'eldritch-heralds' }] });
  let call;
  const backup = requireVerifiedUpdateBackup((payload, reason) => {
    call = { payload, reason };
    return validBackup;
  }, raw);
  assert.deepEqual(call, { payload: raw, reason: 'before-update' });
  assert.equal(backup, validBackup);
});
