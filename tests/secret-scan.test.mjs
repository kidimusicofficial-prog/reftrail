import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanOwnSecrets } from '../examples/qa/secret-scan.mjs';

async function workspace(t) {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'secret-scan-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('scanner reports the verified byte count for a clean directory', async t => {
  const dir = await workspace(t);
  const content = Buffer.from('Prüfdaten');
  await writeFile(path.join(dir, 'sample.txt'), content);
  const result = await scanOwnSecrets([dir], [randomUUID()]);
  assert.equal(result.status, 'PASS');
  assert.equal(result.files, 1);
  assert.equal(result.bytes, content.length);
  assert.equal(result.matches, 0);
});

for (const encoding of ['utf8', 'utf16le']) {
  test('scanner detects a synthetic ' + encoding + ' secret spanning two chunks', async t => {
    const dir = await workspace(t);
    const file = path.join(dir, 'sample.bin');
    const secret = 'Grüße-' + randomUUID();
    const needle = Buffer.from(secret, encoding);

    await writeFile(file, Buffer.alloc(0));
    const probe = createReadStream(file);
    const chunkSize = probe.readableHighWaterMark;
    await probe.toArray();

    const contents = Buffer.concat([Buffer.alloc(chunkSize - 3), needle]);
    await writeFile(file, contents);
    let chunks = 0;
    for await (const chunk of createReadStream(file)) {
      chunks++;
      assert.equal(chunk.includes(needle), false);
    }
    assert.equal(chunks, 2);
    await assert.rejects(scanOwnSecrets([dir], [secret]), { message: 'OWN_ARTIFACT_SECRET_LEAK' });
  });
}

test('scanner rejects requests to exclude a directory', async t => {
  const dir = await workspace(t);
  await assert.rejects(scanOwnSecrets([dir], [randomUUID()], { excludeRelativePrefixes: ['subdir/'] }),
    /Path exclusions are unsupported/);
});
