import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkReleaseSource } from '../examples/windows/check-release-source.mjs';
import { assertNames, freezeSource, safeRelative, sourceHashes } from '../examples/windows/windows-build-contract.mjs';

async function fixture(t, contents) {
  const parent = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'source-check-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'project');
  await fs.mkdir(path.join(root, 'test'), { recursive: true });
  await fs.writeFile(path.join(root, 'test', 'value.test.mjs'), contents);
  return { root, parent, output: path.join(parent, 'check'), scope: { directories: ['test'], files: [] } };
}

test('file lists reject Windows aliases, unsafe components and file/directory collisions', () => {
  for (const name of ['../outside', 'folder//file', 'COM¹.txt', 'c:/temp', 'nul .txt', 'a\u007f', 'f.']) {
    assert.throws(() => safeRelative(name), undefined, name);
  }
  for (const names of [['Dir/x', 'dir/y'], ['a', 'A/b'], ['b/c', 'b'], ['z', 'z']]) {
    assert.throws(() => assertNames(names));
  }
  assert.doesNotThrow(() => assertNames(['source/a', 'source/b']));
});

test('receipt binds both inventories, selected tests and the frozen copy', async t => {
  const contents = "import test from 'node:test';\nimport assert from 'node:assert/strict';\n" +
    "test('value', () => assert.equal(1 + 1, 2));\n";
  const options = await fixture(t, contents);
  const result = await checkReleaseSource(options);
  assert.equal(result.status, 'PASS');
  const target = path.join(options.parent, 'snapshot');
  const snapshot = await freezeSource(options.root, target, result.receipt, result.sha256);
  assert.equal(await fs.readFile(path.join(snapshot.root, 'test', 'value.test.mjs'), 'utf8'), contents);
  await assert.rejects(() => freezeSource(options.root, target, result.receipt, result.sha256));
  await fs.writeFile(path.join(options.root, 'test', 'value.test.mjs'), contents + '// change\n');
  await assert.rejects(() => freezeSource(options.root, target + '-new', result.receipt, result.sha256), /differs/);
  await assert.rejects(() => freezeSource(options.root, target + '-new', result.receipt, '0'.repeat(64)), /digest/);
});

test('a skipped selected test prevents a passing receipt', async t => {
  const options = await fixture(t, "import test from 'node:test';\ntest.skip('optional', () => {});\n");
  const result = await checkReleaseSource(options);
  assert.equal(result.status, 'FAIL');
  const receipt = JSON.parse(await fs.readFile(result.receipt, 'utf8'));
  assert.equal(receipt.tests.skipped, 1);
});

test('changes to the source during tests are recorded', async t => {
  const options = await fixture(t,
    "import test from 'node:test';\nimport fs from 'node:fs/promises';\n" +
    "test('write', () => fs.writeFile('test/added.txt', 'observed'));\n");
  const result = await checkReleaseSource(options);
  const receipt = JSON.parse(await fs.readFile(result.receipt, 'utf8'));
  assert.equal(receipt.status, 'FAIL');
  assert.deepEqual(receipt.changedFiles, ['test/added.txt']);
});

test('source input excludes database files and rejects linked directories', async t => {
  const options = await fixture(t, '');
  const privateFile = path.join(options.root, 'test', 'local.db');
  await fs.writeFile(privateFile, '');
  await assert.rejects(() => sourceHashes(options.root, options.scope), /Excluded/);
  await fs.unlink(privateFile);
  await fs.symlink(options.root, path.join(options.root, 'test', 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(() => sourceHashes(options.root, options.scope), /link|junction/i);
});
