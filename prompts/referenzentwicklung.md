# Arbeitsauftrag für die Entwicklung nach einer Softwarereferenz

[English](reference-development.md)

| Eingabe | Wert |
| --- | --- |
| Referenzsoftware | `<Produktname>` |
| Offizielle Homepage | `<URL>` |

Übernimm vorhandene Vorgaben zu Version, Plattform, Lieferumfang, Frist und Kostenobergrenze. Mit Produktname und Homepage allein gilt der begrenzte Startlauf aus Abschnitt 1. Verwende bereitgestellte Unterlagen, Dateien und Zugänge im erlaubten Umfang.

## Ziel

Entwickle eine eigenständige, wartbare Anwendung für den tatsächlichen Einsatz in der Domäne der Referenz. Ein erfahrener Anwender soll seine eigenen Daten verarbeiten, vollständige Vorgänge bearbeiten, Fehler korrigieren, Ergebnisse weiterverwenden und seinen Bestand zuverlässig erhalten können. Zu prüfen sind Funktionsumfang, fachliche Verarbeitung, Anwenderabläufe, Dateikompatibilität, Bedienlogik und relevante Betriebseigenschaften.

Unterscheide das langfristige Produktziel, den beauftragten Lieferumfang und den in diesem Lauf bearbeitbaren Teil. Wenn der Auftrag die ganze Produktlinie umfasst, bewahre dieses Ziel und weise jede noch offene Pflicht aus. Umfang und Budget dürfen nur im Rahmen der erteilten Autorisierung wachsen.

Gib der Anwendung eine eigene Identität und Gestaltung. Prüfe ihre Nähe zur Referenz an beobachtbaren Funktionen, Abläufen, Ergebnissen und Austauschfällen. Kennzeichne Annahmen und Grenzen der verfügbaren Belege.

## 1. Selbstständig im vereinbarten Umfang arbeiten

Halte zu Beginn in `STAND.md` Referenzversion (oder „noch offen“), Ziel, Grenzen und ausdrücklich ausgenommenen Umfang fest. Bei offenem Lieferumfang wähle genau einen fachlich zusammenhängenden Benutzerablauf auf einer Plattform. Beschreibe dessen Anfang, Ende und relevante Fehlerfälle. Halte weitere Module als möglichen Folgeumfang fest.

Ohne abweichende Vorgabe gilt pro Lauf ein Zeitbudget von 60 Minuten ab Beginn der Recherche, einschließlich Implementierung, Prüfung und Berichterstattung. Notiere Start und spätestes Ende anhand der Uhr. Verwende die vorhandene Agentensitzung und freigegebene Werkzeuge. Zusätzliche kostenpflichtige Dienste benötigen ein eigenes Budget. Prüfe die verbleibende Zeit und verfügbare Kostenmessungen vor größeren Arbeitsschritten. Beende den Lauf beim ersten erreichten Limit oder früher, sobald der vereinbarte Umfang abgenommen ist. Sichere offene Arbeit und den nächsten Schritt. Ein Folgelauf benötigt ein verfügbares, autorisiertes Budget.

- Verwende das zum Auftrag gehörende Projektverzeichnis. Falls keines vorliegt, lege eines mit neutralem Namen an. Prüfe vorhandenen Code und Tests, erhalte funktionierende Teile und beschränke Änderungen auf den beauftragten Bestand.
- Übernimm Recherche, Implementierung, projektlokale Einrichtung, Auswahl geeigneter kostenfreier Abhängigkeiten, lokale Starts, Builds, Migrationen, Tests, Reviews und Fehlerkorrekturen im Rahmen der geltenden Berechtigungen. Wähle Technik, Reihenfolge und Arbeitsteilung selbst. Nutze bei Bedarf parallel arbeitende Agenten. Halte den Aufwand für Arbeitssteuerung und Nachweise dem Produktziel angemessen.
- Leite Nutzergruppen und Betriebsform aus der Referenz ab, sofern keine Vorgabe vorliegt. Halte folgenreiche Annahmen kurz fest. Frage gezielt nach, wenn eine wesentliche Entscheidung nicht vertretbar ableitbar ist, nur der Auftraggeber eine benötigte Ressource bereitstellen kann oder zusätzliche Kosten, externe Handlungen oder irreversible Änderungen eine weitergehende Autorisierung benötigen.
- Bereite solche Entscheidungen konkret vor und setze unabhängig davon mögliche Arbeit fort. Verwende für Integrationsprüfungen getrennte Bestände und vorgesehene Testzugänge. Die Nutzung fremder Produktivdaten, eine Veröffentlichung sowie echte Nachrichten oder Buchungen in Fremdsystemen benötigen dafür erteilte Berechtigungen.
- Berichte bei aussagekräftigen Zwischenständen kurz über tatsächlich fertiggestellte Fähigkeiten, die wichtigste verbleibende Lücke und den nächsten Arbeitsschritt. Weise bei Bedarf den aktuellen Katalogstand aus.

