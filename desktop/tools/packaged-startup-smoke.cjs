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
const reportPath = path.resolve(process.env.RQK_PACKAGED_SMOKE_REPORT || 'packaged-startup-smoke-report.json');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'Keeper Installed QA '));
const report = { version: require('../package.json').version, offlineProxy: true, events: [] };
const storageKey = 'rqk.desktopWorkspace.v1';
const fixture = {
  version: 1,
  campaigns: [{ id: 'windows-qa-campaign', name: 'Synthetic Windows QA Campaign', dm_user_id: 'Local Keeper' }],
  characters: [{ id: 'windows-qa-character', name: 'Synthetic QA Hero', campaign_id: 'windows-qa-campaign', current_hp: 7, max_hp: 19, resources: { arrows: 3 } }],
  collections: {}, notes: [], recaps: [], receipts: {}, objects: {}, homebrew: [],
};
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
function record(event) {
  report.events.push(event);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
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
    if (seed) {
      await evaluate(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fixture))})`);
      record({ stage: 'synthetic-workspace-saved' });
    } else {
      const saved = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}))`);
      assert.deepEqual(saved, fixture, 'Campaign IDs, character HP/resources and all saved fields must survive restart.');
      await client.command('Page.navigate', { url: 'rqk://desktop/campaigns' });
      let campaignVisible = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        campaignVisible = await evaluate('document.getElementById("root")?.innerText.includes("Synthetic Windows QA Campaign")');
        if (campaignVisible) break;
        await delay(250);
      }
      assert.equal(campaignVisible, true, 'Campaign must be available in the installed offline library.');
      record({ stage: 'offline-restart-preserved-workspace-and-library' });
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
    await launchAndCheck(true);
    await launchAndCheck(false);
    record({ stage: 'passed' });
  } catch (error) {
    record({ stage: 'failed', error: String(error.stack || error) });
    process.exitCode = 1;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
})();
