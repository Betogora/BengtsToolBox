# App Development Guide

Dieser Guide ist die Arbeitscheckliste für neue oder grundlegend überarbeitete Apps. Vor größeren Eingriffen zuerst [README](../README.md) und [Architektur](ARCHITECTURE.md) lesen; der aktuelle Code benachbarter Apps bleibt die beste Quelle für konkrete Muster.

## 1. Umfang und Datenmodell klären

Vor dem ersten Component-Code festlegen:

- Welche Nutzeraktion ist der Kern der App?
- Ist der Zustand nur lokal oder soll er zwischen Geräten synchronisieren?
- Ist ein einzelnes Dokument ausreichend oder braucht die App eine geordnete Collection?
- Welche stabile App-, State- oder Session-ID trennt Datenräume?
- Was muss bei leerem Zustand, Laden, Fehlern und erneutem Öffnen passieren?

Das Domänenmodell gehört in `types.ts`. Reine Berechnungen sollten React- und Firebase-unabhängig bleiben; so sind sie leichter zu prüfen und später zu testen.

## 2. Nur die nötige Feature-Struktur anlegen

```text
src/apps/<app-id>/
├── <AppName>Page.tsx
├── hooks/use<AppName>.ts
├── types.ts
└── index.ts
```

Optionale `components.tsx`, `logic.ts`, `format.ts` oder `data/`-Dateien entstehen erst, wenn Page oder Hook dadurch klarer werden. Eine kleine App braucht kein künstliches Verzeichnisgerüst.

### Verantwortungen

- **Page:** Layout, Darstellung, Eingaben und Aufruf fachlicher Aktionen.
- **Hook:** Zustand, abgeleitete Werte, Aktionen, Normalisierung und Persistenz.
- **Logikdatei:** komplexe pure Regeln und Berechnungen ohne React.
- **Index:** nur die öffentliche Page beziehungsweise bewusst öffentliche Exporte.

## 3. Gemeinsame Bausteine wiederverwenden

1. Für Controls zuerst `src/components/ui` prüfen.
2. Für App-Layouts und wiederkehrende Interaktionen `src/apps/shared/components` prüfen.
3. Gemeinsame Teams, IDs und Hilfen aus `src/apps/shared` nutzen.
4. Code erst nach `shared` verschieben, wenn mindestens zwei Apps dieselbe Abstraktion wirklich verwenden.

Lucide Icons, bestehende Tokens und die globale Typografie bewahren die visuelle Sprache. Neue globale CSS-Regeln sind die Ausnahme; Feature-Layout gehört möglichst in die Komponente. Für Schriftgrößen und Gewichte semantische Rollen aus `src/styles/globals.css` verwenden, zum Beispiel `type-page-title`, `type-section-title`, `type-label`, `type-action` und `type-metric-*`, statt app-spezifische `text-*`/`font-*`-Kombinationen einzuführen.

### Presenter-Modus

Wenn eine App eine beamer- oder zuschauerfreundliche Ausgabe braucht, nutzt sie `PresenterLauncher` aus `src/apps/shared/components/Presenter`. Die Views bleiben feature-lokal, sind rein lesend und rufen keine Hook-Actions auf. Mehrere sinnvolle Ausgaben werden als mehrere `PresenterViewDefinition`-Einträge angeboten; der Launcher zeigt dann eine kleine Startauswahl und rendert die gewählte Ansicht als Fullscreen-Overlay. Die normale Page bleibt die Steuerfläche.

## 4. Persistenz anbinden

### Dokument oder Collection?

| Bedarf | Abstraktion |
| --- | --- |
| kompakter gemeinsamer Zustand | `useFirestoreDoc` |
| einzeln änderbare, geordnete Elemente | `useFirestoreCollection` |
| nur flüchtige lokale UI | React State, keine Firebase-Persistenz |

