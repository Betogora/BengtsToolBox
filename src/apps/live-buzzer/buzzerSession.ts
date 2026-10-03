import { collection, doc, getDocFromServer, getDocsFromServer } from 'firebase/firestore'
import { isBuzzerTeamId } from './teams'
import type { BuzzerBuzz, BuzzerPlayer, BuzzerSessionState } from './types'
import { recordBuzz } from './buzzerLogic'
import { getFirebaseServices } from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { readLocalValue } from '@/lib/firebase/localStore'

export type BuzzerSession = { state: BuzzerSessionState; players?: Record<string, BuzzerPlayer>; hostUid?: string }

export const initialBuzzerState: BuzzerSessionState = {
  roundId: null, buzzes: [], isOpen: false, winnerPlayerId: null, winnerTeamId: null,
  roundNumber: 0, lastBuzzedAt: null, lastBuzzedAtClientIso: null, history: [],
  firstReceivedAtMs: null, clockSyncId: null, clockSyncRequestedAtMs: null,
}

export function normalizeBuzzerState(state?: BuzzerSessionState): BuzzerSessionState {
  return { ...initialBuzzerState, ...state,
    buzzes: Object.values(state?.buzzes ?? {}).map((buzz) => ({ ...buzz, teamId: isBuzzerTeamId(buzz.teamId) ? buzz.teamId : null })),
    history: state?.history ?? [] }
}

export function normalizePlayer(player: BuzzerPlayer, index: number): BuzzerPlayer {
  const position = Number.isFinite(player.position) ? player.position : index + 1
  return {
    ...player, position, name: player.name?.trim() || `Person ${position}`,
    teamId: isBuzzerTeamId(player.teamId) ? player.teamId : null,
    isActive: player.isActive ?? true, buzzedAt: player.buzzedAt ?? null,
    buzzedAtClientIso: player.buzzedAtClientIso ?? null,
  }
}

export function recordSessionBuzz(current: BuzzerSession | null, roundId: string, candidate: BuzzerBuzz) {
  const player = current?.players?.[candidate.playerId]
  if (!current || !player || player.isActive === false) return undefined
  const remotePlayer = normalizePlayer({ ...player, id: candidate.playerId }, 0)
  const patch = recordBuzz(normalizeBuzzerState(current.state), roundId, {
    ...candidate, playerName: remotePlayer.name, teamId: remotePlayer.teamId,
  })
  return patch ? { ...current, state: { ...current.state, ...patch } } : undefined
}

export function readLocalBuzzer(lobbyId: string): BuzzerSession {
  const state = readLocalValue(`app-hub:doc:${firebasePaths.liveBuzzerState(lobbyId)}`, initialBuzzerState)
  const players = readLocalValue<BuzzerPlayer[]>(`app-hub:collection:${firebasePaths.liveBuzzerPlayers(lobbyId)}`, [])
  return { state: normalizeBuzzerState(state.value), players: Object.fromEntries(players.value.map((p, i) => [p.id, normalizePlayer(p, i)])) }
}

export async function loadExistingBuzzer(lobbyId: string): Promise<BuzzerSession> {
  const services = getFirebaseServices()!
  const [state, players] = await Promise.all([
    getDocFromServer(doc(services.db, firebasePaths.liveBuzzerState(lobbyId))),
    getDocsFromServer(collection(services.db, firebasePaths.liveBuzzerPlayers(lobbyId))),
  ])
  const seed = {
    state: normalizeBuzzerState(state.data() as BuzzerSessionState | undefined),
    players: Object.fromEntries(players.docs.map((p, i) => [p.id, normalizePlayer({ ...p.data(), id: p.id } as BuzzerPlayer, i)])),
  }
  // Keep existing fields; serialize Firestore timestamps for Realtime Database.
  return JSON.parse(JSON.stringify(seed)) as BuzzerSession
}
