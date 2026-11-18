import { useRef, useState, useSyncExternalStore } from 'react'

import {
  editUnlockStorageKey,
  isAdminUnlocked,
  isEditPassword,
  setAdminUnlocked,
} from '@/apps/shared/adminUnlock'
import { SyncError, syncFailure } from '@/lib/firebase/syncError'
import { defaultLobby } from '@/lobbies/types'

/** Kennzeichnet eine Änderung, die mangels PIN nicht ausgeführt wurde; kein Anzeigefehler. */
export class EditLockedError extends SyncError {
  constructor() {
    super('Editing requires the PIN.', 'firestore', 'write', 'write-rejected', false)
  }
}

export function editLockedResult<T>(value: T) {
  return syncFailure(value, new EditLockedError())
}

export function isEditLocked(error: unknown) {
  return error instanceof EditLockedError
}

const listeners = new Set<() => void>()
// Ohne Session Storage bleibt die Freischaltung bis zum Neuladen der Seite erhalten.
let unlockedInMemory = false

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readUnlocked() {
  return unlockedInMemory || isAdminUnlocked(editUnlockStorageKey)
}

function markUnlocked() {
  unlockedInMemory = true
  setAdminUnlocked(editUnlockStorageKey, true)
  listeners.forEach((listener) => listener())
}

export type EditUnlock = {
  /** Änderungen sind ohne weitere PIN-Abfrage erlaubt. */
  isUnlocked: boolean
  /** Eine Änderung wartet gerade auf die PIN. */
  isPrompting: boolean
  /** Fragt bei Bedarf die PIN ab; liefert, ob danach geändert werden darf. */
  requestUnlock: () => Promise<boolean>
  /** Umhüllt eine Änderung: sofort oder erst nach richtiger PIN ausführen, sonst `lockedResult` liefern. */
  protect: <Args extends unknown[], T>(
    write: (...args: Args) => T | Promise<T>,
    lockedResult: T,
  ) => (...args: Args) => Promise<T>
  submit: (pin: string) => boolean
  cancel: () => void
}

/**
 * Schützt Änderungen am globalen Datensatz mit der Bearbeitungs-PIN; Lobby-Daten bleiben frei.
 * Die Freischaltung gilt für alle geschützten Apps bis zum Ende der Browser-Sitzung.
 */
export function useEditUnlock(lobbyId: string): EditUnlock {
  const isStoredUnlocked = useSyncExternalStore(subscribe, readUnlocked, () => false)
  const isUnlocked = lobbyId !== defaultLobby.id || isStoredUnlocked
  const [isPrompting, setIsPrompting] = useState(false)
  const waitingRef = useRef<Array<(unlocked: boolean) => void>>([])

  const settle = (unlocked: boolean) => {
    const waiting = waitingRef.current
    waitingRef.current = []
    setIsPrompting(false)
    waiting.forEach((resolve) => resolve(unlocked))
  }

  const requestUnlock = () => {
    if (isUnlocked || readUnlocked()) return Promise.resolve(true)
    setIsPrompting(true)
    return new Promise<boolean>((resolve) => {
      waitingRef.current.push(resolve)
    })
  }

  const protect = <Args extends unknown[], T>(
    write: (...args: Args) => T | Promise<T>,
    lockedResult: T,
  ) => (...args: Args) => {
    if (isUnlocked) return Promise.resolve(write(...args))
    return requestUnlock().then((unlocked) => (unlocked ? write(...args) : lockedResult))
  }

  const submit = (pin: string) => {
    if (!isEditPassword(pin)) return false
    markUnlocked()
    settle(true)
    return true
  }

  return {
    isUnlocked,
    isPrompting,
    protect,
    requestUnlock,
    submit,
    cancel: () => settle(false),
  }
}
