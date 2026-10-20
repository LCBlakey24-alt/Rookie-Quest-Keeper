'use strict';
const { spawnSync } = require('child_process');
const electron = require('electron');
if (typeof electron !== 'string') throw new Error('Electron executable path was not returned.');
const result = spawnSync(electron, [require.resolve('./startup-smoke.cjs')], {
  stdio: 'inherit', windowsHide: true, timeout: 90000,
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
