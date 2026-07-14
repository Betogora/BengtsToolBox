import { describe, expect, it } from 'vitest'

import { OptimisticState, commitOptimisticMutation } from '@/lib/firebase/syncMutation'
import {
  SyncError,
  syncFailure,
  syncSuccess,
  type SyncError as SyncErrorType,
} from '@/lib/firebase/syncError'

describe('OptimisticState', () => {
  it('rebases newer mutations when an older mutation fails', () => {
    const state = new OptimisticState({ count: 0, label: 'old' })
    const first = state.begin((value) => ({ ...value, count: 1 }))
    state.begin((value) => ({ ...value, label: 'new' }))

    state.reject(first)

    expect(state.value).toEqual({ count: 0, label: 'new' })
  })

  it('uses only server-confirmed snapshots as its new basis', () => {
    const state = new OptimisticState({ count: 0 })
    state.begin(() => ({ count: 1 }))

    state.acceptSnapshot({ count: 1 }, true)
    expect(state.isPending).toBe(true)

    state.acceptSnapshot({ count: 1 }, false)
    expect(state.value).toEqual({ count: 1 })
    expect(state.isPending).toBe(false)
  })
})

describe('commitOptimisticMutation', () => {
  it('rolls a local mutation back when persistence fails', async () => {
    const state = new OptimisticState({ count: 0 })
    const error = new SyncError(
      'full',
      'local-storage',
      'write',
      'storage-quota',
      true,
    )
    const published: Array<{ count: number }> = []

    const result = await commitOptimisticMutation({
      state,
      apply: () => ({ count: 1 }),
      isRealtime: false,
      persistLocal: () => syncFailure(undefined, error),
      publish: (value) => published.push(value),
      setError: () => undefined,
    })

    expect(result.ok).toBe(false)
    expect(state.value).toEqual({ count: 0 })
    expect(published).toEqual([{ count: 1 }, { count: 0 }])
  })

  it('continues a remote mutation when only the cache fails', async () => {
    const state = new OptimisticState({ count: 0 })
    const cacheError = new SyncError(
      'blocked',
      'local-storage',
      'write',
      'storage-unavailable',
      true,
    )
    let didWriteRemote = false

    const result = await commitOptimisticMutation({
      state,
      apply: () => ({ count: 1 }),
      isRealtime: true,
      persistLocal: () => syncFailure(undefined, cacheError),
      persistRemote: async () => {
        didWriteRemote = true
      },
      publish: () => undefined,
      setError: () => undefined,
    })

    expect(didWriteRemote).toBe(true)
    expect(result).toMatchObject({ ok: true })
  })

  it('rolls a definitive remote rejection back', async () => {
    const state = new OptimisticState({ count: 0 })
    const remoteError = new SyncError(
      'denied',
      'firestore',
      'save',
      'permission-denied',
      false,
    )
    let reported: SyncErrorType | null = null

    const result = await commitOptimisticMutation({
      state,
      apply: () => ({ count: 1 }),
      isRealtime: true,
      persistLocal: () => syncSuccess(undefined),
      persistRemote: async () => {
        throw remoteError
      },
      publish: () => undefined,
      setError: (_source, error) => {
        if (error) reported = error
      },
    })

    expect(result).toMatchObject({ ok: false, error: remoteError })
    expect(state.value).toEqual({ count: 0 })
    expect(reported).toBe(remoteError)
  })

  it('reads back storage and reports a failed remote rollback explicitly', async () => {
    const state = new OptimisticState({ count: 0 })
    const remoteError = new SyncError(
      'denied',
      'firestore',
      'save',
      'permission-denied',
      false,
    )
    const storageError = new SyncError(
      'blocked',
      'local-storage',
      'write',
      'storage-unavailable',
      true,
    )

    const result = await commitOptimisticMutation({
      state,
      apply: () => ({ count: 1 }),
      isRealtime: true,
      persistLocal: (value) =>
        value.count === 1
          ? syncSuccess(undefined)
          : syncFailure(undefined, storageError),
      readLocal: () => syncSuccess({ count: 1 }),
      persistRemote: async () => {
        throw remoteError
      },
      publish: () => undefined,
      setError: () => undefined,
    })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'rollback-failed' },
    })
    expect(state.value).toEqual({ count: 1 })
  })
})