Jeder neue Firestore-Pfad wird als Funktion in `src/lib/firebase/paths.ts` ergänzt. Komponenten und Hooks bauen keine Pfadstrings selbst.

```ts
// src/lib/firebase/paths.ts
exampleState: (sessionId = 'default') =>
  `apps/example/sessions/${sessionId}/state/default`,
```

Danach verwendet der Feature-Hook den Pfad und einen stabilen Initialwert:

```ts
const statePath = useMemo(
  () => firebasePaths.exampleState(sessionId),
  [sessionId],
)
const store = useFirestoreDoc<ExampleState>(statePath, initialState)
```

Wichtig:

- Initialwerte außerhalb des Hooks definieren oder anderweitig referenziell stabil halten.
- Fehler und `isLoading` an die Page weiterreichen.
- Aktionen semantisch benennen (`addPlayer`, `finishRound`) statt Speicheroperationen in die UI zu leaken.
- Zeitstempel nicht clientseitig erfinden; die gemeinsamen Hooks schreiben `updatedAt` als Server-Zeit.
- Keine eigenen Firebase-Apps, Auth-Flows oder LocalStorage-Fallbacks pro Feature bauen.

## 5. Route und Registry ergänzen

Für eine reguläre Dashboard-App einen Eintrag in `src/apps/registry.ts` ergänzen:

- stabile, URL-taugliche `id`
- sichtbarer `title` und kurze `description`
- übereinstimmende `href` und `routePath`
- `status`, Lucide `Icon` und dynamischer `loadPage`

Dashboard, Router und Lazy Loading übernehmen den Rest. Ein separater Eintrag in `router.tsx` ist nur für bewusst nicht registrierte Sonderbereiche sinnvoll, beispielsweise geschützte Unterbereiche.

Falls die App eine eigene Vorschau auf der Dashboard-Kachel braucht, `AppPreview` in `src/components/layout/DashboardPage.tsx` ergänzen. Ohne Sonderfall wird eine neutrale Vorschau verwendet.

## 6. UX und Barrierefreiheit prüfen

- Der erste Screen zeigt das Werkzeug, keine vorgeschaltete Marketing-Landingpage.
- Mobile Breiten und Touch-Bedienung funktionieren ohne horizontales Scrollen.
- Icon-only Buttons besitzen einen zugänglichen Namen.
- Formfelder haben sichtbare oder programmatisch verknüpfte Labels.
- Lade-, Leer-, Fehler- und Offlinezustände sind verständlich.
- Destruktive Aktionen verlangen eine angemessene Bestätigung.
- Farbe ist nie der einzige Informationsträger.

## 7. Verifizieren

Mindestens:

```powershell
npm run lint
npm run build
```

Bei Persistenz- oder Sync-Änderungen zusätzlich:

1. App ohne `.env.local` öffnen und lokalen Modus prüfen.
2. Mit Firebase-Konfiguration dieselbe App in zwei Fenstern öffnen und Realtime-Änderungen beobachten.
3. Neu laden und Persistenz sowie Initialisierung prüfen.
4. Firestore-Fehlerzustand sichtbar testen, nicht nur den Happy Path.

Bei komplexer Fachlogik sind automatisierte Tests die bevorzugte Dokumentation. Falls noch kein passender Test-Runner eingerichtet ist, Logik zumindest in pure Funktionen kapseln und die fehlende Testabdeckung nicht durch eine lange, schnell veraltende Markdown-Spezifikation ersetzen.

## Fertig-Definition

Eine App ist fertig integriert, wenn:

- Registry oder bewusste Sonderroute korrekt ist,
- ihre Daten nur über zentrale Pfade und Sync-Hooks laufen,
- gemeinsamer Code nicht dupliziert wurde,
- lokale und synchronisierte Zustände verständlich reagieren,
- Lint und Build erfolgreich sind,
- README oder Architekturdoku nur dann geändert wurden, wenn sich der dauerhafte Projektkontext wirklich verändert hat.
