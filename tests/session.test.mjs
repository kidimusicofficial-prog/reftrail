import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { verifyInstalledSession } from '../examples/session/installed-session.mjs';

async function artifact(file) {
  const path = await realpath(file);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return { path, sha256: hash.digest('hex') };
}

const executable = await artifact(process.execPath);
const script = await artifact(fileURLToPath(new URL('./fixtures/session-program.mjs', import.meta.url)));

function settings(mode) {
  return {
    executable, inputs: [script], sample: { text: randomUUID() },
    adapter: {
      args: profile => [script.path, profile, mode],
      async connect(child, signal) {
        const lines = createInterface({ input: child.stdout, crlfDelay: Infinity, signal });
        const stream = lines[Symbol.asyncIterator]();
        async function receive() {
          const line = await stream.next();
          assert.equal(line.done, false, 'Missing response');
          return JSON.parse(line.value);
        }
        assert.deepEqual(await receive(), { ready: true });
        return {
          async request(command) {
            child.stdin.write(JSON.stringify(command) + '\n');
            return receive();
          },
          stop() { child.stdin.end('{"action":"stop"}\n'); },
        };
      },
      read: client => client.request({ action: 'read' }),
      write: (client, value) => client.request({ action: 'write', value }),
      stop: client => client.stop(),
    },
  };
}

test('reads its stored value through the CLI after a clean restart', async () => {
  const result = await verifyInstalledSession(settings('persistent'));
  assert.deepEqual(result, { launches: 2, cleanExits: 2, checkedArtifacts: 2 });
});

test('rejects a write that is lost on restart', async () => {
  await assert.rejects(verifyInstalledSession(settings('volatile')), /Restart\/read check failed/);
});

test('rejects altered input before startup', async () => {
  const options = settings('persistent');
  options.inputs = [{ ...script, sha256: '0'.repeat(64) }];
  await assert.rejects(verifyInstalledSession(options), /Artifact digest mismatch/);
});
