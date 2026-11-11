# Verify a source tree and build a Windows-compatible package

[Deutsch](USAGE.md) · English

This example turns an approved file list into a package whose contents can be verified independently. The commands run locally using the Node.js standard library and require Node.js 22.16 or later. Start with a directory of files ready to ship. The repository README is enough to try the packaging steps.

## Verify the source tree

Run the following command from the repository root. It executes the tests and checks JavaScript syntax within the selected directories. The receipt records the file list and SHA-256 hashes before and after the run. Choose two new output directories outside the repository.

```sh
node examples/windows/check-release-source.mjs check --root . --dir docs --dir examples --dir integration --dir prompts --dir showcase --dir templates --dir tests --dir tools --file CHANGELOG.md --file CONTRIBUTING.md --file LICENSE --file README.md --file README.de.md --file README.en.md --file package.json --output ../source-check
```

If the result is `PASS`, replace `PASTE_HASH_HERE` in the next command with the reported `sha256` value. This verifies the receipt and copies the files it covers into `../source-copy/source/`.

```sh
node examples/windows/check-release-source.mjs freeze --root . --receipt ../source-check/receipt.json --sha256 PASTE_HASH_HERE --output ../source-copy
```

This receipt covers the published files, which includes every file the tests read. Only then can the copy in `../source-copy/source/` pass the same tests on its own. Use `--dir` and `--file` to select the directories and individual files for another project. Include at least one file ending in `.test.js`, `.test.mjs` or `.test.cjs`. The test runner can count an empty test file as a successful run. Read the test cases to see which behavior they actually check. You can also try the packaging example on its own.

## Try the package commands

Run these commands from the repository root. The profile and package output paths must both be unused.

```sh
node examples/windows/package-windows.mjs plan . 1.0.0 beispiel-profil.json README.md
node examples/windows/package-windows.mjs build . beispiel-profil.json beispiel-paket
node examples/windows/package-windows.mjs verify beispiel-paket
```

1. `plan` reads the explicitly named files and records their relative paths, sizes and SHA-256 hashes along with the package version. It prints the SHA-256 hash of the complete profile file.
2. `build` checks each input against the profile, then writes `payload.zip` and a copy of the profile. It reopens the archive, verifies its entries and rechecks the input files and profile against their initial state. After these checks pass, it writes the profile and archive hashes to `receipt.json`.
3. `verify` checks the archive and receipt against the enclosed profile. It detects changes to payload bytes, file names or ZIP headers, as well as extra archive bytes. An error produces a nonzero exit code.

For a release, retain the hash of the approved profile separately and pass it as the final argument to both `build` and `verify`. That external value allows you to detect substitution of the entire package, including its profile and receipt. A hash computed from the files at verification time records their current state.

## Select files for the package

Specify each file individually using a relative path with forward slashes. The profile accepts printable ASCII paths with Windows-compatible names. The checks reject path traversal, symbolic links, names that collide under case folding and common paths for keys, databases or user profiles. Review the contents of each file when selecting it for the profile.

The example supports up to 4,096 files and a total of 64 MiB of payload data. It writes an uncompressed classic ZIP archive with a fixed entry order and timestamp. The same profile and file contents produce the same archive. The verifier reads this exact output format.

## Use the package with an installer

| Step | What to check |
| --- | --- |
| Verify source and prerequisites | Check the source receipt for a passing test run. Supply the specified versions of the runtime, dependencies and any launcher. Include the license notices for the components that ship. |
| Approve the profile | For files copied directly from source, compare their SHA-256 hashes with the verified source inventory. Use a separately verified build receipt for generated binaries. Record the hash of the resulting approved profile. |
| Build the installer | Supply the verified archive to your installer build. Record the expected profile and archive hashes, the compiler used and the hash of the resulting installer in its build receipt. |
| Test the installed application | On Windows, exercise installation, startup, an update, an interrupted update and uninstallation. Check that user data survives as specified and compare the installed files with the approved profile. |

For Inno Setup, `installerInputs(payloadRoot, profileBytes, expectedProfileSha256)` returns the contents of `payload-files.iss`, `PAYLOAD.SHA256` and the canonical version pointer `current.json`. Both the pointer and the destination directory `versions/<version>-<sha256>` use the SHA-256 hash of the original profile bytes. Use a separate, verified directory of approved files as `payloadRoot` and as the installer's `SourceDir`. In the `[Files]` section, include the generated file with `#include "payload-files.iss"`. Keep the source files unchanged until the compiler finishes. Supported paths for this integration contain ASCII letters and digits, spaces, periods, underscores, hyphens and forward slashes. [Installer input module](installer-inputs.mjs)

The following snippet writes those files from a build script at the repository root. Set `profilePath` and `payloadRoot` to your build's input paths, and `expectedProfileSha256` to the hash retained when the profile was approved. Use a separate output directory containing your installer script as `setupDir`.

```js
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { installerInputs } from './examples/windows/installer-inputs.mjs';

const profileBytes = await readFile(profilePath);
const { filesInclude, checksums, current } = await installerInputs(payloadRoot, profileBytes, expectedProfileSha256);
await writeFile(path.join(setupDir, 'payload-files.iss'), filesInclude, { flag: 'wx' });
await writeFile(path.join(setupDir, 'PAYLOAD.SHA256'), checksums, { flag: 'wx' });
await writeFile(path.join(setupDir, 'current.json'), current, { flag: 'wx' });
```

`PAYLOAD_VERIFIED` describes the bytes in the archive. Building the installer and testing the installed application each require a separate run.
