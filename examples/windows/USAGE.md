# Quellstand und Windows-Paket prüfen

Deutsch · [English](USAGE.en.md)

Das Beispiel zeigt den Übergang von einer freigegebenen Dateiliste zu einem überprüfbaren Lieferpaket. Es nutzt die Standardbibliothek von Node.js ab Version 22.16. Alle Befehle laufen lokal. Die Eingabe ist ein Ordner mit fertig vorbereiteten Dateien. Im einfachsten Fall genügt die README dieses Repositorys als Testdatei.

## Quellstand prüfen

Dieser Aufruf führt die Testdateien und die JavaScript-Syntaxprüfung im angegebenen Umfang durch. Er bindet die Ergebnisse an die Dateiliste und ihre SHA-256-Werte vor und nach dem Lauf. Wähle zwei neue Ausgabeordner außerhalb des Repositorys.

```sh
node examples/windows/check-release-source.mjs check --root . --dir docs --dir examples --dir integration --dir prompts --dir showcase --dir templates --dir tests --dir tools --file CHANGELOG.md --file CONTRIBUTING.md --file LICENSE --file README.md --file README.de.md --file README.en.md --file package.json --output ../quellpruefung
```

Wenn der Lauf `PASS` meldet, kopiere den ausgegebenen Wert von `sha256` anstelle von `HIER_HASH_EINSETZEN`. Der zweite Befehl prüft den Beleg und legt die gebundenen Dateien unter `../quellkopie/source/` ab.

```sh
node examples/windows/check-release-source.mjs freeze --root . --receipt ../quellpruefung/receipt.json --sha256 HIER_HASH_EINSETZEN --output ../quellkopie
```

Der Quellprüfbeleg umfasst damit den veröffentlichten Stand einschließlich aller Dateien, die die Tests lesen. Nur dann besteht die Kopie unter `../quellkopie/source/` dieselben Tests eigenständig. Für einen anderen Bestand benenne die Verzeichnisse und Einzeldateien ausdrücklich mit `--dir` und `--file`. Der Prüfer erwartet mindestens eine Testdatei mit der Endung `.test.js`, `.test.mjs` oder `.test.cjs`. Der Test-Runner kann auch eine leere Testdatei als erfolgreichen Dateilauf zählen. Ob eine fachliche Behauptung tatsächlich geprüft wird, ergibt sich aus den enthaltenen Testfällen. Die Paketprüfung lässt sich unabhängig davon ausprobieren.

## Ausprobieren

Die folgenden Befehle im Stammverzeichnis des Repositorys ausführen. Die beiden Ausgabenamen müssen frei sein.

```sh
node examples/windows/package-windows.mjs plan . 1.0.0 beispiel-profil.json README.md
node examples/windows/package-windows.mjs build . beispiel-profil.json beispiel-paket
node examples/windows/package-windows.mjs verify beispiel-paket
```

1. `plan` liest ausschließlich die ausdrücklich genannten Dateien. Das Profil enthält Version, relative Pfade, Größen und SHA-256-Prüfsummen. Der Befehl gibt den SHA-256-Wert der gesamten Profildatei aus.
2. `build` prüft jede Eingabedatei gegen das Profil und erstellt `payload.zip` sowie eine Kopie des Profils. Nach dem Schreiben öffnet das Skript das ZIP erneut, prüft seine Einträge und vergleicht das Profil und die Eingabedateien nochmals mit ihrem Anfangsstand. Erst danach schreibt es `receipt.json` mit Profil- und Archivhash.
3. `verify` prüft das ZIP und den Beleg anhand des beiliegenden Profils. Es erkennt abweichende Nutzdaten, Dateinamen, ZIP-Kopfdaten und zusätzliche Archivbytes. Bei einem Fehler liefert der Befehl einen Exitcode ungleich null.

