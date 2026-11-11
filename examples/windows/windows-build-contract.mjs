// Shared filesystem and source-receipt checks for a trusted, local build tree.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

export function safeRelative(name) {
  assert.equal(typeof name, 'string');
  assert(name.length > 0 && name.length < 1024, 'Invalid path length');
  assert(!/[\\:\x00-\x1f\x7f-\x9f|"<>?*]/u.test(name), 'Invalid path character');
  const device = /^(?:con|prn|aux|nul|conin\$|conout\$|(?:com|lpt)[1-9¹²³]) *(?:\.|$)/iu;
  for (const part of name.split('/')) {
    assert(part && !/[. ]$/.test(part) && !device.test(part), 'Invalid Windows path component');
  }
  return name;
}

// Each name represents a file. Directories must also use one consistent spelling.
export function assertNames(names) {
  const seen = new Map();
  for (const name of names) {
    safeRelative(name);
    const parts = name.split('/');
    let prefix = '';
    for (let i = 0; i < parts.length; i++) {
      prefix += (i ? '/' : '') + parts[i];
      const key = prefix.normalize('NFC').toLowerCase();
      const directory = i < parts.length - 1;
      if (seen.has(key)) {
        const entry = seen.get(key);
        assert(entry.directory && directory && entry.path === prefix, 'Conflicting paths: ' + prefix);
      } else {
        seen.set(key, { path: prefix, directory });
      }
    }
  }
}

export function isWithin(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

export async function canonicalRoot(root) {
  const absolute = path.resolve(root);
  const stat = await fs.lstat(absolute);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Expected a plain directory');
  assert.equal(path.relative(await fs.realpath(absolute), absolute), '', 'Directory resolves elsewhere');
  return absolute;
}

// Intended for a locally controlled working tree. Paths can change after a preflight.
export async function guarded(root, name, allowMissing = false) {
  safeRelative(name);
  let cursor = await canonicalRoot(root);
  for (const part of name.split('/')) {
    cursor = path.join(cursor, part);
    try {
      const stat = await fs.lstat(cursor);
      assert(!stat.isSymbolicLink(), 'Symbolic link or junction in path');
      assert.equal(path.relative(await fs.realpath(cursor), cursor), '', 'Path resolves elsewhere');
    } catch (error) {
      if (!allowMissing || error.code !== 'ENOENT') throw error;
    }
  }
  return cursor;
}

export async function read(root, name) {
  const filePath = await guarded(root, name);
  const stat = await fs.lstat(filePath);
  assert(stat.isFile(), 'Expected a regular file');
  const bytes = await fs.readFile(filePath);
  assert.equal(bytes.length, stat.size, 'File changed during read');
  return bytes;
}

export async function file(root, name) {
  const bytes = await read(root, name);
  return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
}

export async function freshOutput(target, sourceRoot) {
  const output = path.resolve(target);
  await canonicalRoot(path.dirname(output));
  assert(path.relative(sourceRoot, output) !== '' && !isWithin(sourceRoot, output) &&
    !isWithin(output, sourceRoot), 'Output must be outside the source tree');
  await fs.mkdir(output); // Exclusive creation. An existing output is never overwritten.
  return output;
}

function permittedSource(name) {
  const sensitive = /^(?:\.git|\.ssh|\.aws|\.env(?:\..*)?)$/i;
  return !name.split('/').some(part => sensitive.test(part)) &&
    !/(?:\.(?:db|sqlite3?|pem|pfx|p12|key)|-wal|-shm|-journal)$/i.test(name);
}

export function isScript(name) {
  return /\.(?:js|mjs|cjs)$/.test(name);
}

export function selectedTests(names) {
  return names.filter(name => /\.test\.(?:js|mjs|cjs)$/.test(name)).sort();
}

export async function sourceHashes(root, { directories, files }) {
  assert(Array.isArray(directories) && Array.isArray(files), 'Expected explicit source scope');
  const names = [];
  async function visit(name, expectedType) {
    assert(permittedSource(name), 'Excluded private or data path: ' + name);
    const target = await guarded(root, name);
    const stat = await fs.lstat(target);
    if (stat.isDirectory() && expectedType !== 'file') {
      for (const child of await fs.readdir(target)) await visit(name + '/' + child);
    } else {
      assert(stat.isFile() && expectedType !== 'directory', 'Unexpected file type: ' + name);
      names.push(name);
    }
  }

  for (const name of directories) await visit(name, 'directory');
  for (const name of files) await visit(name, 'file');
  assert(names.length > 0, 'Empty source inventory');
  assertNames(names);
  const entries = [];
  for (const name of names.sort()) entries.push([name, (await file(root, name)).sha256]);
  return Object.fromEntries(entries);
}

export function validateSourceAuthority(receipt, hashes) {
  assert.equal(receipt.schemaVersion, 1, 'Unsupported source receipt');
  assert.equal(receipt.status, 'PASS', 'Passing source check required');
  assert.deepEqual(receipt.sourceHashes, hashes, 'Source differs from initial inventory');
  assert.deepEqual(receipt.sourceHashesAfter, hashes, 'Source differs from final inventory');
  assert.deepEqual(receipt.changedFiles, [], 'Source changed during check');

  const names = Object.keys(hashes);
  const testFiles = selectedTests(names);
  assert(testFiles.length > 0);
  assert.deepEqual(receipt.testFiles, testFiles);
  assert.equal(receipt.testExitCode, 0);
  const counts = receipt.tests;
  assert(Number.isSafeInteger(counts.tests) && counts.tests >= testFiles.length);
  assert.equal(counts.pass, counts.tests);
  for (const key of ['fail', 'cancelled', 'skipped', 'todo']) assert.equal(counts[key], 0);
  assert.deepEqual(receipt.syntax, names.filter(isScript).sort().map(name => ({ name, exitCode: 0 })));
}

export async function freezeSource(sourceRoot, outputRoot, authorityPath, expectedSHA) {
  assert.match(expectedSHA, /^[a-f0-9]{64}$/, 'Invalid receipt digest');
  const original = await canonicalRoot(sourceRoot);
  const authority = path.resolve(authorityPath);
  const receiptBytes = await read(path.dirname(authority), path.basename(authority));
  assert.equal(sha256(receiptBytes), expectedSHA, 'Receipt digest mismatch');
  const receipt = JSON.parse(receiptBytes);
  const hashes = await sourceHashes(original, receipt.scope);
  validateSourceAuthority(receipt, hashes);

  const output = await freshOutput(outputRoot, original);
  const frozen = path.join(output, 'source');
  try {
    await fs.mkdir(frozen);
    for (const name of receipt.scope.directories) {
      await fs.mkdir(await guarded(frozen, name, true), { recursive: true });
    }
    for (const [name, digest] of Object.entries(hashes)) {
      const bytes = await read(original, name);
      assert.equal(sha256(bytes), digest, 'File changed during copy: ' + name);
      const target = await guarded(frozen, name, true);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes, { flag: 'wx' });
    }
    assert.deepEqual(await sourceHashes(frozen, receipt.scope), hashes, 'Frozen source mismatch');
    assert.deepEqual(await sourceHashes(original, receipt.scope), hashes, 'Source changed during copy');
    await fs.writeFile(path.join(output, 'receipt.json'), receiptBytes, { flag: 'wx' });
    return { root: frozen, files: Object.keys(hashes).length, receiptSHA256: expectedSHA };
  } catch (error) {
    await fs.rm(output, { recursive: true, force: true });
    throw error;
  }
}
