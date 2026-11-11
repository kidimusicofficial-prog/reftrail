// Pure checks for the versioned installation layout. Callers perform all filesystem I/O.
import assert from 'node:assert/strict';

const digest = /^[a-f0-9]{64}$/;

export function makeCurrent(versionId) {
  const match = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-([a-f0-9]{64})$/.exec(versionId);
  assert(typeof versionId === 'string' && match, 'Expected numeric version and SHA-256');
  assert(match.slice(1, 4).every(part => Number(part) <= 65535), 'Version component out of range');
  return { schemaVersion: 1, payload: 'versions/' + versionId };
}

export function parseCanonicalCurrent(bytes) {
  assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 1024, 'Invalid pointer size');
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  assert(value?.schemaVersion === 1 && typeof value.payload === 'string' &&
    value.payload.startsWith('versions/'), 'Invalid version pointer');
  const expected = makeCurrent(value.payload.slice('versions/'.length));
  assert(bytes.equals(Buffer.from(JSON.stringify(expected))), 'Expected canonical pointer bytes');
  return expected;
}

// The caller supplies metadata observed at the actual file, including its reparse status.
export function parseRetainedPointer(name, bytes, metadata) {
  assert.match(name, /^current\.(?:before|next|rollback)\.[a-f0-9]{64}\.json$/, 'Invalid retained pointer name');
  assert(metadata?.isFile === true && metadata?.isReparse === false, 'Expected a plain file');
  return parseCanonicalCurrent(bytes);
}

export function requireSameLauncher(existingHash, candidateHash) {
  assert.match(candidateHash, digest, 'Invalid launcher digest');
  if (existingHash !== null) assert.equal(existingHash, candidateHash, 'Installed launcher differs');
  return true;
}
