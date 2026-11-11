// Run the acceptance cases through the public command-line interface.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCriteria } from '../../tools/criteria.mjs';

const here = fileURLToPath(new URL('./', import.meta.url));
// Revision 2 of the criteria. Revision 1 stays in baseline/criteria.json under its own pin.
const pin = 'aeb2acf023f6a27b7042b09b194ccf0a3b107637fc928f2be26a81bc7d520a75';
const previousPin = 'ca0f09342cbe9d306e3cb8569dde6e1c5ea33a91d2619cfcd5ba1ade7a96fd90';
const executable = path.join(here, 'line-runs.mjs');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function launch(program, args, input, cwd) {
  const result = spawnSync(program, args, {
    cwd, input, env: { ...process.env, LC_ALL: 'C' }, timeout: 5000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.notEqual(result.status, null, 'Process terminated before returning an exit code');
  return result;
}

function compareOutput(result, expected, label) {
  assert.equal(result.status, 0, label + ': unexpected exit status');
  assert.equal(result.stderr.length, 0, label + ': unexpected diagnostic');
  assert.equal(result.stdout.length, expected.length, label + ': output length differs');
  assert.ok(result.stdout.equals(expected), label + ': output bytes differ');
}

// Send the initial distinct lines, keep standard input open and close the read end after the
// first output chunk, as a reader such as `head -n 1` would. Further distinct lines keep arriving,
// so a program that ignores the failed write and keeps reading never sees end of input.
function launchWithEarlyClose(program, args, initialLines, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd, env: { ...process.env, LC_ALL: 'C' }, windowsHide: true });
    const stderr = [];
    let firstChunk = 0;
    let next = 1;
    const lines = count => {
      const batch = [];
      for (let i = 0; i < count; i++) batch.push(String(next++) + '\n');
      return Buffer.from(batch.join(''));
    };
    const feed = setInterval(() => {
      if (firstChunk && child.stdin.writable && child.stdin.writableLength < 1024 * 1024) child.stdin.write(lines(1000));
    }, 10);
    let timedOut = false;
    const timer = setTimeout(() => {
      // Report only after the process has closed, so Windows can release its working directory.
      timedOut = true;
      clearInterval(feed);
      child.kill('SIGKILL');
    }, timeoutMs);
    child.on('error', error => { clearInterval(feed); clearTimeout(timer); reject(error); });
    child.stdin.on('error', () => {}); // Writing fails once the program has stopped reading.
    child.stderr.on('data', chunk => stderr.push(chunk));
    child.stdout.once('data', chunk => { firstChunk = chunk.length; child.stdout.destroy(); });
    child.on('close', (status, signal) => {
      clearInterval(feed);
      clearTimeout(timer);
      if (timedOut) reject(new Error('Process kept running after its reader closed standard output'));
      else resolve({ status, signal, firstChunk, stderr: Buffer.concat(stderr) });
    });
    child.stdin.write(lines(initialLines)); // Standard input stays open.
  });
}

function checkEarlyClose(result, label) {
  assert.ok(result.firstChunk > 0, label + ': no output before the reader closed');
  assert.equal(result.stderr.length, 0, label + ': unexpected diagnostic ' + JSON.stringify(result.stderr.toString().slice(0, 120)));
}

function supplementalInput() {
  // This independently selected input crosses ordinary stream chunk boundaries.
  const longLine = 'q'.repeat(70017);
  const rows = [
    'alpha', 'alpha', 'Alpha', 'Alpha', 'Alpha', '', '\0z', '\0z', 'alpha', 'alpha',
    '\xff', longLine, longLine, longLine.slice(1) + 'r', 'z\r', 'z\r', 'z',
  ];
  return Buffer.from(rows.join('\n'), 'latin1');
}

const supplemental = [
  { args: [], digest: '74b255518b81eea990037aa3b0e4cb7eb38c773cc9b84b1fe142bef2ffe5274b' },
  { args: ['-c'], digest: 'a82bef636a1f0945097a40987b46c3b978f15e3572534084883579e535afc8df' },
  { args: ['-d'], digest: '2961348c954e93306c06e7c714ca13399f990f1c2b42af18c9f4176191bfc38c' },
  { args: ['-u'], digest: '32b99ed5ac51d62cb15828df27c7ce774a2a54d4c03a9fe61a9e636695de558d' },
];