## 2. Die Referenz und ihren Umfang ermitteln

Öffne die offizielle Homepage. Ermittle Produktlinie, Version, Ausstattungsvarianten und die zur Referenz gehörenden Module. Halte Versionsbezug, Quellenlinks und Abrufdatum fest. Kläre eine mehrdeutige Produktangabe gezielt, wenn sich die Zuordnung aus den Quellen nicht auflösen lässt.

Suche Produkt- und Modulseiten, Handbücher, Onlinehilfen, Versionshinweise, dokumentierte Arbeitsabläufe, Screenshots, Videos oder Transkripte, beschriebene Dateiformate und Schnittstellen. Schulungsunterlagen können Abläufe belegen. Übernimm Schulungsfunktionen in den Umfang, wenn die Referenz sie als Produktfunktionen anbietet.

| Quellenklasse | Beispiele und Verwendung |
| --- | --- |
| Q1 | Herstellerdokumentation und Herstellerbeispiele für belegte Produktfunktionen und Abläufe |
| Q2 | Normen, offizielle Spezifikationen, rechtliche Grundlagen, offizielle Beispieldateien und Prüfwerkzeuge für die jeweils geregelte Eigenschaft |
| Q3 | Fachliteratur, Fachpresse, dokumentierte Partnerlösungen und belastbare unabhängige Beschreibungen |
| Q4 | Foren, Bewertungen, Stellenanzeigen und soziale Medien als Ausgangspunkt für weitere Recherche |
| N | Nachvollziehbare eigene Beobachtungen, Dateien oder Ergebnisse aus zulässigem Zugang zur Referenz |

Dokumentiere bei jedem Beleg, welche Eigenschaft er tatsächlich stützt. Eine Funktions- oder Rechenregel braucht eine passende fachliche Grundlage. Hinweise aus Q4 und allgemeine Werbeaussagen bedürfen dafür weiterer Belege. Begrenze Beobachtungen zunächst auf den untersuchten Fall. Ein autorisierter REA-Befund kann als N-Beleg eingehen. Erfasse Zielversion, Werkzeugversion, Fundstelle bzw. Laufbeleg, Eingabe, beobachtetes Ergebnis und die Grenze der Aussage. Eine unbestätigte Deutung bleibt eine Hypothese.

Gib an die Implementierung ausschließlich beobachtetes Verhalten in eigenen Worten weiter. Dekompilierter Code, Pseudocode und Quelltext der Referenz gehören weder in Kriterien und Katalog noch in den Implementierungsauftrag, sofern die Lizenz der Referenz diese Verwendung nicht ausdrücklich erlaubt. Wer solches Material gesehen hat, beschreibt das Verhalten. Die Umsetzung übernimmt möglichst ein getrennter Agent, der nur diese Beschreibung erhält. Halte im Prüfbericht fest, wer welche Unterlagen gesehen hat.

Ermittle mindestens die für die Domäne relevanten Eigenschaften:

- Module, Nutzergruppen, Paketgrenzen und vollständige Anwenderabläufe.
- Daten, Dokumente, Zustände, Übergänge, Beziehungen und Historien.
- Berechnungen, Einheiten, Rundungsregeln, Ausnahmefälle und Referenzwerte.
- Import und Export, Protokolle, Integrationen und externe Voraussetzungen.
- Navigation, Maskeninhalte, Feldgruppen, Tastaturbedienung und Informationsdichte.
- Betriebsform, Verhalten bei gleichzeitiger Nutzung und im Offlinebetrieb, Leistungsanforderungen und Schutzfunktionen.

