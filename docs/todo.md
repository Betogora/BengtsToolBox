# BengtsToolBox – sinnvolle nächste Schritte

> **Stand:** 10. Juli 2026  
> **Grundlage:** aktueller Code, Build-Ausgabe und [`specs.md`](specs.md)

Diese Liste enthält bewusst keine beliebige Feature-Wunschliste. Aufgenommen sind nur Schritte mit klarer technischer oder betrieblicher Begründung. Erledigte Punkte werden entfernt oder in die Spezifikation übernommen.

## P0 – zuerst absichern

### 1. Sicherheitsmodell vor öffentlicher Nutzung härten

**Warum:** Anonymous Auth darf aktuell vollständig unter `apps/**` lesen und schreiben. Der Zugang zu `Schlag den Raab` basiert auf einer fest codierten Client-PIN und `sessionStorage`.

**Nächster Schnitt:**

- Entscheiden, ob der Hub dauerhaft privat/vertrauensbasiert bleibt oder echte Zugriffskontrolle benötigt.
- Für echte Kontrolle Session-/Raum-IDs, Besitzer- oder Teilnehmer-Claims und engere Firestore Rules modellieren.
- Client-PIN entfernen oder durch eine serverseitig prüfbare Autorisierung ersetzen.
- Firestore Emulator und Rules-Tests für erlaubte sowie abgewiesene Zugriffe einführen.
- Keine bestehenden Datenräume ohne Migrationsplan umstellen.

**Fertig, wenn:** der dokumentierte Schutz dem tatsächlichen technischen Schutz entspricht.

### 2. CI zu einem vollständigen Qualitätsgate machen

**Warum:** Die Hosting-Workflows führen Tests und Build aus, aber noch nicht ESLint. Rules und Indizes werden außerhalb der Workflows deployt.

**Nächster Schnitt:**

- `npm run lint` in beiden Workflows vor Tests und Build ausführen.
- Ein separates, least-privilege Rules-/Index-Deployment planen.
- Build- und Testfehler als verpflichtende PR-Checks konfigurieren.

## P1 – Wartbarkeit und Laufzeit verbessern

### 4. Turnier-App intern weiter vertiefen

**Warum:** `SwissTournamentsPage.tsx` und `logic.ts` liegen jeweils bei mehr als 4.000 Zeilen. Formatwissen und UI-Verantwortungen sind trotz vorhandener purer Logik schwer navigierbar.

**Nächster Schnitt:**

- Die vorhandenen Tests an den öffentlichen Interfaces als Refactoring-Schutz verwenden.
- Formatimplementierungen intern in Swiss-, Round-Robin-, Hand-and-Brain- und Mario-Kart-Module gliedern.
- Eine kleine gemeinsame Interface für Paarungsgenerierung, Vollständigkeit und Wertung erhalten.
- Große Page-Bereiche entlang sichtbarer Tabs und Dialoge feature-lokal zerlegen.
- Keine zusätzlichen externen Adapter oder parallele Zustandsmodelle einführen.

### 5. Sync- und LocalStorage-Fehler robuster behandeln

**Warum:** Lesen aus LocalStorage ist abgesichert, mehrere Schreibpfade können bei gesperrtem oder vollem Storage jedoch werfen. Optimistische Mehrfachschreibvorgänge besitzen kein Rollback oder gemeinsames Fehlerprotokoll.

**Nächster Schnitt:**

- LocalStorage-Schreibfehler in der gemeinsamen Infrastruktur abfangen und sichtbar melden.
- Verhalten bei fehlgeschlagenem Firestore-Schreiben festlegen: Retry, erneuter Snapshot oder verständliche Warnung.
- Mehrdokument-Aktionen mit hohem Konsistenzbedarf identifizieren und gezielt über Batch/Transaction absichern.
- Reconnect-, Doppel-Tab- und Konfliktfälle dokumentiert testen.

### 6. Echte Diagnoseoberfläche bereitstellen

**Warum:** Für Sync-Änderungen fehlt eine zentrale, laufzeitnahe Sicht auf Konfiguration, Auth, Firestore und Cache. Eine früher dokumentierte `/apps/diagnostics`-Route existiert im Router nicht.

**Nächster Schnitt:**

- Entweder eine bewusst versteckte Diagnose-Route implementieren oder bei einer dokumentierten manuellen Checkliste bleiben.
- Keine Secrets anzeigen; nur Konfigurationsvollständigkeit, Modus, UID, Connectivity und Testpfade darstellen.
- Diagnose nicht als Ersatz für Emulator- und Integrationstests verwenden.

### 7. Dokumentationsdrift automatisiert erkennen

**Warum:** Registry, Firestore-Pfade, Workflows und Dokumentation können unabhängig voneinander geändert werden.

**Nächster Schnitt:**

- Markdown-Links in CI prüfen.
- Sicherstellen, dass Registry-Routen eindeutig sind und `href`/`routePath` zusammenpassen.
- Optional die App-/Routentabelle der Specs aus einem kleinen verifizierten Metadatenexport erzeugen.
- `specs.md` und `specs.html` bei fachlichen Änderungen im selben PR aktualisieren.

## P2 – Produktqualität abrunden

### 8. Browser- und Accessibility-Regressionen automatisieren

**Warum:** Viele Oberflächen sind mobil, tabellarisch, fullscreen- oder pointerintensiv; derzeit gibt es nur manuelle Prüfung.

**Nächster Schnitt:**

- Kritische Flows bei 320/390 Pixel, Tablet und Desktop als Browser-Smokes abdecken.
- Tastatur, Fokus, Dialoge, Presenter, Tabellen und Karteninteraktion prüfen.
- Axe oder eine vergleichbare Accessibility-Prüfung in die Browser-Suite aufnehmen.

### 9. Platzhalter im Sonderbereich entscheiden

**Warum:** `Schlag den Raab` zeigt zwei deaktivierte `Dummy Game`-Kacheln. Sie sind sichtbar, aber keine nutzbaren Spiele.

**Nächster Schnitt:**

- Entweder echte Spielmodule spezifizieren und implementieren oder die Platzhalter entfernen.
- Keine leeren Kacheln dauerhaft als vermeintliche Funktion ausliefern.

## Nicht als offene Spezifikation weiterführen

Die entfernte Mario-Kart-Fragensammlung wird nicht in diese TODO-Liste kopiert. Der aktuelle Code hat die zentralen Fragen bereits entschieden: exakt vier Fahrer pro Lobby, explizite Wertungsrunden, vorgezogene Füller, zunächst ungewertete Extras, parallele aktive Lobbys ohne Doppelbelegung, eindeutige Platzierungen von 1 bis 15 mit relativer Menschenreihenfolge und eine gemeinsame Rangfolge für UI, Presenter, Druck und CSV. Neue Regeländerungen benötigen eine konkrete Produktentscheidung und anschließend eine Änderung von Code, Tests und Specs im selben Satz.
