# Line Runs · A reference rebuild you can try

This small Node.js command filters **consecutive equal lines** on standard input. It implements the default behavior of GNU `uniq` and three individual switches. For example, `bolt, bolt, nut, bolt` in count mode produces three groups with counts **2, 1, 1**. The last bolt starts a new group.

From the repository root, with Node.js 22.16 or newer:

```sh
node showcase/uniq/verify.mjs
```

To try the program itself in a POSIX shell:

```sh
printf 'bolt\nbolt\nnut\nbolt\n' | node showcase/uniq/line-runs.mjs -c
```

```text
      2 bolt
      1 nut
      1 bolt
```

Run `node showcase/uniq/line-runs.mjs` for one record per group, `-d` for repeated groups or `-u` for singletons. Close standard input to finish the stream. The implementation handles raw bytes and writes LF-delimited records. The CLI requires Node.js. The verifier uses only the Node.js standard library. Add `--reference` to the **verifier** if GNU Coreutils `uniq` is on your PATH for a live comparison in the C locale.

| Step | Inspect the actual artifacts |
| --- | --- |
| Identify the target and select the scope | [Official manual](https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html) and [scope and exclusions](criteria.json). The observed binaries were GNU Coreutils 9.4 on Linux (revisions 1 and 2) and 8.32 on Windows (revision 2). |
| Fix acceptance before implementation | [Frozen baseline, revision 2](baseline/criteria-v2.json), [retained revision 1](baseline/criteria.json), [pins and chronology](TEST_REPORT.md), [pin in verifier](verify.mjs). |
| Implement through a real user interface | [Standalone CLI](line-runs.mjs). It reads stdin, writes stdout, reports unsupported invocations on stderr and stops quietly when a reader closes its output early. |
| Revise criteria when a gap appears | Revision 2 adds R07 after a differential check found a diagnostic on early reader exit. The criteria were frozen first, the old program failed the new case and only then was the program changed. [Revision record](evidence/revision-v2.json) |
| Verify each claimed capability | [Filled coverage catalog](COVERAGE.csv), [test report](TEST_REPORT.md), live comparisons for [revision 1](evidence/reference-run.json), [revision 2 on Windows](evidence/reference-run-v2.json) and [revision 2 on Linux](evidence/reference-run-v2-linux.json), additional review for [revision 1](evidence/review-run.json) and revision 2 on [Windows](evidence/review-run-v2.json) and [Linux](evidence/review-run-v2-linux.json). The [catalog tool](../../tools/README.md) recalculates coverage and the mandatory check from the catalog. The verifier's start was corrected in 4.5.2, see the [change record](evidence/verifier-start-v4.5.2.json). |
| Record a scoped delivery decision | [Final status](STATUS.md). The result applies to the four specified invocations. |

## Auf Deutsch

Line Runs fasst aufeinanderfolgende gleichlautende Zeilen zusammen. Du kannst das Beispiel direkt vom Repository-Stamm mit `node showcase/uniq/verify.mjs` prüfen oder die CLI mit eigenen Eingaben verwenden. Mit `-c` zählt sie die Größe jeder Gruppe, mit `-d` erscheinen nur wiederholte Gruppen und mit `-u` nur Einzelgruppen. Eine später erneut auftretende Zeile beginnt eine neue Gruppe.

Im [ausgefüllten Katalog](COVERAGE.csv) stehen sieben fachliche Anforderungen und eine Pflichtprüfung für ungültige Aufrufe. Revision 2 ergänzt R07: Schließt ein nachfolgendes Programm die Ausgabe vorzeitig, endet Line Runs ohne Fehlermeldung. Die neuen Kriterien wurden vor der Programmänderung festgeschrieben, die erste Fassung bestand die beiden neuen Fälle nachweislich nicht. Der [Prüfbericht](TEST_REPORT.md) unterscheidet die Läufe gegen GNU `uniq` 9.4 (Linux, Revision 1 und 2) und 8.32 (Windows, Revision 2), die eigenen Fehlerfälle und die zusätzliche Prüfung. Revision 2 ist als Selbstprüfung gekennzeichnet. Den Linux-Lauf für Revision 2 hat ein externer Prüfer ausgeführt. Der erste Befehl arbeitet mit den festgehaltenen Sollwerten. Für einen erneuten Live-Vergleich führe `node showcase/uniq/verify.mjs --reference` mit GNU Coreutils auf dem Suchpfad aus.