Gleiche den vereinbarten Lieferumfang mit passenden Modul-, Hilfe- und Schnittstellenübersichten ab. Erfasse jede Verpflichtung, strittige Grenze und relevante Voraussetzung. Ungeklärte Anforderungen im Lieferumfang bleiben offen. Erkenntnisse außerhalb des vereinbarten Umfangs kommen auf eine separate Folgeliste. Lege die Kriterien für den ersten Ablauf vor der Implementierung gemäß Abschnitt 3 fest.

## 3. Anforderungen, Etappen und Fortschritt festhalten

Führe `ABDECKUNG.csv` mit stabilen IDs, UTF-8 mit BOM und Semikolon als Trennzeichen. Verwende diese Kopfzeile:

```csv
ID;Dimension;Modul;Funktion oder Ablauf;Quelle;Gewicht;Abnahmekriterium;Etappe;Umsetzung;Nachweisart;Nachweispfad oder Berichtabschnitt;Nachweisgrenze;Abweichung;Änderungsvermerk
```

| Feld | Belegung |
| --- | --- |
| Dimension | F = Funktionsumfang, A = Anwenderabläufe, R = Rechen- und Verarbeitungsregeln, D = Datenaustausch, B = Bedienlogik |
| Gewicht | 3 = Kernanforderung, 2 = Standardfunktion, 1 = Spezialfunktion, 0 = notwendige technische Stützfunktion ohne unmittelbaren Referenzbezug |
| Umsetzung | 0 = fehlt, ist eine Attrappe oder über den vorgesehenen Zugang nicht erreichbar. 1 = teilweise tatsächlich nutzbar. 2 = Kriterium einschließlich relevanter Fehlerfälle erfüllt. |
| Nachweisart | `keiner`, `eigen` für ausgeführte Prüfungen mit fachlich begründetem Sollwert oder `extern gestützt` für eine zusätzlich anhand eines von der Implementierung unabhängigen Maßstabs geprüfte Eigenschaft |

Gewichte nach Bedeutung für die gewählte Referenz und Nutzung. Erfasse die im Lieferumfang anwendbaren Betriebspflichten als prüfbare Einträge mit stabilen IDs, auch bei Gewicht 0. Begründe Nichtanwendbarkeit. Vermeide Doppelzählungen und bewahre beim Aufteilen eines Eintrags sein Gesamtgewicht.

### Kriterien vor dem ersten Produktcode festschreiben

Schreibe für die Etappe eine eigene Kriteriendatei. Sie enthält Umfang und Versionsbezug, die Katalog-IDs, Quellen, Testeingaben, Sollwerte bzw. Toleranzen sowie die Pflichtprüfungen. Halte die späteren Ist-Ergebnisse in Katalog und Bericht getrennt davon. Erzeuge vor der Implementierung eine neue Bytekopie und halte den ausgegebenen SHA-256-Wert separat fest, etwa in einem vorab aufgezeichneten Commit oder beim Auftraggeber. Ersetze in den Befehlen die Platzhalter durch die tatsächlichen Pfade im Zielprojekt. Starte sie im Verzeichnis des Werkzeugkastens oder verwende den absoluten Pfad zu seinem Skript. Ist der Werkzeugkasten nicht verfügbar, erzeuge die Kopie und den SHA-256-Wert mit einem gleichwertigen Standardwerkzeug, etwa `sha256sum <Datei>` oder `certutil -hashfile <Datei> SHA256`, und vergleiche vor der Abnahme auf dieselbe Weise.

```sh
node tools/criteria.mjs freeze <Kriteriendatei> <neue-Baseline-Datei>
node tools/criteria.mjs check <Kriteriendatei> <Baseline-Datei> <festgehaltener-SHA256>
```

Prüfe den festgehaltenen Wert vor der Abnahme erneut. Schlägt die Prüfung fehl, bleibt die Abnahme blockiert. Für begründete Änderungen dokumentiere die betroffenen IDs und den Grund, erzeuge vor der betroffenen Umsetzung eine neue Revision mit eigenem Hash und prüfe die betroffenen Fälle erneut. Erhalte frühere Stände und offenbare nachträglich ergänzte Kriterien. Die Hashprüfung belegt Bytegleichheit. Zeitliche Reihenfolge und unabhängige Begutachtung benötigen eigene Nachweise. [Werkzeuganleitung](../tools/README.md) · [Durchgespieltes Beispiel](../showcase/uniq/README.md)

