// Mutation check for R07: the early-exit cases must reject a program that keeps reading after
// its reader has closed standard output. A weaker harness that closed the input itself let such
// a program pass.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('early-exit cases reject a program that keeps reading after its output closed', async t => {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'early-exit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(path.join(root, 'tools'), path.join(dir, 'tools'), { recursive: true });
  await cp(path.join(root, 'showcase', 'uniq'), path.join(dir, 'showcase', 'uniq'), { recursive: true });

  const program = path.join(dir, 'showcase', 'uniq', 'line-runs.mjs');
  const original = await readFile(program, 'utf8');
  const quietStop = '    await pipeline(lineRuns(process.stdin, args[0]), process.stdout);\n';
  assert.equal(original.split(quietStop).length, 2, 'Expected one pipeline call in the showcase program');
  // The faulty variant ignores failed writes and reads until end of input.
  await writeFile(program, original.replace(quietStop,
    "    process.stdout.on('error', () => {});\n" +
    '    for await (const part of lineRuns(process.stdin, args[0])) {\n' +
    '      if (!process.stdout.destroyed) process.stdout.write(part);\n' +
    '    }\n'));

  const result = spawnSync(process.execPath, [path.join(dir, 'showcase', 'uniq', 'verify.mjs')], {
    cwd: dir, encoding: 'utf8', timeout: 60_000,
  });
  assert.equal(result.status, 1, 'The faulty variant passed:\n' + result.stdout + result.stderr);
  assert.match(result.stderr, /kept running after its reader closed standard output/);
});
