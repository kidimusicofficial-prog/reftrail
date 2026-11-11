# Delivery status

**A — the agreed standard-input slice is complete (criteria revision 2).** The CLI groups adjacent LF-delimited records. It accepts the default invocation or one of the three flags `-c`, `-d` and `-u`. It preserves the tested byte sequences in the C locale and stops without a diagnostic when a reader closes its output early.

| Measure | Current state |
| --- | --- |
| Weighted functional scope | 14 of 14 points (100%) for R01–R07 at implementation level 2. All 14 points have external reference support. |
| Mandatory operational gates | 1 of 1 passed. G01 requires unsupported invocations to fail without writing any standard output. This separately reported gate has weight 0 and local evidence. |
| Critical defects | None identified in the agreed slice and executed cases. |
| Comparative evidence | Revision 2: 16 byte-for-byte output comparisons and 2 early-exit checks against GNU Coreutils `uniq` 8.32 under Windows x64 (Git for Windows), plus 4 local rejection cases. The early-exit checks compare termination and stderr, not output bytes. Revision 1: 16 byte-for-byte output comparisons against GNU `uniq` 9.4 under Linux x64. Revision 2 was also run under Linux x64 against GNU `uniq` 9.4 on 10 November 2026 in an external review: 16 byte-for-byte output comparisons and 2 early-exit checks passed. |

The [catalog](COVERAGE.csv) maps the eight criteria to their checks. `node tools/catalog.mjs report showcase/uniq/COVERAGE.csv --gates G01` recalculates the first two rows of this table from it. The [test report](TEST_REPORT.md) records the evidence, environment and limits, including the available time and AI-cost accounting. The current [frozen specification](baseline/criteria-v2.json) is identified by SHA-256 `aeb2acf023f6a27b7042b09b194ccf0a3b107637fc928f2be26a81bc7d520a75`. Revision 1 is retained unchanged in [baseline/criteria.json](baseline/criteria.json) with SHA-256 `ca0f09342cbe9d306e3cb8569dde6e1c5ea33a91d2619cfcd5ba1ade7a96fd90`.

File operands, combined and long options, locale-dependent comparison rules, native installation and large-input performance are outside the agreed scope. The observed runs establish Linux results for both revisions and Windows results for revision 2. Persistent storage, backup and restoration do not apply to this stateless standard-I/O filter.

The pilot began its recorded specification work at 17:37:28 UTC on 9 November 2026 with the four-invocation scope. A separate monetary cap and deadline were not recorded in advance for this pilot. The measured run interval is in the report; the brief’s prospective 60-minute default is not a historical cost or timing record. Revision 2 was added the same day after a separate differential check found a diagnostic on early reader exit. Its criteria were frozen before the program changed; the report lists the sequence. After an external review, the early-exit harness was tightened without changing the criteria: the first version closed the input itself and could not detect a program that keeps reading.

In version 4.5.2 the start of the verifier was corrected. Reached through a linked folder it had ended without running a check. The criteria, their pin and the program are unchanged. The report gives both verifier hashes and the repeated Linux runs. The Windows comparison has not been repeated with the corrected verifier.

**To resume,** run `node showcase/uniq/verify.mjs` from the repository root to replay the retained expectations. Add `--reference` to exercise the installed GNU reference as well. To expand the program, select another behavior and record a new baseline before implementing it.