Nenne zum Nachweis den konkreten Test, die Datei oder den Berichtsabschnitt sowie die Grenze seiner Aussage. Ein Schema belegt nur die von ihm geprüften Regeln. Ein Vergleichsfall belegt zunächst nur diesen Fall. Unterscheide den unabhängigen Sollmaßstab, die Unabhängigkeit des Prüfers und einen tatsächlich ausgeführten Vergleichslauf in der Referenz.

Berechne bei Bedarf die gewichtete Umsetzung der Fachanforderungen. In beide Formeln gehen ausschließlich anwendbare Einträge des vereinbarten Lieferumfangs ein.

```text
Gewichtete Fachabdeckung (%) = 100 × Σ(Gewicht × Umsetzung / 2) / Σ(Gewicht)
Extern gestützter Anteil (%) =
    100 × Σ(Gewicht × Umsetzung / 2 für extern gestützte Einträge) / Σ(Gewicht aller Einträge)
```

Berechne beide Werte mit dem Katalogwerkzeug und prüfe damit zugleich den Aufbau des Katalogs. Benenne die Pflichtprüfungen des Lieferumfangs ausdrücklich. Ist der Werkzeugkasten nicht verfügbar, rechne nach den Formeln und lege die Rechnung im Prüfbericht offen.

```sh
node tools/catalog.mjs check <Katalog>
node tools/catalog.mjs report <Katalog> --gates <ID,ID>
```

Bei Gewichtssumme null lautet die gewichtete Fachabdeckung „nicht bewertbar“. Veröffentliche die Zahl ausschließlich zusammen mit Lieferumfang, Katalogrevision, bestandenen/anwendbaren Pflichtprüfungen (einschließlich Gewicht 0), offenen kritischen Befunden und der Abnahmeentscheidung. Eine Pflichtprüfung zählt nur mit einem ausgeführten, passenden Nachweis als bestanden. Offene, fehlgeschlagene und ungeprüfte Pflichten sowie ungeklärte Anwendbarkeit blockieren die Freigabe des betroffenen Umfangs. Ein möglicher Bericht lautet „100 % Fachabdeckung, 2/3 Pflichtprüfungen bestanden, Wiederherstellung ungeprüft, Freigabe blockiert“. Beurteile die betriebliche Einsatzfähigkeit anhand des gesamten Prüfergebnisses.

Plane interne Etappen entlang vollständiger Abläufe einschließlich ihrer Abhängigkeiten. Bearbeite zuerst kritische Fehler und den Schutz bestehender Daten, danach notwendige Betriebsqualität, integrierte Kernabläufe mit Fehlerfällen und schließlich weitere Funktionen und Sonderfälle. Halte eine vom Auftraggeber beschlossene Umfangsänderung ausdrücklich fest. Eine Priorisierung verändert die Reihenfolge der Arbeit.

## 4. Architektur und Bedienung entwickeln

Wähle Anwendungsform und Technik anhand der benötigten Plattformen, Dateikompatibilität, Offlinefähigkeit, Interaktion, Parallelität und Leistung. Verwende bewährte, wartbare Komponenten und dokumentiere relevante Versionen und Lizenzvoraussetzungen.

Führe alle vorgesehenen Benutzerzugänge über dieselbe tatsächliche Fachlogik. Prüfe die erforderlichen Aufgaben, fachlich notwendigen Eingaben und Reihenfolgen, Zustandswechsel, Ausgaben sowie anwendbare Austauschstandards. Entwickle dafür eigene Navigation, Gruppierung, Texte, Symbole und visuelle Gestaltung. Begründe übernommene Bedieneigenschaften mit der konkreten technischen oder fachlichen Notwendigkeit, etwa einem festgelegten Austauschformat. Dokumentiere eigene Entwurfsentscheidungen und wichtige Abweichungen.

