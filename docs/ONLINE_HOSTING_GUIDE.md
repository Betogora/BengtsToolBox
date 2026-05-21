# Online-Hosting mit GitHub und Firebase

Diese Anleitung bringt die App Schritt fuer Schritt online. Das Prinzip ist:

1. Der Code liegt im GitHub-Repository `Betogora/BengtsToolBox`.
2. GitHub Actions baut die React-App automatisch.
3. Firebase Hosting veroeffentlicht den fertigen `dist`-Ordner.

## 1. Accounts erstellen

### GitHub

Du hast bereits das Ziel-Repository:

`https://github.com/Betogora/BengtsToolBox`

### Google/Firebase

1. Oeffne `https://console.firebase.google.com/`.
2. Melde dich mit einem Google-Konto an oder erstelle ein neues Google-Konto.
3. Klicke auf `Projekt erstellen`.
4. Projektname: `BengtsToolBox`.
5. Google Analytics kannst du fuer den Start deaktivieren.
6. Projekt erstellen.

## 2. Firebase Web-App anlegen

1. Im Firebase-Projekt auf das Web-Symbol `</>` klicken.
2. App-Spitzname: `BengtsToolBox Web`.
3. App registrieren.
4. Firebase zeigt dir eine `firebaseConfig`.
5. Kopiere die Werte spaeter in `.env.local` fuer lokale Tests und in GitHub Secrets/Variables fuer GitHub Actions.

Die lokalen Variablen liegen in `.env.local`:

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 3. Firestore und Anonymous Auth aktivieren

### Anonymous Auth

1. Firebase Console oeffnen.
2. `Authentication` oeffnen.
3. `Loslegen` klicken.
4. Reiter `Sign-in method`.
5. `Anonym` aktivieren.

### Firestore

1. `Firestore Database` oeffnen.
2. `Datenbank erstellen`.
3. Standort auswaehlen, z. B. `europe-west3`.
4. Fuer den Start `Produktionsmodus` waehlen.
5. Regeln spaeter aus diesem Repository deployen.

## 4. Firebase Hosting aktivieren

1. Firebase Console oeffnen.
2. `Hosting` oeffnen.
3. `Loslegen` klicken.
4. Die lokalen CLI-Schritte in der Console kannst du ueberspringen, weil `firebase.json` schon im Repository liegt.
5. Merke dir die Projekt-ID, z. B. `bengtstoolbox-12345`.

## 5. GitHub Secrets und Variables eintragen

Oeffne in GitHub:

`Betogora/BengtsToolBox` -> `Settings` -> `Secrets and variables` -> `Actions`

### Variable

Unter `Variables`:

```txt
FIREBASE_PROJECT_ID = deine-firebase-projekt-id
```

### Secrets fuer die Web-App

Unter `Secrets`:

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Die Werte kommen aus der Firebase Web-App-Konfiguration.
Im Feld `Secret` darf jeweils nur der reine Wert stehen, nicht der Name:

```txt
Richtig: AIzaSy...
Falsch: VITE_FIREBASE_API_KEY = AIzaSy...
```

## 6. Firebase Service Account fuer GitHub Actions

GitHub Actions braucht einen technischen Zugang zu Firebase.

Der einfachste Weg:

1. Installiere lokal Node.js, falls noch nicht vorhanden.
2. Im Projektordner ausfuehren:

```powershell
npx firebase-tools login
npx firebase-tools init hosting:github
```

Dabei auswaehlen:

- Firebase-Projekt: dein `BengtsToolBox` Firebase-Projekt
- Repository: `Betogora/BengtsToolBox`
- Build command: `npm ci && npm run build`
- Public directory: `dist`
- Single-page app rewrite: `Yes`
- Automatische Deploys auf `main`: `Yes`

Firebase legt dann normalerweise selbst ein passendes GitHub Secret fuer den Service Account an.
In diesem Projekt heisst es:

```txt
FIREBASE_SERVICE_ACCOUNT_BENGTSTOOLBOX
```

Falls du es manuell machst, muss der Workflow entweder diesen Secret-Namen verwenden oder entsprechend angepasst werden.

## 6.1 Firestore-Regeln deployen

Hosting alleine veroeffentlicht nur die Website. Fuer Firestore muessen Regeln
und Indexes ebenfalls deployed werden:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Diese Dateien werden aktuell manuell deployed. Der GitHub-Service-Account aus
`firebase-tools init hosting:github` hat standardmaessig nur Hosting-Rechte; fuer
automatische Rules-Deploys braeuchte er zusaetzliche Firebase Rules/
Firestore-Berechtigungen.

## 7. Deploy aus GitHub starten

Sobald der Code auf GitHub ist:

1. GitHub Repository oeffnen.
2. Reiter `Actions`.
3. Workflow `Deploy Firebase Hosting` oeffnen.
4. `Run workflow` klicken.
5. Branch `main` auswaehlen.
6. Warten, bis der Lauf gruen ist.

Danach findest du die Online-Adresse in Firebase unter `Hosting`, typischerweise:

```txt
https://deine-projekt-id.web.app
https://deine-projekt-id.firebaseapp.com
```

## 8. Spaetere Updates

Ab dann ist der Alltag einfach:

1. Wir bearbeiten hier im Projekt den Code.
2. Wir committen und pushen nach GitHub.
3. GitHub Actions baut automatisch.
4. Firebase Hosting veroeffentlicht automatisch.

## Fehlerhilfe

Wenn GitHub Actions rot wird:

- `npm ci` Fehler: `package-lock.json` fehlt oder passt nicht.
- `npm run build` Fehler: Code/TypeScript-Fehler im Projekt.
- Firebase Deploy Fehler: Service Account Secret `FIREBASE_SERVICE_ACCOUNT_BENGTSTOOLBOX` oder `FIREBASE_PROJECT_ID` fehlt.
- App online leer: Firebase Web-App-Secrets fehlen oder sind falsch.
- `auth/api-key-not-valid`: GitHub Secret enthaelt vermutlich `NAME = wert` statt nur `wert`.
- `Missing or insufficient permissions`: Firestore-Regeln sind nicht deployed oder Anonymous Auth ist deaktiviert.
