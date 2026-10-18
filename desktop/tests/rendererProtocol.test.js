'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { rendererResponse } = require('../rendererProtocol');

test('loads renderer assets beyond Windows MAX_PATH with explicit MIME types', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'rqk-renderer-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const renderer = path.join(root, 'nested-folder-'.repeat(10), 'release-'.repeat(8), 'renderer');
  const js = path.join(renderer,'static','js','main.1234.js');
  assert.ok(js.length > 260);
  fs.mkdirSync(path.dirname(js),{recursive:true});
  fs.writeFileSync(js,'window.loaded = true;');
  fs.writeFileSync(path.join(renderer,'index.html'),'<div id="root"></div>');
  const response = rendererResponse(renderer,'rqk://desktop/static/js/main.1234.js');
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/javascript/);
  assert.equal(await response.text(),'window.loaded = true;');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(await rendererResponse(renderer,'rqk://desktop/campaigns/123').text(),'<div id="root"></div>');
  assert.equal(await rendererResponse(renderer,'rqk://desktop/characters/id.with.dots').text(),'<div id="root"></div>');
  assert.equal(rendererResponse(renderer,'rqk://desktop/static/js/missing.js').status,404);
});

test('does not serve malformed paths, foreign origins or sibling files', () => {
  for(const url of ['rqk://other/home','https://desktop/home','rqk://desktop/%ZZ',
    'rqk://desktop/foo%5Cbar','rqk://desktop/C%3A/file','rqk://desktop/%00',
    'rqk://desktop/x%2F..%2F..%2Fsecret']) {
    assert.ok(rendererResponse(__dirname,url).status >= 400,url);
  }
});
