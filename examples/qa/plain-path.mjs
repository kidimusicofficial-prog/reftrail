import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function plain(file, { missing = false } = {}) {
  const absolute = path.resolve(file);
  for (let current = absolute; ; current = path.dirname(current)) {
    try {
      const stat = await fs.lstat(current);
      assert(!stat.isSymbolicLink(), 'NO_REPARSE');
    } catch (error) {
      if (!missing || error.code !== 'ENOENT') throw error;
    }
    if (path.dirname(current) === current) break;
  }
  if (!missing) assert.equal((await fs.realpath(absolute)).toLowerCase(), absolute.toLowerCase());
  return absolute;
}
