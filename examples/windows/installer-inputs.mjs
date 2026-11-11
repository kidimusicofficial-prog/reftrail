// Emit [Files] entries relative to the caller's Inno Setup SourceDir.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkProfile } from './package-windows.mjs';
import { makeCurrent } from './release-update.mjs';
import { file, guarded, sha256 } from './windows-build-contract.mjs';

export async function installerInputs(payloadRoot, profileBytes, expectedProfileSha256) {
  assert(Buffer.isBuffer(profileBytes), 'Expected raw profile bytes');
  const digest = sha256(profileBytes);
  assert.equal(digest, expectedProfileSha256, 'Profile digest mismatch');
  const profile = JSON.parse(profileBytes.toString('utf8'));
  checkProfile(profile);
  const pointer = makeCurrent(profile.version + '-' + digest);
  const versionDirectory = '{app}\\' + pointer.payload.replaceAll('/', '\\');
  const checksums = [];
  const entries = [];
  const records = [...profile.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  for (const record of records) {
    // A small literal alphabet excludes both script and preprocessor expressions.
    assert(!/[^A-Za-z0-9._ /-]/.test(record.path), 'Unsupported installer filename');
    const source = await guarded(payloadRoot, record.path);
    const stat = await fs.lstat(source);
    assert(stat.isFile() && stat.size === record.bytes, 'Payload type or size mismatch');
    const actual = await file(payloadRoot, record.path);
    assert(actual.bytes === record.bytes && actual.sha256 === record.sha256, 'Payload contents changed');

    const name = record.path.replaceAll('/', '\\');
    const directory = path.win32.dirname(name);
    const dest = versionDirectory + (directory === '.' ? '' : '\\' + directory);
    entries.push(`Source: "${name}"; DestDir: "${dest}"; Flags: ignoreversion`);
    checksums.push(`${name}|${actual.sha256}|${actual.bytes}`);
  }
  return {
    filesInclude: entries.join('\r\n') + '\r\n',
    checksums: checksums.join('\r\n') + '\r\n',
    current: JSON.stringify(pointer)
  };
}
