'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { build } = require('./build-program-package');
const { verifyEnvelope } = require('../signedProgramPackage');
// The key path is a local DPAPI-encrypted file, never a plaintext PEM.
const [keyFile, keyId, kind, input, output, version, bootstrapMin, electron] = process.argv.slice(2);
const protectedKey = fs.readFileSync(keyFile, 'utf8').trim();
const privateKey = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  '$ErrorActionPreference="Stop"; Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))'],
{ input: protectedKey, encoding: 'utf8', windowsHide: true, timeout: 30000 });
const result = build({ kind, input, output, version, bootstrapMin, electron, privateKey, keyId });
const envelope = JSON.parse(fs.readFileSync(path.join(output, `Keeper-${version}.rqkprogram`)));
verifyEnvelope(envelope, require('../programTrust.json'));
console.log(JSON.stringify(result));
