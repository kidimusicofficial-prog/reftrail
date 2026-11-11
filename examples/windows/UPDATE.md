# Versionswechsel und Laufzeitabhängigkeiten prüfen

Deutsch · [English](UPDATE.en.md)

## Aktive Version und Launcher

[release-update.mjs](release-update.mjs) prüft die Metadaten für eine Installation mit mehreren Versionsverzeichnissen. Bei der [Installer-Übergabe](USAGE.md) bezeichnet der Hash in der Versions-ID die exakten Bytes des geprüften Paketprofils. Damit können zwei Builds derselben numerischen Version getrennte Verzeichnisse haben.

| Funktion | Vertrag |
| --- | --- |
| `makeCurrent(versionId)` | Erzeugt einen Zeiger auf `versions/<Version>-<SHA-256>`. Die Version enthält drei Zahlen zwischen 0 und 65535 ohne führende Nullen. |
| `parseCanonicalCurrent(bytes)` | Liest exakt die UTF-8-Bytes aus `JSON.stringify(makeCurrent(versionId))`. Zusätzliche Felder, andere Reihenfolgen, BOM und abschließende Zeilenumbrüche führen zum Fehler. |
| `parseRetainedPointer(name, bytes, metadata)` | Akzeptiert Sicherungsnamen der Form `current.before.<sha256>.json`, `current.next.<sha256>.json` oder `current.rollback.<sha256>.json`. Der Aufrufer übergibt am konkreten Pfad ermittelte Metadaten mit `isFile: true` und `isReparse: false`. Der Namenssuffix dient als Kennung. Der Inhalt wird wie ein aktiver Zeiger geprüft. |
| `requireSameLauncher(existingHash, candidateHash)` | Bei einer Erstinstallation ist `existingHash` gleich `null`. Bei einem Update müssen die SHA-256-Werte des vorhandenen und des bereitgestellten Launchers übereinstimmen. Ein abweichender Launcher erfordert einen eigenen Austauschweg. |

Der aufrufende Installer muss das tatsächliche Zielverzeichnis und seine Dateien prüfen, den Zeiger umschalten und bei Bedarf einen Rollback durchführen. Die Funktionen validieren die übergebenen Bytes und Hashes im Speicher.

## Installierten npm-Paketbaum mit dem Lockfile abgleichen

[runtime-lock.mjs](runtime-lock.mjs) ist ein optionaler Baustein für Anwendungen, die mit npm einen lokalen Paketbaum für die Auslieferung aufbauen. Der folgende Ausschnitt setzt ein bereits vorbereitetes Paketverzeichnis voraus. Die verwendete Importadresse gilt für ein Skript im Repository-Stamm.

```js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyInstalledLock } from './examples/windows/runtime-lock.mjs';

const root = process.argv[2];
const load = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const installed = await verifyInstalledLock(root, await load('package.json'), await load('package-lock.json'));
console.log(installed);
```

Die Prüfung vergleicht bei einem Lockfile der Version 2 oder 3 die Root-Metadaten und die deklarierten Abhängigkeiten. Für Laufzeiteinträge verlangt sie eine HTTPS-Quelle der öffentlichen npm-Registry und einen SHA-512-Integritätseintrag. Nach einer Installation ohne Entwicklungsabhängigkeiten prüft sie auf der Festplatte die Pfade, Namen und Versionen einschließlich verschachtelter Pakete. Optionale Pakete dürfen fehlen. Mit einem vierten Argument lassen sich für die Zielplattform benötigte Paketpfade ausdrücklich verlangen. Registry-Aliase werden anhand des im Lockfile deklarierten Paketnamens geprüft.

Dieser Vertrag erfasst registrybasierte Pakete. Workspaces, verlinkte Pakete, andere Registries und weitere Lockformate benötigen eine angepasste Prüfung. Die Integritätsangabe bezieht sich auf das Registry-Archiv. Die abschließenden Hashes der ausgelieferten Dateien liefert die [Paketprüfung](USAGE.md).
