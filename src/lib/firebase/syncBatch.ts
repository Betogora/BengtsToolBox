import {
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'

import {
  ensureAnonymousUser,
  getFirebaseServices,
} from '@/lib/firebase/client'
import {
  SyncError,
  createSyncError,
  syncFailure,
  syncSuccess,
  type SyncErrorSource,
  type SyncResult,
} from '@/lib/firebase/syncError'
import type { OptimisticState } from '@/lib/firebase/syncMutation'

const syncBatchBrand = Symbol('SyncBatch')
const maxBatchWrites = 500

type StagedMutation<T = unknown> = {
  state: OptimisticState<T>
  apply: (value: T) => T
  isRealtime: boolean
  persistLocal: (value: T) => SyncResult<void>
  readLocal: () => SyncResult<T>
  readLocalRaw: () => SyncResult<string | null>
  restoreLocalRaw: (value: string | null) => SyncResult<void>
  publish: (value: T, isPending: boolean) => void
  setError: (source: SyncErrorSource, error: SyncError | null) => void
  stageRemote: (batch: WriteBatch, db: Firestore) => void
  writeCount: number
}

export type SyncBatch = {
  readonly [syncBatchBrand]: true
}

const batchOperations = new WeakMap<SyncBatch, StagedMutation[]>()

function createBatch(): SyncBatch {
  const batch: SyncBatch = { [syncBatchBrand]: true }
  batchOperations.set(batch, [])
  return batch
}

export function stageSyncMutation<T>(
  batch: SyncBatch,
  operation: StagedMutation<T>,
) {
  const operations = batchOperations.get(batch)
  if (!operations) throw new Error('The sync batch token is invalid.')
  operations.push(operation as StagedMutation)
}

function rollbackError(cause: unknown) {
  return new SyncError(
    'The local state could not be restored completely.',
    'local-storage',
    'rollback',
    'rollback-failed',
    false,
    cause,
  )
}

function restoreOperations(
  operations: StagedMutation[],
  mutationIds: number[],
  rawValues?: Array<string | null>,
) {
  let firstError: SyncError | null = null

  operations.forEach((operation, index) => {
    operation.state.reject(mutationIds[index])
    const rollbackResult = rawValues
      ? operation.restoreLocalRaw(rawValues[index])
      : operation.persistLocal(operation.state.value)

    if (!rollbackResult.ok) {
      const error = rollbackError(rollbackResult.error)
      operation.setError('local-storage', error)
      firstError ??= error
    }

    if (rawValues) {
      const actual = operation.readLocal()
      operation.state.replaceConfirmed(actual.value)

      if (!actual.ok) {
        const error = rollbackError(actual.error)
        operation.setError('local-storage', error)
        firstError ??= error
      }
    }

    operation.publish(operation.state.value, operation.state.isPending)
  })

  return firstError
}

export async function commitSyncBatch(
  stage: (batch: SyncBatch) => void,
): Promise<SyncResult<void>> {
  const batch = createBatch()

  try {
    stage(batch)
  } catch (error) {
    return syncFailure(
      undefined,
      new SyncError(
        error instanceof Error ? error.message : String(error),
        'firestore',
        'batch',
        'unknown',
        false,
        error,
      ),
    )
  }

  const operations = batchOperations.get(batch) ?? []
  if (operations.length === 0) return syncSuccess(undefined)

  const modes = new Set(operations.map((operation) => operation.isRealtime))
  if (modes.size !== 1) {
    return syncFailure(
      undefined,
      new SyncError(
        'A sync batch cannot mix local and realtime stores.',
        'firestore',
        'batch',
        'unknown',
        false,
      ),
    )
  }

  const writeCount = operations.reduce(
    (total, operation) => total + operation.writeCount,
    0,
  )
  if (operations[0].isRealtime && writeCount > maxBatchWrites) {
    const error = new SyncError(
      'The requested operation exceeds the Firestore batch limit.',
      'firestore',
      'batch',
      'too-many-writes',
      false,
    )
    for (const operation of operations) {
      operation.setError('firestore', error)
    }
    return syncFailure(undefined, error)
  }

  let rawValues: Array<string | null> | undefined

  if (!operations[0].isRealtime) {
    for (const operation of operations) {
      try {
        if (JSON.stringify(operation.apply(operation.state.value)) === undefined) {
          throw new TypeError('The local value cannot be serialized.')
        }
      } catch (cause) {
        const error = new SyncError(
          cause instanceof Error ? cause.message : String(cause),
          'local-storage',
          'write',
          'storage-serialization',
          false,
          cause,
        )
        operation.setError('local-storage', error)
        return syncFailure(undefined, error)
      }
    }

    rawValues = []
    for (const operation of operations) {
      const rawResult = operation.readLocalRaw()
      if (!rawResult.ok) {
        operation.setError('local-storage', rawResult.error)
        return syncFailure(undefined, rawResult.error)
      }
      rawValues.push(rawResult.value)
    }
  }

  const mutationIds = operations.map((operation) => {
    const id = operation.state.begin(operation.apply)
    operation.publish(operation.state.value, operation.state.isPending)
    return id
  })

  for (const operation of operations) {
    const localResult = operation.persistLocal(operation.state.value)

    if (!localResult.ok) {
      operation.setError('local-storage', localResult.error)

      if (!operation.isRealtime) {
        const rollbackFailure = restoreOperations(
          operations,
          mutationIds,
          rawValues,
        )
        return syncFailure(undefined, rollbackFailure ?? localResult.error)
      }
    } else {
      operation.setError('local-storage', null)
    }
  }

  if (!operations[0].isRealtime) {
    for (const operation of operations) {
      operation.state.confirmLocal()
      operation.publish(operation.state.value, operation.state.isPending)
    }
    return syncSuccess(undefined)
  }

  try {
    try {
      await ensureAnonymousUser()
    } catch (error) {
      throw createSyncError(error, 'auth', 'batch')
    }

    const services = getFirebaseServices()
    if (!services) throw new Error('Firebase services are unavailable.')

    const remoteBatch = writeBatch(services.db)
    for (const operation of operations) {
      operation.stageRemote(remoteBatch, services.db)
    }
    await remoteBatch.commit()

    for (const operation of operations) {
      operation.setError('auth', null)
      operation.setError('firestore', null)
    }
    return syncSuccess(undefined)
  } catch (error) {
    const syncError =
      error instanceof SyncError
        ? error
        : createSyncError(error, 'firestore', 'batch')
    const rollbackFailure = restoreOperations(operations, mutationIds)
    for (const operation of operations) {
      operation.setError(syncError.source, syncError)
    }
    return syncFailure(undefined, rollbackFailure ?? syncError)
  }
}
