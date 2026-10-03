import type { BuzzerBuzz, BuzzerSessionState } from './types'

export type ClockSample = {
  serverAtMidpointMs: number
  midpointMs: number
  uncertaintyMs: number
}

export const BUZZ_COLLECTION_MS = 800
export const CLOCK_RECENT_MS = 90_000

export function createClockSample(startMs: number, endMs: number, serverMs: number): ClockSample {
  return {
    serverAtMidpointMs: serverMs,
    midpointMs: (startMs + endMs) / 2,
    uncertaintyMs: (endMs - startMs) / 2,
  }
}

export function estimatePress(sample: ClockSample, nowMs: number) {
  return {
    pressedAtMs: sample.serverAtMidpointMs + nowMs - sample.midpointMs,
    // Allow clock drift between samples; network asymmetry remains uncertain.
    uncertaintyMs: sample.uncertaintyMs + Math.abs(nowMs - sample.midpointMs) * 0.001,
  }
}

export function orderBuzzes(buzzes: NonNullable<BuzzerSessionState['buzzes']>) {
  return Object.values(buzzes).sort((a, b) => a.pressedAtMs - b.pressedAtMs || a.playerId.localeCompare(b.playerId))
}

export function isLateBuzz(state: BuzzerSessionState, buzz: BuzzerBuzz) {
  return typeof state.firstReceivedAtMs === 'number' && buzz.receivedAtMs > state.firstReceivedAtMs + BUZZ_COLLECTION_MS
}

export function recordBuzz(state: BuzzerSessionState, roundId: string, buzz: BuzzerBuzz): Partial<BuzzerSessionState> | null {
  if (!state.isOpen || state.roundId !== roundId ||
    Object.values(state.buzzes ?? {}).some((entry) => entry.playerId === buzz.playerId)) return null

  const buzzes = Object.fromEntries(Object.values(state.buzzes ?? {}).map((entry) => [entry.playerId, entry]))
  return { buzzes: { ...buzzes, [buzz.playerId]: buzz }, firstReceivedAtMs: state.firstReceivedAtMs ?? buzz.receivedAtMs }
}

export function decideRound(state: BuzzerSessionState, nowMs: number): Partial<BuzzerSessionState> | null {
  if (!state.isOpen || state.winnerPlayerId || !state.roundId || typeof state.firstReceivedAtMs !== 'number' ||
    nowMs < state.firstReceivedAtMs + BUZZ_COLLECTION_MS) return null
  const first = orderBuzzes(Object.values(state.buzzes ?? {}).filter((buzz) => !isLateBuzz(state, buzz)))[0]
  if (!first) return null
  const result = {
    id: state.roundId,
    roundNumber: state.roundNumber,
    winnerPlayerId: first.playerId,
    winnerPlayerName: first.playerName,
    winnerTeamId: first.teamId ?? null,
    createdAt: new Date(first.pressedAtMs).toISOString(),
  }
  return {
    winnerPlayerId: first.playerId,
    winnerTeamId: first.teamId ?? null,
    lastBuzzedAtClientIso: result.createdAt,
    history: [result, ...(state.history ?? []).filter((entry) => entry.id !== state.roundId)].slice(0, 5),
  }
}
