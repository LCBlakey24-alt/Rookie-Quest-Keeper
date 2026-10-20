'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readCurrentWorkspace, writeCurrentWorkspace } = require('../workspaceSnapshot');

function fixture(raw = '{"version":1,"campaigns":[]}') {
  const events = [];
  const contents = {
    isDestroyed: () => false,
    getURL: () => 'rqk://desktop/campaigns/test',
    executeJavaScript: async expression => {
      assert.equal(expression, 'localStorage.getItem("rqk.desktopWorkspace.v1")');
      events.push('read');
      return raw;
    },
    session: { flushStorageData: () => { events.push('flush requested'); } },
  };
  return { window: { isDestroyed: () => false, webContents: contents }, contents, events };
}

test('latest campaign state replaces the click-time snapshot and requests a storage flush', async () => {
  const saved = '{"version":1,"campaigns":[{"id":"same-id","hp":7}]}';
  const f = fixture(saved);
  assert.equal(await readCurrentWorkspace(f.window, f.contents, 'stale'), saved);
  assert.deepEqual(f.events, ['read', 'flush requested']);
});

test('only an absent first-run workspace may use the supplied empty workspace', async () => {
  const f = fixture(null);
  assert.equal(await readCurrentWorkspace(f.window, f.contents, 'empty-seed'), 'empty-seed');
  const invalid = fixture('');
  await assert.rejects(readCurrentWorkspace(invalid.window, invalid.contents, 'stale'), /latest saved workspace/);
});

test('audience or external windows cannot supply the update backup', async () => {
  const f = fixture();
  await assert.rejects(readCurrentWorkspace(f.window, {}, 'stale'), /main Keeper window/);
  f.contents.getURL = () => 'https://example.com/';
  await assert.rejects(readCurrentWorkspace(f.window, f.contents, 'stale'), /main Keeper window/);
  assert.deepEqual(f.events, []);
});

test('storage read or flush failure stops update preparation', async () => {
  const f = fixture();
  f.contents.executeJavaScript = async () => { throw new Error('renderer stopped'); };
  await assert.rejects(readCurrentWorkspace(f.window, f.contents, 'stale'), /renderer stopped/);
  f.contents.executeJavaScript = async () => 'current';
  f.contents.session.flushStorageData = () => { throw new Error('disk full'); };
  await assert.rejects(readCurrentWorkspace(f.window, f.contents, 'stale'), /disk full/);
});

function writableFixture(previous = 'original') {
  const f = fixture();
  const data = new Map(previous === null ? [] : [['rqk.desktopWorkspace.v1', previous]]);
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key),
  };
  f.contents.executeJavaScript = async expression => vm.runInNewContext(expression, { localStorage: storage });
  return { ...f, data, storage };
}

test('native restore safely saves exact imported content, including script-like text', async () => {
  const f = writableFixture();
  const raw = JSON.stringify({ note: '` ${secret} </script> \\ current HP: 7' });
  await writeCurrentWorkspace(f.window, f.contents, raw);
  assert.equal(f.data.get('rqk.desktopWorkspace.v1'), raw);
});

test('quota failure leaves the previous workspace untouched', async () => {
  const f = writableFixture();
  f.storage.setItem = () => { throw new Error('quota exceeded'); };
  await assert.rejects(writeCurrentWorkspace(f.window, f.contents, 'incoming'), /quota exceeded/);
  assert.equal(f.data.get('rqk.desktopWorkspace.v1'), 'original');
});

test('flush failure restores the previous saved value or first-run absence', async () => {
  for (const previous of ['original', null]) {
    const f = writableFixture(previous);
    f.contents.session.flushStorageData = () => { throw new Error('storage flush failed'); };
    await assert.rejects(writeCurrentWorkspace(f.window, f.contents, 'incoming'), /flush failed/);
    assert.equal(f.data.get('rqk.desktopWorkspace.v1') ?? null, previous);
  }
});
