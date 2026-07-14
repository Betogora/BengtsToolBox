import {
  createStorageError,
  syncFailure,
  syncSuccess,
  type SyncResult,
} from '@/lib/firebase/syncError'

type StorageProvider = () => Storage
type IdFactory = () => string

export type LocalStore = {
  read: <T>(key: string, fallback: T) => SyncResult<T>
  write: <T>(key: string, value: T) => SyncResult<void>
  remove: (key: string) => SyncResult<void>
  getOrCreateId: (key: string) => SyncResult<string>
  readRaw: (key: string) => SyncResult<string | null>
  restoreRaw: (key: string, value: string | null) => SyncResult<void>
  readText: (key: string, fallback: string) => SyncResult<string>
  writeText: (key: string, value: string) => SyncResult<void>
}

function defaultIdFactory() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createLocalStore(
  getStorage: StorageProvider = () => window.localStorage,
  createId: IdFactory = defaultIdFactory,
): LocalStore {
  const memoryIds = new Map<string, string>()

  const fallbackId = (key: string) => {
    const existing = memoryIds.get(key)

    if (existing) {
      return syncSuccess(existing)
    }

    try {
      const id = createId()
      memoryIds.set(key, id)
      return syncSuccess(id)
    } catch (error) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      memoryIds.set(key, id)
      return syncFailure(id, createStorageError(error, 'create-id'))
    }
  }

  return {
    read<T>(key: string, fallback: T) {
      try {
        const raw = getStorage().getItem(key)
        return syncSuccess(raw ? (JSON.parse(raw) as T) : fallback)
      } catch (error) {
        return syncFailure(fallback, createStorageError(error, 'read'))
      }
    },

    write<T>(key: string, value: T) {
      try {
        const serialized = JSON.stringify(value)
        getStorage().setItem(key, serialized)
        return syncSuccess(undefined)
      } catch (error) {
        return syncFailure(undefined, createStorageError(error, 'write'))
      }
    },

    remove(key: string) {
      try {
        getStorage().removeItem(key)
        return syncSuccess(undefined)
      } catch (error) {
        return syncFailure(undefined, createStorageError(error, 'remove'))
      }
    },

    getOrCreateId(key: string) {
      try {
        const existing = getStorage().getItem(key)

        if (existing) {
          memoryIds.set(key, existing)
          return syncSuccess(existing)
        }
      } catch (error) {
        const fallback = fallbackId(key)
        return syncFailure(
          fallback.value,
          fallback.ok ? createStorageError(error, 'read') : fallback.error,
        )
      }

      const generated = fallbackId(key)

      if (!generated.ok) {
        return generated
      }

      try {
        getStorage().setItem(key, generated.value)
        return generated
      } catch (error) {
        return syncFailure(
          generated.value,
          createStorageError(error, 'write'),
        )
      }
    },

    readRaw(key: string) {
      try {
        return syncSuccess(getStorage().getItem(key))
      } catch (error) {
        return syncFailure(null, createStorageError(error, 'read'))
      }
    },

    restoreRaw(key: string, value: string | null) {
      try {
        if (value === null) {
          getStorage().removeItem(key)
        } else {
          getStorage().setItem(key, value)
        }
        return syncSuccess(undefined)
      } catch (error) {
        return syncFailure(
          undefined,
          createStorageError(error, value === null ? 'remove' : 'write'),
        )
      }
    },

    readText(key: string, fallback: string) {
      try {
        return syncSuccess(getStorage().getItem(key) ?? fallback)
      } catch (error) {
        return syncFailure(fallback, createStorageError(error, 'read'))
      }
    },

    writeText(key: string, value: string) {
      try {
        getStorage().setItem(key, value)
        return syncSuccess(undefined)
      } catch (error) {
        return syncFailure(undefined, createStorageError(error, 'write'))
      }
    },
  }
}

export const localStore = createLocalStore()

export const readLocalValue = localStore.read
export const writeLocalValue = localStore.write
export const removeLocalValue = localStore.remove
export const getOrCreateLocalId = localStore.getOrCreateId
export const readLocalRaw = localStore.readRaw
export const restoreLocalRaw = localStore.restoreRaw
