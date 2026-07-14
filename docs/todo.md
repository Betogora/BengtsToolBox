# BengtsToolBox – sinnvolle nächste Schritte

> **Stand:** 14. Juli 2026
> **Grundlage:** aktueller Code, Build-Ausgabe und [`specs.md`](specs.md)

Diese Liste enthält nur aktuell begründete Arbeiten. Sie ist von kleinen, risikoarmen Schritten zu größeren Umbauten sortiert, damit sie von oben nach unten abgearbeitet werden kann. Innerhalb derselben Größenklasse stehen Absicherung und Fehlervermeidung vor Komfort. Erledigte Punkte werden entfernt oder als dauerhafter Vertrag in die Spezifikation übernommen.

Die Größenangaben sind relativ: **klein** ist ein enger Änderungssatz, **mittel** umfasst mehrere zusammenhängende Dateien oder eine neue Prüfschicht, **groß** benötigt mehrere sichere Refactoring-Schnitte.

## Aktive Abarbeitungsreihenfolge

Derzeit liegen keine aktiven Punkte vor.

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
