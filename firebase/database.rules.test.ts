import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { get, goOffline, goOnline, ref, runTransaction, serverTimestamp, set, type Database } from 'firebase/database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialBuzzerState, loadExistingBuzzer, recordSessionBuzz, type BuzzerSession } from '../src/apps/live-buzzer/buzzerSession'
import type { BuzzerBuzz } from '../src/apps/live-buzzer/types'
import { decideRound, isLateBuzz } from '../src/apps/live-buzzer/buzzerLogic'
import { firebasePaths } from '../src/lib/firebase/paths'
import { updateRealtimeValue } from '../src/lib/firebase/realtimeDatabase'
import { doc, setDoc, getDoc, type Firestore } from 'firebase/firestore'

const client = vi.hoisted(() => ({ database: null as Database | null, firestore: null as Firestore | null, authFails: false }))
vi.mock('../src/lib/firebase/client', () => ({
  getFirebaseServices: () => ({ db: client.firestore }),
  ensureAnonymousUser: async () => {
    if (client.authFails) throw new Error('auth denied')
    return { uid: 'user' }
  },
}))

let environment: RulesTestEnvironment
const path = firebasePaths.liveBuzzerRealtime('ABC234')
const player = (i: number) => ({ id: `player-${i}`, position: i + 1, name: `Player ${i}`, teamId: 'red' as const, isActive: true, ownerUid: i == 0 ? 'host' : 'device-' + i, joinedAtMs: 1, clockSyncId: 'sync', clockSyncedAtMs: serverTimestamp() as unknown as number, buzzedAt: null, buzzedAtClientIso: null })
const session = (count = 20): BuzzerSession => ({
  hostUid: 'host', state: { ...initialBuzzerState, clockSyncId: 'sync', clockSyncRequestedAtMs: 1, roundId: 'round-1', roundNumber: 1, isOpen: true },
  players: Object.fromEntries(Array.from({ length: count }, (_, i) => [player(i).id, player(i)])),
})
const buzz = (i: number, pressedAtMs = 1000 + i * 100) => ({
  roundId: 'round-1', playerId: player(i).id, playerName: player(i).name, teamId: 'red' as const, pressedAtMs, uncertaintyMs: 10, receivedAtMs: serverTimestamp() as unknown as number,
})
const database = (uid: string) => environment.authenticatedContext(uid).database() as unknown as Database

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-buzzer-realtime',
    database: { rules: readFileSync('firebase/database.rules.json', 'utf8') },
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
  })
})
beforeEach(async () => { client.authFails = false; await environment.clearDatabase(); await environment.clearFirestore() })
afterAll(async () => { await environment.cleanup() })

