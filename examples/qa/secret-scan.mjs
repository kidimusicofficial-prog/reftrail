import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { plain } from './plain-path.mjs';

/**
 * Scan completed local test outputs for the supplied synthetic secrets in UTF-8
 * and UTF-16LE. Pass directories and values of at least 16 characters.
 * Durchsucht abgeschlossene lokale Testausgaben nach vorgegebenen Testgeheimnissen.
 * Aufruf / usage: await scanOwnSecrets([outputDirectory], [testSecret]).
 */
export async function scanOwnSecrets(dirs, secrets, { excludeRelativePrefixes = [] } = {}) {
  assert(Array.isArray(dirs) && dirs.length > 0, 'Select at least one output directory');
  assert(Array.isArray(secrets) && secrets.length > 0, 'Supply at least one synthetic secret');
  assert(Array.isArray(excludeRelativePrefixes) && excludeRelativePrefixes.length === 0,
    'Path exclusions are unsupported; the scan covers every selected directory');

  const needles = [];
  let files = 0;
  let bytes = 0;
  let overlap = 0;

  async function scanDirectory(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      assert(!entry.isSymbolicLink(), 'Symbolic links are outside the scan scope');
      if (entry.isDirectory()) {
        await scanDirectory(file);
        continue;
      }
      assert(entry.isFile(), 'Expected a regular file');
      assert(++files <= 4096, 'Scan file limit exceeded');
      let tail = Buffer.alloc(0);
      try {
        for await (const chunk of createReadStream(file)) {
          bytes += chunk.length;
          assert(bytes <= 1024 ** 3, 'Scan byte limit exceeded');
          const joined = Buffer.concat([tail, chunk]);
          if (needles.some(needle => joined.includes(needle))) throw new Error('OWN_ARTIFACT_SECRET_LEAK');
          tail.fill(0);
          tail = Buffer.from(joined.subarray(Math.max(0, joined.length - overlap)));
        }
      } finally {
        tail.fill(0);
      }
    }
  }

  try {
    for (const secret of secrets) {
      assert(typeof secret === 'string' && secret.length >= 16, 'Expected a synthetic secret of at least 16 characters');
      const utf8 = Buffer.from(secret, 'utf8');
      const utf16le = Buffer.from(secret, 'utf16le');
      needles.push(utf8, utf16le);
      overlap = Math.max(overlap, utf8.length - 1, utf16le.length - 1);
    }
    for (const dir of dirs) await scanDirectory(await plain(dir));
    return {
      status: 'PASS', files, bytes, secretValueCount: secrets.length,
      representations: ['UTF8', 'UTF16LE'], matches: 0, excludedRelativePrefixes: [],
      scope: 'Regular files in the selected directories, checked against the supplied secret values.'
    };
  } finally {
    for (const needle of needles) needle.fill(0);
  }
}
