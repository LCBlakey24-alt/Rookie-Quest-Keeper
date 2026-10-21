'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readCurrentSnapshot, writeCurrentSnapshot, EMPTY_WORKSPACE } = require('../workspaceSnapshot');

function fixture(initial = {}) {
  const data = new Map(Object.entries(initial));
  const read = [];
  let quota = Infinity;
  const storage = {
    get length() { return data.size; },
    key: index => [...data.keys()][index] ?? null,
    getItem(key) { read.push(key); return data.get(key) ?? null; },
    removeItem: key => data.delete(key),
    setItem(key, value) {
      const next = new Map(data).set(key, value);
      if ([...next].reduce((sum, [k, v]) => sum + k.length + v.length, 0) > quota) throw new Error('Quota exceeded');
      data.set(key, value);
    },
  };
  const contents = { isDestroyed: () => false, getURL: () => 'rqk://desktop/home',
    executeJavaScript: async expression => JSON.parse(JSON.stringify(vm.runInNewContext(expression, { localStorage: storage }))),
    session: { flushStorageData() {} } };
  const window = { isDestroyed: () => false, webContents: contents };
  return { window, contents, data, read, setQuota: value => { quota = value; } };
}

test('captures supported browser records atomically without reading authentication or unknown values', async () => {
  const f = fixture({ 'rqk.desktopWorkspace.v1': EMPTY_WORKSPACE, 'gm.activeCombat.campaign': '{"hp":0,"round":4}',
    'rqk.gm.assets.campaign': '{"image":"data:image/png;base64,AA=="}', auth_token: 'private sentinel',
    'other.product': 'unknown sentinel', 'gm.activeCombat.bad\0token': 'invalid key sentinel' });
  const result = await readCurrentSnapshot(f.window, f.contents);
  assert.equal(result.workspace, EMPTY_WORKSPACE);
  assert.deepEqual(result.browserStorage, { 'gm.activeCombat.campaign': '{"hp":0,"round":4}',
    'rqk.gm.assets.campaign': '{"image":"data:image/png;base64,AA=="}' });
  assert.equal(f.read.includes('auth_token'), false);
  assert.equal(f.read.includes('other.product'), false);
  assert.equal(f.read.includes('gm.activeCombat.bad\0token'), false);
});

test('restores exact workspace and supplemental values while retaining unrelated storage', async () => {
  const f = fixture({ 'rqk.desktopWorkspace.v1': 'old workspace', 'rook-theme': 'old theme',
    'smart-sessions-old': 'old sessions', auth_token: 'private sentinel', other: 'unrelated' });
  const extras = { 'rook-theme': 'new theme', 'rqk.character-notes-draft:hero': 'Exact \n draft ` ${value} </script>',
    'soundboard-custom-campaign': '[{"audio":"data:audio/wav;base64,AA=="}]' };
  await writeCurrentSnapshot(f.window, f.contents, EMPTY_WORKSPACE, extras);
  assert.deepEqual((await readCurrentSnapshot(f.window, f.contents)).browserStorage, extras);
  assert.equal(f.data.get('rqk.desktopWorkspace.v1'), EMPTY_WORKSPACE);
  assert.equal(f.data.has('smart-sessions-old'), false);
  assert.equal(f.data.get('auth_token'), 'private sentinel');
  assert.equal(f.data.get('other'), 'unrelated');
});

test('partial quota failure restores every previous browser key and original workspace', async () => {
  const original = { 'rqk.desktopWorkspace.v1': 'original workspace', 'rook-theme': 'old theme',
    'smart-sessions-campaign': 'original sessions', auth_token: 'private sentinel' };
  const f = fixture(original);
  f.setQuota(250);
  await assert.rejects(writeCurrentSnapshot(f.window, f.contents, 'incoming workspace', {
    'rook-theme': 'already written', 'rqk.gm.assets.campaign': 'x'.repeat(1000),
  }), /Previous saved values were restored/);
  assert.deepEqual(Object.fromEntries(f.data), original);
});

test('legacy restore keeps supplemental data, explicit empty capture removes only supported keys', async () => {
  const f = fixture({ 'rqk.desktopWorkspace.v1': 'old', 'rook-theme': 'keep', auth_token: 'private sentinel' });
  await writeCurrentSnapshot(f.window, f.contents, 'legacy', null);
  assert.equal(f.data.get('rook-theme'), 'keep');
  await writeCurrentSnapshot(f.window, f.contents, 'new', {});
  assert.equal(f.data.has('rook-theme'), false);
  assert.equal(f.data.get('auth_token'), 'private sentinel');
});

test('clean install still captures supported preferences before its first campaign', async () => {
  const f = fixture({ 'rook-theme': 'dark' });
  const result = await readCurrentSnapshot(f.window, f.contents);
  assert.equal(result.workspace, EMPTY_WORKSPACE);
  assert.deepEqual(result.browserStorage, { 'rook-theme': 'dark' });
});

test('newer autosaved campaign or browser values are refused before restore changes any key', async () => {
  for (const [key, value] of [['rqk.desktopWorkspace.v1', 'newer campaign'], ['rook-theme', 'newer preference']]) {
    const f = fixture({ 'rqk.desktopWorkspace.v1': 'original campaign', 'rook-theme': 'original preference', auth_token: 'private sentinel' });
    const expected = await readCurrentSnapshot(f.window, f.contents);
    f.data.set(key, value);
    const before = Object.fromEntries(f.data);
    await assert.rejects(writeCurrentSnapshot(f.window, f.contents, 'imported campaign', { 'rook-theme': 'imported' }, expected),
      error => error.code === 'WORKSPACE_CHANGED_DURING_RESTORE');
    assert.deepEqual(Object.fromEntries(f.data), before);
  }
});
