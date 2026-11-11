// Build a reproducible, classic ZIP from an explicit manifest of approved files.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import { assertNames, canonicalRoot, guarded, jsonBytes, read, sha256 } from './windows-build-contract.mjs';

const MAX_FILES = 4096;
const MAX_PAYLOAD = 64 * 1024 * 1024;
const MAX_ARCHIVE = 80 * 1024 * 1024;
const MAX_PROFILE = 8 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const VERSION = /^(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){2}$/;
const PRIVATE_DIR = /^(?:data|backups?|profiles?|tmp|secrets?)$/i;
const PRIVATE_FILE = /(?:\.(?:db|sqlite[23]?|pem|key|pfx|p12)|-wal|-shm|-journal)$/i;

function checkPaths(names) {
  assert(Array.isArray(names) && names.length > 0 && names.length <= MAX_FILES, 'PAYLOAD_FILE_COUNT');
  assertNames(names);
  for (const name of names) {
    assert(/^[\x20-\x7e]+$/.test(name) && !PRIVATE_FILE.test(name), 'UNSUITABLE_PACKAGE_PATH');
    const parts = name.split('/');
    assert(parts.every(part => !part.startsWith('.') && !PRIVATE_DIR.test(part)), 'PRIVATE_PACKAGE_PATH');
  }
}

export function checkProfile(profile) {
  assert(profile?.schemaVersion === 1 && typeof profile.version === 'string', 'PROFILE_SCHEMA');
  assert(VERSION.test(profile.version) && profile.version.split('.').every(part => Number(part) <= 65535),
    'WINDOWS_NUMERIC_VERSION_REQUIRED');
  assert(Array.isArray(profile.files), 'PROFILE_FILE_LIST');
  checkPaths(profile.files.map(item => item.path));
  let total = 0;
  for (const item of profile.files) {
    assert(Number.isSafeInteger(item.bytes) && item.bytes >= 0 && SHA256.test(item.sha256), 'INVALID_FILE_RECORD');
    total += item.bytes;
    assert(total <= MAX_PAYLOAD, 'PAYLOAD_SIZE_LIMIT');
  }
}

async function smallFile(fileName, limit) {
  const full = path.resolve(fileName);
  const root = await canonicalRoot(path.dirname(full));
  const stat = await fs.lstat(full);
  assert(stat.isFile() && stat.size <= limit, 'FILE_TYPE_OR_SIZE');
  return read(root, path.basename(full));
}

async function readPayload(root, name, remaining) {
  const stat = await fs.lstat(await guarded(root, name));
  assert(stat.isFile() && stat.size <= remaining, 'PAYLOAD_SIZE_LIMIT');
  const bytes = await read(root, name);
  assert(bytes.length <= remaining, 'PAYLOAD_SIZE_LIMIT');
  return bytes;
}

export async function createPlan(root, version, profilePath, fileNames) {
  checkPaths(fileNames);
  const files = [];
  let remaining = MAX_PAYLOAD;
  for (const name of [...fileNames].sort()) {
    const bytes = await readPayload(root, name, remaining);
    remaining -= bytes.length;
    files.push({path: name, bytes: bytes.length, sha256: sha256(bytes)});
  }
  const profile = {schemaVersion: 1, version, files};
  checkProfile(profile);
  await canonicalRoot(path.dirname(path.resolve(profilePath)));
  const profileBytes = jsonBytes(profile);
  await fs.writeFile(profilePath, profileBytes, {flag: 'wx'});
  return {profile: profilePath, sha256: sha256(profileBytes), files: files.length};
}

// This small ZIP profile uses stored files, DOS 1980-01-01 and no extensions.
function localHeader(name, size, crc) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(name.length, 26);
  return header;
}

function centralHeader(name, size, crc, offset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50);
  header.writeUInt16LE(20, 4);
  localHeader(name, size, crc).copy(header, 6, 4, 30);
  header.writeUInt32LE(offset, 42);
  return header;
}

function endRecord(count, directorySize, directoryOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(directoryOffset, 16);
  return end;
}

