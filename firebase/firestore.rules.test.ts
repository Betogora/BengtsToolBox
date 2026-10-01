import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deleteApp, initializeApp } from 'firebase/app'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  disableNetwork,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  enableNetwork,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  terminate,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({ db: undefined as Firestore | undefined, cache: new Map<string, unknown>() }))
vi.mock('../src/lib/firebase/client', () => ({
  isFirebaseConfigured: true,
  getFirebaseServices: () => ({ db: client.db }),
  ensureAnonymousUser: async () => ({ uid: 'emulator' }),
}))
vi.mock('../src/lib/firebase/localStore', async (original) => ({
  ...await original<typeof import('../src/lib/firebase/localStore')>(),
  readLocalValue: (key: string, initial: unknown) => ({ ok: true, value: client.cache.get(key) ?? initial, error: null }),
  writeLocalValue: (key: string, value: unknown) => {
    client.cache.set(key, value)
    return { ok: true, value: undefined, error: null }
  },
}))

import { useCoinflip } from '../src/apps/coinflip/hooks/useCoinflip'
import { useProgressDashboard } from '../src/apps/progress-dashboard/hooks/useProgressDashboard'
import { useFirestoreDoc } from '../src/lib/firebase/useFirestoreDoc'
import { commitSyncBatch } from '../src/lib/firebase/syncBatch'

function renderHook<T>(useHook: () => T) {
  let result!: T
  function Probe() { result = useHook(); return null }
  renderToStaticMarkup(createElement(Probe))
  return result
}

const projectId = 'demo-bengtstoolbox-lobbies'
let testEnvironment: RulesTestEnvironment

function validLobby(id: string, uid: string) {
  return {
    id,
    code: id,
    name: 'Test Lobby',
    kind: 'custom',
    createdAt: serverTimestamp(),
    createdAtClientIso: new Date().toISOString(),
    createdByDeviceId: uid,
  }
}

