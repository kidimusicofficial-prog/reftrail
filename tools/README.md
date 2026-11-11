# RefTrail tools · Werkzeuge

Two small commands with no dependencies beyond Node.js 22.16 or newer. Run them from this repository, or copy the `tools` folder into your project. · Zwei kleine Befehle, die nur Node.js ab 22.16 brauchen. Starte sie aus diesem Repository oder kopiere den Ordner `tools` in dein Projekt.

## English

### Freeze acceptance criteria

Before implementing a feature, put its scope, acceptance criteria and tolerances in a separate criteria file. Keep implementation status and evidence in the evolving coverage catalog.

```sh
node tools/criteria.mjs freeze criteria.csv criteria-v1.baseline.csv
node tools/criteria.mjs check criteria.csv criteria-v1.baseline.csv PINNED_SHA256
```

The first command creates an exact byte copy at a new path in an existing directory. The copy and the digest both come from one read of the criteria. An existing baseline is never replaced. Record the returned `sha256` in a separate review record or protected commit **before implementation**. Replace `PINNED_SHA256` with that value. Run the check before the first implementation change, again before acceptance and on resumption. On success it prints `CRITERIA_VERIFIED`. A mismatching file or invalid pin causes a nonzero exit. If the specification needs a justified change, retain the old baseline, record the reason and freeze a new version under a new name.

**How the baseline is written.** The bytes go to a working file named `reftrail-<id>.partial` in the folder of the baseline. The command confirms that file and reads the criteria a second time to confirm that they did not change meanwhile. Only then does it give the file the baseline name, in one step of the storage (a hard link). The baseline name therefore never holds a partly written file.

This step needs storage that supports hard links. The usual drives of Windows (NTFS), Linux and macOS do. exFAT and FAT32 media and some shared folders do not. There the command stops with an error before anything exists under the baseline name. It has no other way of writing the baseline. Freeze in a folder on a drive with hard links, copy the baseline file to its place and run `check`, which confirms the copy against the digest.

**If a freeze does not finish.** A freeze has finished when it printed `CRITERIA_FROZEN` with the digest.

| What happened | What remains | How to continue |
| --- | --- | --- |
| The command reported an error: disk full, criteria changed meanwhile, hard links unavailable | Nothing. If the working file could not be removed, the message names it. | Remove the cause and repeat with the same baseline name. |
| The process was ended by force before the baseline name existed | At most a working file `reftrail-<id>.partial`, complete or not | Repeat with the same baseline name. Delete the working file. |
| The process was ended by force after the baseline name existed and before the digest was printed | The complete baseline without a reported digest, possibly also the working file | The command refuses the name because it never replaces a file. Delete the baseline and the working file, then repeat. |

If the working file cannot be removed after a finished freeze, the output names it as `workingFileLeft`. Delete it. Keep working files out of version control, for example with the line `reftrail-*.partial` in `.gitignore`.

The comparison covers every byte, including the BOM and line endings. Keep identical checkout settings for both files. If Git converts line endings in your project, mark the criteria and baseline files with `-text` in `.gitattributes` so that every checkout has the recorded bytes. The digest establishes correspondence to the recorded bytes. The chronology depends on the separately retained record. The content of the criteria and the independence of their reviewer require their own assessment.

### Check and report the coverage catalog

```sh
node tools/catalog.mjs check COVERAGE.csv
node tools/catalog.mjs report COVERAGE.csv --gates G01,G02
```

`check` reads a catalog with the English or German header. It reports each fault with its line: a missing byte order mark, a changed header, a row with too many or too few fields, a repeated ID and values outside the lists in the brief. A fault ends the command with a nonzero exit. Evidence counts only with both parts, an evidence type other than `none` and an evidence path. An entry with one part alone, or at implementation 2 without evidence, produces a warning.

`report` calculates the two figures from the brief: weighted functional coverage and the externally supported share. It also prints the points behind each percentage. An entry adds to the externally supported share only with that evidence type and an evidence path. The report lists the open entries, the entries claimed complete without evidence and the entries with weight 0, which do not move the percentage. Name the mandatory checks of the agreed scope with `--gates`. A mandatory check counts as passed at implementation 2 with an evidence type and evidence path. The `summary` line puts the results side by side, for example `100% functional coverage, 2/3 mandatory checks passed, release blocked, 1 entry claimed complete without evidence`. A rounded percentage reads 100 only when nothing is missing.

| Option | Effect |
| --- | --- |
| `--gates ID,ID` | Mandatory checks of the agreed scope. An unknown ID and an ID named twice are errors. |
| `--exclude ID,ID` | Entries that do not apply to the agreed scope. Give the reason in the catalog. The report lists them. |
| `--milestone NAME` | Count only the entries of one milestone. A name no entry carries is an error. |
| `--strict` | For an automated check. Needs `--gates`. Ends with a nonzero exit when a named mandatory check has not passed or an entry is claimed complete without evidence. |

