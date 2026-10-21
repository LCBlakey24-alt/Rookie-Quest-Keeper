'use strict';

// electron-builder Windows custom-sign hook for SSL.com eSigner. A reviewed
// protected job provisions the vendor SDK and Java; this hook never downloads
// tools, creates keys, stores credentials or publishes release assets.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');

const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const CREDENTIALS = ['USERNAME', 'PASSWORD', 'CREDENTIAL_ID', 'TOTP_SECRET'];

function digestFile(filename) {
  const info = fs.lstatSync(filename);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Signing inputs must be ordinary files.');
  const digest = crypto.createHash('sha256');
  const descriptor = fs.openSync(filename, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let count;
    while ((count = fs.readSync(descriptor, buffer, 0, buffer.length, null))) digest.update(buffer.subarray(0, count));
  } finally { fs.closeSync(descriptor); }
  return digest.digest('hex');
}

function toolTreeDigest(directory) {
  if (!fs.lstatSync(directory).isDirectory()) throw new Error('Signing SDK must be an ordinary directory.');
  const files = [];
  function visit(folder, prefix = '') {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      if (item.isSymbolicLink()) throw new Error('Signing SDK links are not allowed.');
      const relative = prefix + item.name;
      const filename = path.join(folder, item.name);
      if (item.isDirectory()) visit(filename, relative + '/');
      else if (item.isFile()) files.push([relative, digestFile(filename)]);
      else throw new Error('Signing SDK has an unsupported item.');
    }
  }
  visit(directory);
  files.sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0);
  return crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
}

function required(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value)) throw new Error(`Missing or invalid protected signing setting: ${name}`);
  return value;
}

function buildSettings(env, platform) {
  if (platform !== 'win32' || env.RQK_WINDOWS_SIGNING_PROVIDER !== 'sslcom') {
    throw new Error('Managed signing requires the approved SSL.com Windows release configuration.');
  }
  const sdk = required(env, 'RQK_ESIGNER_TOOL_ROOT');
  const java = required(env, 'RQK_ESIGNER_JAVA_PATH');
  const sdkHash = required(env, 'RQK_ESIGNER_TOOL_SHA256');
  const javaHash = required(env, 'RQK_ESIGNER_JAVA_SHA256');
  const version = required(env, 'RQK_ESIGNER_VERSION');
  const publisher = required(env, 'RQK_WINDOWS_PUBLISHER');
  if (!path.isAbsolute(sdk) || !path.isAbsolute(java) || !SHA256.test(sdkHash) || !SHA256.test(javaHash) || !VERSION.test(version)) {
    throw new Error('Managed signing requires pinned absolute tool paths, SHA-256 hashes and a stable SDK version.');
  }
  const credentials = Object.fromEntries(CREDENTIALS.map(name => [name, required(env, `RQK_ESIGNER_${name}`)]));
  if (toolTreeDigest(sdk) !== sdkHash || digestFile(java) !== javaHash) {
    throw new Error('Managed signing tool integrity check failed. Nothing was signed.');
  }
  const jar = `code_sign_tool-${version}.jar`;
  digestFile(path.join(sdk, 'jar', jar));
  return { sdk, sdkHash, java, jar, publisher, credentials };
}

function runFile(executable, args, options) {
  return new Promise((resolve, reject) => {
    execFile(executable, args, { ...options, windowsHide: true, shell: false, timeout: 600000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      // execFile errors include the command and credentials. Never propagate
      // those errors, stdout or stderr to electron-builder/GitHub logs.
      if (error) reject(new Error('Managed signing command failed. No release was published.'));
      else resolve(String(stdout || ''));
    });
  });
}

