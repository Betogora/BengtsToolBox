import { describe, expect, it, vi } from 'vitest'

import { createLocalStore } from '@/lib/firebase/localStore'

function memoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  }
}

describe('localStore', () => {
  it('reads and writes JSON values through its interface', () => {
    const store = createLocalStore(() => memoryStorage())
    const storage = memoryStorage()
    const persistentStore = createLocalStore(() => storage)

    expect(store.read('missing', 3)).toMatchObject({ ok: true, value: 3 })
    expect(persistentStore.write('value', { count: 2 }).ok).toBe(true)
    expect(persistentStore.read('value', { count: 0 })).toMatchObject({
      ok: true,
      value: { count: 2 },
    })
  })

  it('returns the fallback and a classified error for blocked storage', () => {
    const blocked = new DOMException('blocked', 'SecurityError')
    const store = createLocalStore(() => {
      throw blocked
    })

    expect(store.read('value', 7)).toMatchObject({
      ok: false,
      value: 7,
      error: { code: 'storage-unavailable', operation: 'read' },
    })
  })

  it('classifies quota and serialization failures', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    const store = createLocalStore(() => storage)
    const circular: { self?: unknown } = {}
    circular.self = circular

    expect(store.write('value', 'x')).toMatchObject({
      ok: false,
      error: { code: 'storage-quota' },
    })
    expect(store.write('circular', circular)).toMatchObject({
      ok: false,
      error: { code: 'storage-serialization' },
    })
  })

  it('returns the fallback when persisted JSON cannot be parsed', () => {
    const storage = memoryStorage()
    storage.setItem('broken', '{not-json')

    expect(createLocalStore(() => storage).read('broken', { count: 0 })).toMatchObject({
      ok: false,
      value: { count: 0 },
      error: { code: 'storage-serialization', operation: 'read' },
    })
  })

  it('reports failed removal', () => {
    const storage = memoryStorage()
    storage.removeItem = () => {
      throw new DOMException('blocked', 'SecurityError')
    }

    expect(createLocalStore(() => storage).remove('value')).toMatchObject({
      ok: false,
      error: { operation: 'remove' },
    })
  })

  it('keeps a generated fallback id stable for the page lifetime', () => {
    const idFactory = vi.fn(() => 'stable-id')
    const store = createLocalStore(
      () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      idFactory,
    )

    const first = store.getOrCreateId('device')
    const second = store.getOrCreateId('device')

    expect(first).toMatchObject({ ok: false, value: 'stable-id' })
    expect(second).toMatchObject({ ok: false, value: 'stable-id' })
    expect(idFactory).toHaveBeenCalledTimes(1)
  })

  it('falls back when the preferred id factory throws', () => {
    const store = createLocalStore(memoryStorage, () => {
      throw new Error('crypto failed')
    })

    expect(store.getOrCreateId('device')).toMatchObject({
      ok: false,
      error: { code: 'id-generation', operation: 'create-id' },
    })
  })
})
