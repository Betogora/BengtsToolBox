import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  type SyncRemoteWriter,
} from '@/lib/firebase/syncBatch'
import {
  SyncError,
  createSyncError,
  currentSyncError,
  syncFailure,
  type SyncErrors,
  type SyncErrorSource,
  type SyncResult,
} from '@/lib/firebase/syncError'
import {
  OptimisticState,
  commitOptimisticMutation,
} from '@/lib/firebase/syncMutation'

export type CollectionItem = DocumentData & {
  id: string
}

type SyncCollectionAction<Args extends unknown[]> = {
  (...args: Args): Promise<SyncResult<void>>
  (...args: [...Args, batch: SyncBatch]): void
}

export type SyncedCollectionResult<T extends CollectionItem> = {
  data: T[]
  clearItems: SyncCollectionAction<[]>
  deleteItem: SyncCollectionAction<[id: string]>
  deleteItems: SyncCollectionAction<[ids: string[]]>
  error: SyncError | null
  isLoading: boolean
  hasServerSnapshot: boolean
  isPending: boolean
  isRealtime: boolean
  mergeItem: SyncCollectionAction<[id: string, value: Partial<T> | ((current: T) => Partial<T>)]>
  saveItems: SyncCollectionAction<[items: T[] | ((current: T[]) => T[])]>
  setItem: SyncCollectionAction<[id: string, value: Omit<T, 'id'>]>
}

const maxBatchWrites = 500

function batchLimitError() {
  return new SyncError(
    'The requested operation exceeds the Firestore batch limit.',
    'firestore',
    'batch',
    'too-many-writes',
    false,
  )
}

