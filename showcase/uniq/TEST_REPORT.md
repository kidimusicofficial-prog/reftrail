# Line Runs acceptance report

**Decision: A for the declared slice (criteria revision 2).** Seven reference requirements passed (14/14 weighted feature points). One mandatory local gate passed (1/1). No critical defect was observed in the exercised scope. The combined decision applies to stdin/stdout, the C locale and the four invocations in the [revision 2 baseline](baseline/criteria-v2.json).

## Revision 1: inputs and sequence

The specification author used the [GNU manual](https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html), the installed help and direct observations of GNU Coreutils 9.4. The online manual is a living document. Output padding, binary data and missing-final-LF expectations were checked against the installed version. Synthetic inputs and expected outputs are recorded as hexadecimal bytes to make empty records, CR, NUL and non-UTF-8 data unambiguous.

The specification author fixed six behavioral criteria and one mandatory local argument gate. Before implementation the author made an exclusive byte copy, announced its SHA-256 in a separate task record and passed the pinned criteria to a separate implementation agent. The implementation agent checked the digest before writing the program. The final verifier repeats the comparison through the repository's [criteria tool](../../tools/README.md). A copy and digest kept together in this ZIP can be checked for drift. Independent proof of chronology requires the separately preserved record or another independently controlled system.

| Event | UTC, 9 November 2026 |
| --- | --- |
| First recorded specification work | 17:37:28 |
| Criteria frozen and SHA-256 recorded | 17:38:07.413734 |
| Implementation agent began | 17:38:47.799458 |
| Implementation and first checks reported complete | 17:39:22.656179 |
| First live acceptance run | 17:39:57.247 to 17:39:58.563 |
| Additional differential review | 17:40:46.768600 to 17:40:50.548224 |

**Revision 1 criteria SHA-256:** `ca0f09342cbe9d306e3cb8569dde6e1c5ea33a91d2619cfcd5ba1ade7a96fd90`  
**Revision 1 implementation SHA-256:** `4de335e961e6b7f3a4903e331411f44ac9078943e8b566e04e2be27afe8fe80b`

Elapsed time from the first recorded specification step through first live acceptance was about 2 min 31 s. The live verifier itself took 1.316 s. Agents worked in parallel. These elapsed times exclude packaging, documentation polishing and later review. **Model tokens and monetary cost were unavailable** in the task environment. The example records them as unknown. [Timing record](evidence/timing.json)

## Revision 1: executed checks

Environment: Linux x86-64, Node.js 24.22.1, GNU Coreutils `uniq` 9.4, `LC_ALL=C`. The candidate and reference were launched as separate processes.

| Checks | Result | What was observed |
| --- | --- | --- |
| 12 cases fixed before coding, C01–C12 | 12/12 | Candidate output and reference output matched the literal expected bytes, the processes exited successfully and stderr was empty. Includes nonadjacent repeats, empty data, unterminated final lines and binary records. |
| 4 supplemental comparisons | 4/4 | One independently selected 210,112-byte input in four modes matched the recorded output digests and live GNU output. |
| Mandatory invocation gate G01, L01–L04 | 4/4 | Each unsupported argument form produced nonzero exit, empty stdout and a diagnostic. This gate assesses the local scope decision. GNU accepts additional argument forms. |

The [recorded primary run](evidence/reference-run.json) reports **16 live comparisons** and **4 local rejections**. The portable command runs the same acceptance cases against the frozen expectations and recorded digests. It reports zero live comparisons when GNU was not invoked.

A separate reviewer used a new deterministic corpus with input bytes spanning the byte range, long records around buffer boundaries, and a group of 10,001 records. All four modes matched GNU across 40 different inputs (160/160 comparisons). Ten further invalid argument combinations were rejected. The seed, implementation hash, review-script hash and ordered result digest are in the [review receipt](evidence/review-run.json). The reviewer and implementer were separate agents in this session. This is an internal review using the original executable as an external oracle.

## Revision 2: early reader exit

**Reason.** A separate differential check piped the revision 1 program into a reader that stopped after the first line, as `head -n 1` does. The program wrote `line-runs: EPIPE: broken pipe, write` to stderr and exited with status 1. GNU `uniq` wrote no diagnostic. Revision 1 did not cover this behavior.

