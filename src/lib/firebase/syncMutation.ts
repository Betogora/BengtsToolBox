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
  confirmed?: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

// Returns `previous` (or its equal parts) when `next` has the same content, so
// metadata-only snapshots and acknowledgements keep stable references.
function replaceEqualDeep<T>(previous: unknown, next: T): T {
  if (Object.is(previous, next)) return previous as T

  if (Array.isArray(previous) && Array.isArray(next)) {
    let isEqual = previous.length === next.length
    const shared = next.map((item, index) => {
      const sharedItem = replaceEqualDeep(previous[index], item)
      if (sharedItem !== previous[index]) isEqual = false
      return sharedItem
    })
    return (isEqual ? previous : shared) as T
  }

  if (isPlainObject(previous) && isPlainObject(next)) {
    const previousKeys = Object.keys(previous)
    const nextKeys = Object.keys(next)
    let isEqual = previousKeys.length === nextKeys.length
    const shared: Record<string, unknown> = {}
    for (const key of nextKeys) {
      shared[key] = replaceEqualDeep(previous[key], next[key])
      if (shared[key] !== previous[key] || !Object.hasOwn(previous, key)) isEqual = false
    }
    return (isEqual ? previous : shared) as T
  }

  if (
    previous !== null &&
    typeof previous === 'object' &&
    next !== null &&
    typeof next === 'object' &&
    previous.constructor === next.constructor &&
    typeof (previous as { isEqual?: unknown }).isEqual === 'function' &&
    (previous as { isEqual: (other: unknown) => boolean }).isEqual(next)
  ) {
    return previous as T
  }

  return next
}

export class OptimisticState<T> {
  private confirmed: T
  private mutations: Mutation<T>[] = []
  private nextId = 1
  private snapshotPending = false
  private currentValue: T
  private isValueStale = false

  constructor(initialValue: T) {
    this.confirmed = initialValue
    this.currentValue = initialValue
  }

  get value() {
    if (this.isValueStale) {
      this.currentValue = replaceEqualDeep(
        this.currentValue,
        this.mutations.reduce(
          (value, mutation) => mutation.apply(value),
          this.confirmed,
        ),
      )
      this.isValueStale = false
    }

    return this.currentValue
  }

  get isPending() {
    return this.snapshotPending || this.mutations.length > 0
  }

  begin(apply: (value: T) => T) {
    const id = this.nextId
    this.nextId += 1
    this.mutations.push({ id, apply })
    this.isValueStale = true
    return id
  }

  reject(id: number) {
    this.mutations = this.mutations.filter((mutation) => mutation.id !== id)
    this.isValueStale = true
    this.confirmCompleted()
  }

  confirmLocal() {
    this.confirmed = this.value
    this.mutations = []
    this.snapshotPending = false
  }

  confirm(id: number) {
    const mutation = this.mutations.find((entry) => entry.id === id)
    if (mutation) mutation.confirmed = true
    this.confirmCompleted()
  }

  private confirmCompleted() {
    while (this.mutations[0]?.confirmed) {
      const mutation = this.mutations.shift()!
      this.confirmed = mutation.apply(this.confirmed)
      this.isValueStale = true
    }
  }

  acceptSnapshot(value: T, hasPendingWrites: boolean) {
    this.snapshotPending = hasPendingWrites

    if (!hasPendingWrites) {
      this.confirmed = value
      this.isValueStale = true
    }
  }

  replaceConfirmed(value: T) {
    this.confirmed = value
    this.mutations = []
    this.snapshotPending = false
    this.isValueStale = true
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
    state.confirm(mutationId)
    const cacheResult = persistLocal(state.value)
    setError('local-storage', cacheResult.ok ? null : cacheResult.error)
    publish(state.value, state.isPending)
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
