'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPPLEMENTAL_POLICY, isSupportedBrowserKey, validateBrowserStorage, summarizeBrowserStorage,
  MAX_BROWSER_STORAGE_VALUE_BYTES, MAX_BROWSER_STORAGE_KEYS,
} = require('../browserStorage');

test('supplemental policy includes actual campaign/runtime/media keys and safe preferences only', () => {
  for (const key of SUPPLEMENTAL_POLICY.exactKeys) assert.equal(isSupportedBrowserKey(key), true, key);
  for (const prefix of SUPPLEMENTAL_POLICY.prefixKeys) {
    assert.equal(isSupportedBrowserKey(prefix + 'synthetic-id'), true, prefix);
    assert.equal(isSupportedBrowserKey(prefix), false, 'a dynamic key needs an ID');
  }
  for (const key of [
    'token', 'auth_token', 'dm_token', 'dm_username', 'username', 'staging_credentials',
    'admin.impersonation', 'rqk.admin.originalToken', 'rook-ai-consent', 'analytics-consent',
    'rqk.desktopWorkspace.v1', 'rqk.previewWorkspace.v1', 'rqk.readOnlyDemo.v1',
    'gm.auth', 'rqk.unknown', 'another-product.key', '__proto__', 'constructor',
    'gm.activeCombat.id\0token',
  ]) assert.equal(isSupportedBrowserKey(key), false, key);
  assert.equal(SUPPLEMENTAL_POLICY.prefixKeys.includes('rqk.'), false);
  assert.equal(SUPPLEMENTAL_POLICY.prefixKeys.includes('gm.'), false);
});

test('canonical supplemental map keeps all string bytes including inline media and incomplete drafts', () => {
  const inline = 'data:audio/mpeg;base64,' + 'A'.repeat(2 * 1024 * 1024);
  const input = {
    'soundboard-custom-campaign': '[{"url":"' + inline + '"}]',
    'rqk.character-notes-draft:character': 'Unsaved note\n\0with exact whitespace  ',
    'gm.activeCombat.campaign': '{"round":4,"current_hp":0,"resources":{"current":0}}',
    'rqk.gm.assets.campaign': '{"inline":"data:image/png;base64,AA=="}',
    'rook-theme': '',
  };
  const result = validateBrowserStorage(input);
  assert.deepEqual(result, input);
  assert.deepEqual(Object.keys(result), Object.keys(input).sort());
  assert.deepEqual(validateBrowserStorage(JSON.parse(JSON.stringify(result))), input);
  assert.deepEqual(summarizeBrowserStorage(result), { combat: 1, preferences: 1, drafts: 1, media: 2 });
});

test('validator rejects unsupported/non-string properties without evaluating their values', () => {
  for (const input of [null, [], 'raw', 4, new Date(), { token: 'never export' }, { 'rook-theme': null }, { 'rook-theme': {} }]) {
    assert.throws(() => validateBrowserStorage(input));
  }
  let readSecret = false;
  const accessor = Object.defineProperty({}, 'auth_token', { enumerable: true, get() { readSecret = true; return 'private'; } });
  assert.throws(() => validateBrowserStorage(accessor), /unsupported/);
  assert.equal(readSecret, false);
  const supportedAccessor = Object.defineProperty({}, 'rook-theme', { enumerable: true, get() { readSecret = true; return 'private'; } });
  assert.throws(() => validateBrowserStorage(supportedAccessor), /unsupported/);
  assert.equal(readSecret, false);
  assert.throws(() => validateBrowserStorage(Object.create({ token: 'inherited private' })), /map of supported keys/);
  assert.throws(() => validateBrowserStorage({ [Symbol('private')]: 'never export' }), /unsupported/);
});

test('size and entry caps refuse oversized supplemental data instead of silently truncating it', () => {
  assert.throws(() => validateBrowserStorage({ 'rqk.gm.assets.large': 'x'.repeat(MAX_BROWSER_STORAGE_VALUE_BYTES + 1) }), /40 MB/);
  // Escaped JSON can be much larger than its raw string byte count.
  assert.throws(() => validateBrowserStorage({ 'rqk.character-notes-draft:large': '\0'.repeat(12 * 1024 * 1024) }), /64 MB/);
  const excessive = Object.fromEntries(Array.from({ length: MAX_BROWSER_STORAGE_KEYS + 1 }, (_, i) => [`gm.activeCombat.${i}`, 'x']));
  assert.throws(() => validateBrowserStorage(excessive), /too many entries/);
  assert.deepEqual(validateBrowserStorage({}), {});
});
