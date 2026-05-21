# Architektur

BengtsToolBox ist eine Vite/React-SPA fuer kleine, getrennte Mini-Apps. Das
Projekt soll leicht erweiterbar bleiben, ohne dass jede neue App eigene
Firebase- oder Layout-Entscheidungen treffen muss.

## App-Struktur

- `src/apps/registry.ts` ist die zentrale Quelle fuer Navigation, Dashboard und
  Routen.
- Jede Mini-App liegt unter `src/apps/{app-id}` und exportiert ihre Page ueber
  `index.ts`.
- App-spezifische Typen und Hooks bleiben im jeweiligen App-Ordner.
- Wiederverwendbare UI-Bausteine liegen unter `src/components/ui`.
- Gemeinsame Firebase-Logik liegt unter `src/lib/firebase`.

## Datenfluss

Der Standardfluss fuer geteilte App-Zustaende ist:

```txt
Page -> App Hook -> Firebase Hook -> Firestore
                         |
                         v
                   LocalStorage Fallback
```

Komponenten sollen keine Firestore-Pfade direkt bauen. Neue Pfade werden in
`src/lib/firebase/paths.ts` definiert und dann in App-Hooks verwendet.

## Firebase-Modell

- Anonymous Auth stellt eine `uid` bereit, ohne Nutzerkonten einzufuehren.
- Firestore-Regeln erlauben fuer den Start angemeldeten Nutzern Zugriff auf
  `apps/{appId}/...`.
- Geteilte App-Zustaende speichern mindestens `updatedAt` und bei Nutzeraktionen
  `updatedBy`.
- Snapshot Listener sorgen dafuer, dass mehrere Browserfenster oder Geraete den
  gleichen Zustand live sehen.

## Fehlerstrategie

Firebase-Ausfaelle sollen die Toolbox nicht unbenutzbar machen:

- Wenn Firebase nicht konfiguriert ist, laufen Apps im lokalen Demo-Modus.
- Wenn Auth oder Firestore fehlschlaegt, zeigt die App eine konkrete
  Fehlermeldung.
- LocalStorage haelt den zuletzt bekannten lokalen Zustand.
- `/apps/diagnostics` ist die erste Anlaufstelle fuer Config-, Auth-, Rules- und
  Realtime-Probleme.

## Deploy-Modell

Der Workflow `.github/workflows/firebase-hosting.yml` baut die App und
veroeffentlicht Firebase Hosting. Firestore Rules/Indexes werden vorerst
manuell deployed:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Der Service Account liegt in GitHub als Secret
`FIREBASE_SERVICE_ACCOUNT_BENGTSTOOLBOX`. Wenn dieser Account spaeter
Rules-/Firestore-Rechte bekommt, kann der Rules-Deploy wieder in den Workflow
aufgenommen werden.
