'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { signManaged, toolTreeDigest, digestFile } = require('../tools/sign-windows-managed.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keeper-signing-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const sdk = path.join(root, 'SDK with spaces');
  fs.mkdirSync(path.join(sdk, 'jar'), { recursive: true });
  fs.writeFileSync(path.join(sdk, 'jar', 'code_sign_tool-1.3.3.jar'), 'synthetic vendor jar, not executable');
  fs.mkdirSync(path.join(sdk, 'conf'));
  fs.writeFileSync(path.join(sdk, 'conf', 'code_sign_tool.properties'), 'synthetic test config');
  const java = path.join(root, 'java.exe'); fs.writeFileSync(java, 'synthetic Java, never launched');
  const input = path.join(root, 'Keeper Setup.exe'); fs.writeFileSync(input, 'unsigned test build');
  const env = {
    RQK_WINDOWS_SIGNING_PROVIDER: 'sslcom', RQK_WINDOWS_PUBLISHER: 'Test Publisher',
    RQK_ESIGNER_TOOL_ROOT: sdk, RQK_ESIGNER_TOOL_SHA256: toolTreeDigest(sdk),
    RQK_ESIGNER_JAVA_PATH: java, RQK_ESIGNER_JAVA_SHA256: digestFile(java), RQK_ESIGNER_VERSION: '1.3.3',
    RQK_ESIGNER_USERNAME: 'test-user', RQK_ESIGNER_PASSWORD: 'never-log-secret-&-$(literal)',
    RQK_ESIGNER_CREDENTIAL_ID: 'synthetic-id', RQK_ESIGNER_TOTP_SECRET: 'synthetic-totp',
    SystemRoot: root,
  };
  const configuration = { path: input, hash: 'sha256', isNest: false };
  const calls = [];
  const run = async (executable, args, options) => {
    calls.push({ executable, args, options });
    if (executable === java) {
      const candidate = args.find(arg => arg.startsWith('-input_file_path=')).slice('-input_file_path='.length);
      fs.writeFileSync(candidate, 'synthetically signed test build');
      return 'vendor diagnostics are deliberately suppressed';
    }
    return 'KEEPER_SIGNATURE_VERIFIED';
  };
  return { root, sdk, java, input, env, configuration, calls, run, sign: () => signManaged(configuration, { env, platform: 'win32', run, temporaryRoot: root }) };
}

test('managed hook uses a staged file and native argument array before verified atomic replacement', async t => {
  const f = fixture(t);
  await f.sign();
  assert.equal(fs.readFileSync(f.input, 'utf8'), 'synthetically signed test build');
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].executable, f.java);
  assert.ok(f.calls[0].args.includes(`-password=${f.env.RQK_ESIGNER_PASSWORD}`));
  assert.ok(f.calls[0].args.includes('-malware_block=true'));
  assert.ok(!f.calls[0].args.includes(`-input_file_path=${f.input}`));
  assert.ok(f.calls[1].args.at(-1).includes('TimeStamperCertificate'));
  assert.equal(f.calls[1].options.env.RQK_VERIFY_PUBLISHER, 'Test Publisher');
  assert.deepEqual(fs.readdirSync(f.root).sort(), ['Keeper Setup.exe', 'SDK with spaces', 'java.exe']);
});

for (const [name, mutate] of [
  ['unsupported provider', f => { f.env.RQK_WINDOWS_SIGNING_PROVIDER = 'other'; }],
  ['missing credential', f => { delete f.env.RQK_ESIGNER_PASSWORD; }],
  ['multiline credential', f => { f.env.RQK_ESIGNER_USERNAME = 'user\nunsafe'; }],
  ['changed SDK', f => { fs.appendFileSync(path.join(f.sdk, 'conf', 'code_sign_tool.properties'), 'changed'); }],
  ['changed Java binary', f => { fs.appendFileSync(f.java, 'changed'); }],
  ['SHA-1 signing', f => { f.configuration.hash = 'sha1'; }],
  ['nested signature', f => { f.configuration.isNest = true; }],
]) {
  test(`managed hook refuses ${name} without launching the signing client`, async t => {
    const f = fixture(t); mutate(f);
    await assert.rejects(f.sign());
    assert.deepEqual(f.calls, []);
    assert.equal(fs.readFileSync(f.input, 'utf8'), 'unsigned test build');
  });
}

test('vendor failure is redacted and cannot alter the original build', async t => {
  const f = fixture(t);
  await assert.rejects(signManaged(f.configuration, { env: f.env, platform: 'win32', temporaryRoot: f.root,
    run: async () => { throw new Error(`failed command -password=${f.env.RQK_ESIGNER_PASSWORD}`); },
  }), error => !String(error.stack).includes(f.env.RQK_ESIGNER_PASSWORD) && /original build file was not changed/.test(error.message));
  assert.equal(fs.readFileSync(f.input, 'utf8'), 'unsigned test build');
});

test('unverified publisher or missing timestamp prevents signed-file activation', async t => {
  const f = fixture(t);
  const run = async (...args) => args[0] === f.java ? f.run(...args) : 'UNVERIFIED';
  await assert.rejects(signManaged(f.configuration, { env: f.env, platform: 'win32', run, temporaryRoot: f.root }), /did not confirm/);
  assert.equal(fs.readFileSync(f.input, 'utf8'), 'unsigned test build');
});

test('external build modification during signing prevents overwriting the newer file', async t => {
  const f = fixture(t);
  const run = async (...args) => {
    const result = await f.run(...args);
    if (args[0] !== f.java) fs.writeFileSync(f.input, 'independent newer build');
    return result;
  };
  await assert.rejects(signManaged(f.configuration, { env: f.env, platform: 'win32', run, temporaryRoot: f.root }), /changed during/);
  assert.equal(fs.readFileSync(f.input, 'utf8'), 'independent newer build');
});
