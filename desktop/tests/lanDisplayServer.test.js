'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLanDisplayServer, attachmentPath } = require('../lanDisplayServer');

test('LAN display excludes private GM fields and shows all selected NPCs', () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  const visible = server.projectDisplayState({
    mode: 'npc-grid',
    payload: {
      title: 'In the tavern',
      secret: 'The barkeep is the villain',
      npcs: [
        { name: 'Alys', subtitle: 'Innkeeper', description: 'Friendly face', notes: 'Spy', hp: 17 },
        { name: 'Bram', role: 'Guard', notes: 'Secret mission' },
        { name: 'Cora', private_description: 'Secret', description: 'Merchant' },
        { name: 'Dain', notes: 'Invisible' },
      ],
    },
  });
  assert.equal(visible.payload.npcs.length, 4);
  assert.equal(visible.payload.npcs[0].name, 'Alys');
  assert.equal(visible.payload.npcs[3].name, 'Dain');
  assert.doesNotMatch(JSON.stringify(visible), /Spy|Secret mission|villain|Invisible|private_description|"hp"/);
});

test('world map data URI is carried to the LAN display', () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  const value = server.projectDisplayState({
    mode: 'image', payload: { title: 'Balderin', image_url: 'data:image/png;base64,QUJD' },
  });
  assert.equal(value.payload.image_url, 'data:image/png;base64,QUJD');
  assert.equal(value.payload.title, 'Balderin');
});

test('attachment files stay inside approved campaign pack folder', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-lan-'));
  try {
    assert.equal(
      attachmentPath('rqk-attachment://pack-one/map.png', base),
      path.join(base, 'campaign-packs', 'pack-one', 'map.png')
    );
    assert.equal(attachmentPath('rqk-attachment://pack-one/%2e%2e/%2e%2e/secret.png', base), null);
    assert.equal(attachmentPath('file:///etc/passwd', base), null);
    assert.equal(attachmentPath('rqk-attachment://pack-one/notes.json', base), null);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('read-only LAN HTTP viewer serves a map and requires its private link', async () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  try {
    const info = await server.start();
    assert.match(info.url, /^http:/);
    const viewer = new URL(info.url);
    viewer.hostname = '127.0.0.1';
    const denied = await fetch(viewer.origin + '/state');
    assert.equal(denied.status, 403);
    server.publish({ mode: 'image', payload: { title: 'Local map', image_url: 'data:image/png;base64,QUJD' } });
    const state = await fetch(viewer.origin + '/state' + viewer.search);
    assert.equal(state.status, 200);
    assert.equal((await state.json()).payload.title, 'Local map');
    const html = await fetch(viewer);
    assert.equal(html.status, 200);
    assert.match(await html.text(), /Rookie Quest Keeper/);
  } finally { server.close(); }
});

test('Wi-Fi VTT includes portrait/fullscreen layout and ResizeObserver token positioning', async () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  try {
    const info = await server.start();
    const viewer = new URL(info.url);
    viewer.hostname = '127.0.0.1';
    const response = await fetch(viewer);
    assert.equal(response.status, 200);
    const page = await response.text();
    assert.match(page, /@media \(orientation:portrait\)/);
    assert.match(page, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(page, /cards\.dataset\.dense/);
    assert.match(page, /ResizeObserver\(fit\)/);
    assert.match(page, /classList\.toggle\('clean'\)/);
    assert.match(page, /overflow:hidden/);
    assert.doesNotMatch(page, /GM secret|private_description/);
  } finally { server.close(); }
});
