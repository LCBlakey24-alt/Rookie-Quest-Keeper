'use strict';

// Seed, close, then inspect a disposable older profile in a SECOND Electron
// process. Source hashes are compared after both processes have exited.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const electron = require('electron');
const { inspectOrdinaryTree } = require('../copiedProfileMigration');
if (typeof electron !== 'string') throw new Error('Electron executable path was not returned.');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'Keeper Copied Profile QA '));
const output = path.resolve(process.env.RQK_COPIED_PROFILE_SMOKE_REPORT || 'copied-profile-smoke-report.json');
const report = { events: [] };
function record(event) {
  report.events.push(event);
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
}
try {
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.PORTABLE_EXECUTABLE_DIR;
  delete environment.PORTABLE_EXECUTABLE_FILE;
  function run(mode) {
    const result = spawnSync(electron, [require.resolve('./copied-profile-smoke.cjs'), mode, root], {
      encoding: 'utf8', windowsHide: true, timeout: 60000, env: environment,
    });
    if (result.error || result.status !== 0) {
      throw new Error(`${mode} Electron process failed: ${String(result.error || result.stderr || result.stdout || result.status).slice(0, 6000)}`);
    }
    record({ stage: mode, passed: true });
  }
  run('seed');
  const source = path.join(root, 'Earlier Keeper COPY', 'RookieQuestKeeperData');
  const before = inspectOrdinaryTree(source);
  run('extract');
  assert.deepEqual(inspectOrdinaryTree(source), before, 'Every source file and empty directory must remain unchanged.');
  const extracted = JSON.parse(fs.readFileSync(path.join(root, 'extract-result.json'), 'utf8'));
  record({ stage: 'passed', source_unchanged: true, ...extracted });
  console.log('Copied-profile migration preserved exact synthetic workspace, extra records and media without changing source files.');
} catch (error) {
  record({ stage: 'failed', error: String(error.stack || error) });
  console.error(String(error.stack || error));
  process.exitCode = 1;
} finally {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
