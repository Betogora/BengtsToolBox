# BengtsToolBox – sinnvolle nächste Schritte

> **Stand:** 13. Juli 2026
> **Grundlage:** aktueller Code, Build-Ausgabe und [`specs.md`](specs.md)

Diese Liste enthält nur aktuell begründete Arbeiten. Sie ist von kleinen, risikoarmen Schritten zu größeren Umbauten sortiert, damit sie von oben nach unten abgearbeitet werden kann. Innerhalb derselben Größenklasse stehen Absicherung und Fehlervermeidung vor Komfort. Erledigte Punkte werden entfernt oder als dauerhafter Vertrag in die Spezifikation übernommen.

Die Größenangaben sind relativ: **klein** ist ein enger Änderungssatz, **mittel** umfasst mehrere zusammenhängende Dateien oder eine neue Prüfschicht, **groß** benötigt mehrere sichere Refactoring-Schnitte.

## Aktive Abarbeitungsreihenfolge

### 6. Browser- und Accessibility-Regressionen automatisieren — mittel bis groß

**Warum:** Viele Oberflächen sind mobil, tabellarisch, fullscreen- oder pointerintensiv; derzeit werden diese Risiken überwiegend manuell geprüft.

- [ ] Eine kleine Browser-Smoke-Suite für App-Start, verschachtelte Route, Dialog und zentrale Nutzeraktion einführen.
- [ ] Kritische Flows bei 320/390 Pixel, Tablet und Desktop abdecken.
- [ ] Tastatur, Fokusführung, Dialoge, Presenter, Tabellen und Karteninteraktion prüfen.
- [ ] Axe oder eine vergleichbare Accessibility-Prüfung in dieselbe Suite aufnehmen.
- [ ] Die Suite erst nach stabilen lokalen Läufen als verpflichtenden CI-Check aktivieren.

**Fertig, wenn:** die wichtigsten mobilen und tastaturbasierten Flows reproduzierbar geprüft werden und offensichtliche Accessibility-Verstöße den Check fehlschlagen lassen.

### 7. Sync- und LocalStorage-Fehler robust behandeln — groß

**Warum:** LocalStorage-Lesen ist abgesichert, gemeinsame Schreib- und ID-Pfade können bei gesperrtem oder vollem Storage jedoch weiterhin werfen. Optimistische Firestore-Schreibvorgänge besitzen noch kein einheitliches Fehler- und Wiederherstellungsverhalten.

- [ ] LocalStorage-Schreib-, Lösch- und ID-Fehler in der gemeinsamen Infrastruktur abfangen und als verständliches Ergebnis bereitstellen.
- [ ] Ein kleines gemeinsames Interface für Sync-Fehler festlegen, statt Fehlerbehandlung über Feature-Caller zu verteilen.
- [ ] Verhalten nach fehlgeschlagenem Firestore-Schreiben definieren: erneuter Snapshot, gezielter Retry oder sichtbare Warnung.
- [ ] Mehrdokument-Aktionen mit echtem Konsistenzbedarf identifizieren und nur dort Batch oder Transaction einsetzen.
- [ ] Lokalen Modus, Reload, Doppel-Tab, Reconnect, volle Storage-Quota sowie Auth-, Rules- und Netzwerkfehler dokumentiert testen.

**Fertig, wenn:** ein Schreibfehler weder unbemerkt bleibt noch einen dauerhaft falschen optimistischen Zustand erzeugt.

### 8. Turnier-App in tiefe fachliche Module gliedern — groß

**Warum:** `SwissTournamentsPage.tsx` enthält mehr als 4.300 nichtleere Zeilen; `logic.ts` mehr als 3.100 und rund 26 exportierte Funktionen. Für Menschen und KI-Agenten ist dadurch bei lokalen Änderungen unnötig viel Kontext erforderlich.

- [ ] Die vorhandenen Golden-, Lifecycle- und Format-Tests als Refactoring-Schutz an den heutigen öffentlichen Interfaces festhalten.
- [ ] Swiss, Round Robin, Hand and Brain, Rangfolge und Turnierlebenszyklus hinter jeweils kleinen fachlichen Interfaces kapseln.
- [ ] Keine Sammlung flacher Einzelfunktionen erzeugen: Ein Modul soll mehrere zusammengehörige Regeln verbergen und für Caller weniger Wissen erfordern.
- [ ] Das äußere Turnier-Interface für Paarungsgenerierung, Vollständigkeit, Wertung und Zustandsübergänge bewusst verkleinern.
- [ ] Große Page-Bereiche entlang sichtbarer Arbeitsabläufe, Tabs und Dialoge feature-lokal aufteilen.
- [ ] Nach jedem Schnitt Tests, Build und die betroffenen Browser-Flows ausführen; keine parallelen Zustandsmodelle oder vorsorglichen Adapter einführen.

**Fertig, wenn:** eine Änderung an einem Turnierformat überwiegend dessen eigenes Modul berührt und Page, Hook sowie Tests nur das kleine gemeinsame Interface kennen müssen.

## Konditionale Gates – derzeit nicht abarbeiten

### Sicherheitsmodell für nicht vertrauensbasierte Nutzung

Der aktuelle Produktvertrag entscheidet sich ausdrücklich für einen privaten, vertrauensbasierten Hub ohne sensible oder mandantengetrennte Daten. Client-PINs sind dokumentierte Bedienbarrieren und keine Sicherheitsgrenzen. Rules-Tests und ein separates Rules-/Index-Deployment existieren bereits.

Erst wenn öffentliche Nutzung mit sensiblen Daten, echte Besitzerrollen oder Mandantentrennung gewünscht werden, wird daraus wieder ein aktives P0-Thema:

- Datenräume, Identitäten und Besitzer-/Teilnehmer-Claims modellieren;
- globale Legacy-Pfade migrieren und Firestore Rules verengen;
- Client-PINs durch serverseitig prüfbare Autorisierung ersetzen;
- erlaubte, abgewiesene und migrationsbezogene Zugriffe im Emulator absichern.

### Zweite Programmiersprache oder WebAssembly

TypeScript bleibt die gemeinsame Sprache für UI, Hooks, Fachlogik und Infrastruktur. ReScript, F#/Fable, Kotlin/JS, Rust oder AssemblyScript werden nicht allein zur Reduktion von Quellzeilen eingeführt. Eine zusätzliche Toolchain und der Sprach-Seam sind erst gerechtfertigt, wenn die Performance-Baseline einen isolierten Hotspot nachweist und eine TypeScript-Lösung einschließlich Web Worker nicht genügt.

## Nicht als offene Spezifikation weiterführen

- Eine eigene Diagnose-Route ist derzeit kein offenes Muss. `specs.md` enthält bereits lokale, Firebase-, Deploy- und Fehlerdiagnose-Checklisten. Eine Route wird nur bei einem konkreten wiederkehrenden Diagnoseproblem neu bewertet.
- Das separate Rules-/Index-Deployment und Emulator-Rules-Tests sind umgesetzt und deshalb kein offenes Todo mehr.
- Die entfernte Mario-Kart-Fragensammlung wird nicht in diese Liste kopiert. Der aktuelle Code hat die zentralen Regeln bereits entschieden. Neue Regeländerungen benötigen eine konkrete Produktentscheidung und anschließend eine Änderung von Code, Tests und Specs im selben Satz.
