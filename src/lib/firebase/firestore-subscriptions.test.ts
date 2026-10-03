import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  effects: [] as Array<() => unknown>,
  listeners: [] as Array<(snapshot: unknown) => void>,
  cache: new Map<string, unknown>(),
  remote: new Map<string, unknown>(),
  writes: vi.fn(),
  stateUpdates: [] as unknown[],
  configured: true,
  loaded: false,
  auth: vi.fn(async () => ({ uid: 'test' })),
}))

vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>()
  return {
    ...react,
    useEffect: (effect: () => unknown) => { mock.effects.push(effect) },
    useState: (initial: unknown) => {
      const [value, setValue] = react.useState(mock.loaded && initial === true ? false : initial)
      return [value, (next: unknown) => { mock.stateUpdates.push(next); setValue(next) }]
    },
  }
})
vi.mock('@/lib/firebase/client', () => ({
  get isFirebaseConfigured() { return mock.configured },
  getFirebaseServices: () => mock.configured ? { db: {} } : null,
  ensureAnonymousUser: mock.auth,
}))
vi.mock('@/lib/firebase/localStore', async (original) => ({
  ...await original<typeof import('@/lib/firebase/localStore')>(),
  readLocalValue: (key: string, initial: unknown) => ({ ok: true, value: mock.cache.get(key) ?? initial, error: null }),
  writeLocalValue: (key: string, value: unknown) => {
    mock.cache.set(key, value)
    return { ok: true, value: undefined, error: null }
  },
}))
vi.mock('firebase/firestore', async (original) => ({
  ...await original<typeof import('firebase/firestore')>(),
  doc: (_db: unknown, path: string, id?: string) => ({ path: id ? `${path}/${id}` : path }),
  collection: (_db: unknown, path: string) => ({ path }),
  query: (reference: unknown) => reference,
  onSnapshot: (_reference: unknown, _options: unknown, callback: (snapshot: unknown) => void) => {
    mock.listeners.push(callback)
    return () => undefined
  },
  setDoc: mock.writes,
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<unknown>) => {
    const writes: Array<() => void> = []
    const result = await action({
      get: async ({ path }: { path: string }) => ({ id: path.split('/').at(-1), exists: () => mock.remote.has(path), data: () => mock.remote.get(path) }),
      set: (reference: { path: string }, value: Record<string, unknown>, options?: { merge: boolean }) => {
        mock.writes(reference, value, ...(options ? [options] : []))
        writes.push(() => mock.remote.set(reference.path, options?.merge
          ? { ...(mock.remote.get(reference.path) as object), ...value } : value))
      },
      delete: (reference: { path: string }) => { writes.push(() => mock.remote.delete(reference.path)) },
    })
    writes.forEach((write) => write())
    return result
  },
}))
vi.mock('@/lib/firebase/useAnonymousSession', () => ({
  useAnonymousSession: () => ({ userId: 'test', error: null }),
}))
vi.mock('@/lobbies/LobbyContext', () => ({ useActiveLobbyId: () => 'default' }))

