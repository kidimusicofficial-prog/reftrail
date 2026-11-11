# Changes · Änderungen

## 4.5.3 – 2026-11-10

Correction after a review that rejected 4.5.2 for one finding. The finding was reproduced on 4.5.2 before the change, with a simulated refusal as in the review and on a mounted file system that refuses hard links.

### Fixed

- **A baseline could appear incomplete on storage without hard links.** The guide of 4.5.2 said that the baseline appears under its name only when it is complete. That held only on storage with hard links. Where the storage refused a hard link, 4.5.2 wrote the bytes directly under the baseline name. A process ended by force during that write left a short file there (954,368 of 67,108,864 bytes in the review, 39,321,600 in the repeat on the mounted file system), and the next attempt was refused because the file existed. `freeze` no longer has this second way of writing. Without hard links it stops with an error before anything exists under the baseline name. The statement now holds on every storage: the baseline name never holds a partly written file.
- **A freeze could still fail after the baseline name existed.** 4.5.2 gave the file its baseline name first and confirmed it afterwards. A process ended by force in between left a baseline without a reported digest. The confirmation now comes before the name is given, so giving the name is the last step that can fail.

### Changed

- The guide states the requirement (storage with hard links: the usual drives of Windows, Linux and macOS; not exFAT, FAT32 and some shared folders), the way to proceed without it (freeze on another drive, copy the baseline, confirm the copy with `check`) and the restart after a freeze that did not finish, for each of the three cases.
- A baseline name that is taken is refused with the restart for the case that an earlier freeze was ended by force before it reported a digest.
- A hard link that is refused for a moment, as by a virus scanner holding the new file, is repeated a few times before the freeze gives up.
- The wording "reads the criteria once" was inexact. The copy and the digest come from one read; a second read confirms that the criteria did not change meanwhile.
- `.gitignore` excludes working files of an interrupted freeze.

### Added

- Tests that end a real process by force at each point of a freeze (while writing, before the baseline name is given, after it is given) and check the documented state and restart; tests for refused hard links in the same process and in a child process; a test for a momentary refusal and for storage that misreports link counts. `tests/fixtures/forced-end.mjs` produces these faults.

### Limits

- Not run on Windows.
- A freeze on storage without hard links is refused. This is a decision for one guarantee on every storage and against a weaker guarantee there.

## 4.5.2 – 2026-11-10

Corrections after a review that rejected 4.5. All four findings were reproduced on 4.5.0 before the change. Each has a test that fails on 4.5.0 and passes now. This version builds on 4.5.0. A version 4.5.1 was produced outside this record; according to its review it changed the version number and references to checksums.

### Fixed

- **Installed command did nothing and reported success.** After `npm install` on Linux, every call of `reftrail`, for example `reftrail catalog check /missing.csv`, ended with exit code 0 and no output. npm installs the command as a link, and the start check compared the started path with the script's own path without resolving links. `tools/reftrail.mjs` now runs unconditionally. `tools/catalog.mjs`, `tools/criteria.mjs` and the two importable example scripts resolve both paths first.
- **The same start check in the other scripts, also in 4.4.** Started through a linked folder (symbolic link, Windows junction), `showcase/uniq/verify.mjs`, `integration/verify.mjs`, `tools/criteria.mjs`, `examples/windows/package-windows.mjs` and `examples/windows/check-release-source.mjs` ran nothing, printed nothing and ended with exit code 0. All of them are corrected. For the verifier this changes its SHA-256; the test report and `showcase/uniq/evidence/verifier-start-v4.5.2.json` record both values and the repeated Linux runs. The Windows comparison has not been repeated with the corrected verifier.
- **Externally supported share counted entries without an evidence path.** An entry with the evidence type "externally supported" and no evidence path counted as 100% externally supported and was listed as complete without evidence at once. Evidence now counts only with both parts, in every figure alike.
- **A mandatory check named twice.** `--gates G01,G01 --strict` reported 1/2 passed and ended with exit code 0. A repeated ID is now an error. The verdict is derived from the same two counts the summary prints, so they cannot disagree.
- **Stopped write left a short baseline.** After a write that stopped at 4,096 of 65,536 bytes the short file stayed under the baseline name and the next attempt failed with `EEXIST`. On storage with hard links the bytes now go to a working file and appear under the baseline name only when complete. After a failed write nothing remains and the same name works again. This entry first claimed that for every storage and for every run ended by force. Both claims were too wide; 4.5.3 corrects the behavior and the wording.

### Changed

- `--strict` needs `--gates`. Without named mandatory checks a strict run had nothing to fail on and passed. It now also fails when an entry is claimed complete without evidence, and the summary names the number of such entries.
- A rounded percentage reads 100 only when nothing is missing and 0 only when nothing is achieved. The report also prints the points behind each percentage. A figure for one milestone or with excluded entries says so in the summary line.
- Errors instead of silent acceptance: `--gates` or `--exclude` without an ID, an excluded ID named twice, a milestone no entry carries, `--milestone` given twice, an ID with spaces or commas, IDs that differ only in upper and lower case.
- A baseline that already exists is reported as such before anything is written.

### Added

- `integration/installed-command.mjs` packs the repository with npm, installs the archive into an empty project and starts the installed command. The GitHub workflow runs it on Linux. It has not been run on Windows.
- Tests: installed command and all start scripts through a link, the evidence rule across all figures, repeated and missing mandatory checks, rounding at the ends of the scale, a write stopped by a replaced file system call and by an operating system limit, storage without hard links.

## 4.5.0 – 2026-11-10

### Added

