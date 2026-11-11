// Run a caller-supplied acceptance case against a single-process executable.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

async function verifyFiles(records) {
  for (const record of records) {
    assert.ok(path.isAbsolute(record.path), 'An absolute artifact path is required');
    assert.match(record.sha256, /^[a-f0-9]{64}$/);
    assert.equal(path.relative(record.path, await realpath(record.path)), '',
      'Artifact path contains a link');
    assert.ok((await lstat(record.path)).isFile(), 'Artifact is not a regular file');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(record.path)) hash.update(chunk);
    assert.equal(hash.digest('hex'), record.sha256, 'Artifact digest mismatch');
  }
}

async function runOnce({ executable, args, profile, adapter, exercise, timeoutMs }) {
  const child = spawn(executable.path, args, {
    cwd: profile, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'],
  });
  // A closed input pipe is also observed through premature process closure.
  child.stdin.on('error', () => {});
  let processError;
  child.on('error', error => { processError = error; });
  const closed = new Promise(resolve => {
    child.once('close', (code, signal) => resolve({ code, signal, error: processError }));
  });
  const interrupted = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Session exceeded its deadline');
      reject(error);
      interrupted.abort(error);
    }, timeoutMs);
  });

  try {
    const signal = interrupted.signal;
    const prematureExit = closed.then(result => {
      throw result.error ?? new Error('Process closed before the acceptance check completed');
    });
    const checked = async () => {
      const client = await adapter.connect(child, signal);
      await exercise(client, signal);
      return client;
    };
    const client = await Promise.race([checked(), prematureExit, expired]);
    const result = await Promise.race([
      Promise.resolve(adapter.stop(client, signal)).then(() => closed),
      expired,
    ]);
    if (result.error) throw result.error;
    assert.equal(result.signal, null, 'Process terminated by signal');
    assert.equal(result.code, 0, 'Unexpected process exit code');
  } finally {
    clearTimeout(timer);
    interrupted.abort();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    child.stdin.destroy();
    child.stdout.destroy();
    await closed;
  }
}

/**
 * executable and inputs are {path, sha256} records. The adapter supplies
 * args(profile), connect(child, signal), read(client, signal),
 * write(client, sample, signal) and stop(client, signal).
 */
export async function verifyInstalledSession({
  executable, inputs = [], adapter, sample, emptyValue = null, timeoutMs = 30_000,
}) {
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 2_147_483_647);
  assert.notEqual(sample, undefined, 'A sample value is required');
  assert.notDeepEqual(sample, emptyValue, 'Choose a sample distinct from the initial state');
  const records = [executable, ...inputs];
  await verifyFiles(records);
  const profile = await mkdtemp(path.join(await realpath(tmpdir()), 'session-'));
  try {
    const options = { executable, profile, adapter, timeoutMs };
    const args = adapter.args(profile);
    assert.ok(Array.isArray(args) && args.every(arg => typeof arg === 'string'));
    await runOnce({ ...options, args, exercise: async (client, signal) => {
      assert.deepEqual(await adapter.read(client, signal), emptyValue, 'Unexpected initial state');
      await adapter.write(client, sample, signal);
      assert.deepEqual(await adapter.read(client, signal), sample, 'Write/read check failed');
    } });
    await verifyFiles(records);
    await runOnce({ ...options, args, exercise: async (client, signal) => {
      assert.deepEqual(await adapter.read(client, signal), sample, 'Restart/read check failed');
    } });
    await verifyFiles(records);
    return { launches: 2, cleanExits: 2, checkedArtifacts: records.length };
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
