# Sitzungsprüfung mit Neustart

Deutsch · [English](README.en.md)

Die Prüfung beantwortet eine konkrete Frage. Kann ein Benutzer einen Wert speichern und ihn nach dem vollständigen Beenden und erneuten Start der Anwendung wieder abrufen? Das Modul führt dafür zweimal dieselbe ausführbare Datei mit denselben Argumenten und einem frischen, für diesen Lauf reservierten Profil aus.

## Ausprobieren

Vom Repository-Stamm mit Node.js ab Version 22 ausführen.

```sh
node --test tests/session.test.mjs
```

Der [Beispieladapter](../../tests/session.test.mjs) bedient ein [synthetisches Konsolenprogramm](../../tests/fixtures/session-program.mjs) über Standardeingabe und Standardausgabe. Der Positivfall schreibt einen zufälligen Wert. Eine Variante, die nur im Arbeitsspeicher speichert, muss bei der Abfrage nach dem Neustart durchfallen. Ein dritter Fall liefert eine falsche Prüfsumme und muss vor dem Start scheitern.

## Mit der eigenen Anwendung verwenden

Importiere `verifyInstalledSession` aus [installed-session.mjs](installed-session.mjs). Übergebe `executable` sowie optional weitere zu bindende `inputs`. Jeder Eintrag enthält einen absoluten, linkfreien Dateipfad `path` und dessen erwartete `sha256` als 64 kleine Hexadezimalzeichen. Für eine Releaseprüfung stammen die Sollwerte aus dem freigegebenen Build. Der synthetische Test berechnet seinen Vergleichswert aus dem lokalen Testbestand.

Lege `sample` als eindeutigen synthetischen Sollwert und `emptyValue` als erwarteten Wert bei leerem Profil fest (Standardwert `null`). Der Adapter kennt die öffentliche Bedienschnittstelle der Zielanwendung.

| Methode | Vertrag |
| --- | --- |
| `args(profile)` | Liefert eine Liste von Startargumenten. Binde den übergebenen temporären Ordner ausdrücklich als Datenprofil ein. |
| `connect(child, signal)` | Wartet auf bestätigte Betriebsbereitschaft des gestarteten Prozesses und liefert den bedienbaren Client. |
| `write(client, sample, signal)` | Führt die zu prüfende fachliche Aktion aus und wartet auf Bestätigung. |
| `read(client, signal)` | Liest den Wert über den tatsächlichen Benutzerzugang in einer mit dem Sollwert vergleichbaren Form. |
| `stop(client, signal)` | Fordert das reguläre Beenden über den vorgesehenen Weg an. |

Reserviere ein separates Testkonto, falls die Anwendung eine Anmeldung benötigt. Nutze für Lese- und Schreiboperationen jeweils dasselbe Testprofil. Beachte das Abbruchsignal in asynchronen Anfragen und Warteoperationen. `timeoutMs` begrenzt jeden der beiden Prozessläufe einschließlich des Beendens (Standardwert 30 Sekunden).

Der Prüfer vergleicht die angegebenen Dateien vor dem ersten Start, zwischen den Sitzungen und nach dem zweiten Ende. Beide Prozesse müssen regulär mit Exitcode 0 schließen. Nach Abschluss oder Fehler entfernt der Prüfer sein temporäres Profil.

Der Nachweis gilt für die gestartete Einzelprozess-Anwendung, die gebundenen Dateien und den ausgeführten Lese-/Schreibfall. Weitere Anwendungsdateien können über `inputs` aufgenommen werden. Die Anwendung erbt die Prozessumgebung. Ob sie den Profilpfad respektiert, muss ihr Adapter sicherstellen. Für Launcher mit eigenständigen Kindprozessen sind zusätzliche Prüfungen zur Prozessverwaltung erforderlich. Installation, Aktualisierung und Deinstallation erfordern eigene Läufe auf der Zielplattform.
