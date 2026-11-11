// Checks the production package tree of a registry-based npm install with dev dependencies omitted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assertNames, canonicalRoot, guarded, read, safeRelative } from './windows-build-contract.mjs';

const location = /^node_modules\/(?:@[^/@]+\/)?[^/@]+(?:\/node_modules\/(?:@[^/@]+\/)?[^/@]+)*$/;

function directRuntimeLocations(pkg) {
  return Object.keys(pkg.dependencies ?? {})
    .filter(name => !Object.hasOwn(pkg.optionalDependencies ?? {}, name))
    .map(name => 'node_modules/' + name);
}

export function validatePackageLock(pkg, lock) {
  assert([2, 3].includes(lock.lockfileVersion), 'Expected package-lock v2 or v3');
  const root = lock.packages?.[''];
  assert(root && typeof pkg.name === 'string' && pkg.name && typeof pkg.version === 'string' && pkg.version);
  assert.equal(root.name, pkg.name, 'Root package name mismatch');
  assert.equal(root.version, pkg.version, 'Root package version mismatch');
  for (const field of ['dependencies', 'optionalDependencies', 'devDependencies', 'peerDependencies']) {
    assert.deepEqual(root[field] ?? {}, pkg[field] ?? {}, 'Root manifest differs in ' + field);
  }
  const records = Object.entries(lock.packages).filter(([name, entry]) => name && !entry.dev);
  assertNames(records.map(([name]) => name + '/package.json'));
  for (const [name, entry] of records) {
    safeRelative(name);
    assert(location.test(name) && !entry.link && typeof entry.version === 'string' && entry.version,
      'Unsupported lock entry: ' + name);
    const url = new URL(entry.resolved);
    assert.equal(url.origin, 'https://registry.npmjs.org', 'Unsupported registry source');
    assert(!url.username && !url.password && !url.search && !url.hash, 'Unexpected registry URL data');
    assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/, 'Expected an SHA-512 integrity value');
  }
  const runtimePaths = new Set(records.map(([name]) => name));
  for (const name of directRuntimeLocations(pkg)) {
    assert(runtimePaths.has(name), 'Missing direct runtime lock entry: ' + name);
  }
  return records;
}

export async function verifyInstalledLock(root, pkg, lock, requiredPackages = []) {
  await canonicalRoot(root);
  const records = new Map(validatePackageLock(pkg, lock));
  const found = new Map();
  async function inspect(name) {
    const expected = records.get(name);
    assert(expected, 'Unexpected package: ' + name);
    const manifest = JSON.parse(await read(root, name + '/package.json'));
    const expectedName = expected.name ?? name.split('node_modules/').at(-1);
    assert.equal(manifest.name, expectedName, 'Installed package name differs: ' + name);
    assert.equal(manifest.version, expected.version, 'Installed package version differs: ' + name);
    found.set(name, { path: name, name: manifest.name, version: manifest.version });
    await walk(name + '/node_modules');
  }

  async function walk(modules) {
    let entries;
    try {
      entries = await fs.readdir(await guarded(root, modules), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.name === '.bin' || entry.name === '.package-lock.json') continue;
      const name = modules + '/' + entry.name;
      assert(entry.isDirectory() && !entry.isSymbolicLink(), 'Unexpected entry in package tree: ' + name);
      if (entry.name.startsWith('@')) {
        const children = await fs.readdir(await guarded(root, name), { withFileTypes: true });
        for (const child of children) {
          assert(child.isDirectory() && !child.isSymbolicLink(), 'Invalid scoped package');
          await inspect(name + '/' + child.name);
        }
      } else {
        await inspect(name);
      }
    }
  }

  await walk('node_modules');
  for (const [name, entry] of records) {
    assert(entry.optional || found.has(name), 'Missing required package: ' + name);
  }
  for (const name of directRuntimeLocations(pkg)) {
    assert(found.has(name), 'Missing installed direct runtime dependency: ' + name);
  }
  for (const name of requiredPackages) assert(found.has(name), 'Missing required target package: ' + name);
  return [...found.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