function orderedFiles(profile) {
  return [...profile.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

async function encodeArchive(root, profile) {
  const locals = [], directory = [];
  let position = 0;
  for (const record of orderedFiles(profile)) {
    const data = await readPayload(root, record.path, record.bytes);
    assert.equal(data.length, record.bytes, 'SOURCE_SIZE_CHANGED');
    assert.equal(sha256(data), record.sha256, 'SOURCE_HASH_CHANGED');
    const name = Buffer.from(record.path, 'ascii'), crc = crc32(data);
    const local = localHeader(name, data.length, crc);
    directory.push(centralHeader(name, data.length, crc, position), name);
    locals.push(local, name, data);
    position += local.length + name.length + data.length;
  }
  const central = Buffer.concat(directory);
  const end = endRecord(profile.files.length, central.length, position);
  assert(position + central.length + end.length <= MAX_ARCHIVE, 'ARCHIVE_SIZE_LIMIT');
  return Buffer.concat([...locals, central, end]);
}

export function verifyArchive(archive, profile) {
  checkProfile(profile);
  const directory = [];
  let offset = 0;
  for (const record of orderedFiles(profile)) {
    const name = Buffer.from(record.path, 'ascii');
    const nameStart = offset + 30, dataStart = nameStart + name.length, next = dataStart + record.bytes;
    assert(next <= archive.length, 'TRUNCATED_ENTRY');
    assert(archive.subarray(nameStart, dataStart).equals(name), 'ENTRY_PATH_MISMATCH');
    const data = archive.subarray(dataStart, next), crc = crc32(data);
    assert.equal(sha256(data), record.sha256, 'ENTRY_HASH_MISMATCH');
    assert(archive.subarray(offset, nameStart).equals(localHeader(name, data.length, crc)), 'LOCAL_HEADER_MISMATCH');
    directory.push(centralHeader(name, data.length, crc, offset), name);
    offset = next;
  }
  const central = Buffer.concat(directory);
  assert(archive.subarray(offset, offset + central.length).equals(central), 'CENTRAL_DIRECTORY_MISMATCH');
  assert(archive.subarray(offset + central.length).equals(endRecord(profile.files.length, central.length, offset)),
    'END_RECORD_MISMATCH');
}

function packageRecord(profile, profileBytes, archive) {
  return {
    schemaVersion: 1,
    status: 'PAYLOAD_VERIFIED',
    version: profile.version,
    profileSha256: sha256(profileBytes),
    archive: {path: 'payload.zip', files: profile.files.length, bytes: archive.length, sha256: sha256(archive)}
  };
}

function checkDigest(bytes, expected) {
  if (expected !== undefined) {
    assert(SHA256.test(expected), 'INVALID_EXPECTED_PROFILE_HASH');
    assert.equal(sha256(bytes), expected, 'PROFILE_HASH_MISMATCH');
  }
}

export async function build(root, profilePath, outputDir, expectedProfileHash) {
  const source = await canonicalRoot(root);
  const profileBytes = await smallFile(profilePath, MAX_PROFILE);
  checkDigest(profileBytes, expectedProfileHash);
  const profile = JSON.parse(profileBytes);
  checkProfile(profile);
  const archive = await encodeArchive(source, profile);
  const output = path.resolve(outputDir);
  await canonicalRoot(path.dirname(output));
  await fs.mkdir(output); // Exclusive new directory; receipt written last.
  await fs.writeFile(path.join(output, 'payload.zip'), archive, {flag: 'wx'});
  await fs.writeFile(path.join(output, 'profile.json'), profileBytes, {flag: 'wx'});
  const reopened = await smallFile(path.join(output, 'payload.zip'), MAX_ARCHIVE);
  verifyArchive(reopened, profile);
  assert((await smallFile(path.join(output, 'profile.json'), MAX_PROFILE)).equals(profileBytes), 'PROFILE_COPY_MISMATCH');
  for (const item of profile.files) {
    const current = await readPayload(source, item.path, item.bytes);
    assert.equal(sha256(current), item.sha256, 'SOURCE_CHANGED_DURING_BUILD');
  }
  assert((await smallFile(profilePath, MAX_PROFILE)).equals(profileBytes), 'PROFILE_CHANGED_DURING_BUILD');
  const receipt = packageRecord(profile, profileBytes, reopened);
  await fs.writeFile(path.join(output, 'receipt.json'), jsonBytes(receipt), {flag: 'wx'});
  return receipt;
}

export async function verify(outputDir, expectedProfileHash) {
  const output = await canonicalRoot(outputDir);
  const profileBytes = await smallFile(path.join(output, 'profile.json'), MAX_PROFILE);
  checkDigest(profileBytes, expectedProfileHash);
  const profile = JSON.parse(profileBytes), archive = await smallFile(path.join(output, 'payload.zip'), MAX_ARCHIVE);
  verifyArchive(archive, profile);
  const receipt = packageRecord(profile, profileBytes, archive);
  assert.deepEqual(JSON.parse(await smallFile(path.join(output, 'receipt.json'), MAX_PROFILE)), receipt, 'RECEIPT_MISMATCH');
  return receipt;
}

const usage = [
  'plan <source-dir> <version> <new-profile.json> <relative-file> [relative-file ...]',
  'build <source-dir> <profile.json> <new-output-dir> [expected-profile-sha256]',
  'verify <output-dir> [expected-profile-sha256]'
].join('\n');

async function main([command, ...args]) {
  if (!command || command === '--help') return console.log(usage);
  let result;
  if (command === 'plan' && args.length >= 4) result = await createPlan(args[0], args[1], args[2], args.slice(3));
  else if (command === 'build' && [3, 4].includes(args.length)) result = await build(...args);
  else if (command === 'verify' && [1, 2].includes(args.length)) result = await verify(...args);
  else throw new Error(usage);
  console.log(JSON.stringify(result));
}

// True when this file is the started script. A project folder can be reached through a link,
// so both paths are resolved before they are compared.
function startedDirectly() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (startedDirectly()) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
