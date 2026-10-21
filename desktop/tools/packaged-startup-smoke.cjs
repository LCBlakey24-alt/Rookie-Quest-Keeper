'use strict';

// Starts the ACTUAL packaged installed edition with disposable Windows profile
// folders. A dead HTTP proxy simulates no internet; CDP is loopback-only.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const executable = path.resolve(process.argv[2] || 'dist/win-unpacked/Rookie Quest Keeper.exe');
const action = process.argv[3] || 'roundtrip';
if (!['roundtrip', 'seed', 'check'].includes(action)) throw new Error('Expected roundtrip, seed or check smoke action.');
const reportPath = path.resolve(process.env.RQK_PACKAGED_SMOKE_REPORT || 'packaged-startup-smoke-report.json');
const persistentProfile = process.argv[4];
if (persistentProfile && (process.env.GITHUB_ACTIONS !== 'true' || process.platform !== 'win32'
  || !path.resolve(persistentProfile).startsWith(path.resolve(process.env.RUNNER_TEMP || '') + path.sep)
  || !fs.existsSync(path.join(persistentProfile, '.keeper-disposable-installer-profile')))) {
  throw new Error('Persistent installer smoke profiles must be marked disposable folders under GitHub RUNNER_TEMP.');
}
const temporary = persistentProfile ? path.resolve(persistentProfile) : fs.mkdtempSync(path.join(os.tmpdir(), 'Keeper Installed QA '));
const expectedVersion = process.env.RQK_QA_EXPECTED_VERSION || require('../package.json').version;
const report = { version: expectedVersion, offlineProxy: true, events: [] };
const storageKey = 'rqk.desktopWorkspace.v1';
const fixture = {
  version: 1,
  campaigns: [{ id: 'windows-qa-campaign', name: 'Synthetic Windows QA Campaign', dm_user_id: 'Local Keeper' }],
  characters: [{ id: 'windows-qa-character', name: 'Synthetic QA Hero', campaign_id: 'windows-qa-campaign', current_hp: 7, max_hp: 19, resources: { arrows: 3 } }],
  collections: {}, notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [],
};
const browserFixture = {
  'gm.activeCombat.windows-qa-campaign': JSON.stringify({ round: 4, combatants: [{ id: 'windows-qa-character', current_hp: 7 }] }),
  'rqk.gm.assets.windows-qa-campaign': JSON.stringify({ portrait: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD0kAAAAASUVORK5CYII=' }),
  'soundboard-custom-windows-qa-campaign': JSON.stringify([{ id: 'qa-track', title: 'Synthetic music' }]),
  'smart-sessions-windows-qa-campaign': JSON.stringify([{ id: 'qa-session', notes: 'Synthetic unfinished notes' }]),
  'rqk.liveRollTables.windows-qa-campaign': JSON.stringify({ last_roll: 11 }),
  'rqk.rollStats.session.windows-qa-campaign': JSON.stringify([{ roll: 17, kind: 'attack' }]),
  'rqk.character-notes-draft:windows-qa-character': 'Synthetic unsaved character note',
};
// This auth sentinel stays local to the disposable profile. A portable export
// or snapshot must never capture it as a campaign preference.
const authSentinel = 'synthetic-local-only-never-export';
const mediaFixture = {
  'map.svg': Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path d="M0 0h2v2H0z"/></svg>'),
  // Four silent 8-bit PCM samples in a valid mono 8 kHz RIFF/WAVE container.
  'music.wav': Buffer.from('524946462800000057415645666d74201000000001000100401f0000401f000001000800646174610400000080808080', 'hex'),
};
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function record(event) {
  report.events.push(event);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function findUserData(directory) {
  const matches = [];
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(folder, entry.name);
      if (entry.name === 'workspace-backups') matches.push(folder);
      else if (entry.name !== 'node_modules') visit(child);
    }
  }
  visit(directory);
  assert.equal(matches.length, 1, 'Native backup must identify exactly one isolated user-data folder.');
  return matches[0];
}

async function verifyPreservedData(evaluate) {
  const saved = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))`);
  assert.deepEqual(saved, fixture, 'Campaign IDs, character HP/resources and all saved fields must survive restart.');
  const supplemental = await evaluate(`Object.fromEntries(${JSON.stringify(Object.keys(browserFixture))}.map(key => [key,localStorage.getItem(key)]))`);
  assert.deepEqual(supplemental, browserFixture, 'Supplemental combat, assets, soundboard, session and draft state must survive.');
  assert.equal(await evaluate('localStorage.getItem("auth_token")'), authSentinel, 'Installer must preserve the existing profile without exporting its auth data.');
  const userData = findUserData(temporary);
  for (const [name, contents] of Object.entries(mediaFixture)) {
    assert.deepEqual(fs.readFileSync(path.join(userData, 'campaign-packs', 'windows-qa', name)), contents, 'Imported map/music bytes must survive.');
    const rendered = await evaluate(`fetch(${JSON.stringify(`rqk-attachment://windows-qa/${name}`)}).then(async response => {if (!response.ok) throw new Error('Attachment unavailable');return Array.from(new Uint8Array(await response.arrayBuffer()))})`);
    assert.deepEqual(Buffer.from(rendered), contents, 'Saved media must resolve through the installed attachment protocol.');
  }
}

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function attach(port, child) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Packaged app exited early: ${child.exitCode}`);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const target = targets.find(item => item.type === 'page' && item.url.startsWith('rqk://desktop/'));
      if (target?.webSocketDebuggerUrl) {
        const socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        let id = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
          const response = JSON.parse(event.data);
          const waiter = pending.get(response.id);
          if (!waiter) return;
          pending.delete(response.id); clearTimeout(waiter.timeout);
          if (response.error) waiter.reject(new Error(JSON.stringify(response.error)));
          else waiter.resolve(response.result);
        });
        return {
          close: () => socket.close(),
          command(method, params = {}) {
            return new Promise((resolve, reject) => {
              const sequence = ++id;
              const timeout = setTimeout(() => { pending.delete(sequence); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
              pending.set(sequence, { resolve, reject, timeout });
              socket.send(JSON.stringify({ id: sequence, method, params }));
            });
          },
        };
      }
    } catch { /* Chromium may still be opening its debugger socket. */ }
    await delay(250);
  }
  throw new Error('Packaged app did not open its local renderer.');
}

