import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  DiagnosticCheck,
  DiagnosticHealth,
  DiagnosticStatus,
} from '@/apps/diagnostics/types'
import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'

const localStorageKey = 'bengtstoolbox:diagnostics:fallback'

function createRunId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeCheck(
  id: string,
  label: string,
  status: DiagnosticStatus,
  detail: string,
): DiagnosticCheck {
  return { id, label, status, detail }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unbekannter Fehler'
}

export function useDiagnostics() {
  const [authUid, setAuthUid] = useState<string | null>(null)
  const [health, setHealth] = useState<DiagnosticHealth | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [checks, setChecks] = useState<DiagnosticCheck[]>(() => [
    makeCheck(
      'config',
      'Firebase Config',
      isFirebaseConfigured ? 'ok' : 'warn',
      isFirebaseConfigured
        ? 'Vite-Konfiguration ist vorhanden.'
        : 'Firebase-Variablen fehlen; die Apps laufen lokal im Demo-Modus.',
    ),
    makeCheck(
      'auth',
      'Anonymous Auth',
      isFirebaseConfigured ? 'pending' : 'warn',
      isFirebaseConfigured
        ? 'Wartet auf anonymen Login.'
        : 'Ohne Firebase Config wird kein Login versucht.',
    ),
    makeCheck(
      'firestore-read',
      'Firestore Lesen',
      isFirebaseConfigured ? 'pending' : 'warn',
      isFirebaseConfigured
        ? 'Wartet auf Lesetest.'
        : 'Lesetest im Demo-Modus uebersprungen.',
    ),
    makeCheck(
      'firestore-write',
      'Firestore Schreiben',
      isFirebaseConfigured ? 'pending' : 'warn',
      isFirebaseConfigured
        ? 'Wartet auf Schreibtest.'
        : 'Schreibtest im Demo-Modus uebersprungen.',
    ),
    makeCheck(
      'realtime',
      'Realtime Snapshot',
      isFirebaseConfigured ? 'pending' : 'warn',
      isFirebaseConfigured
        ? 'Wartet auf Snapshot-Update.'
        : 'Realtime-Test im Demo-Modus uebersprungen.',
    ),
    makeCheck(
      'local-fallback',
      'LocalStorage Fallback',
      'pending',
      'Wartet auf lokalen Speichertest.',
    ),
  ])

  const healthPath = useMemo(() => firebasePaths.diagnosticsHealth(), [])

  const updateCheck = useCallback((nextCheck: DiagnosticCheck) => {
    setChecks((currentChecks) =>
      currentChecks.map((check) =>
        check.id === nextCheck.id ? nextCheck : check,
      ),
    )
  }, [])

  const runChecks = useCallback(async () => {
    setIsRunning(true)

    updateCheck(
      makeCheck(
        'config',
        'Firebase Config',
        isFirebaseConfigured ? 'ok' : 'warn',
        isFirebaseConfigured
          ? 'Vite-Konfiguration ist vorhanden.'
          : 'Firebase-Variablen fehlen; die Apps laufen lokal im Demo-Modus.',
      ),
    )

    try {
      const value = JSON.stringify({ checkedAt: new Date().toISOString() })
      localStorage.setItem(localStorageKey, value)
      const storedValue = localStorage.getItem(localStorageKey)

      updateCheck(
        makeCheck(
          'local-fallback',
          'LocalStorage Fallback',
          storedValue === value ? 'ok' : 'error',
          storedValue === value
            ? 'Lokaler Fallback kann Werte speichern und lesen.'
            : 'LocalStorage hat den Testwert nicht korrekt zurueckgegeben.',
        ),
      )
    } catch (error) {
      updateCheck(
        makeCheck(
          'local-fallback',
          'LocalStorage Fallback',
          'error',
          getErrorMessage(error),
        ),
      )
    }

    const services = getFirebaseServices()

    if (!services) {
      setIsRunning(false)
      return
    }

    try {
      const user = await ensureAnonymousUser()

      if (!user) {
        throw new Error('Anonymous Auth lieferte keinen Nutzer.')
      }

      setAuthUid(user.uid)
      updateCheck(
        makeCheck(
          'auth',
          'Anonymous Auth',
          'ok',
          `Angemeldet als ${user.uid.slice(0, 8)}...`,
        ),
      )

      const reference = doc(services.db, healthPath)
      const snapshotBeforeWrite = await getDoc(reference)

      updateCheck(
        makeCheck(
          'firestore-read',
          'Firestore Lesen',
          'ok',
          snapshotBeforeWrite.exists()
            ? 'Diagnose-Dokument konnte gelesen werden.'
            : 'Pfad ist erreichbar; Diagnose-Dokument wird beim Schreibtest angelegt.',
        ),
      )

      const previousWriteCount = snapshotBeforeWrite.exists()
        ? Number(snapshotBeforeWrite.data().writeCount ?? 0)
        : 0
      const nextHealth: DiagnosticHealth = {
        checkedAt: new Date().toISOString(),
        message: 'BengtsToolBox diagnostics healthy',
        runId: createRunId(),
        updatedBy: user.uid,
        writeCount: previousWriteCount + 1,
      }

      await setDoc(reference, {
        ...nextHealth,
        updatedAt: serverTimestamp(),
      })

      updateCheck(
        makeCheck(
          'firestore-write',
          'Firestore Schreiben',
          'ok',
          `Testwert ${nextHealth.writeCount} wurde gespeichert.`,
        ),
      )
    } catch (error) {
      const message = getErrorMessage(error)
      updateCheck(makeCheck('auth', 'Anonymous Auth', 'error', message))
      updateCheck(
        makeCheck('firestore-read', 'Firestore Lesen', 'error', message),
      )
      updateCheck(
        makeCheck('firestore-write', 'Firestore Schreiben', 'error', message),
      )
    } finally {
      setIsRunning(false)
    }
  }, [healthPath, updateCheck])

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    const unsubscribe = onSnapshot(
      doc(services.db, healthPath),
      (snapshot) => {
        if (!snapshot.exists()) {
          return
        }

        const nextHealth = snapshot.data() as DiagnosticHealth
        setHealth(nextHealth)
        updateCheck(
          makeCheck(
            'realtime',
            'Realtime Snapshot',
            'ok',
            `Letztes Update ${nextHealth.checkedAt}, Zaehler ${nextHealth.writeCount}.`,
          ),
        )
      },
      (error) => {
        updateCheck(
          makeCheck(
            'realtime',
            'Realtime Snapshot',
            'error',
            getErrorMessage(error),
          ),
        )
      },
    )

    return unsubscribe
  }, [healthPath, updateCheck])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runChecks()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [runChecks])

  const status = checks.some((check) => check.status === 'error')
    ? 'error'
    : checks.some((check) => check.status === 'pending')
      ? 'pending'
      : checks.some((check) => check.status === 'warn')
        ? 'warn'
        : 'ok'

  return {
    authUid,
    checks,
    health,
    healthPath,
    isRunning,
    runChecks,
    status,
  }
}