A figure for one milestone or with excluded entries says so in the `summary` line. The report works on what the catalog states. It does not open the referenced evidence. Whether an entry deserves its implementation level and whether its evidence supports the criterion remain questions for the reviewer. Open critical defects and the acceptance decision are outside the catalog and belong in the report next to these figures.

Both tools are also available through one command: `node tools/reftrail.mjs criteria …` and `node tools/reftrail.mjs catalog …`. After `npm install` of this folder or of its packed archive the command is called `reftrail`. `node integration/installed-command.mjs` installs the archive into an empty project and checks that command.

## Deutsch

### Abnahmekriterien festschreiben

Schreibe vor der Umsetzung Umfang, Abnahmekriterien und Toleranzen eines Arbeitspakets in eine gesonderte Kriteriendatei. Der fortlaufende Abdeckungskatalog enthält Umsetzungsstand und Nachweise.

```sh
node tools/criteria.mjs freeze kriterien.csv kriterien-v1.baseline.csv
node tools/criteria.mjs check kriterien.csv kriterien-v1.baseline.csv FESTGEHALTENER_SHA256
```

Der erste Befehl legt eine bytegleiche Kopie unter einem neuen Dateinamen in einem vorhandenen Verzeichnis an. Kopie und Prüfsumme stammen aus den Bytes eines einzigen Lesevorgangs. Eine vorhandene Baseline wird nie ersetzt. Halte den ausgegebenen Wert von `sha256` **vor der Implementierung** in einem getrennten Reviewprotokoll oder einem geschützten Commit fest. Setze diesen Wert für `FESTGEHALTENER_SHA256` ein. Prüfe vor der ersten Implementierungsänderung, vor der Abnahme und bei Wiederaufnahme. Ein erfolgreicher Vergleich meldet `CRITERIA_VERIFIED`. Bei einer Abweichung oder ungültigen Prüfsumme endet das Werkzeug mit Fehlercode. Bei einer fachlich begründeten Änderung bleibt die bisherige Kopie erhalten. Dokumentiere den Grund und schreibe die neue Fassung unter einem neuen Namen fest.

**So entsteht die Baseline.** Die Bytes gehen in eine Arbeitsdatei namens `reftrail-<Kennung>.partial` im Ordner der Baseline. Der Befehl prüft diese Datei und liest die Kriterien ein zweites Mal, um festzustellen, dass sie sich inzwischen nicht geändert haben. Erst dann gibt er der Datei den Namen der Baseline, in einem einzigen Schritt des Datenträgers (Hardlink). Unter dem Namen der Baseline liegt deshalb nie eine nur teilweise geschriebene Datei.

Dieser Schritt braucht einen Datenträger mit Hardlink-Unterstützung. Die üblichen Laufwerke von Windows (NTFS), Linux und macOS haben sie. Datenträger mit exFAT oder FAT32 und manche freigegebenen Ordner haben sie nicht. Dort bricht der Befehl mit einer Fehlermeldung ab, bevor unter dem Namen der Baseline etwas entsteht. Einen anderen Schreibweg hat er nicht. Schreibe in diesem Fall in einem Ordner auf einem Laufwerk mit Hardlinks fest, kopiere die Baseline an ihren Platz und starte `check`. Der Befehl bestätigt die Kopie anhand der Prüfsumme.

**Wenn ein Festschreiben nicht zu Ende läuft.** Abgeschlossen ist es, sobald der Befehl `CRITERIA_FROZEN` mit der Prüfsumme ausgegeben hat.

| Was geschehen ist | Was zurückbleibt | So geht es weiter |
| --- | --- | --- |
| Der Befehl hat einen Fehler gemeldet: Datenträger voll, Kriterien inzwischen geändert, Hardlinks nicht verfügbar | Nichts. Ließ sich die Arbeitsdatei nicht entfernen, nennt die Meldung sie. | Ursache beheben und mit demselben Namen wiederholen. |
| Der Prozess wurde gewaltsam beendet, bevor der Name der Baseline vorhanden war | Höchstens eine Arbeitsdatei `reftrail-<Kennung>.partial`, vollständig oder nicht | Mit demselben Namen wiederholen. Die Arbeitsdatei löschen. |
| Der Prozess wurde gewaltsam beendet, nachdem der Name der Baseline vorhanden war und bevor die Prüfsumme ausgegeben wurde | Die vollständige Baseline ohne gemeldete Prüfsumme, eventuell auch die Arbeitsdatei | Der Befehl lehnt den Namen ab, weil er nie eine Datei ersetzt. Baseline und Arbeitsdatei löschen, dann wiederholen. |