function validDevice(uid: string) {
  const clientIso = new Date().toISOString()
  return {
    deviceId: uid,
    deviceName: 'Testgerät',
    firstSeenAt: serverTimestamp(),
    firstSeenAtClientIso: clientIso,
    lastSeenAt: serverTimestamp(),
    lastSeenAtClientIso: clientIso,
  }
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(resolve('firebase/firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

beforeEach(async () => {
  client.cache.clear()
  await testEnvironment.clearFirestore()
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

describe('lobby Firestore rules', () => {
  it('keeps concurrent coinflip results from two stale clients and existing fields', async () => {
    const writer = testEnvironment.authenticatedContext('writer').firestore()
    const other = testEnvironment.authenticatedContext('other').firestore()
    const path = 'apps/coinflip/state/default'
    const existing = { id: 'existing', side: 'heads', createdAt: '2026-09-30T12:00:00Z' }
    await setDoc(doc(writer, path), { history: [existing], lastFlip: existing, custom: 'preserved' })
    const first = renderHook(() => useCoinflip())
    const second = renderHook(() => useCoinflip())
    client.db = writer as unknown as Firestore
    const savingFirst = first.commitFlipResult({ id: 'first', side: 'heads', createdAt: '2026-09-30T12:01:00Z' })
    client.db = other as unknown as Firestore
    const savingSecond = second.commitFlipResult({ id: 'second', side: 'tails', createdAt: '2026-09-30T12:02:00Z' })
    expect((await Promise.all([savingFirst, savingSecond])).every((result) => result.ok)).toBe(true)
    const fresh = testEnvironment.authenticatedContext('fresh').firestore()
    const stored = (await getDoc(doc(fresh, path))).data()!
    expect(stored.custom).toBe('preserved')
    expect(stored.history.map((entry: { id: string }) => entry.id).sort()).toEqual(['existing', 'first', 'second'])
    expect(stored.history[0]).toEqual(stored.lastFlip)
  })

  it('archives current server events after concurrent additions without a migration', async () => {
    const writer = testEnvironment.authenticatedContext('writer').firestore()
    const other = testEnvironment.authenticatedContext('other').firestore()
    const path = 'apps/progress-dashboard/sessions/default/datasets'
    const existing = { id: 'existing', playerId: 'person-1', valueDelta: 1, position: 1 }
    await setDoc(doc(writer, path, 'dataset-current'), {
      position: 1, status: 'active', name: 'Datensatz', createdAtClientIso: '2026-09-30T12:00:00Z',
      events: [existing], custom: 'preserved',
    })
    const first = renderHook(() => useProgressDashboard())
    const second = renderHook(() => useProgressDashboard())
    client.db = writer as unknown as Firestore
    const savingFirst = first.addEvent(first.players[0], 'beer')
    client.db = other as unknown as Firestore
    const savingSecond = second.addEvent(second.players[1], 'wine')
    expect(await Promise.all([savingFirst, savingSecond])).toEqual([true, true])
    client.db = writer as unknown as Firestore
    expect((await first.resetAndArchiveDataset()).ok).toBe(true)
    const documents = (await getDocs(collection(other, path))).docs.map((entry) => ({ id: entry.id, ...entry.data() }))
    const archive = documents.find((entry) => entry.id !== 'dataset-current') as { events: unknown[]; custom: string; status: string }
    expect(archive.events).toHaveLength(3)
    expect(archive.events).toContainEqual(existing)
    expect(archive.custom).toBe('preserved')
    expect(archive.status).toBe('archived')
    expect((await getDoc(doc(other, path, 'dataset-current'))).data()?.events).toEqual([])
  })

  it('rejects an entire transaction if one staged write violates rules', async () => {
    const writer = testEnvironment.authenticatedContext('writer').firestore()
    const path = 'apps/coinflip/state/default'
    await setDoc(doc(writer, path), { count: 4 })
    const allowed = renderHook(() => useFirestoreDoc(path, { count: 0 }))
    const forbidden = renderHook(() => useFirestoreDoc('lobbies/MISSING/apps/coinflip/state/default', { count: 0 }))
    client.db = writer as unknown as Firestore
    const result = await commitSyncBatch((batch) => {
      allowed.merge((current) => ({ count: current.count + 1 }), batch)
      forbidden.merge({ count: 1 }, batch)
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'permission-denied' } })
    expect((await getDoc(doc(writer, path))).data()?.count).toBe(4)
  })

  it('synchronizes two clients, persists for a fresh client, and keeps cached data offline', async () => {
    const writer = testEnvironment.authenticatedContext('writer').firestore()
    const reader = testEnvironment.authenticatedContext('reader').firestore()
    const path = 'apps/scoreboard/state/default'
    await setDoc(doc(writer, path), { count: 0 })
    const synchronized = new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(doc(reader, path), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.data()?.count === 7 && !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
          unsubscribe()
          resolve()
        }
      }, reject)
    })
    await setDoc(doc(writer, path), { count: 7 })
    await synchronized
    const fresh = testEnvironment.authenticatedContext('fresh-reader').firestore()
    expect((await getDoc(doc(fresh, path))).data()?.count).toBe(7)
    await disableNetwork(fresh)
    try {
      expect((await getDoc(doc(fresh, path))).data()?.count).toBe(7)
    } finally {
      await enableNetwork(fresh)
    }
  })

  it('rejects transactions when their server is unreachable', async () => {
    const app = initializeApp({ projectId }, 'unreachable-transactions')
    const db = getFirestore(app)
    connectFirestoreEmulator(db, '127.0.0.1', 1)
    try {
      await expect(runTransaction(db, async (transaction) => {
        await transaction.get(doc(db, 'apps/scoreboard/state/default'))
      }, { maxAttempts: 1 })).rejects.toMatchObject({ code: 'unavailable' })
    } finally {
      await terminate(db)
      await deleteApp(app)
    }
  })

  it('allows anonymous users to create and list valid public lobbies', async () => {
    const creator = testEnvironment.authenticatedContext('creator').firestore()

    await assertSucceeds(setDoc(doc(creator, 'lobbies/ABC234'), validLobby('ABC234', 'creator')))
    await assertSucceeds(getDocs(collection(creator, 'lobbies')))
  })

  it('keeps device writes scoped to the current device but allows the admin UI to list history', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })

    const own = testEnvironment.authenticatedContext('device-a').firestore()
    const other = testEnvironment.authenticatedContext('device-b').firestore()

    await assertSucceeds(
      setDoc(doc(own, 'lobbies/ABC234/devices/device-a'), validDevice('device-a')),
    )
    await assertFails(
      setDoc(doc(other, 'lobbies/ABC234/devices/device-a'), validDevice('device-a')),
    )
    await assertSucceeds(getDocs(collection(own, 'lobbies/ABC234/devices')))
  })

  it('allows shared app state only below an existing lobby', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })
    const participant = testEnvironment.authenticatedContext('participant').firestore()

    await assertSucceeds(
      setDoc(doc(participant, 'lobbies/ABC234/apps/scoreboard/state/default'), {
        score: 2,
      }),
    )
    await assertFails(
      setDoc(doc(participant, 'lobbies/ZZZ999/apps/scoreboard/state/default'), {
        score: 2,
      }),
    )
  })

  it('rejects an entire batch when one shared-app write violates the rules', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })
    const participant = testEnvironment.authenticatedContext('participant').firestore()
    const allowedState = doc(
      participant,
      'lobbies/ABC234/apps/scoreboard/state/default',
    )
    const rejectedState = doc(
      participant,
      'lobbies/ZZZ999/apps/scoreboard/state/default',
    )
    const batch = writeBatch(participant)
    batch.set(allowedState, { score: 2 })
    batch.set(rejectedState, { score: 2 })

    await assertFails(batch.commit())

    const snapshot = await assertSucceeds(getDoc(allowedState))
    expect(snapshot.exists()).toBe(false)
  })

  it('allows a custom lobby to be archived but never hard-deleted', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/ABC234'), {
        ...validLobby('ABC234', 'creator'),
        createdAt: new Date(),
      })
    })
    const creator = testEnvironment.authenticatedContext('creator').firestore()

    await assertSucceeds(
      updateDoc(doc(creator, 'lobbies/ABC234'), {
        deletedAt: serverTimestamp(),
        deletedAtClientIso: new Date().toISOString(),
        deletedByDeviceId: 'creator',
      }),
    )
    await assertFails(deleteDoc(doc(creator, 'lobbies/ABC234')))
    await assertFails(
      setDoc(doc(creator, 'lobbies/ABC234/apps/scoreboard/state/default'), {
        score: 3,
      }),
    )
  })

  it('never allows the global default lobby to be archived', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'lobbies/default'), {
        id: 'default',
        code: 'DEFAULT',
        name: 'Globale Lobby',
        kind: 'default',
        createdAt: new Date(),
        createdAtClientIso: new Date().toISOString(),
        createdByDeviceId: null,
      })
    })
    const user = testEnvironment.authenticatedContext('device-a').firestore()

    await assertFails(
      updateDoc(doc(user, 'lobbies/default'), {
        deletedAt: serverTimestamp(),
        deletedAtClientIso: new Date().toISOString(),
        deletedByDeviceId: 'device-a',
      }),
    )
  })
})
