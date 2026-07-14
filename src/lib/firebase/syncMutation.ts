import {
  SyncError,
  syncFailure,
  syncSuccess,
  type SyncErrorSource,
  type SyncResult,
} from '@/lib/firebase/syncError'

type Mutation<T> = {
  id: number
  apply: (value: T) => T
}

export class OptimisticState<T> {
  private confirmed: T
  private mutations: Mutation<T>[] = []
  private nextId = 1
  private snapshotPending = false

  constructor(initialValue: T) {
    this.confirmed = initialValue
  }

  get value() {
    return this.mutations.reduce(
      (value, mutation) => mutation.apply(value),
      this.confirmed,
    )
  }

  get isPending() {
    return this.snapshotPending || this.mutations.length > 0
  }

  begin(apply: (value: T) => T) {
    const id = this.nextId
    this.nextId += 1
    this.mutations.push({ id, apply })
    return id
  }

  reject(id: number) {
    this.mutations = this.mutations.filter((mutation) => mutation.id !== id)
  }

  confirmLocal() {
    this.confirmed = this.value
    this.mutations = []
    this.snapshotPending = false
  }

  acceptSnapshot(value: T, hasPendingWrites: boolean) {
    this.snapshotPending = hasPendingWrites

    if (!hasPendingWrites) {
      this.confirmed = value
      this.mutations = []
    }
  }

  replaceConfirmed(value: T) {
    this.confirmed = value
    this.mutations = []
    this.snapshotPending = false
  }
}

type CommitOptimisticMutationOptions<T> = {
  state: OptimisticState<T>
  apply: (value: T) => T
  isRealtime: boolean
  persistLocal: (value: T) => SyncResult<void>
  readLocal?: () => SyncResult<T>
  persistRemote?: () => Promise<void>
  publish: (value: T, isPending: boolean) => void
  setError: (source: SyncErrorSource, error: SyncError | null) => void
}

export async function commitOptimisticMutation<T>({
  state,
  apply,
  isRealtime,
  persistLocal,
  readLocal,
  persistRemote,
  publish,
  setError,
}: CommitOptimisticMutationOptions<T>): Promise<SyncResult<void>> {
  const mutationId = state.begin(apply)
  const optimisticValue = state.value
  publish(optimisticValue, state.isPending)

  const localResult = persistLocal(optimisticValue)

  if (!localResult.ok) {
    setError('local-storage', localResult.error)

    if (!isRealtime) {
      state.reject(mutationId)
      publish(state.value, state.isPending)
      return syncFailure(undefined, localResult.error)
    }
  } else {
    setError('local-storage', null)
  }

  if (!isRealtime || !persistRemote) {
    state.confirmLocal()
    publish(state.value, state.isPending)
    return syncSuccess(undefined)
  }

  try {
    await persistRemote()
    setError('auth', null)
    setError('firestore', null)
    return syncSuccess(undefined)
  } catch (error) {
    const syncError = error as SyncError
    state.reject(mutationId)
    const rollbackResult = persistLocal(state.value)
    setError(syncError.source, syncError)

    if (!rollbackResult.ok) {
      const rollbackError = new SyncError(
        'The local rollback could not be persisted.',
        'local-storage',
        'rollback',
        'rollback-failed',
        false,
        rollbackResult.error,
      )
      const readbackResult = readLocal?.()

      if (readbackResult) {
        state.replaceConfirmed(readbackResult.value)
      }

      setError('local-storage', rollbackError)
      publish(state.value, state.isPending)
      return syncFailure(undefined, rollbackError)
    }

    publish(state.value, state.isPending)
    return syncFailure(undefined, syncError)
  }
}
