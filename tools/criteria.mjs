#!/usr/bin/env node
// Freeze and verify the exact bytes of a local acceptance specification.
import { createHash, randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { link, lstat, open, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const usage = [
  'node tools/criteria.mjs freeze <criteria-file> <new-baseline-file>',
  'node tools/criteria.mjs check <criteria-file> <baseline-file> <pinned-sha256>',
].join('\n');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function regularFile(file) {
  if (!(await stat(file)).isFile()) throw new Error('Expected a regular file: ' + file);
  return readFile(file);
}

export async function verifyCriteria(criteriaFile, baselineFile, expectedSha256) {
  if (typeof expectedSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(expectedSha256)) {
    throw new Error('Expected a separately retained SHA-256 digest (64 hexadecimal characters).');
  }
  const pinned = expectedSha256.toLowerCase();
  if (sha256(await regularFile(baselineFile)) !== pinned) throw new Error('Baseline differs from the pinned digest.');
  if (sha256(await regularFile(criteriaFile)) !== pinned) throw new Error('Criteria differ from the pinned digest.');
  return { status: 'CRITERIA_VERIFIED', sha256: pinned };
}

function exists(baselineFile) {
  return Object.assign(new Error('Baseline already exists and is never replaced: ' + baselineFile +
    '\nIf an earlier freeze was ended by force before it reported a digest, delete this file and repeat the freeze.'),
    { code: 'EEXIST' });
}

function nothing(message, cause) {
  return Object.assign(new Error('Nothing was frozen. ' + message), { code: cause?.code, cause });
}

// Another program, such as a virus scanner, can hold a new file for a moment. A step that is
// refused with one of these codes is therefore repeated a few times within about half a second.
const momentary = error => ['EBUSY', 'EPERM', 'EACCES'].includes(error.code);
const attempts = 6;

// Remove a file this call created and report whether it is gone. unlink removes a single file
// and never a folder.
async function discard(file) {
  for (let attempt = 1; ; attempt++) {
    try {
      await unlink(file);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return true;
      if (attempt === attempts || !momentary(error)) return false;
      await pause(40 * attempt);
    }
  }
}

// Give the complete working file the baseline name. The storage does this in one step and
// refuses if the name is taken.
async function publish(working, baselineFile, pinned) {
  for (let attempt = 1; ; attempt++) {
    try {
      await link(working, baselineFile);
      return;
    } catch (error) {
      // Network storage can report a failure for a link it did create. Then the working file
      // has a second name, and the baseline holds exactly the confirmed bytes.
      const created = await stat(working).then(entry => entry.nlink > 1, () => false) &&
        await readFile(baselineFile).then(found => sha256(found) === pinned, () => false);
      if (created) return;
      if (error.code === 'EEXIST') throw exists(baselineFile);
      if (attempt === attempts || !momentary(error)) {
        throw nothing('The complete copy could not be given the baseline name (' + error.message + ').\n' +
          'This step needs storage that supports hard links; exFAT, FAT32 and some shared folders do not. ' +
          'Nothing was written under the baseline name.\n' +
          'Freeze in a folder on a drive that supports hard links, copy the baseline file from there and confirm the copy with check.', error);
      }
      await pause(40 * attempt);
    }
  }
}

// Create the file exclusively and write all bytes. A file this call created is removed again
// when the write, the flush or the close fails.
async function writeNew(file, bytes) {
  const handle = await open(file, 'wx');
  try {
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (!(await discard(file))) error.message += ' An incomplete working file remains and can be deleted: ' + file;
    throw error;
  }
}

// The steps are ordered so that the baseline name is the last thing to appear:
//   1. Read the criteria. The digest and the copy both come from the bytes of this one read.
//   2. Write them to a working file in the folder of the baseline.
//   3. Confirm the working file, and confirm that the criteria did not change meanwhile.
//   4. Give the working file the baseline name with a hard link. The storage does this in one
//      step. It refuses if the name is taken and never shows a partly written file.
// Everything that can fail comes before step 4, so a failed freeze leaves nothing under the
// baseline name. Storage without hard links cannot do step 4. The freeze then stops there. It
// has no second way of writing the baseline, because writing under the baseline name directly
// could leave a short file there when the process is ended by force.
export async function freezeCriteria(criteriaFile, baselineFile) {
  const bytes = await regularFile(criteriaFile);
  const pinned = sha256(bytes);
  const taken = await lstat(baselineFile).then(() => true, error => {
    if (error.code === 'ENOENT') return false;
    throw nothing('The baseline location cannot be used: ' + error.message, error);
  });
  if (taken) throw exists(baselineFile);

  const working = path.join(path.dirname(baselineFile), 'reftrail-' + randomUUID() + '.partial');
  try {
    await writeNew(working, bytes);
  } catch (error) {
    throw nothing('The working copy could not be written: ' + error.message, error);
  }
  let failure = null;
  try {
    if (sha256(await readFile(working)) !== pinned) {
      throw nothing('The working copy differs from the bytes that were read.');
    }
    const current = await regularFile(criteriaFile).catch(error => { throw nothing('The criteria can no longer be read: ' + error.message, error); });
    if (sha256(current) !== pinned) {
      throw nothing('The criteria file changed during the freeze; repeat the command once it is at rest.');
    }
    await publish(working, baselineFile, pinned);
  } catch (error) {
    failure = error;
  }
  // The baseline keeps the bytes under its own name. The working file is no longer needed.
  const removed = await discard(working);
  if (failure) {
    if (!removed) failure.message += '\nThe working file remains and can be deleted: ' + working;
    throw failure;
  }
  return removed
    ? { status: 'CRITERIA_FROZEN', sha256: pinned }
    : { status: 'CRITERIA_FROZEN', sha256: pinned, workingFileLeft: working };
}

// Returns the text to print. A failed freeze or check throws.
export async function main([command, ...args]) {
  if (command === '--help' && args.length === 0) return { output: usage, failed: false };
  if (command === 'freeze' && args.length === 2) return { output: JSON.stringify(await freezeCriteria(...args)), failed: false };
  if (command === 'check' && args.length === 3) return { output: JSON.stringify(await verifyCriteria(...args)), failed: false };
  throw new Error(usage);
}

// True when this file is the started script. npm links commands, and a project folder can be
// reached through a link, so both paths are resolved before they are compared.
function startedDirectly() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedDirectly()) {
  try {
    console.log((await main(process.argv.slice(2))).output);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
