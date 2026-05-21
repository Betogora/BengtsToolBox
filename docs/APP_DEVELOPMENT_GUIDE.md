# Mini-App Development Guide

Diese Anleitung ist der Einstiegspunkt fuer Menschen und KI-Agenten, die neue
Apps in BengtsToolBox bauen. Vor groesseren Aenderungen zuerst diese Datei,
`README.md` und `docs/ARCHITECTURE.md` lesen.

## Minimaler App-Aufbau

Neue Apps folgen dieser Struktur:

```txt
src/apps/{app-id}/
  {AppName}Page.tsx
  hooks/use{AppName}.ts
  types.ts
  index.ts
```

Die Page rendert UI und ruft den App-Hook auf. Der Hook kapselt Zustand,
Firestore-Zugriff, Normalisierung und Aktionen. Typen bleiben in `types.ts`.

## Registry

Jede App wird in `src/apps/registry.ts` registriert:

- stabile `id`
- sichtbarer `title`
- kurze `description`
- `href` und `routePath`
- `status`
- Akzentfarbe
- Lucide Icon
- Page-Komponente

Die Registry ist die einzige Stelle, an der Navigation und Dashboard neue Apps
kennenlernen.

## Firebase-Pfade

Firestore-Pfade werden nur in `src/lib/firebase/paths.ts` definiert. Das
Standardmuster ist:

```txt
apps/{appId}/...
```

Beispiele:

```txt
apps/randomizer/state/default
apps/realtime-counter/sessions/default/players
apps/diagnostics/health/default
```

App-Hooks importieren Pfade aus `firebasePaths`. Komponenten bauen keine Pfade.

## Sync- und Fallback-Regeln

- Fuer Dokumente `useFirestoreDoc` verwenden.
- Fuer Collections `useFirestoreCollection` verwenden.
- Nutzeraktionen schreiben `updatedBy`.
- Server-Schreibvorgaenge schreiben `updatedAt`.
- Bei fehlender Firebase Config muss die App sinnvoll mit LocalStorage laufen.
- Fehlermeldungen muessen im UI sichtbar und konkret sein.

## UI-Regeln

- Bestehende UI-Komponenten aus `src/components/ui` verwenden.
- Lucide Icons fuer Buttons und App-Kacheln nutzen.
- Keine Landingpage fuer einzelne Tools bauen; die App-Funktion ist der erste
  Screen.
- Kompakte Cards fuer echte Tool-Bereiche verwenden, nicht fuer ganze
  Seitenabschnitte.
- Texte kurz halten und mobile Breiten beachten.

## Checks vor Commit

```powershell
npm run build
```

Wenn Firebase-Verhalten betroffen ist:

1. `/apps/diagnostics` oeffnen.
2. Checks starten.
3. Seite in zweitem Fenster oeffnen.
4. Pruefen, ob der Shared State live aktualisiert.
5. Betroffene Mini-App neu laden und Persistenz pruefen.

## Was nicht spontan neu erfinden

- Keine zweite App-Registry.
- Keine Firestore-Pfade direkt in Komponenten.
- Keine App-spezifischen Firebase-Clients.
- Kein neuer globaler State-Manager ohne klaren Bedarf.
- Keine Login-UI, solange Anonymous Auth als Startmodell reicht.
