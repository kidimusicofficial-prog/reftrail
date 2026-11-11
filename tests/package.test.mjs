import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, createPlan, verify } from '../examples/windows/package-windows.mjs';

test('reproducible ZIP, receipt binding and rejection of modified inputs', async t => {
  const root = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'payload-test-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, 'bin'));
  await fs.writeFile(path.join(root, 'bin', 'sample.txt'), 'text for packaging');
  await fs.writeFile(path.join(root, 'empty.txt'), '');
  const profile = path.join(root, 'approved.json');
  const a = path.join(root, 'first'), b = path.join(root, 'second');
  const plan = await createPlan(root, '1.0.0', profile, ['empty.txt', 'bin/sample.txt']);
  const receipt = await build(root, profile, a, plan.sha256);
  assert.deepEqual(await verify(a, plan.sha256), receipt);
  assert.deepEqual(await build(root, profile, b, plan.sha256), receipt);
  await assert.rejects(verify(a, '0'.repeat(64)), /PROFILE_HASH_MISMATCH/);
  const archivePath = path.join(a, 'payload.zip'), archive = await fs.readFile(archivePath);
  const pos = archive.indexOf('text for packaging');
  assert(pos > 0);
  archive[pos] ^= 1;
  await fs.writeFile(archivePath, archive);
  await assert.rejects(verify(a, plan.sha256), /ENTRY_HASH_MISMATCH/);
  const good = await fs.readFile(path.join(b, 'payload.zip'));
  await fs.writeFile(archivePath, Buffer.concat([good, Buffer.alloc(1)]));
  await assert.rejects(verify(a), /END_RECORD_MISMATCH/);
  await fs.writeFile(path.join(root, 'bin', 'sample.txt'), 'text for packaginG');
  await assert.rejects(build(root, profile, path.join(root, 'third')), /SOURCE_HASH_CHANGED/);
  await assert.rejects(fs.stat(path.join(root, 'third')), {code: 'ENOENT'});
});

test('ambiguous or private package paths are rejected before reading', async () => {
  for (const paths of [['Data/User.db'], ['a/b', 'A/c'], ['a', 'A/b'], ['../outside'], ['.env']]) {
    await assert.rejects(createPlan('.', '1.0.0', 'unused-plan.json', paths));
  }
});