- **Catalog tool** (`tools/catalog.mjs`). `check` validates a coverage catalog with the English or German header and names each fault with its line. `report` calculates weighted functional coverage and the externally supported share by the formulas in the brief and prints them next to the named mandatory checks. `--strict` turns a failed mandatory check into an error exit.
- **One command for both tools** (`tools/reftrail.mjs`) and a `package.json` with `npm test`, the supported Node.js range and no dependencies.
- **Linux run for criteria revision 2** of the showcase: 16 byte-for-byte comparisons and 2 early-exit checks against GNU `uniq` 9.4, ten repeated runs and the differential review, recorded in `showcase/uniq/evidence/`. This closes the comparison that 4.4 listed as pending.
- **Tests** for the catalog tool, the command line, the package metadata and every relative link and heading anchor in the documentation.
- `CHANGELOG.md` and `CONTRIBUTING.md`.

### Changed

- **Freezing criteria** reads the file once and takes both the baseline and the digest from those bytes. A freeze that fails because the file is being edited removes its baseline again. Before, such a freeze left the baseline behind, and a second attempt under the same name was refused. In a test with a file under constant rewriting, 273 of 300 freezes of version 4.4 failed this way.
- **Agent briefs** in both languages: the catalog figures come from the catalog tool, and only observed behavior in own words is passed to the implementation. Decompiled code, pseudocode and source text of the reference stay out of criteria, catalog and implementation task.
- **README** in both languages: overview of the parts, a section on what RefTrail leaves to the user, and legal notes extended by the CJEU decision C-406/10, Article 6 of Directive 2009/24/EC and a statement that the notes are no legal advice.
- **Integration run** covers the published files, including briefs, guides and `package.json`. Before, the briefs and guides were outside the source receipt.
- **GitHub workflow** also runs on Node.js 22, the stated minimum line, and checks the showcase catalog with its mandatory check.

### Unchanged on purpose

- `showcase/uniq/line-runs.mjs`, `verify.mjs`, `criteria.json`, both baselines and `evidence/review.py` keep their recorded SHA-256 values. The test report holds the values of program and criteria, `evidence/revision-v2.json` the value of the verifier and the review receipts the value of the review script. Version 4.5.2 changes the verifier.

## Earlier versions

Versions up to 4.4 were distributed as archives without a change record.

---

**Deutsch, Kurzfassung 4.5.3.** Korrektur nach einer Prüfung, die 4.5.2 wegen eines Befunds abgelehnt hat. Laut Anleitung erschien die Baseline erst vollständig unter ihrem Namen. Das galt nur auf Datenträgern mit Hardlink-Unterstützung. Verweigerte der Datenträger den Hardlink, schrieb 4.5.2 direkt unter den Zielnamen, und ein gewaltsam beendeter Prozess hinterließ dort eine unvollständige Datei, die den nächsten Versuch blockierte. `freeze` hat diesen zweiten Schreibweg nicht mehr und bricht ohne Hardlinks ab, bevor unter dem Zielnamen etwas entsteht. Die Aussage gilt damit auf jedem Datenträger. Außerdem prüft der Befehl jetzt vor der Namensvergabe statt danach. Die Anleitung nennt die Voraussetzung, den Ausweg (auf anderem Laufwerk festschreiben, Baseline kopieren, mit `check` bestätigen) und den Wiederanlauf für alle drei Fälle eines nicht beendeten Laufs. Unter Windows nicht ausgeführt.

**Deutsch, Kurzfassung 4.5.2.** Korrekturen nach einer Prüfung, die 4.5 abgelehnt hat. Alle vier Befunde wurden an 4.5.0 nachgestellt und haben jetzt je einen Test, der an 4.5.0 fehlschlägt. Erstens tat der mit npm installierte Befehl unter Linux nichts und meldete Erfolg. Ursache war eine Startprüfung, die Verknüpfungen nicht auflöste. Dieselbe Prüfung steckte in allen Startskripten, auch in 4.4: Über einen verlinkten Ordner gestartet, liefen sie nicht und endeten mit Exitcode 0. Alle sind berichtigt. Beim Prüfskript des Beispiels ändert das die Prüfsumme; Prüfbericht und Beleg nennen beide Werte, der Windows-Vergleich ist mit dem berichtigten Prüfskript noch nicht wiederholt. Zweitens zählte ein Eintrag ohne Nachweispfad als extern gestützt. Drittens ergab eine doppelt genannte Pflichtprüfung „1/2 bestanden“ mit Exitcode 0. Viertens blieb nach einem Schreibabbruch eine unvollständige Baseline liegen und blockierte den nächsten Versuch. Zusätzlich verlangt `--strict` jetzt `--gates`, ein gerundeter Wert lautet nur bei Vollständigkeit 100, und `integration/installed-command.mjs` prüft den installierten Befehl.

**Deutsch, Kurzfassung 4.5.0.** Neu sind das Katalogwerkzeug (`check` prüft den Aufbau, `report` berechnet Fachabdeckung und extern gestützten Anteil zusammen mit den Pflichtprüfungen), ein gemeinsamer Befehl für beide Werkzeuge, `package.json`, der Linux-Lauf für Kriterienrevision 2 des Beispiels sowie Tests für Katalogwerkzeug, Befehlszeile und alle Verweise in den Anleitungen. Geändert sind das Festschreiben der Kriterien (Kopie und Prüfsumme stammen aus denselben gelesenen Bytes, ein gescheiterter Lauf hinterlässt keine Datei), die Arbeitsaufträge (Kennzahlen aus dem Werkzeug, nur beobachtetes Verhalten geht an die Umsetzung), die README (Übersicht, Grenzen, erweiterte Rechtshinweise), der Umfang des Integrationslaufs und der GitHub-Workflow. Programm, Prüfer, Kriterien und Baselines des Beispiels sind unverändert.
