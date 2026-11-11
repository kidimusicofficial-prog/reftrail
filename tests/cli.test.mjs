// The single reftrail command reaches both tools, and the published metadata stays consistent.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const entry = path.join(root, manifest.bin.reftrail);
const run = (...args) => spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 30_000 });

test('reftrail freezes and checks criteria, then reports the showcase catalog', async t => {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'reftrail cli & '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const criteria = path.join(dir, 'criteria.json'), baseline = path.join(dir, 'criteria-v1.json');
  await writeFile(criteria, '{"scope":"one workflow"}\n');

  const frozen = run('criteria', 'freeze', criteria, baseline);
  assert.equal(frozen.status, 0, frozen.stderr);
  const { status, sha256 } = JSON.parse(frozen.stdout);
  assert.equal(status, 'CRITERIA_FROZEN');
  assert.equal(JSON.parse(run('criteria', 'check', criteria, baseline, sha256).stdout).status, 'CRITERIA_VERIFIED');

  await writeFile(criteria, '{"scope":"a smaller workflow"}\n');
  const changed = run('criteria', 'check', criteria, baseline, sha256);
  assert.equal(changed.status, 1);
  assert.match(changed.stderr, /Criteria differ from the pinned digest/);

  const report = run('catalog', 'report', path.join(root, 'showcase', 'uniq', 'COVERAGE.csv'), '--gates', 'G01', '--strict');
  assert.equal(report.status, 0, report.stderr);
  assert.equal(JSON.parse(report.stdout).summary, '100% functional coverage, 1/1 mandatory checks passed');
});

test('reftrail explains its commands and rejects unknown ones', () => {
  const help = run('--help');
  assert.equal(help.status, 0);
  for (const line of ['criteria freeze', 'criteria check', 'catalog check', 'catalog report']) {
    assert.ok(help.stdout.includes('reftrail ' + line), line);
  }
  for (const args of [[], ['criteria'], ['publish', 'now'], ['catalog', 'remove', 'x.csv']]) {
    const result = run(...args);
    assert.equal(result.status, 1, args.join(' '));
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.length > 0);
  }
});

test('package metadata names an existing command, the tested Node.js range and the changelog version', async () => {
  assert.ok((await stat(entry)).isFile());
  assert.match(await readFile(entry, 'utf8'), /^#!\/usr\/bin\/env node\n/);
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.dependencies, undefined, 'The tools use only the Node.js standard library');
  assert.equal(manifest.engines.node, '>=22.16');
  for (const file of ['README.md', 'README.de.md']) {
    assert.ok((await readFile(path.join(root, file), 'utf8')).includes('22.16'), file + ' names another Node.js version');
  }
  const first = /^## (\d+\.\d+\.\d+)\b/m.exec(await readFile(path.join(root, 'CHANGELOG.md'), 'utf8'));
  assert.equal(first?.[1], manifest.version, 'The newest changelog entry differs from package.json');
});

// npm installs the command as a link to tools/reftrail.mjs. A project folder can also be reached
// through a link. In both cases the started path differs from the real path of the script. A
// script that compares the two unresolved ends without doing anything and reports success.
// Windows needs special rights for a link to a file, so the same situation is produced there
// with a folder junction, which needs none.
// The link points at a copy inside the temporary folder, never at the repository, so removing
// the temporary folder afterwards cannot reach the repository through the link.
async function reachedThroughLink(t) {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'linked start & '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const copy = path.join(dir, 'copy');
  for (const part of ['tools', 'integration', 'examples/windows', 'showcase/uniq']) {
    await cp(path.join(root, ...part.split('/')), path.join(copy, ...part.split('/')), { recursive: true });
  }
  const folder = path.join(dir, 'linked repository');
  await symlink(copy, folder, process.platform === 'win32' ? 'junction' : 'dir');
  const script = name => path.join(folder, ...name.split('/'));
  if (process.platform === 'win32') return { dir, script, command: script('tools/reftrail.mjs') };
  const command = path.join(dir, 'reftrail'); // As in node_modules/.bin
  await symlink(path.join(copy, 'tools', 'reftrail.mjs'), command);
  return { dir, script, command };
}
const start = (...args) => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 30_000 });

test('the installed command reports a missing file as an error instead of ending silently', async t => {
  const { dir, command } = await reachedThroughLink(t);
  const missing = start(command, 'catalog', 'check', path.join(dir, 'missing.csv'));
  assert.equal(missing.status, 1, 'A missing catalog was accepted');
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /ENOENT/);

  const report = start(command, 'catalog', 'report', path.join(root, 'showcase', 'uniq', 'COVERAGE.csv'), '--gates', 'G01', '--strict');
  assert.equal(report.status, 0, report.stderr);
  assert.equal(JSON.parse(report.stdout).summary, '100% functional coverage, 1/1 mandatory checks passed');

  const pin = '0'.repeat(64);
  const check = start(command, 'criteria', 'check', path.join(dir, 'missing.json'), path.join(dir, 'missing-v1.json'), pin);
  assert.equal(check.status, 1, 'Missing criteria were accepted');
  assert.match(check.stderr, /ENOENT/);
  const nothing = start(command);
  assert.equal(nothing.status, 1);
  assert.match(nothing.stderr, /reftrail criteria freeze/);
});

test('every start script works when its folder is reached through a link', async t => {
  const { dir, script } = await reachedThroughLink(t);
  // Each call must produce its own text. Before the correction each of them printed nothing and ended with exit code 0.
  const expectations = [
    [['tools/reftrail.mjs', '--help'], 0, /reftrail catalog report/],
    [['tools/catalog.mjs', '--help'], 0, /catalog\.mjs report/],
    [['tools/criteria.mjs', '--help'], 0, /criteria\.mjs freeze/],
    [['showcase/uniq/verify.mjs', '--help'], 0, /verify\.mjs \[--reference\]/],
    [['integration/verify.mjs', '--help'], 0, /integration\/verify\.mjs/],
    [['examples/windows/package-windows.mjs', '--help'], 0, /plan <source-dir>/],
    [['examples/windows/check-release-source.mjs', '--help'], 0, /check --root DIR/],
    [['tools/catalog.mjs', 'check', path.join(dir, 'missing.csv')], 1, /ENOENT/],
    [['tools/criteria.mjs', 'check', path.join(dir, 'a'), path.join(dir, 'b'), 'no digest'], 1, /64 hexadecimal/],
    [['examples/windows/package-windows.mjs', 'verify', path.join(dir, 'missing')], 1, /ENOENT/],
  ];
  for (const [[name, ...args], status, text] of expectations) {
    const result = start(script(name), ...args);
    const label = name + ' ' + args[0];
    assert.equal(result.status, status, label + ': exit code\n' + result.stderr);
    assert.match(status === 0 ? result.stdout : result.stderr, text, label + ': expected its own message');
  }
});

test('no start script compares its started path without resolving links', async () => {
  // The comparison that failed. Scripts that are only started run unconditionally, and scripts
  // that are also imported resolve both paths first.
  const unresolved = /path\.resolve\(process\.argv\[1\]\)\s*===\s*fileURLToPath\(import\.meta\.url\)/;
  const scripts = (await readdir(root, { recursive: true }))
    .filter(name => name.endsWith('.mjs') && !/(^|[\\/])(node_modules|\.git|\.artifacts|tests)([\\/]|$)/.test(name));
  assert.ok(scripts.length >= 12, 'Expected the script tree');
  for (const name of scripts) {
    assert.doesNotMatch(await readFile(path.join(root, name), 'utf8'), unresolved, name);
  }
});
