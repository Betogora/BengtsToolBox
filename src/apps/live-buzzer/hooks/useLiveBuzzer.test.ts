import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recordSessionBuzz, initialBuzzerState, type BuzzerSession } from '../buzzerSession'
import { createSyncError, syncFailure, syncSuccess } from '@/lib/firebase/syncError'

const mock = vi.hoisted(() => ({ current: {} as BuzzerSession, change: vi.fn(), remote: vi.fn(), error: false }))
vi.mock('@/lib/firebase/useRealtimeDatabaseDoc', () => ({
  useRealtimeDatabaseDoc: () => ({ data: mock.current, change: mock.change, isLoading: false, isPending: false,
    isRealtime: true, online: true, error: null }),
}))
vi.mock('@/lib/firebase/realtimeDatabase', () => ({ getRealtimeDatabase: async () => ({}), updateRealtimeValue: (...args: unknown[]) => mock.remote(...args) }))
vi.mock('@/lib/firebase/localStore', () => ({
  readLocalValue: (key: string, fallback: unknown) => ({ ok: true, value: key.endsWith('player-id') ? 'player-1' : fallback }),
  writeLocalValue: () => ({ ok: true }),
}))
vi.mock('@/lib/firebase/useAnonymousSession', () => ({ useAnonymousSession: () => ({ userId: 'user', isReady: true, error: null }) }))
vi.mock('@/lobbies/LobbyContext', () => ({ useActiveLobbyId: (id?: string) => id ?? 'default' }))
vi.mock('./useBuzzerClock', () => ({ useBuzzerClock: () => ({
  clock: { serverAtMidpointMs: Date.now(), midpointMs: performance.now(), uncertaintyMs: 10 }, error: null,
}) }))
import { useLiveBuzzer } from './useLiveBuzzer'

function buzzer() {
  let app!: ReturnType<typeof useLiveBuzzer>
  function Probe() { app = useLiveBuzzer(); return null }
  renderToStaticMarkup(createElement(Probe))
  return app
}

beforeEach(() => {
  mock.error = false
  mock.current = {
    state: { ...initialBuzzerState, roundId: 'round-1', roundNumber: 1, isOpen: true, clockSyncId: 'sync', clockSyncRequestedAtMs: 1 },
    players: { 'player-1': { id: 'player-1', name: 'Bengt', position: 1, ownerUid: 'user', joinedAtMs: 1, clockSyncId: 'sync', clockSyncedAtMs: Date.now(), isActive: true, teamId: 'red', buzzedAt: null, buzzedAtClientIso: null } },
  }
  mock.remote.mockReset().mockImplementation(async (_db, _path, update) => {
    if (mock.error) throw new Error('denied')
    const candidate = update(null)
    if (mock.current.players?.[candidate.playerId]?.ownerUid !== 'user') return { committed: false }
    const next = recordSessionBuzz(mock.current, candidate.roundId, candidate)
    if (next) mock.current = next
    return { committed: Boolean(next) }
  })
  mock.change.mockReset().mockImplementation(async (update: (value: BuzzerSession) => BuzzerSession | undefined) => {
    if (mock.error) return syncFailure(false, createSyncError(new Error('denied'), 'realtime-database', 'save'))
    const next = update(mock.current)
    if (next) mock.current = next
    return syncSuccess(Boolean(next))
  })
})

describe('Live-Buzzer remote checks', () => {
  it('handles a denied write and permits an explicit retry', async () => {
    const app = buzzer()
    mock.error = true
    expect(await app.buzz()).toBe('sync-error')
    expect(mock.current.state.winnerPlayerId).toBeNull()
    mock.error = false
    expect(await app.buzz()).toBe('saved')
  })
  it.each(['missing', 'inactive'])('does not recreate a %s remote player', async (mode) => {
    const app = buzzer()
    if (mode === 'missing') mock.current.players = {}
    else mock.current.players!['player-1'].isActive = false
    expect(await app.buzz()).toBe('blocked')
    expect(mock.current.state.winnerPlayerId).toBeNull()
  })
  it('normalizes incomplete remote player data', async () => {
    const app = buzzer()
    mock.current.players!['player-1'] = { position: 1, ownerUid: 'user', clockSyncId: 'sync' } as never
    expect(await app.buzz()).toBe('saved')
    expect(mock.current.state.winnerTeamId).toBeNull()
  })
  it('rejects a press from a previous round', async () => {
    const app = buzzer()
    mock.current.state.roundId = 'round-2'
    expect(await app.buzz()).toBe('blocked')
  })
  it('blocks repeated presses before React rerenders', async () => {
    const app = buzzer()
    const first = app.buzz()
    expect(await app.buzz()).toBe('blocked')
    expect(await first).toBe('saved')
    expect(mock.remote).toHaveBeenCalledTimes(1)
  })
  it('keeps stored buzz keys when the host starts another clock sync', async () => {
    mock.current.hostUid = 'user'
    const app = buzzer()
    expect(await app.buzz()).toBe('saved')
    const storedBuzzes = mock.current.state.buzzes
    expect(await app.startClockSync()).toMatchObject({ ok: true, value: true })
    expect(mock.current.state.buzzes).toBe(storedBuzzes)
    expect(mock.current.state.isOpen).toBe(false)
    expect(mock.current.state.clockSyncId).not.toBe('sync')
  })
})
