import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

type FirebaseServices = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let services: FirebaseServices | null = null
let anonymousSignInPromise: Promise<User> | null = null

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

export function getFirebaseServices(): FirebaseServices | null {
  if (!isFirebaseConfigured) {
    return null
  }

  if (!services) {
    const app = initializeApp(firebaseConfig)
    services = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
    }
  }

  return services
}

export function ensureAnonymousUser(): Promise<User | null> {
  const activeServices = getFirebaseServices()

  if (!activeServices) {
    return Promise.resolve(null)
  }

  if (activeServices.auth.currentUser) {
    return Promise.resolve(activeServices.auth.currentUser)
  }

  if (!anonymousSignInPromise) {
    const signInPromise = signInAnonymously(activeServices.auth).then(
      (credential) => credential.user,
    )
    anonymousSignInPromise = signInPromise
    void signInPromise.catch(() => {
      if (anonymousSignInPromise === signInPromise) {
        anonymousSignInPromise = null
      }
    })
  }

  return anonymousSignInPromise
}
