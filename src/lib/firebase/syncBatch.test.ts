import { describe, expect, it } from 'vitest'

import { commitSyncBatch, stageSyncMutation } from '@/lib/firebase/syncBatch'
import { SyncError, syncFailure, syncSuccess } from '@/lib/firebase/syncError'
import { OptimisticState } from '@/lib/firebase/syncMutation'

describe('commitSyncBatch', () => {
  it('commits all staged local mutations together', async () => {
    const first = new OptimisticState(1)
    const second = new OptimisticState('old')

    const result = await commitSyncBatch((batch) => {
      stageSyncMutation(batch, {
        state: first,
        apply: () => 2,
        isRealtime: false,
        persistLocal: () => syncSuccess(undefined),
        readLocal: () => syncSuccess(1),
        readLocalRaw: () => syncSuccess('1'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
      stageSyncMutation(batch, {
        state: second,
        apply: () => 'new',
        isRealtime: false,
        persistLocal: () => syncSuccess(undefined),
        readLocal: () => syncSuccess('old'),
        readLocalRaw: () => syncSuccess('"old"'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
    })

    expect(result.ok).toBe(true)
    expect(first.value).toBe(2)
    expect(second.value).toBe('new')
  })

  it('rolls every local participant back when one write fails', async () => {
    const first = new OptimisticState(1)
    const second = new OptimisticState('old')
    const error = new SyncError(
      'full',
      'local-storage',
      'write',
      'storage-quota',
      true,
    )

    const result = await commitSyncBatch((batch) => {
      stageSyncMutation(batch, {
        state: first,
        apply: () => 2,
        isRealtime: false,
        persistLocal: () => syncSuccess(undefined),
        readLocal: () => syncSuccess(1),
        readLocalRaw: () => syncSuccess('1'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
      stageSyncMutation(batch, {
        state: second,
        apply: () => 'new',
        isRealtime: false,
        persistLocal: (value) =>
          value === 'new'
            ? syncFailure(undefined, error)
            : syncSuccess(undefined),
        readLocal: () => syncSuccess('old'),
        readLocalRaw: () => syncSuccess('"old"'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
    })

    expect(result.ok).toBe(false)
    expect(first.value).toBe(1)
    expect(second.value).toBe('old')
  })

  it('rejects an oversized realtime batch before publishing optimistic state', async () => {
    const state = new OptimisticState(1)
    let publishCount = 0

    const result = await commitSyncBatch((batch) => {
      stageSyncMutation(batch, {
        state,
        apply: () => 2,
        isRealtime: true,
        persistLocal: () => syncSuccess(undefined),
        readLocal: () => syncSuccess(1),
        readLocalRaw: () => syncSuccess('1'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => {
          publishCount += 1
        },
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 501,
      })
    })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'too-many-writes' },
    })
    expect(state.value).toBe(1)
    expect(publishCount).toBe(0)
  })

  it('preflights serialization before changing local state', async () => {
    const state = new OptimisticState<unknown>(1)
    const circular: { self?: unknown } = {}
    circular.self = circular

    const result = await commitSyncBatch((batch) => {
      stageSyncMutation(batch, {
        state,
        apply: () => circular,
        isRealtime: false,
        persistLocal: () => syncSuccess(undefined),
        readLocal: () => syncSuccess(1),
        readLocalRaw: () => syncSuccess('1'),
        restoreLocalRaw: () => syncSuccess(undefined),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
    })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'storage-serialization' },
    })
    expect(state.value).toBe(1)
  })

  it('reports rollback-failed and adopts the actual storage readback', async () => {
    const state = new OptimisticState(1)
    const error = new SyncError(
      'blocked',
      'local-storage',
      'write',
      'storage-unavailable',
      true,
    )

    const result = await commitSyncBatch((batch) => {
      stageSyncMutation(batch, {
        state,
        apply: () => 2,
        isRealtime: false,
        persistLocal: () => syncFailure(undefined, error),
        readLocal: () => syncSuccess(2),
        readLocalRaw: () => syncSuccess('1'),
        restoreLocalRaw: () => syncFailure(undefined, error),
        publish: () => undefined,
        setError: () => undefined,
        stageRemote: () => undefined,
        writeCount: 1,
      })
    })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'rollback-failed' },
    })
    expect(state.value).toBe(2)
  })
})