**Change.** Revision 2 adds R07 (weight 1) and the cases P01 and P02. The verifier sends 200,000 distinct lines and keeps standard input open. It closes standard output after the first chunk and keeps sending further distinct lines. The program must end within 5 seconds with an empty stderr. A program that keeps reading after the failed write never sees end of input and fails. The exit status is not compared because GNU ends through SIGPIPE. R01–R06, G01 and all revision 1 cases are unchanged, and the revision 1 baseline stays in place under its own pin.

| Event | UTC, 9 November 2026 |
| --- | --- |
| Criteria revision 2 frozen; SHA-256 announced in the requester chat | 18:03:19 |
| Unchanged revision 1 program failed P01 with the EPIPE diagnostic | 18:04:10 |
| Program changed to stop quietly on EPIPE | 18:04:36 |
| First live acceptance run against GNU `uniq` 8.32 (first harness, superseded) | 18:07:18.927 to 18:07:20.801 |
| Differential review script rerun | 18:07:48.823959 to 18:07:53.023271 |
| Live acceptance run with the corrected harness | 18:54:28.573 to 18:54:30.419 |
| Ten further live runs with the corrected harness completed | 18:54:48 |

**Revision 2 criteria SHA-256:** `aeb2acf023f6a27b7042b09b194ccf0a3b107637fc928f2be26a81bc7d520a75`  
**Revision 2 implementation SHA-256:** `e9819ff89daafb5b9c0a1b2df755d56034f902b6cb505797993027c774694704`

Environment: Windows 11 x64, Node.js 24.16.0, GNU Coreutils `uniq` 8.32 from Git for Windows, `LC_ALL=C`.

| Checks | Result | What was observed |
| --- | --- | --- |
| Revision 1 cases C01–C12, supplemental input and G01 | 12/12, 4/4, 4/4 | Unchanged expectations, matched live GNU output. |
| Early reader exit P01–P02 | 2/2 | With input kept open, candidate and GNU both ended after the reader closed, with empty stderr. No output bytes are compared. |
| Repeated live run | 10/10 | The complete `--reference` run with the corrected harness passed ten times in a row. |
| Faulty variant, [tests/early-exit.test.mjs](../../tests/early-exit.test.mjs) | rejected | A variant that ignores failed writes and keeps reading fails P01 with a timeout. |
| Differential review script | 160/160 | The ordered result digest equals the revision 1 digest, so the change did not alter normal output for that corpus. |

The [revision 2 run](evidence/reference-run-v2.json) reports **16 byte-for-byte output comparisons**, **2 early-exit checks** and **4 local rejections**. The [review receipt](evidence/review-run-v2.json) and the [revision record](evidence/revision-v2.json) hold the hashes and times. One agent wrote criteria revision 2, changed the program and ran these checks. **This is a marked self-check, not an independent review.** Token usage and monetary cost were not measured and are recorded as unknown.

### Test correction after external review

An external review found two defects in the first revision 2 delivery. The first early-exit harness sent all input and closed standard input itself. A deliberately faulty variant that ignores failed writes and keeps reading until end of input therefore passed P01 and P02. The published summary also counted the two early-exit checks as byte-for-byte comparisons. In addition, on Windows the first harness reported a timeout as `EBUSY`, because it removed the working directory before the killed process had closed.

The corrected harness keeps the input open as described above and reports a timeout only after the process has closed. Criteria revision 2 and its pin are unchanged, because R07 already requires the program to stop reading. The program is unchanged (SHA-256 `e9819ff8…`). The [mutation test](../../tests/early-exit.test.mjs) builds the faulty variant from the current program. It fails the corrected harness and passed the first one. The first run is retained as [reference-run-v2-superseded.json](evidence/reference-run-v2-superseded.json); its count of 18 combines both kinds of check.

A second external review found an unquoted semicolon in the R07 change note of the [catalog](COVERAGE.csv). The row therefore had 15 fields instead of the 14 in the header. The semicolon is now a full stop. The [catalog test](../../tests/catalog.test.mjs) checks every catalog in `templates/` and `showcase/` against its template header and reported this row before the fix.