describe('Live-Buzzer Realtime Database', () => {
  it('isolates four lobbies with twenty simultaneous candidates and freezes their winner', async () => {
    const paths = Array.from({ length: 4 }, (_, i) => firebasePaths.liveBuzzerRealtime('lobby-' + i))
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.database() as unknown as Database
      await Promise.all(paths.map((path) => set(ref(db, path), session())))
    })
    await Promise.all(paths.flatMap((path) => Array.from({ length: 20 }, async (_, i) => {
      const db = database(i === 0 ? 'host' : 'device-' + i)
      await get(ref(db, path))
      const result = await updateRealtimeValue<BuzzerBuzz | null>(db, path + '/state/buzzes/' + player(i).id, (current) => current ? undefined : buzz(i))
      expect(result.committed).toBe(true)
    })))
    await new Promise((resolve) => setTimeout(resolve, 850))
    for (const path of paths) {
      const decider = database('host')
      await get(ref(decider, path))
      await updateRealtimeValue<BuzzerSession>(decider, path, (current) => ({ ...current, state: { ...current.state, firstReceivedAtMs: Math.min(...Object.values(current.state.buzzes ?? {}).map((b) => b.receivedAtMs)) } }))
      await updateRealtimeValue<BuzzerSession>(decider, path, (current) => {
        const patch = decideRound(current.state, Date.now())
        return patch ? { ...current, state: { ...current.state, ...patch } } : undefined
      })
      const result = (await get(ref(database('fresh'), path))).val() as BuzzerSession
      expect(Object.keys(result.state.buzzes ?? {})).toHaveLength(20)
      expect(result.state.winnerPlayerId).toBe('player-0')
      expect(result.state.history).toHaveLength(1)
    }
  })

  it('accepts late presses but rejects early decisions and winner changes', async () => {
    await environment.withSecurityRulesDisabled(async (context) => set(ref(context.database() as unknown as Database, path), session()))
    const host = database('host')
    await get(ref(host, path))
    await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0)))
    await assertFails(set(ref(host, path + '/state/winnerPlayerId'), 'player-0'))
    await new Promise((resolve) => setTimeout(resolve, 850))
    await updateRealtimeValue<BuzzerSession>(host, path, (current) => ({ ...current, state: { ...current.state, ...decideRound(current.state, Date.now()) } }))
    const lateDevice = database('device-1')
    await get(ref(lateDevice, path))
    await updateRealtimeValue<BuzzerSession>(lateDevice, path, (current) => recordSessionBuzz(current, 'round-1', buzz(1, 900)))
    const current = (await get(ref(host, path))).val() as BuzzerSession
    expect(current.state.winnerPlayerId).toBe('player-0')
    expect(isLateBuzz(current.state, Object.values(current.state.buzzes!)[1])).toBe(true)
    await assertFails(set(ref(database('device-1'), path + '/state/winnerPlayerId'), 'player-1'))
    await assertFails(set(ref(host, path + '/state/buzzes/player-0/pressedAtMs'), 1))
    await assertFails(set(ref(host, path + '/state/buzzes/duplicate'), buzz(0)))
  })

  it('lets the eighth device claim the free host role, then protects it and round controls', async () => {
    const first = database('device-0')
    await set(ref(first, path), { state: initialBuzzerState })
    for (let i = 0; i < 8; i++) {
      const uid = 'device-' + i
      await set(ref(database(uid), path + '/players/player-' + i), { ...player(i), ownerUid: uid })
    }
    const host = database('device-7')
    await assertSucceeds(set(ref(host, path + '/hostUid'), 'device-7'))
    await assertFails(set(ref(first, path + '/hostUid'), 'device-0'))
    await assertFails(set(ref(first, path + '/hostUid'), null))
    await assertFails(set(ref(first, path + '/state/isOpen'), true))
    await assertFails(set(ref(first, path + '/state/roundId'), 'stolen'))
    await assertFails(set(ref(first, path + '/state/clockSyncId'), 'stolen'))
    await assertSucceeds(set(ref(host, path + '/state/clockSyncId'), 'approved'))
    await assertFails(set(ref(first, path + '/players/player-7/name'), 'stolen'))
    await assertFails(set(ref(first, path + '/players/player-7/clockSyncId'), 'fake'))
  })

  it('rejects stale rounds, duplicate presses, missing players and confirmed results', async () => {
    const host = database('host')
    await environment.withSecurityRulesDisabled(async (context) => set(ref(context.database() as unknown as Database, path), session()))
    await get(ref(host, path))
    expect((await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'old-round', buzz(0)))).committed).toBe(false)
    expect((await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'round-1', buzz(99)))).committed).toBe(false)
    await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0)))
    expect((await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0)))).committed).toBe(false)
    await set(ref(host, `${path}/state/isOpen`), false)
    expect((await updateRealtimeValue<BuzzerSession>(host, path, (current) => recordSessionBuzz(current, 'round-1', buzz(1)))).committed).toBe(false)
  })

  it('denies unsigned writes and invalid data, and confines clock probes to their owner', async () => {
    const anonymous = environment.unauthenticatedContext().database() as unknown as Database
    await assertFails(set(ref(anonymous, path), session()))
    const host = database('host')
    await assertSucceeds(set(ref(host, path), session(1)))
    await assertFails(set(ref(host, `${path}/state/isOpen`), 'invalid'))
    const clockPath = firebasePaths.liveBuzzerClock('host', 'probe')
    await assertSucceeds(set(ref(host, clockPath), { serverAt: serverTimestamp() }))
    await assertFails(get(ref(database('other'), clockPath)))
    await assertFails(set(ref(database('other'), clockPath), { serverAt: serverTimestamp() }))
    await assertFails(set(ref(host, clockPath), { serverAt: 1 }))
  })

  it('handles auth and rules failures, refuses offline writes, and resumes on reconnection', async () => {
    const host = database('host')
    await set(ref(host, path), session(1))
    client.database = host
    client.authFails = true
    await expect(updateRealtimeValue<BuzzerSession>(client.database!, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0))))
      .rejects.toMatchObject({ source: 'auth' })
    client.authFails = false
    goOffline(host)
    await expect(updateRealtimeValue<BuzzerSession>(client.database!, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0))))
      .rejects.toMatchObject({ code: 'network-unavailable' })
    goOnline(host)
    await get(ref(host, path))
    await updateRealtimeValue<BuzzerSession>(client.database!, path, (current) => recordSessionBuzz(current, 'round-1', buzz(0)))
    expect((await get(ref(host, `${path}/state/buzzes/player-0/playerId`))).val()).toBe('player-0')
    const unsigned = environment.unauthenticatedContext().database() as unknown as Database
    client.database = unsigned
    await expect(updateRealtimeValue<BuzzerSession>(client.database!, path, (current) => current)).rejects.toBeDefined()
  })

  it('copies existing Firestore data once without deleting originals or overwriting a live session', async () => {
    const context = environment.authenticatedContext('host')
    client.firestore = context.firestore() as unknown as Firestore
    const statePath = firebasePaths.liveBuzzerState()
    const playerPath = firebasePaths.liveBuzzerPlayer('default', 'player-0')
    await setDoc(doc(client.firestore, statePath), { ...initialBuzzerState, roundNumber: 7, custom: 'preserved' })
    await setDoc(doc(client.firestore, playerPath), { ...player(0), ownerUid: 'host' })
    const seed = await loadExistingBuzzer('default')
    const reference = ref(database('host'), firebasePaths.liveBuzzerRealtime())
    await runTransaction(reference, (current) => current ?? seed)
    expect((await get(reference)).child('state/custom').val()).toBe('preserved')
    await set(ref(database('host'), `${firebasePaths.liveBuzzerRealtime()}/hostUid`), 'host')
    await set(ref(database('host'), `${firebasePaths.liveBuzzerRealtime()}/state/roundNumber`), 8)
    await runTransaction(reference, (current) => current ?? seed)
    expect((await get(reference)).child('state/roundNumber').val()).toBe(8)
    expect((await getDoc(doc(client.firestore, statePath))).data()?.roundNumber).toBe(7)
    expect((await getDoc(doc(client.firestore, playerPath))).exists()).toBe(true)
  })
})