Beachte Zugangs-, Lizenz- und Testzeitgrenzen. Proprietäre Programmdateien, Datenbanken, Logos, Handbuchtexte, Bildschirmbilder und Originalvorlagen dürfen ohne entsprechende Erlaubnis nicht in die Lieferung übernommen werden. Halte Herkunft und Lizenz aller verwendeten Komponenten und Ressourcen fest. Kläre zweifelhafte Rechte, bevor du das betroffene Material verwendest oder weitergibst. Fahre mit unabhängigen zulässigen Arbeiten innerhalb des Budgets fort.

## 5. Betriebsqualität und Datenbestand absichern

Leite die erforderliche Betriebsqualität aus der vorgesehenen Nutzung ab. Bewerte die folgenden Eigenschaften im `PRUEFBERICHT.md` jeweils als erfüllt, offen oder begründet nicht anwendbar:

- Datenintegrität, Transaktionen, stabile Identitäten und Schutz vor doppelten Wirkungen.
- Konsistente Sicherung und tatsächlich geprüfte Wiederherstellung.
- Fachlich notwendige Korrektur, Rücknahme, Stornierung oder Versionierung.
- Zugriffsschutz, Rollen und Trennung von Nutzern und Beständen.
- Konfliktverhalten bei gleichzeitiger Bearbeitung.
- Kontrollierter Start und Abschluss, Fehlerbehandlung und Wiederaufnahme nach Abbruch.
- Sichere Verarbeitung von Dateien, Eingaben und Geheimnissen.
- Nutzbarer Datenexport, Erhalt vorhandener Daten und nachvollziehbare Migrationen.
- Installation, Aktualisierung und Wartung.

Verarbeite Daten, die Nutzer erfassen oder importieren. Halte synthetische Entwicklungs- und Prüfdaten in getrennten Testbeständen. Lege erforderliche technische Stammdaten oder angeforderte Beispieldaten kontrolliert und ohne Dubletten an.

Sichere vorhandene Daten konsistent vor einer Migration und prüfe diese zuerst an einer Kopie. Prüfe, wie sich Neustarts, Fehler, Wiederholungen und Abbrüche auf bestehende und angefangene Vorgänge auswirken. Verhindere, dass spätere Stammdatenänderungen historisch verbindliche Ergebnisse unbemerkt verändern. Leite Präzision, Einheiten, Rundung, Zeitbehandlung und Nebenläufigkeit aus der Fachlichkeit und den belegten Verträgen ab.

Bewerte Datenverlust, unbemerkte Datenveränderung, falsche Kernberechnungen, unzulässigen Zugriff, einen ausgefallenen Pflichtablauf oder eine nicht startfähige Lieferung als kritische Befunde. Weise solche Befunde unabhängig vom Katalogwert aus.

## 6. Austausch und externe Voraussetzungen prüfen

Ermittle genaue Bezeichnung, Version, Profil und Semantik der relevanten Formate, Standards und Protokolle aus geeigneten Primärquellen. Implementiere die benötigten Import-, Export- und Integrationswege. Prüfe sie mit passenden offiziellen Schemas und Regelwerken, unabhängigen Prüfwerkzeugen und fremd erstellten Referenzdateien. Prüfe zusätzlich die Bedeutung der Daten, Summen, Identitäten, Zustände, Sonderfälle und Erwartungen der empfangenden Seite. Benenne konkret, welche Varianten unterstützt und geprüft wurden.

Bei nicht öffentlich spezifizierten Formaten dürfen zulässig erhaltene Beispieldateien für die Analyse verwendet werden. Kennzeichne empirisch abgeleitete Regeln und ihre Reichweite. Verarbeite unbekannte wichtige Inhalte so, dass kein stiller Informationsverlust entsteht. Beschrifte Exporte entsprechend der belegten Kompatibilität.

Führe fehlende Spezifikationen, Lizenzen, Zugänge, Modelle, Geräte und externe Gegenstellen als konkrete Ressourcenlücken. Dokumentiere jeweils betroffene Funktion, erreichten Stand, genau benötigte Ressource, mögliche Bezugsquelle und gegebenenfalls Preis. Arbeite parallel an den unabhängig umsetzbaren Funktionen weiter.

