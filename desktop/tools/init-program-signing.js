'use strict';
// One-time release-owner setup on Windows. The private key is encrypted by
// Windows DPAPI for the current account and never written as plain text.
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');
const destination = path.resolve(process.argv[2] || '');
if (process.platform !== 'win32' || !process.argv[2] || fs.existsSync(destination)) throw new Error('Choose a NEW protected key file outside the repository on Windows.');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const protectedKey = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  '$ErrorActionPreference = "Stop"; Add-Type -AssemblyName System.Security; $keyBytes = [Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($keyBytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser))'],
{ input: pem, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
if (!protectedKey || protectedKey.includes('PRIVATE KEY')) throw new Error('Windows could not protect the signing key.');
fs.writeFileSync(destination, protectedKey, { flag: 'wx', mode: 0o600 });
const pub = publicKey.export({ type: 'spki', format: 'pem' });
const id = crypto.createHash('sha256').update(pub).digest('hex').slice(0, 16);
console.log(JSON.stringify({ [id]: pub }, null, 2));
