'use strict';

// Real Electron renderer/bridge test. Only synthetic data and ephemeral test keys.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const desktop = path.resolve(__dirname, '..');
const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'Keeper OneDrive Startup '));
// Match a deeply nested OneDrive portable folder: preload <260 chars while
// renderer/static/js assets exceed legacy Windows MAX_PATH.
const root = path.join(parent, 'Nested Keeper Testing '.padEnd(Math.max(1, 155 - parent.length - 1), 'x'));
fs.mkdirSync(root);
const report = { events: [], runtime: process.versions.electron };
const output = process.env.RQK_SMOKE_REPORT || path.join(desktop, 'startup-smoke-report.json');
function record(type, detail) {
  report.events.push({ type, detail });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
}
process.on('uncaughtException', error => { record('uncaught', String(error.stack)); app.exit(1); });
process.on('unhandledRejection', error => { record('rejection', String(error?.stack || error)); app.exit(1); });
const timer = setTimeout(() => { record('timeout', 'Renderer did not confirm startup'); app.exit(1); }, 45000);
const bootstrapVersion = require('../package.json').version;
const parts = bootstrapVersion.split('.').map(Number);
const updateVersion = [parts[0], parts[1], parts[2] + 1].join('.');
app.getVersion = () => bootstrapVersion;
process.env.PORTABLE_EXECUTABLE_DIR = root;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const keys = { smoke: publicKey.export({type:'spki',format:'pem'}) };
// Override the key module in this test process, never the actual shipped file.
require(desktop + '/programTrust.json');
require.cache[require.resolve(desktop + '/programTrust.json')].exports = keys;
const { build } = require('./build-program-package');
const { stageAppPackage, activateApp, readActive } = require('../programRelease');
build({kind:'app',input:desktop,output:root,version:updateVersion,bootstrapMin:bootstrapVersion,
  electron:process.versions.electron,privateKey,keyId:'smoke'});
const data = path.join(root,'RookieQuestKeeperData');
const compat = {currentVersion:bootstrapVersion,bootstrapVersion,platform:process.platform,arch:process.arch,electron:process.versions.electron};
const staged = stageAppPackage(path.join(root,`Keeper-${updateVersion}.rqkprogram`),keys,compat,data);
activateApp(data,staged);
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_event, details) => record('console', details));
  contents.on('preload-error', (_event, file, error) => record('preload-error', {file,error:String(error)}));
  contents.on('did-fail-load', (_event, code, description) => record('load-error', {code,description}));
  contents.on('did-finish-load', () => record('loaded',contents.getURL()));
});
require('../bootstrap');
app.whenReady().then(() => {
  const check = setInterval(async () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    try {
      const state = await win.webContents.executeJavaScript('({bridge:!!window.rookieDesktop?.offline,text:document.getElementById("root")?.innerText||""})');
      if (state.text && state.bridge && readActive(data)?.state === 'healthy') {
        clearInterval(check); clearTimeout(timer);
        record('passed',{bridge:state.bridge,characters:state.text.length,version:app.getVersion(),selection:readActive(data)});
        app.exit(0);
      }
    } catch (error) { record('poll-error',String(error)); }
  },1000);
});
