import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import { readLocalValue, writeLocalValue } from '@/lib/firebase/localStore'

type SyncedDocResult<T extends DocumentData> = {
  data: T
  isLoading: boolean
  error: Error | null
  save: (nextValue: T) => Promise<void>
  merge: (partialValue: Partial<T>) => Promise<void>
  isRealtime: boolean
}

export function useFirestoreDoc<T extends DocumentData>(
  path: string,
  initialValue: T,
): SyncedDocResult<T> {
  const localKey = useMemo(() => `app-hub:doc:${path}`, [path])
  const [data, setData] = useState<T>(() =>
    readLocalValue(localKey, initialValue),
  )
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    let isActive = true
    let unsubscribe: (() => void) | undefined
    const reference = doc(services.db, path)

    ensureAnonymousUser()
      .then(() => {
        if (!isActive) {
          return
        }

        unsubscribe = onSnapshot(
          reference,
          (snapshot) => {
            if (snapshot.exists()) {
              const nextData = snapshot.data() as T
              setData(nextData)
              writeLocalValue(localKey, nextData)
            } else {
              setDoc(reference, {
                ...initialValue,
                updatedAt: serverTimestamp(),
              })
            }

            setIsLoading(false)
          },
          (snapshotError) => {
            setError(snapshotError)
            setIsLoading(false)
          },
        )
      })
      .catch((signInError: Error) => {
        setError(signInError)
        setIsLoading(false)
      })

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [initialValue, localKey, path])

  const save = useCallback(
    async (nextValue: T) => {
      setData(nextValue)
      writeLocalValue(localKey, nextValue)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await setDoc(doc(services.db, path), {
        ...nextValue,
        updatedAt: serverTimestamp(),
      })
    },
    [localKey, path],
  )

  const merge = useCallback(
    async (partialValue: Partial<T>) => {
      const nextValue = { ...data, ...partialValue } as T
      setData(nextValue)
      writeLocalValue(localKey, nextValue)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await setDoc(
        doc(services.db, path),
        { ...partialValue, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [data, localKey, path],
  )

  return {
    data,
    isLoading,
    error,
    save,
    merge,
    isRealtime: isFirebaseConfigured,
  }
}
