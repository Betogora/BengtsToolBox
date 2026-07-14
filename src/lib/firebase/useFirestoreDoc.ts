import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ensureAnonymousUser,
  getFirebaseServices,
  isFirebaseConfigured,
} from '@/lib/firebase/client'
import {
  readLocalRaw,
  readLocalValue,
  restoreLocalRaw,
  writeLocalValue,
} from '@/lib/firebase/localStore'
import {
  stageSyncMutation,
  type SyncBatch,
} from '@/lib/firebase/syncBatch'
import {
  createSyncError,
  currentSyncError,
  type SyncError,
  type SyncErrors,
  type SyncErrorSource,
  type SyncResult,
} from '@/lib/firebase/syncError'
import {
  OptimisticState,
  commitOptimisticMutation,
} from '@/lib/firebase/syncMutation'

export type SyncedDocResult<T extends DocumentData> = {
  data: T
  isLoading: boolean
  isPending: boolean
  error: SyncError | null
  save: {
    (nextValue: T): Promise<SyncResult<void>>
    (nextValue: T, batch: SyncBatch): void
  }
  merge: {
    (partialValue: Partial<T>): Promise<SyncResult<void>>
    (partialValue: Partial<T>, batch: SyncBatch): void
  }
  isRealtime: boolean
}

export function useFirestoreDoc<T extends DocumentData>(
  path: string,
  initialValue: T,
): SyncedDocResult<T> {
  const initialValueRef = useRef(initialValue)
  const localKey = useMemo(() => `app-hub:doc:${path}`, [path])
  const [localValue] = useState(() => readLocalValue(localKey, initialValue))
  const [optimisticState] = useState(
    () => new OptimisticState(localValue.value),
  )
  const [data, setData] = useState<T>(localValue.value)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [isPending, setIsPending] = useState(false)
  const [errors, setErrors] = useState<SyncErrors>(() =>
    localValue.ok ? {} : { 'local-storage': localValue.error },
  )

  const setSyncError = useCallback(
    (source: SyncErrorSource, error: SyncError | null) => {
      setErrors((current) => {
        if (error) return { ...current, [source]: error }

        const next = { ...current }
        delete next[source]
        return next
      })
    },
    [],
  )

  const publish = useCallback((value: T, pending: boolean) => {
    setData(value)
    setIsPending(pending)
  }, [])

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
        if (!isActive) return

        setSyncError('auth', null)
        unsubscribe = onSnapshot(
          reference,
          { includeMetadataChanges: true },
          (snapshot) => {
            const hasPendingWrites = snapshot.metadata.hasPendingWrites

            if (snapshot.exists()) {
              const nextData = snapshot.data() as T
              optimisticState.acceptSnapshot(nextData, hasPendingWrites)

              if (!hasPendingWrites) {
                const cacheResult = writeLocalValue(localKey, nextData)
                setSyncError(
                  'local-storage',
                  cacheResult.ok ? null : cacheResult.error,
                )
              }
            } else if (!hasPendingWrites) {
              const cacheResult = writeLocalValue(localKey, initialValueRef.current)
              setSyncError(
                'local-storage',
                cacheResult.ok ? null : cacheResult.error,
              )

              void setDoc(reference, {
                ...initialValueRef.current,
                updatedAt: serverTimestamp(),
              }).catch((error: unknown) => {
                setSyncError(
                  'firestore',
                  createSyncError(error, 'firestore', 'save'),
                )
              })
            }

            publish(optimisticState.value, optimisticState.isPending)
            setSyncError('snapshot', null)
            setIsLoading(false)
          },
          (error) => {
            setSyncError(
              'snapshot',
              createSyncError(error, 'snapshot', 'subscribe'),
            )
            setIsLoading(false)
          },
        )
      })
      .catch((error: unknown) => {
        setSyncError('auth', createSyncError(error, 'auth', 'subscribe'))
        setIsLoading(false)
      })

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [localKey, optimisticState, path, publish, setSyncError])

  const authenticate = useCallback(async () => {
    try {
      await ensureAnonymousUser()
    } catch (error) {
      throw createSyncError(error, 'auth', 'save')
    }
  }, [])

  const save = useCallback(
    (nextValue: T, batch?: SyncBatch) => {
      const apply = () => nextValue
      const persistLocal = (value: T) => writeLocalValue(localKey, value)

      if (batch) {
        stageSyncMutation(batch, {
          state: optimisticState,
          apply,
          isRealtime: isFirebaseConfigured,
          persistLocal,
          readLocal: () => readLocalValue(localKey, optimisticState.value),
          readLocalRaw: () => readLocalRaw(localKey),
          restoreLocalRaw: (value) => restoreLocalRaw(localKey, value),
          publish,
          setError: setSyncError,
          stageRemote: (remoteBatch, db) => {
            remoteBatch.set(doc(db, path), {
              ...nextValue,
              updatedAt: serverTimestamp(),
            })
          },
          writeCount: 1,
        })
        return undefined
      }

      return commitOptimisticMutation({
        state: optimisticState,
        apply,
        isRealtime: isFirebaseConfigured,
        persistLocal,
        readLocal: () => readLocalValue(localKey, optimisticState.value),
        persistRemote: async () => {
          const services = getFirebaseServices()
          if (!services) return

          await authenticate()
          try {
            await setDoc(doc(services.db, path), {
              ...nextValue,
              updatedAt: serverTimestamp(),
            })
          } catch (error) {
            throw createSyncError(error, 'firestore', 'save')
          }
        },
        publish,
        setError: setSyncError,
      })
    },
    [authenticate, localKey, optimisticState, path, publish, setSyncError],
  ) as SyncedDocResult<T>['save']

  const merge = useCallback(
    (partialValue: Partial<T>, batch?: SyncBatch) => {
      const apply = (value: T) => ({ ...value, ...partialValue }) as T
      const persistLocal = (value: T) => writeLocalValue(localKey, value)

      if (batch) {
        stageSyncMutation(batch, {
          state: optimisticState,
          apply,
          isRealtime: isFirebaseConfigured,
          persistLocal,
          readLocal: () => readLocalValue(localKey, optimisticState.value),
          readLocalRaw: () => readLocalRaw(localKey),
          restoreLocalRaw: (value) => restoreLocalRaw(localKey, value),
          publish,
          setError: setSyncError,
          stageRemote: (remoteBatch, db) => {
            remoteBatch.set(
              doc(db, path),
              { ...partialValue, updatedAt: serverTimestamp() },
              { merge: true },
            )
          },
          writeCount: 1,
        })
        return undefined
      }

      return commitOptimisticMutation({
        state: optimisticState,
        apply,
        isRealtime: isFirebaseConfigured,
        persistLocal,
        readLocal: () => readLocalValue(localKey, optimisticState.value),
        persistRemote: async () => {
          const services = getFirebaseServices()
          if (!services) return

          await authenticate()
          try {
            await setDoc(
              doc(services.db, path),
              { ...partialValue, updatedAt: serverTimestamp() },
              { merge: true },
            )
          } catch (error) {
            throw createSyncError(error, 'firestore', 'merge')
          }
        },
        publish,
        setError: setSyncError,
      })
    },
    [authenticate, localKey, optimisticState, path, publish, setSyncError],
  ) as SyncedDocResult<T>['merge']

  return {
    data,
    isLoading,
    isPending,
    error: currentSyncError(errors),
    save,
    merge,
    isRealtime: isFirebaseConfigured,
  }
}