async function verify(live) {
  const criteriaFile = path.join(here, 'criteria.json');
  const baselineFile = path.join(here, 'baseline', 'criteria-v2.json');
  await verifyCriteria(criteriaFile, baselineFile, pin);
  assert.equal(sha256(await readFile(path.join(here, 'baseline', 'criteria.json'))), previousPin,
    'Retained revision 1 baseline changed');
  const bytes = await readFile(criteriaFile);
  assert.equal(sha256(bytes), pin, 'Criteria changed after the baseline check');
  const spec = JSON.parse(bytes);
  const work = await mkdtemp(path.join(tmpdir(), 'reference-case-'));
  try {
    let referenceVersion = null;
    if (live) {
      const version = launch('uniq', ['--version'], Buffer.alloc(0), work);
      assert.equal(version.status, 0, 'A GNU Coreutils uniq executable on PATH is required');
      referenceVersion = version.stdout.toString().split(/\r?\n/)[0];
      assert.match(referenceVersion, /^uniq \(GNU coreutils\) [\d.]+/, 'Expected GNU Coreutils uniq');
    }
    for (const item of spec.referenceCases) {
      const input = Buffer.from(item.stdinHex, 'hex');
      const expected = Buffer.from(item.stdoutHex, 'hex');
      const actual = launch(process.execPath, [executable, ...item.args], input, work);
      compareOutput(actual, expected, item.id);
      if (live) compareOutput(launch('uniq', item.args, input, work), actual.stdout, item.id + ' reference');
    }
    // Supply an existing file so a missing file cannot masquerade as an argument rejection.
    await writeFile(path.join(work, 'file.txt'), 'data\n');
    for (const item of spec.localRejections) {
      const result = launch(process.execPath, [executable, ...item.args], Buffer.from('x\nx\n'), work);
      assert.notEqual(result.status, 0, item.id + ': unsupported invocation accepted');
      assert.equal(result.stdout.length, 0, item.id + ': unexpected output');
      assert.ok(result.stderr.length, item.id + ': missing diagnostic');
    }
    const input = supplementalInput();
    assert.equal(sha256(input), '8018aa8053db9a584e02492f726d21da14a418f525eef6b921c6391c6afe02de');
    for (const item of supplemental) {
      const actual = launch(process.execPath, [executable, ...item.args], input, work);
      const label = 'Supplemental ' + (item.args[0] || 'default');
      assert.equal(actual.status, 0, label);
      assert.equal(actual.stderr.length, 0, label);
      assert.equal(sha256(actual.stdout), item.digest, label + ': differs from recorded reference output');
      if (live) compareOutput(launch('uniq', item.args, input, work), actual.stdout, label + ' reference');
    }
    for (const item of spec.closedOutputCases) {
      checkEarlyClose(await launchWithEarlyClose(process.execPath, [executable, ...item.args], item.distinctLines, work, item.timeoutMs), item.id);
      if (live) checkEarlyClose(await launchWithEarlyClose('uniq', item.args, item.distinctLines, work, item.timeoutMs), item.id + ' reference');
    }
    return {
      status: 'PASS',
      criteriaRevision: spec.revision,
      criteriaSha256: pin,
      specifiedExamplesPassed: spec.referenceCases.length,
      localRejectionsPassed: spec.localRejections.length,
      supplementalReferenceDigestsPassed: supplemental.length,
      closedOutputCasesPassed: spec.closedOutputCases.length,
      // Byte comparisons and early-exit checks prove different things, so they are counted apart.
      liveByteComparisons: live ? spec.referenceCases.length + supplemental.length : 0,
      liveEarlyExitChecks: live ? spec.closedOutputCases.length : 0,
      liveReferenceVersion: referenceVersion,
      node: process.version, platform: process.platform, architecture: process.arch,
    };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

// This file is only ever started, never imported, so it runs unconditionally. A start check that
// compared paths ended without a message when the folder was reached through a link.
{
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log('Usage: node showcase/uniq/verify.mjs [--reference]\nWith --reference, compare against GNU Coreutils uniq on PATH (LC_ALL=C).');
    } else {
      assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--reference'), 'Usage: verify.mjs [--reference]');
      console.log(JSON.stringify(await verify(args.length === 1), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
