import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  makeCurrent, parseCanonicalCurrent, parseRetainedPointer, requireSameLauncher,
} from '../examples/windows/release-update.mjs';
import { validatePackageLock, verifyInstalledLock } from '../examples/windows/runtime-lock.mjs';

const hash = createHash('sha256').update('fixture').digest('hex');

test('version pointer and retained copies require canonical bytes, names and file metadata', () => {
  const pointer = makeCurrent('1.0.7-' + hash);
  const bytes = Buffer.from(JSON.stringify(pointer));
  assert.deepEqual(parseCanonicalCurrent(bytes), pointer);
  const name = 'current.rollback.' + hash + '.json';
  assert.deepEqual(parseRetainedPointer(name, bytes, { isFile: true, isReparse: false }), pointer);
  assert.throws(() => parseRetainedPointer(name, bytes, { isFile: true, isReparse: true }));
  assert.throws(() => parseRetainedPointer('current.bak', bytes, { isFile: true, isReparse: false }));
  for (const invalid of [Buffer.concat([bytes, Buffer.from('\n')]),
    Buffer.from(JSON.stringify({ ...pointer, extra: 0 })), Buffer.from(JSON.stringify({ payload: '../', schemaVersion: 1 }))]) {
    assert.throws(() => parseCanonicalCurrent(invalid));
  }
  for (const version of ['0.01.0', '1.2.65536', '../1.2.3', '1.0.0-beta']) {
    assert.throws(() => makeCurrent(version + '-' + hash));
  }
});

test('fresh installations accept a launcher digest and updates require the same digest', () => {
  assert(requireSameLauncher(null, hash));
  assert(requireSameLauncher(hash, hash));
  assert.throws(() => requireSameLauncher('a'.repeat(64), hash));
  assert.throws(() => requireSameLauncher(null, 'invalid'));
});

test('runtime inventory checks aliases, nested packages, optional entries and extraneous packages', async t => {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'lock-check-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pkg = { name: 'fixture', version: '1.0.0', dependencies: { first: '1.0.0' } };
  function record() {
    return { version: '1.0.0', resolved: 'https://registry.npmjs.org/fixture/-/fixture-1.0.0.tgz',
      integrity: 'sha512-' + createHash('sha512').update('fixture').digest('base64') };
  }
  const primary = 'node_modules/first';
  const nested = primary + '/node_modules/@test/second';
  const optional = 'node_modules/extra';
  const lock = { lockfileVersion: 3, packages: {
    '': pkg, [primary]: record(), [nested]: { ...record(), name: 'alias-target' },
    [optional]: { ...record(), optional: true },
  } };
  async function installed(relative, name, version = '1.0.0') {
    const dir = path.join(root, ...relative.split('/'));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, version }));
  }

  await installed(primary, 'first');
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /Missing required/);
  await installed(nested, 'alias-target');
  const result = await verifyInstalledLock(root, pkg, lock);
  assert.deepEqual(result.map(row => row.path), [primary, nested]);
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock, [optional]), /Missing required/);
  await installed(nested, 'wrong-name');
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /name differs/);
  await installed(nested, 'alias-target', '1.1.0');
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /version differs/);
  await installed(nested, 'alias-target');
  await installed('node_modules/stray', 'stray');
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /Unexpected package/);
  lock.packages[primary].resolved = 'file:../local';
  assert.throws(() => validatePackageLock(pkg, lock), /registry/);
});

test('direct runtime dependencies require a lock entry and installation unless overridden as optional', async t => {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'direct-dep-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pkg = { name: 'fixture', version: '1.0.0', dependencies: { required: '1.0.0' } };
  const lock = { lockfileVersion: 3, packages: { '': pkg } };
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /Missing direct runtime lock entry/);
  lock.packages['node_modules/required'] = {
    version: '1.0.0', optional: true, resolved: 'https://registry.npmjs.org/required/-/required-1.0.0.tgz',
    integrity: 'sha512-' + createHash('sha512').update('fixture').digest('base64'),
  };
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock), /Missing installed direct runtime dependency/);
  pkg.optionalDependencies = { required: '1.0.0' };
  assert.deepEqual(await verifyInstalledLock(root, pkg, lock), []);
  await assert.rejects(() => verifyInstalledLock(root, pkg, lock, ['node_modules/required']), /Missing required/);
});
