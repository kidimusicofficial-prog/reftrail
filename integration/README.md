# Eine geprüfte CLI verpacken · Package a verified CLI

## Deutsch

Der [Integrationslauf](verify.mjs) führt die Tests sowie die fachliche Abnahme des [Zeilenfilters](../showcase/uniq/line-runs.mjs) aus. Du brauchst Node.js ab 22.16 und ein temporäres Systemverzeichnis außerhalb des Repositorys. Starte im Repository-Stamm:

```sh
node integration/verify.mjs
```

1. Der Lauf prüft die JavaScript-Syntax, führt die Testdateien aus und vergleicht die Dateihashes vor und nach der Prüfung. Der Quellbeleg umfasst den veröffentlichten Stand: die Anleitungen im Stammverzeichnis, `docs/`, `examples/`, `integration/`, `prompts/`, `showcase/`, `templates/`, `tests/`, `tools/`, die `LICENSE` und `package.json`. Die Git-Einstellungen und `.github/` gehören nicht dazu.
2. Aus dem belegten Quellstand entsteht eine verifizierte Kopie. In dieser Kopie führt der Treiber dieselben Tests erneut aus. Liest ein Test Dateien außerhalb des Belegs, bricht der Lauf hier ab. Anschließend startet er dort die [Abnahme des Zeilenfilters](../showcase/uniq/verify.mjs). Die portable Prüfung verwendet die festgelegten Erwartungen. Erfolg verlangt einen regulären Exitcode 0, den Status `PASS`, den passenden Kriterienhash und einen identischen Quellbestand nach Ausführung.
3. Das Ausgabe-ZIP enthält `showcase/uniq/line-runs.mjs` und `LICENSE`. Beide Sollhashes stammen aus dem geprüften Quellstand. Der Paketprüfer öffnet das Archiv erneut und kontrolliert die enthaltenen Dateien gegen das gebundene Profil.
4. `acceptance.json` enthält die tatsächliche JSON-Ausgabe der Fachprüfung. `integration.json` verbindet ihren Hash mit Quellbeleg, Profil, Paketbeleg und ZIP. Der Lauf meldet die Pfade und den Hash des Integrationsbelegs. Bei einem Fehler endet er mit einem Fehlercode. Der neu angelegte Ausgabeordner bleibt zur Prüfung erhalten.

Die Kindprozesse dieses Integrationslaufs verwenden ein eigenes temporäres Verzeichnis. `node --test "tests/*.test.mjs"` im Repository-Stamm prüft die Testdateien zusätzlich mit der geerbten Umgebung. Für den Vergleich mit einem installierten GNU `uniq` dient `node showcase/uniq/verify.mjs --reference`. Die Berichte zeigen, ob dieser Vergleich ausgeführt wurde. Die Paketprüfung belegt die ausgelieferten CLI- und Lizenzbytes; eine native Installerabnahme benötigt einen eigenen Lauf.

`node integration/installed-command.mjs` prüft den Befehl `reftrail` so, wie er nach einer Installation vorliegt. Der Lauf braucht npm. Er packt das Repository, installiert das Archiv in ein leeres temporäres Projekt und startet dort den installierten Befehl: mit einer fehlenden Datei, mit dem Katalog des Beispiels, mit Festschreiben und Prüfen von Kriterien, mit `--help` und ohne Argumente. Unter Linux und macOS startet er die von npm angelegte Verknüpfung. Unter Windows legt npm eine Startdatei an. Dort startet der Lauf stattdessen das installierte Skript mit Node.js. Unter Windows wurde dieser Lauf bisher nicht ausgeführt.

## English

The [integration runner](verify.mjs) runs the tests and verifies the behavior of the [line filter](../showcase/uniq/line-runs.mjs). It requires Node.js 22.16 or newer and a system temporary directory outside the repository. From the repository root, run:

```sh
node integration/verify.mjs
```

1. The runner checks JavaScript syntax, executes the test files and compares file hashes before and after the checks. The source receipt covers the published files: the guides in the repository root, `docs/`, `examples/`, `integration/`, `prompts/`, `showcase/`, `templates/`, `tests/`, `tools/`, `LICENSE` and `package.json`. Git settings and `.github/` are outside it.
2. It creates a verified copy of the recorded sources and reruns the same tests from that copy. If a test reads files outside the receipt, the run stops here. It then runs the [showcase acceptance checks](../showcase/uniq/verify.mjs) from that copy. The portable check uses the pinned expectations. Success requires exit code 0, a `PASS` result, the bound criteria hash and an unchanged source tree after execution.
3. The ZIP contains `showcase/uniq/line-runs.mjs` and `LICENSE`. Both expected hashes come from the tested source inventory. A separate verifier reopens the archive and checks its files against the pinned profile.
4. `acceptance.json` holds the actual JSON output of the behavior checks. `integration.json` binds its digest to the source receipt, profile, package receipt and ZIP. The runner prints the paths and the digest of the integration receipt. Failed checks produce a nonzero exit code. The fresh output directory remains available for inspection.

Child processes in this integration run use a dedicated temporary directory. Run `node --test "tests/*.test.mjs"` from the repository root to run the test files in the inherited environment as well. Run `node showcase/uniq/verify.mjs --reference` for a live comparison with an installed GNU `uniq`. The reports identify whether a live comparison ran. The package check verifies the CLI and license bytes shipped in the ZIP. Native installer acceptance requires a separate run.

`node integration/installed-command.mjs` checks the `reftrail` command as it exists after an installation. The run needs npm. It packs the repository, installs the archive into an empty temporary project and starts the installed command there: with a missing file, with the showcase catalog, with freezing and checking criteria, with `--help` and without arguments. On Linux and macOS it starts the link npm created. On Windows npm writes a launcher file. There the run starts the installed script with Node.js instead. This run has not yet been executed on Windows.