import { useFirestoreDoc } from './useFirestoreDoc'
import { useFirestoreCollection } from './useFirestoreCollection'
import { useCoinflip } from '@/apps/coinflip/hooks/useCoinflip'
import { useDecisionWheel } from '@/apps/decision-wheel/hooks/useDecisionWheel'
import { useRandomizer } from '@/apps/randomizer/hooks/useRandomizer'
import { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'

beforeEach(() => {
  mock.effects = []
  mock.listeners = []
  mock.cache.clear()
  mock.remote.clear()
  mock.stateUpdates = []
  mock.writes.mockReset()
  mock.configured = true
  mock.loaded = false
  mock.auth.mockReset().mockResolvedValue({ uid: 'test' })
})

function renderHook<T>(useHook: () => T) {
  let result!: T
  function Probe() { result = useHook(); return null }
  renderToStaticMarkup(createElement(Probe))
  return result
}

describe('transactional list mutations', () => {
  it('preserves newer server results and unrelated fields when a cached client adds a flip', async () => {
    const path = 'apps/coinflip/state/default'
    const first = { id: 'first', side: 'heads' as const, createdAt: '2026-09-30T12:00:00Z' }
    const second = { id: 'second', side: 'tails' as const, createdAt: '2026-09-30T12:01:00Z' }
    mock.remote.set(path, { history: [first], lastFlip: first, custom: 'preserved' })
    const app = renderHook(() => useCoinflip())
    await expect(app.commitFlipResult(second)).resolves.toMatchObject({ ok: true })
    expect(mock.remote.get(path)).toMatchObject({ history: [second, first], lastFlip: second, custom: 'preserved' })
  })

  it('does not reorder a newer acknowledged history while its own write is still pending', async () => {
    const path = 'apps/coinflip/state/default'
    const first = { id: 'first', side: 'heads' as const, createdAt: '2026-09-30T12:00:00Z' }
    const second = { id: 'second', side: 'tails' as const, createdAt: '2026-09-30T12:01:00Z' }
    mock.remote.set(path, { history: [], lastFlip: null })
    const app = renderHook(() => useCoinflip())
    mock.effects.forEach((effect) => effect())
    await Promise.resolve()
    let release!: (value: { uid: string }) => void
    mock.auth.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
    const writing = app.commitFlipResult(first)
    const confirmed = { history: [second, first], lastFlip: second }
    mock.remote.set(path, confirmed)
    mock.listeners[0]({ exists: () => true, data: () => confirmed, metadata: { fromCache: false, hasPendingWrites: false } })
    release({ uid: 'test' })
    await writing
    expect(mock.cache.get(`app-hub:doc:${path}`)).toMatchObject(confirmed)
    expect(mock.remote.get(path)).toMatchObject(confirmed)
  })

  it('does not leak a failed earlier result into a later successful write', async () => {
    const path = 'apps/coinflip/state/default'
    mock.remote.set(path, { history: [], lastFlip: null })
    const app = renderHook(() => useCoinflip())
    let reject!: (error: Error) => void
    mock.auth.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    const failed = app.commitFlipResult({ id: 'failed', side: 'heads', createdAt: '2026-09-30T12:00:00Z' })
    await app.commitFlipResult({ id: 'saved', side: 'tails', createdAt: '2026-09-30T12:01:00Z' })
    reject(new Error('Auth denied'))
    await expect(failed).resolves.toMatchObject({ ok: false })
    expect(mock.remote.get(path)).toMatchObject({ history: [expect.objectContaining({ id: 'saved' })] })
    expect(mock.cache.get(`app-hub:doc:${path}`)).toMatchObject({ history: [expect.objectContaining({ id: 'saved' })] })
  })

  it('rejects missing remote documents instead of recreating cached data', async () => {
    const app = renderHook(() => useCoinflip())
    await expect(app.flip()).resolves.toMatchObject({ ok: false })
    expect(mock.writes).not.toHaveBeenCalled()
  })

  it('keeps randomizer range and existing results while adding a roll', async () => {
    const path = 'apps/randomizer/state/default'
    mock.remote.set(path, { min: 20, max: 30, history: [{ id: 'remote', value: 21, createdAt: '2026-09-30' }], lastRoll: 21 })
    const app = renderHook(() => useRandomizer())
    await app.roll()
    expect(mock.remote.get(path)).toMatchObject({ min: 20, max: 30, history: [expect.anything(), expect.objectContaining({ id: 'remote' })] })
  })

  it('updates a wheel entry without dropping an unseen server entry or history', async () => {
    const path = 'apps/decision-wheel/state/default'
    const entry = { id: 'option-1', text: 'Remote', color: '#0D8E90', weight: 2 }
    mock.remote.set(path, { entries: [entry, { ...entry, id: 'other' }], history: [{ id: 'result' }], lastResult: null })
    const app = renderHook(() => useDecisionWheel())
    await app.updateEntry('option-1', { text: 'Updated' })
    expect(mock.remote.get(path)).toMatchObject({ entries: [{ ...entry, text: 'Updated' }, { ...entry, id: 'other' }], history: [{ id: 'result' }] })
  })

  it('keeps the pure local mode editable without a transaction', async () => {
    mock.configured = false
    const app = renderHook(() => useCoinflip())
    await expect(app.flip()).resolves.toMatchObject({ ok: true })
    expect(mock.writes).not.toHaveBeenCalled()
    expect(mock.cache.get('app-hub:doc:apps/coinflip/state/default')).toMatchObject({ history: [expect.anything()] })
  })

  it.each([false, true])('keeps collection order for local saveItems with updater=%s', async (updater) => {
    mock.configured = false
    const store = renderHook(() => useFirestoreCollection('test/items', [{ id: 'first', position: 1 }]))
    const unsorted = [{ id: 'second', position: 2 }, { id: 'first', position: 1 }]
    await expect(store.saveItems(updater ? () => unsorted : unsorted)).resolves.toMatchObject({ ok: true })
    expect(mock.cache.get('app-hub:collection:test/items')).toEqual([unsorted[1], unsorted[0]])
  })

  it('rolls back a rejected list transaction without changing existing remote data', async () => {
    const path = 'apps/coinflip/state/default'
    const original = { history: [], lastFlip: null }
    mock.remote.set(path, original)
    const app = renderHook(() => useCoinflip())
    mock.writes.mockImplementationOnce(() => { throw Object.assign(new Error('unavailable'), { code: 'unavailable' }) })
    await expect(app.flip()).resolves.toMatchObject({ ok: false, error: { code: 'network' } })
    expect(mock.remote.get(path)).toEqual(original)
    expect(mock.cache.get(`app-hub:doc:${path}`)).toEqual(original)
  })

  it.each(['progress-dashboard', 'territory-map'] as const)('adds to the current server dataset in %s without losing events or fields', async (appId) => {
    mock.loaded = true
    const path = `apps/${appId}/sessions/default/datasets`
    const cached = { id: 'dataset-current', position: 1, name: 'Datensatz', status: 'active', createdAtClientIso: '2026-09-30T12:00:00Z', events: [] }
    const remoteEvent = { id: 'remote', playerId: 'person-1', position: 3, valueDelta: 1, mapId: 'world', territoryId: 'de' }
    mock.cache.set(`app-hub:collection:${path}`, [cached])
    mock.remote.set(`${path}/dataset-current`, { ...cached, events: [remoteEvent], custom: 'preserved' })
    if (appId === 'progress-dashboard') {
      const app = renderHook(() => useProgressDashboard())
      await expect(app.addEvent(app.players[0], 'beer')).resolves.toBe(true)
    } else {
      const app = renderHook(() => useTerritoryMap())
      await expect(app.claimTerritory('world', 'fr', app.players[0].id)).resolves.toBe(true)
    }
    expect(mock.remote.get(`${path}/dataset-current`)).toMatchObject({ events: [remoteEvent, expect.objectContaining({ position: 4 })], custom: 'preserved' })
  })

  it.each(['progress-dashboard', 'territory-map'] as const)('accepts an existing %s dataset without an events field', async (appId) => {
    mock.loaded = true
    const path = `apps/${appId}/sessions/default/datasets`
    const cached = { id: 'dataset-current', position: 1, name: 'Datensatz', status: 'active', createdAtClientIso: '2026-09-30T12:00:00Z' }
    mock.cache.set(`app-hub:collection:${path}`, [cached])
    mock.remote.set(`${path}/dataset-current`, cached)
    if (appId === 'progress-dashboard') {
      const app = renderHook(() => useProgressDashboard())
      await expect(app.addEvent(app.players[0], 'beer')).resolves.toBe(true)
    } else {
      const app = renderHook(() => useTerritoryMap())
      await expect(app.claimTerritory('world', 'de', app.players[0].id)).resolves.toBe(true)
    }
    expect(mock.remote.get(`${path}/dataset-current`)).toMatchObject({ events: [expect.objectContaining({ position: 1 })] })
  })

  it('archives the latest server events atomically without changing the stored shape', async () => {
    const path = 'apps/progress-dashboard/sessions/default/datasets'
    const cached = { id: 'dataset-current', position: 1, name: 'Datensatz', status: 'active', createdAtClientIso: '2026-09-30T12:00:00Z', events: [] }
    const event = { id: 'remote-event', playerId: 'person-1', position: 1, valueDelta: 1 }
    mock.cache.set(`app-hub:collection:${path}`, [cached])
    mock.remote.set(`${path}/dataset-current`, { ...cached, events: [event], custom: 'preserved' })
    const app = renderHook(() => useProgressDashboard())
    await expect(app.resetAndArchiveDataset()).resolves.toMatchObject({ ok: true })
    const archive = [...mock.remote.entries()].find(([key]) => key.startsWith(`${path}/`) && key !== `${path}/dataset-current`)
    expect(archive?.[1]).toMatchObject({ events: [event], custom: 'preserved', status: 'archived' })
    expect(mock.remote.get(`${path}/dataset-current`)).toMatchObject({ events: [], status: 'active' })
  })

  it('rejects an archive whose source was deleted while pending without crashing snapshot replay', async () => {
    const path = 'apps/progress-dashboard/sessions/default/datasets'
    const cached = { id: 'dataset-current', position: 1, name: 'Datensatz', status: 'active', createdAtClientIso: '2026-09-30T12:00:00Z', events: [] }
    mock.cache.set(`app-hub:collection:${path}`, [cached])
    mock.remote.set(`${path}/dataset-current`, cached)
    const app = renderHook(() => useProgressDashboard())
    mock.effects.forEach((effect) => effect())
    await Promise.resolve()
    let release!: (value: { uid: string }) => void
    mock.auth.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
    const archiving = app.resetAndArchiveDataset()
    mock.remote.delete(`${path}/dataset-current`)
    expect(() => mock.listeners[2]({ docs: [], empty: true, metadata: { fromCache: false, hasPendingWrites: false } })).not.toThrow()
    release({ uid: 'test' })
    await expect(archiving).resolves.toMatchObject({ ok: false })
    expect([...mock.remote.keys()].some((key) => key.startsWith(`${path}/`))).toBe(false)
    expect(mock.cache.get(`app-hub:collection:${path}`)).toEqual([])
  })
})

describe('Firestore document initialization', () => {
  async function subscribe() {
    function Probe() { useFirestoreDoc('test/state', { count: 0 }); return null }
    renderToStaticMarkup(createElement(Probe))
    mock.effects.forEach((effect) => effect())
    await Promise.resolve()
  }

  it('does not create defaults when an offline cache cannot find the document', async () => {
    await subscribe()
    mock.listeners[0]({ exists: () => false, metadata: { fromCache: true, hasPendingWrites: false } })
    await Promise.resolve()
    expect(mock.writes).not.toHaveBeenCalled()
  })

  it('rechecks server absence atomically before creating defaults', async () => {
    await subscribe()
    mock.remote.set('test/state', { count: 42 })
    mock.listeners[0]({ exists: () => false, metadata: { fromCache: false, hasPendingWrites: false } })
    await Promise.resolve()
    expect(mock.writes).not.toHaveBeenCalled()
  })

  it('attempts initial creation only once after a definitive rejection', async () => {
    await subscribe()
    mock.writes.mockImplementationOnce(() => { throw new Error('denied') })
    const missing = { exists: () => false, metadata: { fromCache: false, hasPendingWrites: false } }
    mock.listeners[0](missing)
    await Promise.resolve()
    mock.listeners[0](missing)
    await Promise.resolve()
    expect(mock.writes).toHaveBeenCalledTimes(1)
  })
})

it('ends loading for an empty offline cache without claiming server confirmation', async () => {
  let store!: ReturnType<typeof useFirestoreCollection<{ id: string; position: number }>>
  function Probe() { store = useFirestoreCollection('test/players', [{ id: 'p1', position: 1 }]); return null }
  renderToStaticMarkup(createElement(Probe))
  mock.effects.forEach((effect) => effect())
  await Promise.resolve()
  mock.listeners[0]({ empty: true, metadata: { fromCache: true, hasPendingWrites: false } })
  expect(store.data).toHaveLength(1)
  expect(store.hasServerSnapshot).toBe(false)
  expect(mock.stateUpdates).toEqual([expect.any(Function), false])
})
