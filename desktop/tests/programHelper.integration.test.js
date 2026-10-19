'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { powerShellHelper } = require('../portableProgramUpdate');
const { hash } = require('../signedProgramPackage');

for (const mode of ['success', 'bad-hash', 'failed-start']) {
  test('Windows helper filesystem transaction: ' + mode, { skip: process.platform !== 'win32' }, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rqk-helper-'));
    const q = value => "'" + value.replace(/'/g, "''") + "'";
    try {
      const target = path.join(root, 'Keeper.exe');
      const staged = path.join(root, 'staged.exe');
      const backup = path.join(root, 'previous.exe');
      const journal = path.join(root, 'result.json');
      const tmp = path.join(root, 'temporary.exe');
      fs.writeFileSync(target, 'old working program');
      fs.writeFileSync(staged, 'new signed program');
      const helper = powerShellHelper({ oldPid: 987654, target, staged, backup,
        expectedHash: mode === 'bad-hash' ? 'a'.repeat(64) : hash(Buffer.from('new signed program')),
        expectedVersion: '0.4.1', journal, temporaryTarget: tmp });
      // Only process launch, process waiting and hashing are substituted. The
      // real generated helper performs real copy/move/delete operations on a
      // disposable folder. No test payload executable is ever run.
      const harness = [
        'function Get-Process { param($Id,$ErrorAction) return $null }',
        'function Start-Sleep { param($Seconds,$Milliseconds) }',
        'function Get-FileHash { param($LiteralPath,$Algorithm) $s=[IO.File]::OpenRead($LiteralPath); try { $h=[Security.Cryptography.SHA256]::Create(); @{Hash=([BitConverter]::ToString($h.ComputeHash($s))).Replace("-","")} } finally { $s.Dispose() } }',
        'function Start-Process { param($FilePath,$WorkingDirectory) ' + (mode === 'success'
          ? '[IO.File]::WriteAllText(' + q(journal) + ', ' + q(JSON.stringify({ state: 'installed', version: '0.4.1' })) + ')'
          : "throw 'simulated startup failure'") + ' }',
        helper,
      ].join('\n');
      const script = path.join(root, 'transaction.ps1');
      fs.writeFileSync(script, harness);
      execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true, timeout: 30000 });
      const result = JSON.parse(fs.readFileSync(journal, 'utf8').replace(/^\uFEFF/, ''));
      assert.equal(result.state, mode === 'success' ? 'installed' : 'failed');
      assert.equal(fs.readFileSync(target, 'utf8'), mode === 'success' ? 'new signed program' : 'old working program');
      if (mode !== 'bad-hash') assert.equal(fs.readFileSync(backup, 'utf8'), 'old working program');
      assert.equal(fs.existsSync(tmp), false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
}
