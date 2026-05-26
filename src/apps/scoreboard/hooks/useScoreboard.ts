import { useEffect, useMemo } from 'react'

import type {
  ScoreboardEvent,
  ScoreboardPlayer,
  ScoreboardState,
} from '@/apps/scoreboard/types'
import { appTeams, isTeamId, type TeamId } from '@/apps/shared/teams'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const eventLimit = 10

const initialState: ScoreboardState = {
  title: 'Spieleabend',
  roundName: 'Runde 1',
  events: [],
  lastScoreEventId: null,
}

const defaultPlayers: ScoreboardPlayer[] = [
  {
    id: 'person-1',
    name: 'Person 1',
    score: 0,
    teamId: 'blue',
    position: 1,
  },
  {
    id: 'person-2',
    name: 'Person 2',
    score: 0,
    teamId: 'yellow',
    position: 2,
  },
]

function createRandomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fallbackPlayerName(player: Pick<ScoreboardPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Person ${Number.isFinite(position) ? position : 1}`
}

function sanitizeName(
  name: string,
  player: Pick<ScoreboardPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

function getTeamColor(teamId: TeamId | null) {
  if (teamId === 'blue') {
    return '#3b82f6'
  }

  if (teamId === 'yellow') {
    return '#facc15'
  }

  return '#557079'
}

function normalizePlayer(
  player: ScoreboardPlayer,
  index: number,
): ScoreboardPlayer {
  const position = Number.isFinite(Number(player.position))
    ? Number(player.position)
    : index + 1

  return {
    ...player,
    position,
    name: sanitizeName(player.name ?? '', { id: player.id, position }),
    teamId: isTeamId(player.teamId) ? player.teamId : null,
    score: Math.max(0, Math.floor(Number(player.score) || 0)),
  }
}

function normalizeState(state: ScoreboardState): ScoreboardState {
  return {
    ...initialState,
    ...state,
    title: state.title?.trim() || initialState.title,
    roundName: state.roundName?.trim() || initialState.roundName,
    events: (state.events ?? [])
      .map((event, index) => ({
        ...event,
        playerTeamId: isTeamId(event.playerTeamId) ? event.playerTeamId : null,
        playerColor: event.playerColor || getTeamColor(event.playerTeamId),
        delta: Math.trunc(Number(event.delta) || 0),
        previousScore: Math.max(0, Math.trunc(Number(event.previousScore) || 0)),
        nextScore: Math.max(0, Math.trunc(Number(event.nextScore) || 0)),
        createdAtClientIso: event.createdAtClientIso || new Date().toISOString(),
        position: Number.isFinite(Number(event.position))
          ? Number(event.position)
          : index + 1,
      }))
      .slice(0, eventLimit),
    lastScoreEventId: state.lastScoreEventId ?? null,
  }
}

export function useScoreboard(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.scoreboardState(sessionId),
    [sessionId],
  )
  const playersPath = useMemo(
    () => firebasePaths.scoreboardPlayers(sessionId),
    [sessionId],
  )
  const stateStore = useFirestoreDoc<ScoreboardState>(statePath, initialState)
  const playersStore = useFirestoreCollection<ScoreboardPlayer>(
    playersPath,
    defaultPlayers,
  )

  const state = useMemo(() => normalizeState(stateStore.data), [stateStore.data])
  const players = useMemo(
    () => playersStore.data.map(normalizePlayer),
    [playersStore.data],
  )
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (left, right) =>
          right.score - left.score ||
          left.position - right.position ||
          left.name.localeCompare(right.name),
      ),
    [players],
  )
  const leader = sortedPlayers[0] ?? null
  const totalScore = players.reduce((sum, player) => sum + player.score, 0)
  const teamSummaries = useMemo(
    () =>
      appTeams.map((team) => {
        const teamPlayers = players.filter((player) => player.teamId === team.id)

        return {
          ...team,
          memberCount: teamPlayers.length,
          score: teamPlayers.reduce((sum, player) => sum + player.score, 0),
        }
      }),
    [players],
  )
  const unassignedPlayers = useMemo(
    () => players.filter((player) => !player.teamId),
    [players],
  )
  const unassignedScore = unassignedPlayers.reduce(
    (sum, player) => sum + player.score,
    0,
  )

  useEffect(() => {
    if (playersStore.isLoading || playersStore.data.length > 0) {
      return
    }

    playersStore.saveItems(
      defaultPlayers.map((player) => ({
        ...player,
        updatedBy: session.userId,
        lastUpdatedBy: session.userId,
      })),
    )
  }, [playersStore, session.userId])

  const updateTitle = (title: string) =>
    stateStore.merge({
      title: title.trim() || initialState.title,
      updatedBy: session.userId,
    })

  const updateRoundName = (roundName: string) =>
    stateStore.merge({
      roundName: roundName.trim() || initialState.roundName,
      updatedBy: session.userId,
    })

  const addPlayer = () => {
    const nextPosition =
      players.reduce((max, player) => Math.max(max, player.position), 0) + 1
    const id = `person-${nextPosition}`

    return playersStore.setItem(id, {
      name: `Person ${nextPosition}`,
      score: 0,
      teamId: null,
      position: nextPosition,
      updatedBy: session.userId,
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerName = (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      name: sanitizeName(name, player),
      updatedBy: session.userId,
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerTeam = (playerId: string, teamId: TeamId | null) =>
    playersStore.mergeItem(playerId, {
      teamId,
      updatedBy: session.userId,
      lastUpdatedBy: session.userId,
    })

  const removePlayer = (playerId: string) => playersStore.deleteItem(playerId)

  const changeScore = async (playerId: string, delta: number) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return 'missing' as const
    }

    const normalizedDelta = Math.trunc(delta)

    if (normalizedDelta === 0) {
      return 'blocked' as const
    }

    const nextScore = Math.max(0, player.score + normalizedDelta)
    const actualDelta = nextScore - player.score

    if (actualDelta === 0) {
      return 'blocked' as const
    }

    const nextPosition =
      state.events.reduce((max, event) => Math.max(max, event.position), 0) + 1
    const event: ScoreboardEvent = {
      id: `score-${createRandomId()}`,
      playerId: player.id,
      playerName: player.name,
      playerColor: getTeamColor(player.teamId),
      playerTeamId: player.teamId,
      delta: actualDelta,
      previousScore: player.score,
      nextScore,
      createdAtClientIso: new Date().toISOString(),
      position: nextPosition,
      updatedBy: session.userId,
    }

    await playersStore.mergeItem(player.id, {
      score: nextScore,
      updatedBy: session.userId,
      lastUpdatedBy: session.userId,
    })
    await stateStore.merge({
      events: [event, ...state.events].slice(0, eventLimit),
      lastScoreEventId: event.id,
      updatedBy: session.userId,
    })

    return 'saved' as const
  }

  const undoLastScoreChange = async () => {
    const event =
      state.events.find((entry) => entry.id === state.lastScoreEventId) ??
      state.events[0]

    if (!event) {
      return 'empty' as const
    }

    const player = players.find((entry) => entry.id === event.playerId)

    if (!player) {
      return 'missing' as const
    }

    const remainingEvents = state.events.filter((entry) => entry.id !== event.id)

    await playersStore.mergeItem(player.id, {
      score: event.previousScore,
      updatedBy: session.userId,
      lastUpdatedBy: session.userId,
    })
    await stateStore.merge({
      events: remainingEvents,
      lastScoreEventId: remainingEvents[0]?.id ?? null,
      updatedBy: session.userId,
    })

    return 'undone' as const
  }

  const resetScores = async () => {
    await playersStore.saveItems(
      players.map((player) => ({
        ...player,
        score: 0,
        updatedBy: session.userId,
        lastUpdatedBy: session.userId,
      })),
    )
    await stateStore.merge({
      events: [],
      lastScoreEventId: null,
      updatedBy: session.userId,
    })
  }

  return {
    addPlayer,
    changeScore,
    error: stateStore.error ?? playersStore.error,
    isLoading: stateStore.isLoading || playersStore.isLoading,
    isRealtime: stateStore.isRealtime && playersStore.isRealtime,
    leader,
    players,
    recentEvents: state.events,
    removePlayer,
    resetScores,
    session,
    sortedPlayers,
    state,
    teamSummaries,
    totalScore,
    unassignedPlayers,
    unassignedScore,
    undoLastScoreChange,
    updatePlayerName,
    updatePlayerTeam,
    updateRoundName,
    updateTitle,
  }
}
