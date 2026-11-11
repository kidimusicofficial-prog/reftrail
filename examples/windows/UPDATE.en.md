# Verify version changes and runtime dependencies

[Deutsch](UPDATE.md) · English

## Active version and launcher

The update module checks metadata for installations that keep each version in its own directory. The hash in the version ID identifies the exact bytes of the verified package profile. This allows two builds with the same numeric version to occupy separate directories. [Update module](release-update.mjs) · [Installer handoff](USAGE.en.md)

| Function | Contract |
| --- | --- |
| `makeCurrent(versionId)` | Creates a pointer to `versions/<version>-<sha256>`. The version contains three numeric components in the range 0–65535 with no leading zeros. |
| `parseCanonicalCurrent(bytes)` | Accepts the exact UTF-8 encoding produced by `JSON.stringify(makeCurrent(versionId))`. Extra fields, reordered fields, a byte order mark or a trailing newline cause an error. |
| `parseRetainedPointer(name, bytes, metadata)` | Accepts the names `current.before.<sha256>.json`, `current.next.<sha256>.json` and `current.rollback.<sha256>.json`. The caller must inspect the actual path and supply `isFile: true` and `isReparse: false`. The hash suffix identifies the file. Its contents undergo the same checks as the active pointer. |
| `requireSameLauncher(existingHash, candidateHash)` | On first installation, `existingHash` is `null`. For updates, the installed and candidate launchers must have the same SHA-256 hash. A changed launcher requires a separate replacement procedure. |

These functions validate the supplied bytes and hashes in memory. The calling installer must inspect the destination directory and its files, switch the active pointer and perform any necessary rollback.

## Compare installed npm packages with the lockfile

Use the optional runtime dependency check when npm prepares a local package tree for distribution. The following example expects an existing package directory. The import path assumes the script is at the repository root. [Runtime dependency module](runtime-lock.mjs)

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyInstalledLock } from './examples/windows/runtime-lock.mjs';

const root = process.argv[2];
const load = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const installed = await verifyInstalledLock(root, await load('package.json'), await load('package-lock.json'));
console.log(installed);
```

For lockfile versions 2 and 3, the check compares the root metadata and declared dependencies. Runtime package records must have an HTTPS source in the public npm registry and a SHA-512 integrity entry. After an installation that omits development dependencies, the function checks the paths, names and versions of installed packages, including nested packages. Optional packages may be absent. Use the fourth argument to require specific package paths for the target platform. The check resolves registry aliases using the package name declared in the lockfile.

The check covers registry packages. Workspaces, linked packages, other registries and other lockfile formats require changes to the check. The integrity entry identifies the registry archive. The package verification step computes final hashes for the files that ship. [Package verification](USAGE.en.md)
