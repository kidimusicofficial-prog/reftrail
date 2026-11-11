# Contributing · Mitwirken

## English

Run the four checks from the repository root before you propose a change. They need Node.js 22.16 or newer and no packages.

```sh
node --test "tests/*.test.mjs"
node showcase/uniq/verify.mjs
node integration/verify.mjs
node integration/installed-command.mjs
```

The last command also needs npm. It installs the packed repository into an empty project and starts the installed command. The temporary folder of the system must be on storage with hard links, because the tests freeze criteria there.

- **Both languages.** Briefs, templates and guides exist in English and German. Change both versions together.
- **Records stay as they are.** Files under `showcase/uniq/evidence/` and the baselines document runs that happened. Add a new record for a new run. The program, verifier, criteria and review script of the showcase carry recorded SHA-256 values; a change to one of them needs a new criteria revision or a note in the test report.
- **Your own material only.** Contribute text, code and test data you wrote or may license. Leave out manual text, screenshots, sample files and decompiled code of third-party products, also as test fixtures.
- **A test for each fix.** State which check failed before the change and passes after it.
- **License.** Contributions are accepted under the [MIT License](LICENSE).

## Deutsch

Führe vor einem Änderungsvorschlag die vier Prüfungen oben im Repository-Stamm aus. Sie brauchen Node.js ab 22.16 und keine Pakete. Die letzte braucht zusätzlich npm. Sie installiert das gepackte Repository in ein leeres Projekt und startet den installierten Befehl. Der temporäre Ordner des Systems muss auf einem Datenträger mit Hardlink-Unterstützung liegen, weil die Tests dort Kriterien festschreiben.

- **Beide Sprachen.** Arbeitsaufträge, Vorlagen und Anleitungen gibt es auf Deutsch und Englisch. Ändere beide Fassungen gemeinsam.
- **Belege bleiben unverändert.** Dateien unter `showcase/uniq/evidence/` und die Baselines dokumentieren tatsächlich ausgeführte Läufe. Lege für einen neuen Lauf einen neuen Beleg an. Programm, Prüfer, Kriterien und Prüfskript des Beispiels haben festgehaltene SHA-256-Werte. Eine Änderung daran braucht eine neue Kriterienrevision oder einen Vermerk im Prüfbericht.
- **Nur eigenes Material.** Bringe Texte, Code und Testdaten ein, die du selbst verfasst hast oder lizenzieren darfst. Handbuchtexte, Bildschirmbilder, Beispieldateien und dekompilierter Code fremder Produkte gehören nicht hinein, auch nicht als Testdaten.
- **Ein Test je Korrektur.** Nenne die Prüfung, die vor der Änderung fehlschlug und danach besteht.
- **Lizenz.** Beiträge werden unter der [MIT-Lizenz](LICENSE) angenommen.
