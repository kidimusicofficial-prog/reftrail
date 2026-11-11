# Check that a saved value survives a restart

[Deutsch](README.md) · English

Can a user save a value, fully close the application, reopen it and retrieve the same value? The session check launches the same executable twice with the same arguments. Both launches use one fresh profile reserved for the test.

## Try it

From the repository root, run the test with Node.js 22 or later.

```sh
node --test tests/session.test.mjs
```

The example adapter drives a synthetic console program through standard input and output. The passing test writes a random value and checks it after restart. A variant that keeps its value only in memory must fail the read after restart. A third test supplies an incorrect file hash and expects the check to fail before launch. [Example adapter](../../tests/session.test.mjs) · [Console fixture](../../tests/fixtures/session-program.mjs)

## Use the check with your application

Import `verifyInstalledSession` and pass an `executable` record. Optionally include other application files in `inputs`. Each record contains an absolute, link-free file path in `path` and its expected `sha256` as 64 lowercase hexadecimal characters. For a release check, take the expected hashes from the approved build. The synthetic test computes its expected hashes from its local test files. [Session module](installed-session.mjs)

Set `sample` to a distinct synthetic value and `emptyValue` to the value expected in an empty profile (default `null`). Supply an adapter that drives the application's public interface.

| Method | Contract |
| --- | --- |
| `args(profile)` | Returns the startup arguments. Explicitly pass the supplied temporary directory as the application's data profile. |
| `connect(child, signal)` | Waits until the launched process confirms it is ready and returns a usable client. |
| `write(client, sample, signal)` | Performs the operation under test and waits for confirmation. |
| `read(client, signal)` | Reads the result through the interface used by an actual user and returns it in a form that can be compared with the expected value. |
| `stop(client, signal)` | Requests a normal shutdown through the application's supported interface. |

Use a separate test account if the application requires authentication. Use the same test profile for reads and writes. Honor the abort signal in asynchronous requests and waits. `timeoutMs` limits each of the two runs, including shutdown, and defaults to 30 seconds.

The check compares the specified files before the first launch, between sessions and after the second shutdown. Both processes must exit normally with code 0. After the check finishes or fails, it removes its temporary profile.

The result covers the single-process application that was launched, the files identified by their hashes and the read/write case that ran. Use `inputs` to cover additional application files. The application inherits the process environment. Its adapter must ensure it uses the supplied profile path. Launchers that start independent child processes require additional process-management checks. Installation, updates and uninstallation require separate runs on the target platform.