async function verifySignedFile(filename, publisher, run, env) {
  const systemRoot = required(env, 'SystemRoot');
  if (!path.isAbsolute(systemRoot)) throw new Error('Windows system path is unavailable.');
  const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = "$ErrorActionPreference='Stop'; $s=Get-AuthenticodeSignature -LiteralPath $env:RQK_VERIFY_SIGNED_FILE; if($s.Status -ne 'Valid' -or -not $s.SignerCertificate -or -not $s.TimeStamperCertificate){throw 'Unverified or untimestamped managed signature'}; $p=$s.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName,$false); if($p -cne $env:RQK_VERIFY_PUBLISHER){throw 'Unexpected managed publisher'}; [Console]::Out.Write('KEEPER_SIGNATURE_VERIFIED')";
  let result;
  try {
    result = await run(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: { ...env, RQK_VERIFY_SIGNED_FILE: filename, RQK_VERIFY_PUBLISHER: publisher },
    });
  } catch { throw new Error('Managed Windows signature verification failed. Nothing was packaged.'); }
  if (result.trim() !== 'KEEPER_SIGNATURE_VERIFIED') throw new Error('Managed Windows signature verification did not confirm the approved publisher.');
}

async function signManaged(configuration, dependencies = {}) {
  const env = dependencies.env || process.env;
  const platform = dependencies.platform || process.platform;
  const run = dependencies.run || runFile;
  if (!configuration || configuration.hash !== 'sha256' || configuration.isNest) {
    throw new Error('Configure managed Windows signing for SHA-256 only, without nested signatures.');
  }
  const input = configuration.path;
  if (typeof input !== 'string' || !path.isAbsolute(input) || !/\.(?:exe|dll|msi)$/i.test(input)) {
    throw new Error('Managed signing requires an absolute Windows executable build path.');
  }
  const originalHash = digestFile(input);
  const settings = buildSettings(env, platform);
  const temporary = fs.mkdtempSync(path.join(dependencies.temporaryRoot || os.tmpdir(), 'Keeper Managed Signing '));
  const temporarySdk = path.join(temporary, 'sdk');
  const unsignedCopy = path.join(temporary, path.basename(input));
  const pending = `${input}.${crypto.randomBytes(8).toString('hex')}.signed.pending`;
  try {
    fs.cpSync(settings.sdk, temporarySdk, { recursive: true, errorOnExist: true, force: false });
    if (toolTreeDigest(temporarySdk) !== settings.sdkHash) throw new Error('Signing SDK changed while being staged.');
    fs.copyFileSync(input, unsignedCopy, fs.constants.COPYFILE_EXCL);
    if (digestFile(unsignedCopy) !== originalHash) throw new Error('Build file changed while being staged for signing.');
    const args = ['-jar', path.join(temporarySdk, 'jar', settings.jar), 'sign',
      `-username=${settings.credentials.USERNAME}`, `-password=${settings.credentials.PASSWORD}`,
      `-credential_id=${settings.credentials.CREDENTIAL_ID}`, `-totp_secret=${settings.credentials.TOTP_SECRET}`,
      `-input_file_path=${unsignedCopy}`, '-override=true', '-malware_block=true'];
    try {
      await run(settings.java, args, { cwd: temporarySdk, env: { ...env, CODE_SIGN_TOOL_PATH: temporarySdk } });
    } catch { throw new Error('Managed signing failed. The original build file was not changed.'); }
    await verifySignedFile(unsignedCopy, settings.publisher, run, env);
    if (digestFile(input) !== originalHash) throw new Error('Build file changed during managed signing.');
    fs.copyFileSync(unsignedCopy, pending, fs.constants.COPYFILE_EXCL);
    if (digestFile(pending) !== digestFile(unsignedCopy)) throw new Error('Signed build file failed final integrity verification.');
    fs.renameSync(pending, input);
  } finally {
    fs.rmSync(pending, { force: true });
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

module.exports = configuration => signManaged(configuration);
module.exports.signManaged = signManaged;
module.exports.toolTreeDigest = toolTreeDigest;
module.exports.digestFile = digestFile;
module.exports.buildSettings = buildSettings;

if (require.main === module) {
  if (process.argv[2] !== '--inspect' || !process.argv[3]) throw new Error('Usage: node sign-windows-managed.cjs --inspect SDK_FOLDER');
  console.log(toolTreeDigest(path.resolve(process.argv[3])));
}