Lässt sich die Arbeitsdatei nach einem abgeschlossenen Festschreiben nicht entfernen, nennt die Ausgabe sie unter `workingFileLeft`. Lösche sie. Halte Arbeitsdateien aus der Versionsverwaltung heraus, etwa mit der Zeile `reftrail-*.partial` in `.gitignore`.

Der Vergleich erfasst jedes Byte einschließlich BOM und Zeilenenden. Verwende für beide Dateien dieselben Checkout-Einstellungen. Wandelt Git in deinem Projekt Zeilenenden um, kennzeichne Kriterien- und Baseline-Dateien in `.gitattributes` mit `-text`, damit jeder Checkout die festgehaltenen Bytes enthält. Der Hash belegt die Übereinstimmung mit den festgehaltenen Bytes. Die zeitliche Reihenfolge ergibt sich aus dem getrennt aufbewahrten Nachweis. Qualität der Kriterien und Unabhängigkeit der Prüfung sind gesondert zu beurteilen.

### Katalog prüfen und auswerten

```sh
node tools/catalog.mjs check ABDECKUNG.csv
node tools/catalog.mjs report ABDECKUNG.csv --gates G01,G02
```

`check` liest einen Katalog mit deutscher oder englischer Kopfzeile. Der Befehl meldet jeden Fehler mit seiner Zeile: fehlendes BOM, geänderte Kopfzeile, Zeile mit zu vielen oder zu wenigen Feldern, doppelte ID und Werte außerhalb der Listen im Arbeitsauftrag. Bei einem Fehler endet er mit Fehlercode. Ein Nachweis zählt nur mit beiden Teilen, einer Nachweisart außer `keiner` und einem Nachweispfad. Ein Eintrag mit nur einem Teil oder mit Umsetzung 2 ohne Nachweis führt zu einer Warnung.

`report` berechnet die beiden Kennzahlen aus dem Arbeitsauftrag: die gewichtete Fachabdeckung und den extern gestützten Anteil. Der Befehl gibt auch die Punkte hinter jedem Prozentwert aus. Zum extern gestützten Anteil zählt ein Eintrag nur mit dieser Nachweisart und einem Nachweispfad. Der Bericht listet offene Einträge, als erfüllt gemeldete Einträge ohne Nachweis und Einträge mit Gewicht 0, die den Prozentwert nicht verändern. Benenne die Pflichtprüfungen des vereinbarten Lieferumfangs mit `--gates`. Eine Pflichtprüfung zählt bei Umsetzung 2 mit Nachweisart und Nachweispfad als bestanden. Die Zeile `summary` stellt die Ergebnisse nebeneinander, etwa `100 % Fachabdeckung, 2/3 Pflichtprüfungen bestanden, Freigabe blockiert, 1 Eintrag ohne Nachweis als erfüllt gemeldet`. Ein gerundeter Prozentwert lautet nur dann 100, wenn nichts fehlt.

| Option | Wirkung |
| --- | --- |
| `--gates ID,ID` | Pflichtprüfungen des vereinbarten Lieferumfangs. Eine unbekannte und eine doppelt genannte ID sind Fehler. |
| `--exclude ID,ID` | Einträge, die für den vereinbarten Lieferumfang nicht anwendbar sind. Begründe das im Katalog. Der Bericht führt sie auf. |
| `--milestone NAME` | Zählt nur die Einträge einer Etappe. Ein Name, den kein Eintrag trägt, ist ein Fehler. |
| `--strict` | Für eine automatische Prüfung. Verlangt `--gates`. Endet mit Fehlercode, wenn eine benannte Pflichtprüfung nicht bestanden ist oder ein Eintrag ohne Nachweis als erfüllt gemeldet wird. |

Eine Kennzahl für nur eine Etappe oder mit ausgenommenen Einträgen weist das in der Zeile `summary` aus. Der Bericht wertet aus, was im Katalog steht. Den genannten Nachweis öffnet er nicht. Ob ein Eintrag seine Umsetzungsstufe verdient und ob der Nachweis das Kriterium trägt, beurteilt der Prüfer. Offene kritische Befunde und die Abnahmeentscheidung stehen außerhalb des Katalogs und gehören im Bericht neben diese Kennzahlen.

Beide Werkzeuge sind auch über einen gemeinsamen Befehl erreichbar: `node tools/reftrail.mjs criteria …` und `node tools/reftrail.mjs catalog …`. Nach `npm install` dieses Ordners oder seines gepackten Archivs heißt der Befehl `reftrail`. `node integration/installed-command.mjs` installiert das Archiv in ein leeres Projekt und prüft diesen Befehl.