Verwende Simulationen und Testserver für isolierte Prüfungen. Weise ausdrücklich aus, wenn nur eine Simulation geprüft wurde. Eine Aussage über reales Hardware- oder Gegenstellenverhalten setzt eine entsprechende Prüfung voraus. KI-Funktionen benötigen tatsächliche Inferenz und eine fachlich geeignete Ergebnisbewertung. Erfinde keine Fremdsystemantworten, Pflichtangaben oder Formatregeln.

## 7. Implementieren und über den tatsächlichen Benutzerzugang prüfen

Wähle die nächste fachlich sinnvolle Aufgabe, implementiere sie, integriere sie in die Anwendung, prüfe sie gezielt und aktualisiere den Katalog. Löse auftretende Integrationsprobleme innerhalb des Auftrags. Unterscheide Produktfehler, falsche Testannahmen, Umgebungsfehler und tatsächliche Ressourcen- oder Berechtigungsgrenzen. Untersuche nach einem fehlgeschlagenen Versuch seine Ursache und ändere bei Bedarf den Ansatz.

- Prüfe jeden Pflichtablauf vollständig über den tatsächlichen Benutzerzugang einschließlich der Übergänge zwischen Modulen. Berücksichtige Fehler, Korrektur, Abbruch, Wiederaufnahme und bei datenhaltenden Anwendungen auch den weiteren Lebenszyklus eines Vorgangs.
- Beschreibe belegte Originalabläufe in eigenen Worten und spiele passende Referenzfälle durch. Kennzeichne, ob der Vergleich auf Dokumentation oder einem tatsächlich beobachteten Lauf in der Referenz beruht.
- Bestimme Sollwerte, Präzision und Toleranzen fachlich vor der Prüfung. Verwende für exakt geregelte Formate oder Geldbeträge deren Vertrag. Wähle für Messwerte, Simulationen, Grafik und KI-Ausgaben jeweils geeignete Bewertungsmaßstäbe.
- Nutze unabhängig begründete Sollwerte, offizielle Beispiele oder geeignete externe Prüfwerkzeuge. Ein Rundlauf mit dem eigenen Import und Export prüft deren Zusammenspiel. Eine Aussage zur Fremdkompatibilität erfordert zusätzlich einen unabhängigen Maßstab.
- Erhalte fachlich gültige bestehende Tests und ergänze gezielte Regressionstests für relevante behobene Fehler. Begründe Korrekturen an fehlerhaften Testannahmen. Behalte die vorab festgelegten Toleranzen bei.
- Prüfe Oberflächen und grafische Ausgaben visuell, soweit geeignete Werkzeuge verfügbar sind. Verwende repräsentative größere Datenmengen und bei Bedarf gleichzeitige Zugriffe. Dokumentiere Messwerte und Umgebung.
- Prüfe den echten Installations-, Start-, Beendigungs- und Wiederherstellungsweg. Weise die tatsächlich geprüften Plattformen und Betriebsformen aus.
- Erneuere automatisierte und manuelle Nachweise, deren Aussage durch Änderungen betroffen ist. Bewahre weiterhin aussagekräftige Belege mit Versionsbezug auf. Prüfe zum Lieferstand betroffene Regressionen und integrierte Pflichtabläufe. Richte zusätzlich erforderliche Gesamtprüfungen am Änderungsrisiko aus.
- Lasse den Lieferstand nach Möglichkeit durch einen unbeteiligten Prüfer gegen die festgeschriebenen Anforderungen prüfen. Verwende, soweit verfügbar, unabhängige Referenzläufe oder zurückgehaltene Abnahmefälle. Erfasse den Ursprung der Sollwerte und wer Kriterien, Implementierung und Ergebnis jeweils erstellt oder geprüft hat. Kennzeichne eine getrennte Selbstprüfung ausdrücklich.

Beziehe jede Abnahme auf ein fachliches Ergebnis. Testanzahl, erfolgreicher Prozessstart und erfolgreicher Transport einer Anfrage reichen allein dafür nicht aus. Für nachgelagerte Aufgaben wie Quellstands-, Paket- und Neustartprüfungen stehen [optionale technische Beispiele](../examples/) bereit.

## 8. Lieferung und Fortsetzung ermöglichen

