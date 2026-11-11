import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fsPromises, { mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { freezeCriteria, verifyCriteria } from '../tools/criteria.mjs';

const tool = fileURLToPath(new URL('../tools/criteria.mjs', import.meta.url));
const forcedEnd = new URL('./fixtures/forced-end.mjs', import.meta.url).href;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Replace file system calls for the tool while one freeze runs, then restore them. The tool
// imports the calls by name, so the replacement is passed on to those imports.
async function withFileSystem(replacements, action) {
  const originals = Object.fromEntries(Object.keys(replacements).map(name => [name, fsPromises[name]]));
  Object.assign(fsPromises, replacements);
  syncBuiltinESMExports();
  try {
    return await action();
  } finally {
    Object.assign(fsPromises, originals);
    syncBuiltinESMExports();
  }
}

// An open call whose file accepts the first 4,096 bytes and then reports a full disk.
const stoppingOpen = (realOpen, affected) => async (file, ...rest) => {
  const handle = await realOpen(file, ...rest);
  if (affected(String(file))) {
    handle.writeFile = async bytes => {
      await handle.write(bytes.subarray(0, 4096));
      throw Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });
    };
  }
  return handle;
};

async function workspace(t) {
  const dir = await mkdtemp(path.join(await realpath(tmpdir()), 'criteria test & '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { source: path.join(dir, 'criteria.csv'), baseline: path.join(dir, 'criteria-v1.csv') };
}

test('freeze preserves complete file bytes and check accepts their independent digest', async t => {
  const { source, baseline } = await workspace(t);
  const bytes = Buffer.from('\uFEFFID;Criterion\r\nA1;Größe\r\n');
  await writeFile(source, bytes);
  const expected = createHash('sha256').update(bytes).digest('hex');
  assert.deepEqual(await freezeCriteria(source, baseline), { status: 'CRITERIA_FROZEN', sha256: expected });
  assert.deepEqual(await readFile(baseline), bytes);
  assert.deepEqual(await verifyCriteria(source, baseline, expected), { status: 'CRITERIA_VERIFIED', sha256: expected });
});

test('check rejects changed criteria and detects rewriting both files against the original pin', async t => {
  const { source, baseline } = await workspace(t);
  await writeFile(source, 'Original acceptance criterion\n');
  const { sha256 } = await freezeCriteria(source, baseline);
  await assert.rejects(verifyCriteria(source, baseline, 'bad'), /64 hexadecimal/);
  const changed = 'Weaker acceptance criterion\n';
  await writeFile(source, changed);
  await assert.rejects(verifyCriteria(source, baseline, sha256), /Criteria differ/);
  await assert.rejects(freezeCriteria(source, baseline), { code: 'EEXIST' });
  assert.equal(await readFile(baseline, 'utf8'), 'Original acceptance criterion\n');
  await writeFile(baseline, changed);
  await assert.rejects(verifyCriteria(source, baseline, sha256), /Baseline differs/);
});

test('two concurrent freezes cannot replace one another', async t => {
  const { source, baseline } = await workspace(t);
  const other = source + '.other';
  await writeFile(source, 'first criterion');
  await writeFile(other, 'second criterion');
  const results = await Promise.allSettled([freezeCriteria(source, baseline), freezeCriteria(other, baseline)]);
  const winner = results.findIndex(r => r.status === 'fulfilled');
  assert.notEqual(winner, -1);
  const loser = results[1 - winner];
  assert.equal(loser.status, 'rejected');
  assert.equal(loser.reason.code, 'EEXIST');
  const expected = winner === 0 ? 'first criterion' : 'second criterion';
  assert.equal(await readFile(baseline, 'utf8'), expected);
});

test('freeze takes its copy from the bytes it hashed and leaves nothing behind for an unusable source', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  await assert.rejects(freezeCriteria(source, baseline), { code: 'ENOENT' });
  await assert.rejects(freezeCriteria(directory, baseline), /Expected a regular file/);
  await assert.rejects(readFile(baseline), { code: 'ENOENT' });

  const bytes = Buffer.from([0xef, 0xbb, 0xbf, 0x00, 0xff, 0x0d, 0x0a, 0x0a]);
  await writeFile(source, bytes);
  const { sha256 } = await freezeCriteria(source, baseline);
  assert.equal(sha256, createHash('sha256').update(bytes).digest('hex'));
  // A later edit of the working file leaves the frozen copy and its digest untouched.
  await writeFile(source, 'edited after the freeze');
  assert.deepEqual(await readFile(baseline), bytes);
  assert.equal(createHash('sha256').update(await readFile(baseline)).digest('hex'), sha256);
  await assert.rejects(verifyCriteria(source, baseline, sha256), /Criteria differ/);
});

test('an edit during the freeze never leaves a baseline that differs from the reported digest', async t => {
  const { source } = await workspace(t);
  const body = 'criterion;'.repeat(40_000);
  await writeFile(source, body);
  let editing = true, edits = 0;
  // A system may refuse one of these overlapping writes. The check below holds either way.
  const editor = (async () => { while (editing) await writeFile(source, body + edits++).catch(() => {}); })();
  const outcomes = { frozen: 0, refused: 0 };
  try {
    for (let i = 0; i < 40; i++) {
      const baseline = source + '.v' + i;
      const result = await freezeCriteria(source, baseline).catch(error => error);
      if (result instanceof Error) {
        await assert.rejects(readFile(baseline), { code: 'ENOENT' }, 'A refused freeze left a baseline behind');
        outcomes.refused++;
      } else {
        assert.equal(createHash('sha256').update(await readFile(baseline)).digest('hex'), result.sha256);
        outcomes.frozen++;
      }
    }
  } finally {
    editing = false;
    await editor;
  }
  assert.equal(outcomes.frozen + outcomes.refused, 40);
});

test('a write that stops after 4,096 of 65,536 bytes leaves nothing behind and the same name works again', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  const bytes = randomBytes(65536);
  await writeFile(source, bytes);

  const written = [];
  const realOpen = fsPromises.open;
  await withFileSystem({
    open: stoppingOpen(realOpen, file => { written.push(path.basename(file)); return true; }),
  }, () => assert.rejects(freezeCriteria(source, baseline),
    { code: 'ENOSPC', message: /^Nothing was frozen\. The working copy could not be written: ENOSPC/ }));
  assert.equal(written.length, 1, 'Expected one file to be opened for writing');
  assert.notEqual(written[0], path.basename(baseline), 'The bytes went straight to the baseline name');
  assert.deepEqual(await readdir(directory), ['criteria.csv'], 'An incomplete file stayed behind');

  // The next attempt uses the same baseline name and succeeds.
  assert.deepEqual(await freezeCriteria(source, baseline), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
  assert.deepEqual(await readFile(baseline), bytes);
  assert.deepEqual((await readdir(directory)).sort(), ['criteria-v1.csv', 'criteria.csv']);
  assert.equal((await stat(baseline)).nlink, 1, 'The working file is still linked to the baseline');
  await assert.rejects(freezeCriteria(source, baseline), { code: 'EEXIST', message: /already exists and is never replaced/ });
});

test('storage without hard links: the freeze stops before anything exists under the baseline name', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  const bytes = randomBytes(65536);
  await writeFile(source, bytes);
  const refused = async () => { throw Object.assign(new Error('EPERM: operation not permitted, link'), { code: 'EPERM' }); };
  const realOpen = fsPromises.open;
  const openedForWriting = [];
  const recordingOpen = async (file, flags, ...rest) => {
    if (flags !== 'r') openedForWriting.push(path.basename(String(file)));
    return realOpen(file, flags, ...rest);
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    await withFileSystem({ link: refused, open: recordingOpen }, () => assert.rejects(freezeCriteria(source, baseline),
      { code: 'EPERM', message: /^Nothing was frozen\. .*needs storage that supports hard links.* Nothing was written under the baseline name\./s }));
    assert.deepEqual(await readdir(directory), ['criteria.csv'], 'Attempt ' + attempt + ' left a file behind');
  }
  // The tool has no second way of writing: the baseline name was never opened.
  assert.equal(openedForWriting.length, 2);
  assert.ok(openedForWriting.every(name => /^reftrail-[0-9a-f-]{36}\.partial$/.test(name)), openedForWriting.join());

  // With hard links available again, the same name works.
  assert.deepEqual(await freezeCriteria(source, baseline), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
  assert.deepEqual(await readFile(baseline), bytes);
});

// A process that is ended by force cannot clean up. These cases end a real process at each
// point of a freeze and state what the documentation promises for the restart.
const frozenByChild = (source, baseline, env = {}) => spawnSync(process.execPath, ['--import', forcedEnd, tool, 'freeze', source, baseline],
  { encoding: 'utf8', timeout: 30_000, env: { ...process.env, ...env } });
const working = async directory => (await readdir(directory)).filter(name => name.endsWith('.partial'));

test('a freeze ended by force while writing or before publishing leaves no baseline, and the same name works again', async t => {
  for (const [end, links, expectedSize] of [['write', '', 4096], ['before-link', '', 65536], ['write', 'refused', 4096]]) {
    const { source, baseline } = await workspace(t);
    const directory = path.dirname(source);
    const label = end + (links ? ', hard links ' + links : '');
    const bytes = randomBytes(65536);
    await writeFile(source, bytes);

    const ended = frozenByChild(source, baseline, { REFTRAIL_TEST_END: end, REFTRAIL_TEST_LINKS: links });
    assert.notEqual(ended.status, 0, label + ': the ended freeze reported success');
    assert.equal(ended.stdout, '', label + ': a digest was reported');
    await assert.rejects(readFile(baseline), { code: 'ENOENT' }, label + ': a file exists under the baseline name');
    const left = await working(directory);
    assert.equal(left.length, 1, label + ': expected the working file to remain');
    assert.equal((await stat(path.join(directory, left[0]))).size, expectedSize, label);

    // Restart as documented: the baseline name is free. The working file can be deleted at any time.
    const again = frozenByChild(source, baseline);
    assert.equal(again.status, 0, label + ': ' + again.stderr);
    assert.deepEqual(JSON.parse(again.stdout), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
    assert.deepEqual(await readFile(baseline), bytes);
    assert.deepEqual((await readdir(directory)).sort(), ['criteria-v1.csv', 'criteria.csv', left[0]].sort());
  }
});

test('a freeze ended by force after publishing leaves a complete baseline, and the restart is stated', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  const bytes = randomBytes(65536);
  await writeFile(source, bytes);

  const ended = frozenByChild(source, baseline, { REFTRAIL_TEST_END: 'after-link' });
  assert.notEqual(ended.status, 0);
  assert.equal(ended.stdout, '', 'A digest was reported');
  // The name never holds a short file: what is there is the complete, confirmed copy.
  assert.deepEqual(await readFile(baseline), bytes);

  // No digest was reported, so the freeze did not finish. An existing file is never replaced;
  // the message says what to do, and after deleting the file the same name works.
  const refused = frozenByChild(source, baseline);
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /already exists and is never replaced/);
  assert.match(refused.stderr, /ended by force before it reported a digest, delete this file and repeat the freeze/);
  assert.deepEqual(await readFile(baseline), bytes, 'The refused attempt changed the baseline');

  await rm(baseline);
  for (const name of await working(directory)) await rm(path.join(directory, name));
  const again = frozenByChild(source, baseline);
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(JSON.parse(again.stdout), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
  assert.deepEqual((await readdir(directory)).sort(), ['criteria-v1.csv', 'criteria.csv']);
});

test('a refused hard link in a real process ends with an error and leaves nothing', async t => {
  // The second case is the fault found in review: hard links refused, and the process ended by
  // force as soon as it writes under the baseline name. Version 4.5.2 wrote there directly and
  // left 4,096 bytes under the baseline name. Now no such write exists, so the process is not
  // ended and reports the refusal.
  for (const end of ['', 'write-baseline-name']) {
    const { source, baseline } = await workspace(t);
    await writeFile(source, randomBytes(65536));
    const refused = frozenByChild(source, baseline, { REFTRAIL_TEST_LINKS: 'refused', REFTRAIL_TEST_END: end });
    assert.equal(refused.status, 1, 'Ending: ' + (end || 'none'));
    assert.equal(refused.stdout, '');
    assert.match(refused.stderr, /^Nothing was frozen\. /);
    assert.match(refused.stderr, /copy the baseline file from there and confirm the copy with check/);
    assert.deepEqual(await readdir(path.dirname(source)), ['criteria.csv'], 'Ending: ' + (end || 'none'));
  }
});

test('a link that was created although the storage reported a failure counts as published', async t => {
  const { source, baseline } = await workspace(t);
  const bytes = randomBytes(5000);
  await writeFile(source, bytes);
  const realLink = fsPromises.link;
  await withFileSystem({
    link: async (existing, created) => {
      await realLink(existing, created);
      throw Object.assign(new Error('EEXIST: file already exists, link'), { code: 'EEXIST' });
    },
  }, async () => {
    assert.deepEqual(await freezeCriteria(source, baseline), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
  });
  assert.deepEqual(await readFile(baseline), bytes);
  assert.deepEqual((await readdir(path.dirname(source))).sort(), ['criteria-v1.csv', 'criteria.csv']);
});

test('a missing target folder is reported and leaves nothing behind', async t => {
  const { source } = await workspace(t);
  await writeFile(source, 'criterion');
  const baseline = path.join(path.dirname(source), 'missing folder', 'criteria-v1.csv');
  await assert.rejects(freezeCriteria(source, baseline), { code: 'ENOENT', message: /^Nothing was frozen\./ });
  assert.deepEqual(await readdir(path.dirname(source)), ['criteria.csv']);
});

// The same fault produced by the operating system: a file size limit ends the write early.
// Windows has no such limit for a single command, so this case exists on the other systems.
if (process.platform !== 'win32') {
  test('a write ended by the operating system leaves no baseline and the same name works again', async t => {
    const { source, baseline } = await workspace(t);
    const bytes = randomBytes(65536);
    await writeFile(source, bytes);
    const limited = spawnSync('sh', ['-c', 'ulimit -f 4 && exec "$@"', 'sh', process.execPath, tool, 'freeze', source, baseline],
      { encoding: 'utf8', timeout: 30_000 });
    assert.notEqual(limited.status, 0, 'The limited freeze reported success:\n' + limited.stdout + limited.stderr);
    assert.equal(limited.stdout, '');
    await assert.rejects(readFile(baseline), { code: 'ENOENT' }, 'A baseline exists after the stopped write');

    const again = spawnSync(process.execPath, [tool, 'freeze', source, baseline], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(again.status, 0, again.stderr);
    assert.deepEqual(JSON.parse(again.stdout), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
    assert.deepEqual(await readFile(baseline), bytes);
  });
}

test('a link refused for a moment is repeated, and a false link count does not turn a refusal into success', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  const bytes = randomBytes(5000);
  await writeFile(source, bytes);
  const realLink = fsPromises.link, realStat = fsPromises.stat;

  // A scanner holds the new file twice, then lets go.
  let calls = 0;
  await withFileSystem({
    link: async (existing, created) => {
      if (++calls <= 2) throw Object.assign(new Error('EBUSY: resource busy or locked, link'), { code: 'EBUSY' });
      return realLink(existing, created);
    },
  }, async () => {
    assert.deepEqual(await freezeCriteria(source, baseline), { status: 'CRITERIA_FROZEN', sha256: digest(bytes) });
  });
  assert.equal(calls, 3);
  assert.deepEqual(await readFile(baseline), bytes);
  assert.deepEqual((await readdir(directory)).sort(), ['criteria-v1.csv', 'criteria.csv']);

  // Storage that refuses the link and reports two names for every file anyway. Success is
  // reported only when the baseline holds the confirmed bytes, and here it does not exist.
  const second = path.join(directory, 'criteria-v2.csv');
  await withFileSystem({
    link: async () => { throw Object.assign(new Error('ENOSYS: function not implemented, link'), { code: 'ENOSYS' }); },
    stat: async (...args) => Object.defineProperty(await realStat(...args), 'nlink', { value: 2 }),
  }, () => assert.rejects(freezeCriteria(source, second), { code: 'ENOSYS', message: /^Nothing was frozen\./ }));
  assert.deepEqual((await readdir(directory)).sort(), ['criteria-v1.csv', 'criteria.csv']);
});

test('a working file that cannot be removed is named, after a finished freeze and after a refused one', async t => {
  const { source, baseline } = await workspace(t);
  const directory = path.dirname(source);
  const bytes = randomBytes(5000);
  await writeFile(source, bytes);
  const held = async () => { throw Object.assign(new Error('EACCES: permission denied, unlink'), { code: 'EACCES' }); };

  // Finished: the baseline is complete and the output names the working file that stayed.
  const finished = await withFileSystem({ unlink: held }, () => freezeCriteria(source, baseline));
  assert.equal(finished.status, 'CRITERIA_FROZEN');
  assert.equal(finished.sha256, digest(bytes));
  assert.deepEqual(await readFile(baseline), bytes);
  const [left] = (await readdir(directory)).filter(name => name.endsWith('.partial'));
  assert.equal(finished.workingFileLeft, path.join(directory, left));
  await rm(finished.workingFileLeft);
  assert.deepEqual(await readFile(baseline), bytes, 'Deleting the working file changed the baseline');

  // Refused: nothing under the new baseline name, and the message names the working file.
  const second = path.join(directory, 'criteria-v2.csv');
  const refused = await withFileSystem({
    unlink: held,
    link: async () => { throw Object.assign(new Error('ENOSYS: function not implemented, link'), { code: 'ENOSYS' }); },
  }, () => freezeCriteria(source, second).catch(error => error));
  assert.match(refused.message, /^Nothing was frozen\./);
  const [stayed] = (await readdir(directory)).filter(name => name.endsWith('.partial'));
  assert.ok(refused.message.endsWith('The working file remains and can be deleted: ' + path.join(directory, stayed)), refused.message);
  await assert.rejects(readFile(second), { code: 'ENOENT' });
});

test('criteria that change while the freeze runs are refused, and nothing remains', async t => {
  const { source, baseline } = await workspace(t);
  await writeFile(source, 'criterion as first read');
  const realOpen = fsPromises.open;
  // The tool opens its working file after it has read the criteria. Edit the criteria at that moment.
  await withFileSystem({
    open: async (...args) => {
      await writeFile(source, 'criterion edited meanwhile');
      return realOpen(...args);
    },
  }, () => assert.rejects(freezeCriteria(source, baseline),
    { message: /^Nothing was frozen\. The criteria file changed during the freeze/ }));
  assert.deepEqual(await readdir(path.dirname(source)), ['criteria.csv']);

  // At rest, the same name works and freezes the edited bytes.
  const { sha256 } = await freezeCriteria(source, baseline);
  assert.equal(sha256, digest(Buffer.from('criterion edited meanwhile')));
  assert.deepEqual(await readFile(baseline, 'utf8'), 'criterion edited meanwhile');
});
