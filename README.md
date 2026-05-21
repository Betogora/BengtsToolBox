# BengtsToolBox

Privater App-Hub fuer Mini-Apps, Spiele und kuenftige Projekte. Die Toolbox ist
als modulare React-App aufgebaut: Jede App lebt in einem eigenen Ordner, nutzt
die gemeinsame UI-Sprache und greift ueber zentrale Firebase-Helfer auf
Firestore oder den lokalen Fallback zu.

## Lokal starten

```powershell
npm install
npm run dev
```

Die lokale App laeuft danach normalerweise unter:

```txt
http://127.0.0.1:5173
```

## Firebase-Grundmodell

- Hosting liefert den gebauten `dist`-Ordner aus.
- Anonymous Auth meldet Besucher ohne Login-UI an.
- Firestore speichert geteilte App-Zustaende unter `apps/{appId}/...`.
- LocalStorage bleibt Fallback, wenn Firebase lokal nicht konfiguriert ist.

Die Diagnose-App unter `/apps/diagnostics` prueft Config, Auth, Firestore
Lesen/Schreiben, Realtime-Snapshots und LocalStorage.

## Deploy

Die Schritt-fuer-Schritt-Anleitung liegt hier:

[docs/ONLINE_HOSTING_GUIDE.md](docs/ONLINE_HOSTING_GUIDE.md)

Der GitHub-Workflow deployed bei Push auf `main` Firebase Hosting.
Firestore-Regeln sind ein separates Firebase-Produkt und werden manuell
deployed, bis der GitHub-Service-Account zusaetzliche Rules-/Firestore-Rechte
bekommt.

## Wichtige Befehle

```powershell
npm run lint
npm run build
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## Struktur

- `src/apps/registry.ts`: zentrale App-Registry fuer Navigation und Dashboard
- `src/apps/diagnostics`: Firebase- und Multi-Device-Checks
- `src/apps/realtime-counter`: Echtzeit-Counter
- `src/apps/randomizer`: Zufallsgenerator
- `src/lib/firebase`: Firebase-Client, Pfade, Sync-Hooks und lokaler Fallback
- `.github/workflows/firebase-hosting.yml`: GitHub Actions Deployment

## Neue Mini-App anlegen

1. App-Ordner unter `src/apps/{app-id}` erstellen.
2. Typen und Hook im App-Ordner kapseln.
3. Firestore-Pfade nur in `src/lib/firebase/paths.ts` ergaenzen.
4. App in `src/apps/registry.ts` registrieren.
5. UI mit vorhandenen Komponenten aus `src/components/ui` bauen.
6. Bei geteiltem Zustand `updatedAt` und `updatedBy` speichern.

Mehr Details stehen in:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/APP_DEVELOPMENT_GUIDE.md](docs/APP_DEVELOPMENT_GUIDE.md)
