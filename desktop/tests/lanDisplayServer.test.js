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

test('fog covers the LAN map and strips unrevealed enemies from player JSON', () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  const visible = server.projectDisplayState({
    mode: 'combat',
    payload: {
      title: 'Hidden crypt',
      map_url: 'data:image/png;base64,QUJD',
      fog: { enabled: true, reveals: [{ x: 24, y: 30, radius: 10 }, { x: 999, y: -10, radius: 500 }] },
      tokens: [
        { name: 'Discovered guardian', x: 25, y: 34, privateNotes: 'Keep safe' },
        { name: 'Surprise vampire', x: 84, y: 66, hp: 99, gm_only: true },
        { name: 'Secret unplaced figure' },
      ],
    },
  });
  assert.equal(visible.payload.fog.enabled, true);
  assert.equal(visible.payload.fog.reveals.length, 1);
  assert.deepEqual(visible.payload.tokens.map(token => token.name), ['Discovered guardian']);
  assert.doesNotMatch(JSON.stringify(visible), /Surprise vampire|Secret unplaced figure|privateNotes|gm_only/);

  const uncovered = server.projectDisplayState({
    mode: 'image', payload: { image_url: 'data:image/png;base64,QUJD', fog: { enabled: true, reveals: [] } },
  });
  assert.equal(uncovered.payload.fog.enabled, true);
  assert.equal(uncovered.payload.fog.reveals.length, 0);
});

test('Wi-Fi viewer includes player-side SVG fog masking support', async () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  try {
    const info = await server.start();
    const viewer = new URL(info.url);
    viewer.hostname = '127.0.0.1';
    const page = await (await fetch(viewer)).text();
    assert.match(page, /function fogSvg/);
    assert.match(page, /fog-cutout/);
    assert.match(page, /layer\.appendChild\(fog\)/);
    assert.match(page, /function map\(p,combat\)/);
  } finally { server.close(); }
});

test('Wi-Fi VTT allows a shared grid/ruler but never leaks an unshared ruler', () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  const ruler = { start: { x: 5, y: 7 }, end: { x: 31, y: 79 } };
  const hidden = server.projectDisplayState({
    mode: 'image',
    payload: { image_url: 'data:image/png;base64,QUJD', tactical: { grid: true, columns: 30, ruler, showRuler: false, notes: 'GM path' } },
  });
  assert.equal(hidden.payload.tactical.grid, true);
  assert.equal(hidden.payload.tactical.columns, 30);
  assert.equal(hidden.payload.tactical.ruler, null);
  assert.doesNotMatch(JSON.stringify(hidden), /GM path|"x":5/);
  const shared = server.projectDisplayState({
    mode: 'image',
    payload: { image_url: 'data:image/png;base64,QUJD', tactical: { grid: true, columns: 30, ruler, showRuler: true } },
  });
  assert.deepEqual(shared.payload.tactical.ruler, ruler);
  const unsafe = server.projectDisplayState({
    mode: 'image',
    payload: { tactical: { grid: true, columns: 700, ruler: { start: { x: -1, y: 0 }, end: { x: 200, y: 500 } }, showRuler: true } },
  });
  assert.equal(unsafe.payload.tactical.columns, 60);
  assert.equal(unsafe.payload.tactical.ruler, null);
});

test('Wi-Fi viewer contains original grid/ruler projection tools', async () => {
  const server = createLanDisplayServer({ userDataDir: os.tmpdir() });
  try {
    const info = await server.start();
    const url = new URL(info.url);
    url.hostname = '127.0.0.1';
    const page = await (await fetch(url)).text();
    assert.match(page, /function tacticalSvg/);
    assert.match(page, /tactical-grid/);
    assert.match(page, /tactical-ruler/);
    assert.match(page, /layer\.insertBefore\(grid,layer\.firstChild\)/);
  } finally { server.close(); }
});
