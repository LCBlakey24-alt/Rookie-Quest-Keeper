'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafePlayerDisplayUrl } = require('../playerDisplayWindow');

test('allows only player-facing windows within the installed app', () => {
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/my-campaign/player-display?target=virtual-table'), true);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/player-display/my-campaign?target=standing-tv'), true);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/my-campaign'), false);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/home'), false);
  assert.equal(isSafePlayerDisplayUrl('https://evil.example/campaign/my-campaign/player-display'), false);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop.evil/campaign/my-campaign/player-display'), false);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/%2Fsecret/player-display'), false);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/foo/player-display?debug=1'), false);
  assert.equal(isSafePlayerDisplayUrl('rqk://desktop/campaign/foo/player-display#gm'), false);
});
