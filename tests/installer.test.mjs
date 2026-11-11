import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { installerInputs } from '../examples/windows/installer-inputs.mjs';
import { sha256 } from '../examples/windows/windows-build-contract.mjs';

const record = (name, contents) => ({
  path: name,
  bytes: Buffer.byteLength(contents),
  sha256: sha256(contents)
});
function generate(root, value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return installerInputs(root, bytes, sha256(bytes));
}

const profile = (...files) => ({ schemaVersion: 1, version: '1.2.3', files });

test('installer inputs verify only listed files and preserve their destination subdirectories', async t => {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'installer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = record('read me.txt', 'instructions');
  const second = record('resources/message.txt', 'message');
  await fs.mkdir(path.join(root, 'resources'));
  await fs.writeFile(path.join(root, first.path), 'instructions');
  await fs.writeFile(path.join(root, second.path), 'message');
  await fs.writeFile(path.join(root, 'unused.txt'), 'unlisted');
  const plan = profile(second, first);
  const raw = Buffer.from(JSON.stringify(plan));
  const digest = sha256(raw);
  const versionId = '1.2.3-' + digest;
  const inputs = await installerInputs(root, raw, digest);
  assert.equal(inputs.current, JSON.stringify({ schemaVersion: 1, payload: 'versions/' + versionId }));
  const alternateBytes = Buffer.from(JSON.stringify(profile(first)));
  const alternateDigest = sha256(alternateBytes);
  await assert.rejects(installerInputs(root, raw, alternateDigest), /digest mismatch/);
  const alternate = await installerInputs(root, alternateBytes, alternateDigest);
  assert.equal(JSON.parse(alternate.current).payload, 'versions/1.2.3-' + alternateDigest);
  assert.notEqual(alternate.current, inputs.current);
  assert.equal(inputs.filesInclude,
    `Source: "read me.txt"; DestDir: "{app}\\versions\\${versionId}"; Flags: ignoreversion\r\n` +
    `Source: "resources\\message.txt"; DestDir: "{app}\\versions\\${versionId}\\resources"; Flags: ignoreversion\r\n`);
  assert.equal(inputs.checksums, `read me.txt|${first.sha256}|12\r\nresources\\message.txt|${second.sha256}|7\r\n`);

  await assert.rejects(generate(root, profile({ ...first, bytes: 0 })), /size mismatch/);
  await fs.writeFile(path.join(root, second.path), 'changed'); // Same size, different bytes.
  await assert.rejects(generate(root, profile(first, second)), /contents changed/);
});

test('installer input rejects script syntax, invalid destinations and path aliases', async t => {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'installer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ['x/{#expr}.txt', 'x/{app}.txt', 'a;b', 'a%b', 'a"b', '#code', 'x\r\ny', '../x']) {
    await assert.rejects(generate(root, profile(record(name, ''))), { name: 'AssertionError' });
  }
  const ok = record('info.txt', '');
  await assert.rejects(generate(root, profile(ok, record('Info.txt', ''))), { name: 'AssertionError' });
  await assert.rejects(generate(root, { ...profile(ok), version: '1.0.0/{app}' }), { name: 'AssertionError' });
});

test('installer source rejects a linked payload subdirectory', async t => {
  const base = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'installer-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'payload'), outside = path.join(base, 'elsewhere');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'item.txt'), 'item');
  await fs.symlink(outside, path.join(root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(generate(root, profile(record('alias/item.txt', 'item'))), /link|junction|elsewhere/i);
});
