# AGENTS.md

Kurzer Arbeitskontext für KI-Agenten in BengtsToolBox. Diese Datei gilt für das gesamte Repository. Lies nur die Dokumente und Quellbereiche, die für die konkrete Aufgabe nötig sind.

## Schnellorientierung

BengtsToolBox ist eine deutsche React-/TypeScript-SPA für kleine Spiele-, Gruppen- und Turnierwerkzeuge. Vite baut die Anwendung, Firebase Hosting liefert sie aus, und Firestore synchronisiert App-Zustände nach anonymer Anmeldung. Ohne vollständige Firebase-Konfiguration verwenden die gemeinsamen Hooks LocalStorage.

```text
src/app/                  Router, Lazy Routes, globale Provider
src/apps/registry.ts      Metadaten und Loader regulärer Dashboard-Apps
src/apps/<app-id>/        UI, Hook, Typen und Fachlogik eines Features
src/apps/shared/          Wirklich appübergreifende App-Bausteine
src/components/layout/    Shell und Dashboard
src/components/ui/        Generische UI-Primitiven
src/lib/firebase/         Client, kanonische Pfade, Sync-Hooks, lokaler Cache
src/styles/               Globale Styles und Design-Tokens
docs/                     Dauerhafte Architektur-, Entwicklungs- und Betriebsdoku
```

## Lokaler Dev-Server

- BengtsToolBox immer auf Port `5180` öffnen und starten, zum Beispiel mit `npm run dev -- --host 127.0.0.1 --port 5180 --strictPort`. Nicht auf den Vite-Standardport `5173` ausweichen, damit die App nicht mit anderen lokalen Projekten konkurriert.

## Kontext gezielt laden

| Aufgabe | Zuerst lesen |
| --- | --- |
| kleine Änderung in einer App | betroffene Page, Hook und Typen |
| neue reguläre App | `docs/APP_DEVELOPMENT_GUIDE.md`, `src/apps/registry.ts`, eine ähnliche App |
| Routing, Shared Code oder Firebase-Infrastruktur | `docs/ARCHITECTURE.md` und betroffene zentrale Dateien |
| Hosting, Actions oder Umgebungsvariablen | `docs/ONLINE_HOSTING_GUIDE.md`, Workflows und Firebase-Konfiguration |
| Projektüberblick oder öffentliche Beschreibung | `README.md` |

Nicht vorsorglich alle Apps, Datensätze oder Guides laden. Der aktuelle Code ist für Implementierungsdetails maßgeblich; Markdown beschreibt stabile Grenzen und Arbeitsabläufe.

## Architekturregeln

- Reguläre Dashboard-Apps genau einmal in `src/apps/registry.ts` registrieren. Dashboard, Standardroute und Lazy Loading entstehen daraus.
- Bewusst versteckte oder anders strukturierte Bereiche dürfen explizite Routen besitzen. Aktuell gilt dies für `/schlag-den-rabe`.
- Firestore-Pfade ausschließlich in `src/lib/firebase/paths.ts` definieren; keine Pfadstrings in Pages oder Feature-Hooks duplizieren.
- Dokumentzustand über `useFirestoreDoc`, geordnete Mengen über `useFirestoreCollection` synchronisieren.
- Keine app-eigenen Firebase-Clients, Auth-Flows oder LocalStorage-Fallbacks erstellen.
- UI in der Page, Zustand und Aktionen im Feature-Hook, komplexe pure Fachlogik außerhalb von React halten.
- Wiederverwendung beginnt feature-lokal. Erst tatsächlich von mehreren Apps genutzten Code nach `src/apps/shared` oder `src/components/ui` verschieben.
- Bestehende Design-Tokens, Lucide Icons und gemeinsame UI-Komponenten bevorzugen. Mobile Nutzung, Lade-, Leer- und Fehlerzustände mitdenken.

## Typischer Änderungsweg

1. Arbeitsbaum mit `git status --short` prüfen und fremde Änderungen bewahren.
2. Betroffene Dateien und direkte Abhängigkeiten mit `rg` beziehungsweise `rg --files` finden.
3. Eine ähnliche bestehende App als Muster wählen.
4. Kleine, klar begrenzte Änderungen vornehmen; keine zweite Architektur oder parallele Registry einführen.
5. Dokumentation nur aktualisieren, wenn sich dauerhafter Projektkontext ändert. Veränderliche Fachregeln gehören in verständlichen, testbaren Code statt in lange Markdown-Duplikate.
6. Passend zum Risiko verifizieren.

## Verifikation

Mindestens für Codeänderungen:

```powershell
npm run lint
npm run build
```

Bei Firebase- oder Sync-Änderungen zusätzlich `/apps/diagnostics`, lokalen Modus ohne `.env.local`, Realtime-Sync in zwei Fenstern und Persistenz nach Reload prüfen.

Bei Dokumentationsänderungen lokale Links, genannte Pfade und Befehle gegen den aktuellen Repository-Stand prüfen. `dist/`, `node_modules/`, Logs und `.env.local` weder bearbeiten noch committen.

## Maßgebliche Dokumente

- `README.md`: GitHub-Landingpage, App-Übersicht und Einstieg
- `docs/ARCHITECTURE.md`: Schichten, Datenfluss und technische Entscheidungen
- `docs/APP_DEVELOPMENT_GUIDE.md`: vollständige Integrationscheckliste
- `docs/ONLINE_HOSTING_GUIDE.md`: Firebase-, GitHub-Actions- und Deployment-Betrieb

Wenn diese Dateien dem Code widersprechen, zuerst den aktuellen Laufzeitpfad verifizieren und die Dokumentation im selben Änderungssatz korrigieren.