Liefere den eigenen Quellcode, notwendige Ressourcen, festgelegte Abhängigkeiten, Tests und einen einfachen, überprüften Einrichtungs- und Startweg. Verwende für Desktopanwendungen möglichst einen Start per Doppelklick, für andere Softwarearten die passende Betriebsform. Unterscheide Ersteinrichtung, normalen Betrieb und Wartung.

| Bestandteil | Inhalt |
| --- | --- |
| Start- und Betriebsanleitung | Einrichtung, Start, Nutzung, Betrieb und Wartung in der vorgesehenen Umgebung |
| Architekturbeschreibung | Aufbau, wesentliche Entscheidungen, Annahmen und relevante Abweichungen von der Referenz |
| `ABDECKUNG.csv` | Versionierter Anforderungskatalog mit Kriterien, Umsetzungsstand, Nachweisen und Prüfgrenzen |
| `PRUEFBERICHT.md` | Tatsächlich ausgeführte Prüfungen, Betriebsqualität, Umgebungen, Befunde und Grenzen |
| `STAND.md` | Gesamtumfang, aktueller Katalogstand, erledigte Etappen, Nachweise, Entscheidungen, offene Funktionen und nächster konkreter Schritt |

Halte bei einer Unterbrechung einen fortsetzbaren Stand fest. Nutze ihn bei Wiederaufnahme einschließlich der bereits geleisteten Recherche. Bewahre referenzierte Belege und erforderliche Beispielausgaben. Entferne nur eindeutig entbehrliche eigene Testbestände und temporäre Zwischenläufe. Schütze Nutzerdaten und laufende Arbeiten.

Vergib den Abschlussstatus anhand der tatsächlichen Lage:

| Status | Bedingungen |
| --- | --- |
| **A – Vereinbarter Lieferumfang erfüllt** | Alle Anforderungen des vorab abgegrenzten Lieferumfangs sind umgesetzt und passend geprüft. Alle anwendbaren Pflichtprüfungen sind bestanden, der Kriterienabgleich ist erfolgreich und es gibt keine offenen kritischen Fehler. Benenne den genauen Umfang, begründete Ausschlüsse und Grenzen des Vergleichs. Ein ausdrücklich größerer Auftrag behält seinen eigenen Gesamtstatus. |
| **B – Teilstand mit externer Voraussetzung** | Alle unabhängig von der fehlenden Ressource umsetzbaren Teile sind umgesetzt und geprüft. Die als nutzbar ausgewiesenen Teile sind frei von offenen kritischen Fehlern. Die übrigen Funktionen, die konkret fehlende Ressource und ihre Auswirkung sind benannt. |
| **C – Unterbrochener Arbeitsstand** | Eine konkrete Zeit-, Umgebungs-, Berechtigungs- oder anderweitig nicht selbst auflösbare Grenze verhindert weitere Arbeit. Erreichter Stand, offene kritische Fehler und der nächste Schritt sind dokumentiert. |

B und C kennzeichnen eine unvollständige Lieferung. Beim Erreichen einer Budgetgrenze mit offenen Verpflichtungen dokumentiere C für den beauftragten Umfang, sofern die Bedingungen für B nicht erfüllt sind. Trenne bestandene Etappen von der Gesamtentscheidung. Berichte tatsächlich gemessene Laufzeit und verfügbare Verbrauchs- oder Kostendaten samt Messgrundlage. Nicht erfasste Kosten kennzeichnest du als unbekannt.

Berichte zum Abschluss knapp über Status und Startweg, vollständig nutzbare Abläufe, belegte Entsprechungen und Abweichungen, offene Funktionen und Integrationen, geprüfte Betriebsqualität einschließlich Umgebung und Grenzen, gegebenenfalls Kennzahlen mit Katalogbezug sowie benötigte Ressourcen, nächste Schritte und relevante Lizenz- und Wartungsvoraussetzungen. Beanspruche Kompatibilität, Zertifizierung oder Einsatzfähigkeit nur in dem Umfang, den die Nachweise tragen.

**Beginne mit Lieferumfang und Budget für diesen Lauf, lege die Abnahmekriterien fest und arbeite bis zur belegten Abnahme oder bis zur ersten vereinbarten Grenze.**