export function useFirestoreCollection<T extends CollectionItem>(
  path: string,
  initialValue: T[],
  orderField = 'position',
): SyncedCollectionResult<T> {
  const localKey = useMemo(() => `app-hub:collection:${path}`, [path])
  const sortItems = useCallback(
    (items: T[]) =>
      [...items].sort(
        (left, right) => Number(left[orderField]) - Number(right[orderField]),
      ),
    [orderField],
  )
  const [localValue] = useState(() => {
    const result = readLocalValue(localKey, initialValue)
    return { ...result, value: sortItems(result.value) }
  })
  const [optimisticState] = useState(
    () => new OptimisticState(localValue.value),
  )
  const [data, setData] = useState<T[]>(localValue.value)
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [hasServerSnapshot, setHasServerSnapshot] = useState(!isFirebaseConfigured)
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

  const publish = useCallback((value: T[], pending: boolean) => {
    setData(value)
    setIsPending(pending)
  }, [])

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    let unsubscribe: (() => void) | undefined
    let isActive = true

    ensureAnonymousUser()
      .then(() => {
        if (!isActive) return

        setSyncError('auth', null)
        unsubscribe = onSnapshot(
          query(collection(services.db, path), orderBy(orderField)),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (snapshot.empty && snapshot.metadata.fromCache) {
              setIsLoading(false)
              return
            }
            const hasPendingWrites = snapshot.metadata.hasPendingWrites
            if (!snapshot.metadata.fromCache && !hasPendingWrites) setHasServerSnapshot(true)
            const nextData = sortItems(
              snapshot.docs.map(
                (entry) => ({ id: entry.id, ...entry.data() }) as T,
              ),
            )
            optimisticState.acceptSnapshot(nextData, hasPendingWrites)

            if (!hasPendingWrites) {
              const cacheResult = writeLocalValue(localKey, optimisticState.value)
              setSyncError(
                'local-storage',
                cacheResult.ok ? null : cacheResult.error,
              )
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
  }, [localKey, optimisticState, orderField, path, publish, setSyncError, sortItems])

  const authenticate = useCallback(async () => {
    try {
      await ensureAnonymousUser()
    } catch (error) {
      throw createSyncError(error, 'auth', 'save-items')
    }
  }, [])

  const commit = useCallback(
    (
      apply: (value: T[]) => T[],
      persistRemote: (() => Promise<void>) | undefined,
    ) =>
      commitOptimisticMutation({
        state: optimisticState,
        apply: (value) => sortItems(apply(value)),
        isRealtime: isFirebaseConfigured,
        persistLocal: (value) => writeLocalValue(localKey, value),
        readLocal: () => readLocalValue(localKey, optimisticState.value),
        persistRemote,
        publish,
        setError: setSyncError,
      }),
    [localKey, optimisticState, publish, setSyncError, sortItems],
  )

  const stageOrCommit = useCallback(
    (
      apply: (value: T[]) => T[],
      persistRemote: () => Promise<void>,
      stageRemote: (batch: SyncRemoteWriter, db: Firestore) => void,
      writeCount: number,
      batch?: SyncBatch,
      readRemote?: (transaction: Transaction, db: Firestore) => Promise<void>,
    ) => {
      if (batch) {
        stageSyncMutation(batch, {
          state: optimisticState,
          apply: (value) => sortItems(apply(value)),
          isRealtime: isFirebaseConfigured,
          persistLocal: (value) => writeLocalValue(localKey, value),
          readLocal: () => readLocalValue(localKey, optimisticState.value),
          readLocalRaw: () => readLocalRaw(localKey),
          restoreLocalRaw: (value) => restoreLocalRaw(localKey, value),
          publish,
          setError: setSyncError,
          readRemote,
          stageRemote,
          writeCount,
        })
        return undefined
      }

      return commit(apply, readRemote ? async () => {
        const services = getFirebaseServices()
        if (!services) return
        await authenticate()
        try {
          await runTransaction(services.db, async (transaction) => {
            await readRemote(transaction, services.db)
            stageRemote(transaction, services.db)
          })
        } catch (error) {
          throw createSyncError(error, 'firestore', 'merge-item')
        }
      } : persistRemote)
    },
    [authenticate, commit, localKey, optimisticState, publish, setSyncError, sortItems],
  )

  const rejectOversizedBatch = useCallback(() => {
    const error = batchLimitError()
    setSyncError('firestore', error)
    return Promise.resolve(syncFailure(undefined, error))
  }, [setSyncError])

  const setItem = useCallback(
    (id: string, value: Omit<T, 'id'>, batch?: SyncBatch) =>
      stageOrCommit(
        (items) => [
          ...items.filter((item) => item.id !== id),
          { id, ...value } as T,
        ],
        async () => {
          const services = getFirebaseServices()
          if (!services) return
          await authenticate()
          try {
            await setDoc(doc(services.db, path, id), {
              ...value,
              updatedAt: serverTimestamp(),
            })
          } catch (error) {
            throw createSyncError(error, 'firestore', 'set-item')
          }
        },
        (remoteBatch, db) => {
          remoteBatch.set(doc(db, path, id), {
            ...value,
            updatedAt: serverTimestamp(),
          })
        },
        1,
        batch,
      ),
    [authenticate, path, stageOrCommit],
  ) as SyncedCollectionResult<T>['setItem']

  const saveItems = useCallback(
    (items: T[] | ((current: T[]) => T[]), batchToken?: SyncBatch) => {
      const resolve = (current: T[]) => typeof items === 'function' ? items(current) : items
      const apply = (current: T[]) => {
        try {
          return resolve(current)
        } catch {
          // A changed server basis may invalidate the pending action; the transaction will report it.
          return current
        }
      }
      let nextData = resolve(optimisticState.value)
      let nextIds = new Set(nextData.map((item) => item.id))
      let idsToDelete = data
        .filter((item) => !nextIds.has(item.id))
        .map((item) => item.id)
      const writeCount = nextData.length + idsToDelete.length
      const readRemote = typeof items === 'function'
        ? async (transaction: Transaction, db: Firestore) => {
            const ids = [...new Set([...data.map((item) => item.id), ...nextIds])]
            const snapshots = await Promise.all(ids.map((id) => transaction.get(doc(db, path, id))))
            const current = snapshots.flatMap((snapshot) => snapshot.exists()
              ? [{ ...snapshot.data(), id: snapshot.id } as T] : [])
            nextData = resolve(current)
            nextIds = new Set(nextData.map((item) => item.id))
            idsToDelete = current.filter((item) => !nextIds.has(item.id)).map((item) => item.id)
          }
        : undefined
      if (!batchToken && isFirebaseConfigured && writeCount > maxBatchWrites) {
        return rejectOversizedBatch()
      }

      return stageOrCommit(
        apply,
        async () => {
          const services = getFirebaseServices()
          if (!services) return
          await authenticate()
          try {
            const batch = writeBatch(services.db)
            for (const id of idsToDelete) {
              batch.delete(doc(services.db, path, id))
            }
            for (const item of nextData) {
              const { id, ...value } = item
              batch.set(doc(services.db, path, id), {
                ...value,
                updatedAt: serverTimestamp(),
              })
            }
            await batch.commit()
          } catch (error) {
            throw createSyncError(error, 'firestore', 'save-items')
          }
        },
        (remoteBatch, db) => {
          for (const id of idsToDelete) {
            remoteBatch.delete(doc(db, path, id))
          }
          for (const item of nextData) {
            const { id, ...value } = item
            remoteBatch.set(doc(db, path, id), {
              ...value,
              updatedAt: serverTimestamp(),
            })
          }
        },
        writeCount,
        batchToken,
        readRemote,
      )
    },
    [authenticate, data, optimisticState, path, rejectOversizedBatch, stageOrCommit],
  ) as SyncedCollectionResult<T>['saveItems']

  const clearItems = useCallback((batchToken?: SyncBatch) => {
    const currentData = data
    if (!batchToken && isFirebaseConfigured && currentData.length > maxBatchWrites) {
      return rejectOversizedBatch()
    }

    return stageOrCommit(
      () => [],
      async () => {
        const services = getFirebaseServices()
        if (!services) return
        await authenticate()
        try {
          const batch = writeBatch(services.db)
          for (const item of currentData) {
            batch.delete(doc(services.db, path, item.id))
          }
          await batch.commit()
        } catch (error) {
          throw createSyncError(error, 'firestore', 'clear-items')
        }
      },
      (remoteBatch, db) => {
        for (const item of currentData) {
          remoteBatch.delete(doc(db, path, item.id))
        }
      },
      currentData.length,
      batchToken,
    )
  }, [authenticate, data, path, rejectOversizedBatch, stageOrCommit]) as SyncedCollectionResult<T>['clearItems']

  const mergeItem = useCallback(
    (id: string, value: Partial<T> | ((current: T) => Partial<T>), batch?: SyncBatch) => {
      const resolve = (current: T) => typeof value === 'function' ? value(current) : value
      let remoteValue: Partial<T>
      const readRemote = typeof value === 'function'
        ? async (transaction: Transaction, db: Firestore) => {
            const snapshot = await transaction.get(doc(db, path, id))
            if (!snapshot.exists()) throw new Error('The collection item no longer exists.')
            remoteValue = value({ ...snapshot.data(), id } as T)
          }
        : undefined
      return stageOrCommit(
        (items) =>
          items.map((item) =>
            item.id === id ? ({ ...item, ...resolve(item) } as T) : item,
          ),
        async () => {
          const services = getFirebaseServices()
          if (!services) return
          await authenticate()
          try {
            await setDoc(
              doc(services.db, path, id),
              { ...value, updatedAt: serverTimestamp() },
              { merge: true },
            )
          } catch (error) {
            throw createSyncError(error, 'firestore', 'merge-item')
          }
        },
        (remoteBatch, db) => {
          remoteBatch.set(
            doc(db, path, id),
            { ...(readRemote ? remoteValue : value), updatedAt: serverTimestamp() },
            { merge: true },
          )
        },
        1,
        batch,
        readRemote,
      )
    },
    [authenticate, path, stageOrCommit],
  ) as SyncedCollectionResult<T>['mergeItem']

  const deleteItem = useCallback(
    (id: string, batch?: SyncBatch) =>
      stageOrCommit(
        (items) => items.filter((item) => item.id !== id),
        async () => {
          const services = getFirebaseServices()
          if (!services) return
          await authenticate()
          try {
            await deleteDoc(doc(services.db, path, id))
          } catch (error) {
            throw createSyncError(error, 'firestore', 'delete-item')
          }
        },
        (remoteBatch, db) => remoteBatch.delete(doc(db, path, id)),
        1,
        batch,
      ),
    [authenticate, path, stageOrCommit],
  ) as SyncedCollectionResult<T>['deleteItem']

  const deleteItems = useCallback(
    (ids: string[], batchToken?: SyncBatch) => {
      const idsToDelete = new Set(ids)
      if (idsToDelete.size === 0) {
        return batchToken
          ? undefined
          : Promise.resolve({ ok: true, value: undefined, error: null } as const)
      }
      if (!batchToken && isFirebaseConfigured && idsToDelete.size > maxBatchWrites) {
        return rejectOversizedBatch()
      }

      return stageOrCommit(
        (items) => items.filter((item) => !idsToDelete.has(item.id)),
        async () => {
          const services = getFirebaseServices()
          if (!services) return
          await authenticate()
          try {
            const batch = writeBatch(services.db)
            for (const id of idsToDelete) {
              batch.delete(doc(services.db, path, id))
            }
            await batch.commit()
          } catch (error) {
            throw createSyncError(error, 'firestore', 'delete-items')
          }
        },
        (remoteBatch, db) => {
          for (const id of idsToDelete) {
            remoteBatch.delete(doc(db, path, id))
          }
        },
        idsToDelete.size,
        batchToken,
      )
    },
    [authenticate, path, rejectOversizedBatch, stageOrCommit],
  ) as SyncedCollectionResult<T>['deleteItems']

  return {
    data,
    clearItems,
    deleteItem,
    deleteItems,
    error: currentSyncError(errors),
    isLoading,
    hasServerSnapshot,
    isPending,
    isRealtime: isFirebaseConfigured,
    mergeItem,
    saveItems,
    setItem,
  }
}
