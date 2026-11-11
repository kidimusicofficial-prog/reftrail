# Ein Windows-Paket im Zielsystem prüfen

[English](product-acceptance.md)

Die folgenden Prüfschritte ergänzen das ausführbare Beispiel für eine Anwendung mit Installer und dauerhafter Datenspeicherung. Wähle für jeden Pflichtablauf ein beobachtbares Ergebnis. Halte im Prüfbericht fest, welche Paketversion auf welchem Zielsystem lief, welche Fälle tatsächlich geprüft wurden und welche Voraussetzungen noch fehlen.

## Vom geprüften Quellstand zum Paket

1. **Quellstand binden.** Erfasse Dateien und SHA-256-Werte vor und nach dem Lauf der Tests und der Syntaxprüfung. Prüfe die Testergebnisse auf fehlgeschlagene, übersprungene und abgebrochene Fälle. Erzeuge das Paket aus einer Kopie genau des geprüften Stands. Eine während des Laufs geänderte Quelldatei macht die Zuordnung des Ergebnisses ungültig.
2. **Werkzeuge und Abhängigkeiten binden.** Halte Version, Bezugsquelle und erwarteten Hash der Laufzeit fest. Prüfe den tatsächlich verwendeten Launcher gegen seinen Buildnachweis und den verwendeten Installer-Compiler gegen den erwarteten Hash. Installiere Abhängigkeiten in einem frischen Verzeichnis anhand der festgeschriebenen Versionen. Gleiche den installierten Paketbaum einschließlich optionaler plattformabhängiger Komponenten mit der vorgesehenen Zusammenstellung ab. Lege die zugehörigen Lizenztexte, Hinweise und gegebenenfalls benötigtes Quellmaterial in der vorgesehenen Lieferform bei.
3. **Lieferumfang kontrollieren.** Verzeichne für jede Nutzlastdatei relativen Pfad, Größe und SHA-256. Öffne das fertige Archiv erneut und gleiche Dateimenge und Inhalt mit dem Manifest ab. Berücksichtige zusätzliche Dateien, Pfadwechsel über Verzeichnisverweise sowie Namenskollisionen bei Groß- und Kleinschreibung. Prüfe auch die installierten Dateien. Eigene Nutzerdaten, Sicherungen und Zugangsdaten gehören außerhalb der Nutzlast.

## Installation und Versionswechsel

Installiere das Paket unter einer eigenen Testidentität in ein frisches Verzeichnis mit eigenem Profil. Starte die tatsächlich installierte Anwendung über den vorgesehenen Einstieg. Prüfe Startbereitschaft, bedienbaren Hauptablauf und kontrolliertes Beenden einschließlich gestarteter Kindprozesse.

Teste ein Update mit einem vorher erzeugten Datenbestand. Ermittle nach erfolgreichem Wechsel, nach Abbruch und nach einer vorgesehenen Rücknahme jeweils die aktive Version. Starte diese Version und öffne den Bestand. Prüfe auch den vorgesehenen Umgang mit einem geänderten Launcher sowie die im Produkt zugesagte Datenerhaltung bei Deinstallation und Neuinstallation.

## Fachablauf, Berechtigungen und Neustart

Verwende synthetische Datensätze mit vorab festgelegten Sollwerten. Lege einen Vorgang über den normalen Benutzerzugang an, ändere ihn und führe die vorgesehene Korrektur oder Rücknahme aus. Prüfe nach jedem Schritt die betroffenen Werte einschließlich abgeleiteter Ergebnisse. Öffne den Vorgang nach einem Neustart unter demselben Testprofil erneut. Prüfe den gespeicherten Endzustand und, soweit fachlich gefordert, die Änderungshistorie.

Hat die Anwendung Rollen oder Freigabestufen, führe denselben Zugriff auch mit einem eingeschränkten Konto aus. Prüfe direkte Zugriffe und indirekte Ausgaben, etwa Suche, Summen oder gespeicherte Berichte. Entziehe einem zunächst berechtigten Konto das Recht. Prüfe die Wirkung in der bereits geöffneten Sitzung und nach erneuter Anmeldung entsprechend der zugesagten Sitzungsregel. Stelle das Recht wieder her und kontrolliere den Zugriff auf dasselbe gespeicherte Ergebnis.

Vergleiche den Paketinhalt und einen separaten, während des Tests unbenutzten Testbestand vor und nach der Sitzung. Prüfe erzeugte Protokolle und Berichte auf die im Lauf verwendeten synthetischen Geheimnisse. Halte den Befund ohne deren Werte fest. Dokumentiere Paketbau, Installation und bestandenen Fachablauf jeweils mit ihrem eigenen Nachweis.