### Revision 2 on Linux, external review run

On 10 November 2026 a reviewer outside the original session reran the checks at the author's request. The reviewer was an AI assistant working from the delivered ZIP in a separate Linux environment. The program had the SHA-256 recorded above (`e9819ff8…`). The verifier had the value in the [revision record](evidence/revision-v2.json) (`d6ae4522…`) and the review script the value in the review receipts (`910205cf…`).

Environment: Ubuntu 24.04 x86-64, Node.js 22.23.4, GNU Coreutils `uniq` 9.4, Python 3.13.18, `LC_ALL=C`.

| Checks | Result | What was observed |
| --- | --- | --- |
| Complete `--reference` run, 01:48:02.065 to 01:48:03.033 UTC | PASS | 16 byte-for-byte output comparisons and 2 early-exit checks against GNU `uniq` 9.4, plus 4 local rejections. [Run record](evidence/reference-run-v2-linux.json) |
| Repeated live run | 10/10 | Ten further complete `--reference` runs passed in a row, ending 01:48:12 UTC. |
| Differential review script | 160/160 | The ordered result digest `18fb72a6…` equals the digest of both earlier review runs. [Review receipt](evidence/review-run-v2-linux.json) |

This closes the Linux comparison that the first revision 2 delivery left open. The reviewer did not write the criteria or the program. The run used the criteria and expected values as delivered and does not assess their content.

### Verifier start corrected in 4.5.2

A review of version 4.5 found that the installed command ended without output and with exit code 0. The cause was a start check that compared the started path with the script's own path without resolving links. The verifier of this showcase carried the same check in every version up to 4.5. Started through a linked folder (a symbolic link or a Windows junction), it ran no case, printed nothing and ended with exit code 0.

The verifier now runs unconditionally. One line changed: the start check became a plain block. The function that runs the cases, the criteria, their pin and the program are unchanged.

**Verifier SHA-256 before:** `d6ae4522119a8d12c20f9e55381e6ce8f50edf8f6c57134dd81948f754f61b41`  
**Verifier SHA-256 from 4.5.2:** `70c8ea4e2bccaa3987d78ad928fcb7e152711a274d935571bee1bb42326ad5ad`

| Checks with the corrected verifier, 10 November 2026 | Result | What was observed |
| --- | --- | --- |
| Start through a linked folder | PASS, 431 bytes of output | Before the correction: exit code 0 and no output. |
| Complete `--reference` run on Linux, 10:17:07.120 to 10:17:08.407 UTC | PASS | 16 byte-for-byte output comparisons and 2 early-exit checks against GNU `uniq` 9.4, plus 4 local rejections. |
| Repeated live run | 10/10 | Ending 10:17:21 UTC. |
| Faulty variant, [tests/early-exit.test.mjs](../../tests/early-exit.test.mjs) | rejected | The variant that keeps reading still fails with a timeout. |

The [change record](evidence/verifier-start-v4.5.2.json) holds both hashes, the run output and the roles. An AI assistant working as external reviewer made the change and ran these checks. For this change that is a marked self-check. **The Windows comparison against GNU `uniq` 8.32 was recorded with the previous verifier and has not been repeated with this one.**

## Reproduce

From the repository root:

```sh
node showcase/uniq/verify.mjs
node showcase/uniq/verify.mjs --reference
```

For the optional additional review, use Python 3, Node.js and GNU Coreutils:

```sh
python3 showcase/uniq/evidence/review.py showcase/uniq/line-runs.mjs uniq
```

## Limits of the result

The claimed scope excludes file operands, multiple or long options, locale-specific comparison rules and a performance target. The program keeps the current record and group in memory. Very long individual records are bounded by available memory. Live comparisons were performed on Linux for both revisions and on Windows for revision 2. The Windows comparison used the verifier before its start correction in 4.5.2. The GitHub workflow repeats the Linux comparison on every push. This filter does not persist user data, migrate schemas or install a native application. Backup, restore and installer checks are inapplicable to this slice. A developer choosing a different scope must fix a new baseline before implementing it.
