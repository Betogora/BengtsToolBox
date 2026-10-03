import { describe, expect, it, vi } from 'vitest'
import { BUZZ_COLLECTION_MS, createClockSample, decideRound, estimatePress, isLateBuzz, orderBuzzes, recordBuzz } from './buzzerLogic'
import type { BuzzerBuzz, BuzzerSessionState } from './types'

const initial: BuzzerSessionState = {
  roundId: 'round-1', roundNumber: 1, isOpen: true, buzzes: [],
  winnerPlayerId: null, winnerTeamId: null, lastBuzzedAt: null,
  lastBuzzedAtClientIso: null, history: [],
}
const buzz = (id: string, time: number, receivedAtMs = 1100): BuzzerBuzz => ({
  playerId: id, playerName: id, teamId: 'red', pressedAtMs: time, uncertaintyMs: 10, receivedAtMs,
})
const add = (state: BuzzerSessionState, candidate: BuzzerBuzz) => ({ ...state, ...recordBuzz(state, 'round-1', candidate) })

describe('distributed buzz timing', () => {
  it('collects silently and decides by press time after the server arrival window', () => {
    const first = add(initial, buzz('fast-network', 1000, 1100))
    const next = add(first, buzz('slow-network', 900, 1700))
    expect(next.winnerPlayerId).toBeNull()
    expect(next.history).toHaveLength(0)
    expect(decideRound(next, 1100 + BUZZ_COLLECTION_MS - 1)).toBeNull()
    const decided = { ...next, ...decideRound(next, 1900) }
    expect(decided.winnerPlayerId).toBe('slow-network')
    expect(decided.history).toHaveLength(1)
  })
  it('retains twelve candidates and sorts independently of arrival order', () => {
    let state = initial
    for (let index = 11; index >= 0; index--) state = add(state, buzz(`player-${index}`, 1000 + index))
    expect(Object.keys(state.buzzes!)).toHaveLength(12)
    expect(orderBuzzes(state.buzzes!)[0].playerId).toBe('player-0')
    expect(decideRound(state, 1900)?.winnerPlayerId).toBe('player-0')
  })
  it('rejects duplicates, closed rounds and previous round IDs', () => {
    const state = add(initial, buzz('a', 1000))
    expect(recordBuzz(state, 'round-1', buzz('a', 900))).toBeNull()
    expect(recordBuzz({ ...state, isOpen: false }, 'round-1', buzz('b', 800))).toBeNull()
    expect(recordBuzz({ ...initial, roundId: 'round-2' }, 'round-1', buzz('b', 800))).toBeNull()
  })
  it('uses stable IDs for equal estimated press times, independent of arrival order', () => {
    for (const ids of [['a', 'b'], ['b', 'a']]) {
      const state = ids.reduce((state, id) => add(state, buzz(id, 1000)), initial)
      expect(decideRound(state, 1900)?.winnerPlayerId).toBe('a')
    }
  })
  it('registers late presses without changing a frozen winner or its history', () => {
    const collected = add(initial, buzz('a', 1000))
    const decided = { ...collected, ...decideRound(collected, 1900) }
    const late = add(decided, buzz('b', 900, 1901))
    expect(isLateBuzz(late, Object.values(late.buzzes!)[1])).toBe(true)
    expect(late.winnerPlayerId).toBe('a')
    expect(late.history).toEqual(decided.history)
    expect(decideRound(late, 3000)).toBeNull()
  })
  it('excludes arrivals beyond the deadline even if finalization itself was delayed', () => {
    const state = add(add(initial, buzz('a', 1000)), buzz('b', 900, 1901))
    expect(decideRound(state, 4000)?.winnerPlayerId).toBe('a')
    expect(isLateBuzz(state, buzz('c', 1000, 1900))).toBe(false)
  })
  it('uses monotonic time despite a changed phone clock', () => {
    const sample = createClockSample(100, 200, 1_000_000)
    const phoneClock = vi.spyOn(Date, 'now').mockReturnValue(9_000_000)
    expect(estimatePress(sample, 300)).toEqual({ pressedAtMs: 1_000_150, uncertaintyMs: 50.15 })
    phoneClock.mockRestore()
  })
  it('decides an unassigned player when Realtime Database omitted the null team field', () => {
    const candidate = buzz('no-team', 1000)
    delete (candidate as Partial<BuzzerBuzz>).teamId
    const decision = decideRound(add(initial, candidate), 1900)
    expect(decision?.winnerTeamId).toBeNull()
    expect(decision?.history?.[0].winnerTeamId).toBeNull()
  })
  it('keeps five distinct rounds when automatically deciding', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      id: `previous-${i}`, roundNumber: i, winnerPlayerId: 'a', winnerPlayerName: 'a',
      winnerTeamId: null, createdAt: '2026-10-02T10:00:00.000Z',
    }))
    const state = add({ ...initial, history }, buzz('b', 1000))
    expect(decideRound(state, 1900)?.history?.map((r) => r.id)).toEqual(['round-1', 'previous-0', 'previous-1', 'previous-2', 'previous-3'])
  })
})