async function launchAndCheck(seed) {
  const port = await unusedPort();
  const profile = path.join(temporary, 'profile');
  const environment = { ...process.env, APPDATA: path.join(temporary, 'AppData', 'Roaming'), LOCALAPPDATA: path.join(temporary, 'AppData', 'Local') };
  delete environment.PORTABLE_EXECUTABLE_DIR;
  delete environment.PORTABLE_EXECUTABLE_FILE;
  delete environment.ELECTRON_RUN_AS_NODE;
  fs.mkdirSync(environment.APPDATA, { recursive: true });
  fs.mkdirSync(environment.LOCALAPPDATA, { recursive: true });
  const child = spawn(executable, [`--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9'], {
    env: environment, stdio: 'ignore', windowsHide: true,
  });
  let spawnError;
  child.once('error', error => { spawnError = error; });
  let client;
  try {
    client = await attach(port, child);
    if (spawnError) throw spawnError;
    const evaluate = async expression => {
      const result = await client.command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Packaged renderer evaluation failed.');
      return result.result?.value;
    };
    const deadline = Date.now() + 45000;
    let state;
    while (Date.now() < deadline) {
      state = await evaluate('({offline:window.rookieDesktop?.offline,edition:window.rookieDesktop?.edition,text:document.getElementById("root")?.innerText||"",path:location.pathname})');
      if (state?.text && state.offline && state.edition === 'desktop') break;
      await delay(250);
    }
    assert.equal(state?.offline, true, 'Installed app must expose its offline bridge.');
    assert.equal(state?.edition, 'desktop');
    assert.ok(state.text.length > 0, 'Installed renderer must mount without internet.');
    assert.notEqual(state.path, '/auth', 'Offline startup must not require login.');
    const updateStatus = await evaluate('window.rookieDesktop.getUpdateStatus()');
    assert.equal(updateStatus.installed_version, expectedVersion, 'The running installed application must report the expected QA version.');
    if (seed) {
      await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fixture))})`);
      await evaluate(`Object.entries(${JSON.stringify(browserFixture)}).forEach(([key,value]) => localStorage.setItem(key,value));localStorage.setItem('auth_token',${JSON.stringify(authSentinel)})`);
      await evaluate(`window.rookieDesktop.createBackup(${JSON.stringify(JSON.stringify(fixture))},'manual')`);
      const userData = findUserData(temporary);
      const mediaFolder = path.join(userData, 'campaign-packs', 'windows-qa');
      fs.mkdirSync(mediaFolder, { recursive: true });
      for (const [name, contents] of Object.entries(mediaFixture)) fs.writeFileSync(path.join(mediaFolder, name), contents);
      record({ stage: 'synthetic-workspace-browser-state-and-imported-media-saved' });
      const backup = await evaluate(`window.rookieDesktop.createBackup(${JSON.stringify(JSON.stringify(fixture))},'manual')`);
      const snapshot = path.join(userData, 'workspace-backups', backup.id);
      function assertNoAuthExport(folder) {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
          const filename = path.join(folder, entry.name);
          if (entry.isDirectory()) assertNoAuthExport(filename);
          else assert.equal(fs.readFileSync(filename).includes(Buffer.from(authSentinel)), false, 'Native backup must exclude authentication storage.');
        }
      }
      assertNoAuthExport(snapshot);
      const changed = JSON.stringify({ ...fixture, campaigns: [{ ...fixture.campaigns[0], name: 'Synthetic mutation to recover' }] });
      await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)},${JSON.stringify(changed)});${JSON.stringify(Object.keys(browserFixture))}.forEach(key=>localStorage.setItem(key,'synthetic changed value'))`);
      for (const name of Object.keys(mediaFixture)) fs.writeFileSync(path.join(mediaFolder, name), 'synthetic changed media');
      await evaluate(`window.rookieDesktop.restoreBackup(${JSON.stringify(backup.id)},${JSON.stringify(changed)})`);
      await verifyPreservedData(evaluate);
      record({ stage: 'native-backup-restore-preserved-workspace-browser-state-and-media-without-auth-export' });
    } else {
      await verifyPreservedData(evaluate);
      await client.command('Page.navigate', { url: 'rqk://desktop/campaigns' });
      let campaignVisible = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        campaignVisible = await evaluate('document.getElementById("root")?.innerText.includes("Synthetic Windows QA Campaign")');
        if (campaignVisible) break;
        await delay(250);
      }
      assert.equal(campaignVisible, true, 'Campaign must be available in the installed offline library.');
      record({ stage: 'offline-restart-preserved-workspace-browser-state-media-and-library' });
    }
    await client.command('Page.close');
    for (let attempt = 0; attempt < 80 && child.exitCode === null; attempt++) await delay(250);
    assert.equal(child.exitCode, 0, 'Packaged app must close cleanly and flush its profile.');
  } finally {
    client?.close();
    if (child.exitCode === null) {
      child.kill();
      await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3000); });
    }
  }
}

(async () => {
  try {
    if (action !== 'check') await launchAndCheck(true);
    if (action !== 'seed') await launchAndCheck(false);
    record({ stage: 'passed' });
  } catch (error) {
    record({ stage: 'failed', error: String(error.stack || error) });
    process.exitCode = 1;
  } finally {
    if (!persistentProfile) fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})();
