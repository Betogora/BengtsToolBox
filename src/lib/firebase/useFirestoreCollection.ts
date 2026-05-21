import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
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

type CollectionItem = DocumentData & {
  id: string
}

export function useFirestoreCollection<T extends CollectionItem>(
  path: string,
  initialValue: T[],
  orderField = 'position',
) {
  const localKey = useMemo(() => `app-hub:collection:${path}`, [path])
  const [data, setData] = useState<T[]>(() =>
    readLocalValue(localKey, initialValue),
  )
  const [isLoading, setIsLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const services = getFirebaseServices()

    if (!services) {
      return undefined
    }

    let unsubscribe: (() => void) | undefined
    let isActive = true

    ensureAnonymousUser()
      .then(() => {
        if (!isActive) {
          return
        }

        unsubscribe = onSnapshot(
          query(collection(services.db, path), orderBy(orderField)),
          (snapshot) => {
            const nextData = snapshot.docs.map(
              (entry) => ({ id: entry.id, ...entry.data() }) as T,
            )
            setData(nextData)
            writeLocalValue(localKey, nextData)
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
  }, [localKey, orderField, path])

  const setItem = useCallback(
    async (id: string, value: Omit<T, 'id'>) => {
      const nextData = [
        ...data.filter((item) => item.id !== id),
        { id, ...value } as T,
      ].sort((left, right) => Number(left[orderField]) - Number(right[orderField]))

      setData(nextData)
      writeLocalValue(localKey, nextData)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await setDoc(doc(services.db, path, id), {
        ...value,
        updatedAt: serverTimestamp(),
      })
    },
    [data, localKey, orderField, path],
  )

  const saveItems = useCallback(
    async (items: T[]) => {
      const nextData = [...items].sort(
        (left, right) => Number(left[orderField]) - Number(right[orderField]),
      )

      setData(nextData)
      writeLocalValue(localKey, nextData)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await Promise.all(
        nextData.map((item) => {
          const { id, ...value } = item

          return setDoc(doc(services.db, path, id), {
            ...value,
            updatedAt: serverTimestamp(),
          })
        }),
      )
    },
    [localKey, orderField, path],
  )

  const mergeItem = useCallback(
    async (id: string, value: Partial<T>) => {
      const nextData = data.map((item) =>
        item.id === id ? ({ ...item, ...value } as T) : item,
      )
      setData(nextData)
      writeLocalValue(localKey, nextData)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await setDoc(
        doc(services.db, path, id),
        { ...value, updatedAt: serverTimestamp() },
        { merge: true },
      )
    },
    [data, localKey, path],
  )

  const deleteItem = useCallback(
    async (id: string) => {
      const nextData = data.filter((item) => item.id !== id)
      setData(nextData)
      writeLocalValue(localKey, nextData)

      const services = getFirebaseServices()

      if (!services) {
        return
      }

      await ensureAnonymousUser()
      await deleteDoc(doc(services.db, path, id))
    },
    [data, localKey, path],
  )

  return {
    data,
    deleteItem,
    error,
    isLoading,
    isRealtime: isFirebaseConfigured,
    mergeItem,
    saveItems,
    setItem,
  }
}