Für einen Release den Hash eines zuvor geprüften Profils separat aufbewahren und als letztes Argument an `build` und `verify` übergeben. So wird auch der Austausch des gesamten Pakets mitsamt seinem Profil und Beleg erkennbar. Ein unter denselben Bedingungen neu berechneter Hash dokumentiert lediglich den gerade vorgefundenen Zustand.

## Welche Dateien ins Paket gehören

Dateien einzeln mit relativen Pfaden und Schrägstrichen angeben. Das Profil unterstützt druckbare ASCII-Pfade mit Windows-kompatiblen Namen. Die Prüfungen verwerfen unter anderem Pfadwechsel, symbolische Links, Groß-/Kleinschreibungskollisionen und typische Schlüssel-, Datenbank- oder Profilpfade. Die Auswahl und die inhaltliche Prüfung der Dateien erfolgen beim Erstellen des Profils.

Das Beispiel unterstützt bis zu 4.096 Dateien und insgesamt 64 MiB Nutzdaten. Es schreibt ein klassisches ZIP ohne Kompression, mit fester Reihenfolge und festem Zeitstempel. Für dasselbe Profil und dieselben Dateiinhalte entsteht dasselbe Archiv. `verify` versteht genau dieses Ausgabeformat.

## Übergabe an einen Installer

| Schritt | Übergabepunkt |
| --- | --- |
| Quellstand und Voraussetzungen prüfen | Quellprüfbeleg mit bestandenem Testlauf prüfen. Benötigte Laufzeit, Abhängigkeiten und gegebenenfalls Launcher in festgelegten Versionen bereitstellen. Lizenzhinweise tatsächlich enthaltener Komponenten in die Dateiliste aufnehmen. |
| Sollprofil freigeben | Bei unverändert übernommenen Quelldateien die SHA-256-Werte mit dem geprüften Quellinventar abgleichen. Für erzeugte Binärdateien den separat geprüften Buildbeleg heranziehen. Danach den Hash des Sollprofils festhalten. |
| Setup erstellen | Die eigene Installer-Pipeline übernimmt das verifizierte Archiv. Sie bindet den erwarteten Profil- und Archivhash, den verwendeten Compiler und den Hash der entstandenen Setup-Datei an ihren eigenen Buildbeleg. |
| Installierte Anwendung prüfen | Unter Windows Installation, Start, Aktualisierung, abgebrochenes Update und Deinstallation ausführen. Den Erhalt der Nutzerdaten und den installierten Dateibestand gegen das freigegebene Profil prüfen. |

Bei Verwendung von Inno Setup liefert `installerInputs(payloadRoot, profileBytes, expectedProfileSha256)` aus [installer-inputs.mjs](installer-inputs.mjs) die Texte für `payload-files.iss`, `PAYLOAD.SHA256` und den kanonischen Versionszeiger `current.json`. Das Zielverzeichnis `versions/<version>-<sha256>` und der Zeiger verwenden den SHA-256 der unveränderten Profilbytes. Als `payloadRoot` einen separaten, geprüften Ordner mit den freigegebenen Dateien verwenden und denselben Ordner als `SourceDir` des Installers setzen. Im Abschnitt `[Files]` die erzeugte Datei mit `#include "payload-files.iss"` einbinden. Die Quelldateien bis zum Ende des Compilerlaufs unverändert halten. Diese Integration verwendet für die Dateinamen Buchstaben und Ziffern aus dem ASCII-Zeichensatz sowie Leerzeichen, Punkt, Unterstrich, Bindestrich und Schrägstrich.

Die Texte lassen sich im eigenen Buildskript so speichern. Der relative Importpfad gilt für ein Buildskript in der Repository-Wurzel. `profilePath`, `payloadRoot` und `setupDir` sind die im Build festgelegten Pfade. `expectedProfileSha256` ist der festgehaltene Hash des freigegebenen Profils. `setupDir` ist ein eigener Ausgabeordner mit dem Installer-Skript.

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

Der Status `PAYLOAD_VERIFIED` gilt für die Bytes im ZIP. Die Installer-Erstellung und die Prüfung der installierten Anwendung erfordern eigene Läufe.
