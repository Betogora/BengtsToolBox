# BengtsToolBox

Privater App-Hub fuer Mini-Apps, Spiele und kuenftige Projekte.

## Lokal starten

```powershell
npm install
npm run dev
```

Die lokale App laeuft danach normalerweise unter:

```txt
http://127.0.0.1:5173
```

## Online-Hosting

Die einfache Schritt-fuer-Schritt-Anleitung liegt hier:

[docs/ONLINE_HOSTING_GUIDE.md](docs/ONLINE_HOSTING_GUIDE.md)

## Wichtige Befehle

```powershell
npm run lint
npm run build
```

## Struktur

- `src/apps/registry.ts`: zentrale App-Registry
- `src/apps/realtime-counter`: Echtzeit-Counter
- `src/apps/randomizer`: Zufallsgenerator
- `src/lib/firebase`: Firebase-Client, Pfade und Sync-Hooks
- `.github/workflows/firebase-hosting.yml`: GitHub Actions Deployment nach Firebase Hosting
