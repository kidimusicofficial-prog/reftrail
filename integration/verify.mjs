// Run acceptance on the tested source snapshot, then verify the redistributable CLI.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { checkReleaseSource } from '../examples/windows/check-release-source.mjs';
import {
  freezeSource, isWithin, jsonBytes, sha256, sourceHashes,
} from '../examples/windows/windows-build-contract.mjs';
import { createPlan, build, verify } from '../examples/windows/package-windows.mjs';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const acceptanceScript = 'showcase/uniq/verify.mjs';
const cli = 'showcase/uniq/line-runs.mjs';
const payload = ['LICENSE', cli];

async function run() {
  const temp = await realpath(tmpdir());
  assert(path.relative(root, temp) !== '' && !isWithin(root, temp),
    'Choose a system temporary directory outside the repository');
  const output = await mkdtemp(path.join(temp, 'source-package-'));
  console.error('Run directory:', output);

  // Cover the published files, including everything the tests read, so the frozen copy can
  // run them on its own. Git settings and the workflow definition stay outside the receipt.
  const scope = {
    directories: ['docs', 'examples', 'integration', 'prompts', 'showcase', 'templates', 'tests', 'tools'],
    files: ['CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'README.de.md', 'README.en.md', 'README.md', 'package.json'],
  };
  const check = await checkReleaseSource({ root, output: path.join(output, 'check'), scope });
  assert.equal(check.status, 'PASS', 'See the source receipt and test log in the check directory');
  const snapshot = await freezeSource(root, path.join(output, 'snapshot'), check.receipt, check.sha256);
  const sourceBytes = await readFile(check.receipt);
  assert.equal(sha256(sourceBytes), check.sha256, 'Source receipt changed');
  const source = JSON.parse(sourceBytes);

  const childTemp = path.join(output, 'check', 'temp');
  const env = { ...process.env, TEMP: childTemp, TMP: childTemp, TMPDIR: childTemp };
  for (const name of Object.keys(env)) {
    if (['NODE_OPTIONS', 'NODE_PATH', 'NODE_TEST_CONTEXT'].includes(name.toUpperCase())) delete env[name];
  }
  const { stdout } = await execute(process.execPath, [acceptanceScript], {
    cwd: snapshot.root, env, windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024, encoding: 'buffer',
  });
  const acceptance = JSON.parse(stdout);
  assert.equal(acceptance.status, 'PASS', 'Showcase acceptance failed');
  assert.equal(acceptance.criteriaSha256, source.sourceHashes['showcase/uniq/criteria.json'],
    'Showcase used different acceptance criteria');

  // Rerun the same tests from the frozen copy. A test that reads files outside the receipt scope fails here.
  const snapshotTap = await execute(process.execPath,
    ['--test', '--test-concurrency=1', '--test-reporter=tap', '--', ...source.testFiles], {
      cwd: snapshot.root, env, windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8',
    }).then(result => result.stdout, error => {
      const failed = String(error.stdout ?? '').split('\n').filter(line => /^not ok|ENOENT/.test(line.trim()));
      throw new Error('Tests failed in the frozen copy; a test may read files outside the receipt scope.\n' +
        failed.join('\n'));
    });
  const snapshotTestsPassed = Number(/^# pass (\d+)\r?$/m.exec(snapshotTap)?.[1]);
  assert.equal(snapshotTestsPassed, source.tests.pass, 'Frozen copy ran a different number of passing tests');
  assert.deepEqual(await sourceHashes(snapshot.root, scope), source.sourceHashes,
    'Snapshot changed during acceptance or tests');
  const acceptanceReceipt = path.join(output, 'acceptance.json');
  await writeFile(acceptanceReceipt, stdout, { flag: 'wx' });
  assert.deepEqual(await readFile(acceptanceReceipt), stdout);

  const plan = await createPlan(snapshot.root, '1.0.0', path.join(output, 'profile.json'), payload);
  const profileBytes = await readFile(plan.profile);
  assert.equal(sha256(profileBytes), plan.sha256, 'Package profile changed');
  const profile = JSON.parse(profileBytes);
  assert.deepEqual(profile.files.map(record => record.path), payload);
  for (const record of profile.files) {
    assert.equal(record.sha256, source.sourceHashes[record.path], 'Payload differs from tested source: ' + record.path);
  }

  const packageDir = path.join(output, 'package');
  await build(snapshot.root, plan.profile, packageDir, plan.sha256);
  const result = await verify(packageDir, plan.sha256);
  const packageReceipt = path.join(packageDir, 'receipt.json');
  const report = {
    status: result.status,
    testsPassed: source.tests.pass,
    snapshotTestsPassed,
    sourceReceipt: check.receipt,
    sourceReceiptSha256: check.sha256,
    showcaseCommand: ['node', acceptanceScript],
    acceptanceReceipt,
    acceptanceReceiptSha256: sha256(stdout),
    criteriaSha256: acceptance.criteriaSha256,
    payload,
    profile: plan.profile,
    profileSha256: plan.sha256,
    archive: path.join(packageDir, result.archive.path),
    archiveSha256: result.archive.sha256,
    packageReceipt,
    packageReceiptSha256: sha256(await readFile(packageReceipt)),
  };
  const runReceipt = path.join(output, 'integration.json');
  const bytes = jsonBytes(report);
  await writeFile(runReceipt, bytes, { flag: 'wx' });
  assert.deepEqual(await readFile(runReceipt), bytes);
  return { ...report, runReceipt, runReceiptSha256: sha256(bytes) };
}

// This file is only ever started, never imported, so it runs unconditionally. A start check that
// compared paths ended without a message when the folder was reached through a link.
{
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log('Usage: node integration/verify.mjs\nRuns tests, reruns them from the frozen copy, runs showcase acceptance, then packages the verified CLI in a new temporary directory.');
    } else {
      if (args.length) throw new Error('Usage: node integration/verify.mjs [--help]');
      console.log(JSON.stringify(await run(), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
