import { useEffect, useMemo, useRef, useState } from 'react'

import {
  createScoreboardPlayer,
  createScoreboardTeam,
  getScoreboardHistory,
  getScoreboardStandings,
  getScoreboardTargets,
  getScoringEvents,
  hasTeamEvents,
  hasTargetEvents,
  isValidScoreDelta,
  normalizeScoreboardPlayer,
  normalizeScoreboardTeam,
  sanitizeScoreboardName,
  scoreboardSchemaVersion,
  sortScoreboardPlayers,
} from '@/apps/scoreboard/logic'
import type {
  ScoreboardMode,
  ScoreboardPlayer,
  ScoreboardScoreEvent,
  ScoreboardScoring,
  ScoreboardState,
  ScoreboardTeam,
  ScoreTargetType,
} from '@/apps/scoreboard/types'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const initialPlayerOneId = 'player-initial-1'
const initialPlayerTwoId = 'player-initial-2'
const initialTeamOneId = 'team-initial-1'
const initialTeamTwoId = 'team-initial-2'
const initialScoringId = 'scoring-initial'
const initialCreatedAt = new Date().toISOString()

function formatScoringName(value: string) {
  const date = new Date(value)

  return `Scoring ${new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)}`
}

const initialPlayers: ScoreboardPlayer[] = [
  {
    id: initialPlayerOneId,
    name: 'Spieler 1',
    color: '#0D8E90',
    position: 1,
    teamId: initialTeamOneId,
  },
  {
    id: initialPlayerTwoId,
    name: 'Spieler 2',
    color: '#FD7261',
    position: 2,
    teamId: initialTeamTwoId,
  },
]

const initialTeams: ScoreboardTeam[] = [
  {
    id: initialTeamOneId,
    name: 'Team 1',
    color: '#0D8E90',
    position: 1,
  },
  {
    id: initialTeamTwoId,
    name: 'Team 2',
    color: '#FD7261',
    position: 2,
  },
]

const initialScoring: ScoreboardScoring = {
  id: initialScoringId,
  name: formatScoringName(initialCreatedAt),
  mode: 'individual',
  status: 'active',
  position: 1,
  createdAtClientIso: initialCreatedAt,
  archivedAtClientIso: null,
  playerSnapshot: [],
  teamSnapshot: [],
}

const initialState: ScoreboardState = {
  schemaVersion: scoreboardSchemaVersion,
  activeScoringId: initialScoringId,
}

function normalizeScoring(scoring: ScoreboardScoring, index: number): ScoreboardScoring {
  const position = Number.isFinite(Number(scoring.position))
    ? Math.max(1, Math.trunc(Number(scoring.position)))
    : index + 1

  return {
    ...scoring,
    name: sanitizeScoreboardName(scoring.name ?? '', `Scoring ${position}`),
    mode: scoring.mode === 'teams' ? 'teams' : 'individual',
    status: scoring.status === 'archived' ? 'archived' : 'active',
    position,
    createdAtClientIso: scoring.createdAtClientIso || new Date(0).toISOString(),
    archivedAtClientIso: scoring.archivedAtClientIso ?? null,
    playerSnapshot: (scoring.playerSnapshot ?? []).map(normalizeScoreboardPlayer),
    teamSnapshot: (scoring.teamSnapshot ?? []).map(normalizeScoreboardTeam),
  }
}

function normalizeScoreEvent(event: ScoreboardScoreEvent): ScoreboardScoreEvent {
  const createdAtClientMs = Number.isFinite(Number(event.createdAtClientMs))
    ? Number(event.createdAtClientMs)
    : Date.parse(event.createdAtClientIso) || 0

  return {
    ...event,
    targetType: event.targetType === 'team' ? 'team' : 'player',
    targetName: event.targetName?.trim() || '-',
    creditedTeamId:
      typeof event.creditedTeamId === 'string' && event.creditedTeamId
        ? event.creditedTeamId
        : null,
    delta: Math.trunc(Number(event.delta) || 0),
    createdAtClientIso:
      event.createdAtClientIso || new Date(createdAtClientMs).toISOString(),
    createdAtClientMs,
  }
}

export function useScoreboard(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const [isInitializing, setIsInitializing] = useState(true)
  const [initializationError, setInitializationError] = useState<Error | null>(null)
  const initializedLobbyRef = useRef<string | null>(null)
  const statePath = useMemo(
    () => firebasePaths.scoreboardState(activeLobbyId),
    [activeLobbyId],
  )
  const playersPath = useMemo(
    () => firebasePaths.scoreboardPlayers(activeLobbyId),
    [activeLobbyId],
  )
  const teamsPath = useMemo(
    () => firebasePaths.scoreboardTeams(activeLobbyId),
    [activeLobbyId],
  )
  const scoringsPath = useMemo(
    () => firebasePaths.scoreboardScorings(activeLobbyId),
    [activeLobbyId],
  )
  const eventsPath = useMemo(
    () => firebasePaths.scoreboardEvents(activeLobbyId),
    [activeLobbyId],
  )
  const stateStore = useFirestoreDoc<ScoreboardState>(statePath, initialState)
  const playersStore = useFirestoreCollection<ScoreboardPlayer>(playersPath, initialPlayers)
  const teamsStore = useFirestoreCollection<ScoreboardTeam>(teamsPath, initialTeams)
  const scoringsStore = useFirestoreCollection<ScoreboardScoring>(
    scoringsPath,
    [initialScoring],
  )
  const eventsStore = useFirestoreCollection<ScoreboardScoreEvent>(
    eventsPath,
    [],
    'createdAtClientMs',
  )
  const storesAreLoading =
    stateStore.isLoading ||
    playersStore.isLoading ||
    teamsStore.isLoading ||
    scoringsStore.isLoading ||
    eventsStore.isLoading

  useEffect(() => {
    if (storesAreLoading || initializedLobbyRef.current === activeLobbyId) {
      return
    }

    initializedLobbyRef.current = activeLobbyId
    setIsInitializing(true)
    setInitializationError(null)

    const initialize = async () => {
      const hasLegacyPlayers = playersStore.data.some((player) => {
        const legacyPlayer = player as ScoreboardPlayer & { score?: unknown }

        return typeof legacyPlayer.color !== 'string' || legacyPlayer.score !== undefined
      })
      const isLegacy =
        (stateStore.data as Partial<ScoreboardState>).schemaVersion !==
          scoreboardSchemaVersion || hasLegacyPlayers

      if (isLegacy) {
        await Promise.all([
          playersStore.clearItems(),
          teamsStore.clearItems(),
          scoringsStore.clearItems(),
          eventsStore.clearItems(),
        ])
        await Promise.all([
          playersStore.saveItems(initialPlayers),
          teamsStore.saveItems(initialTeams),
          scoringsStore.saveItems([initialScoring]),
        ])
        await stateStore.save({
          ...initialState,
          updatedBy: session.userId,
        })
        return
      }

      const writes: Promise<void>[] = []

      if (playersStore.data.length === 0) {
        writes.push(playersStore.saveItems(initialPlayers))
      }
      if (teamsStore.data.length === 0) {
        writes.push(teamsStore.saveItems(initialTeams))
      }
      if (scoringsStore.data.length === 0) {
        writes.push(scoringsStore.saveItems([initialScoring]))
      }

      await Promise.all(writes)

      const hasActiveScoring = scoringsStore.data.some(
        (scoring) => scoring.id === stateStore.data.activeScoringId,
      )

      if (!hasActiveScoring && scoringsStore.data.length > 0) {
        const fallbackScoring =
          scoringsStore.data.find((scoring) => scoring.status === 'active') ??
          scoringsStore.data.at(-1)

        if (fallbackScoring) {
          await stateStore.save({
            schemaVersion: scoreboardSchemaVersion,
            activeScoringId: fallbackScoring.id,
            updatedBy: session.userId,
          })
        }
      }
    }

    void initialize()
      .catch((error: unknown) => {
        setInitializationError(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => setIsInitializing(false))
  }, [
    activeLobbyId,
    eventsStore,
    playersStore,
    scoringsStore,
    session.userId,
    stateStore,
    storesAreLoading,
    teamsStore,
  ])

  const players = useMemo(
    () => playersStore.data.map(normalizeScoreboardPlayer),
    [playersStore.data],
  )
  const teams = useMemo(
    () => teamsStore.data.map(normalizeScoreboardTeam),
    [teamsStore.data],
  )
  const scorings = useMemo(
    () => scoringsStore.data.map(normalizeScoring),
    [scoringsStore.data],
  )
  const events = useMemo(
    () => eventsStore.data.map(normalizeScoreEvent),
    [eventsStore.data],
  )
  const activeScoring =
    scorings.find((scoring) => scoring.id === stateStore.data.activeScoringId) ??
    scorings.find((scoring) => scoring.status === 'active') ??
    initialScoring
  const activeEvents = useMemo(
    () => getScoringEvents(events, activeScoring.id),
    [activeScoring.id, events],
  )
  const playerTargets = useMemo(
    () => getScoreboardTargets('individual', players, teams),
    [players, teams],
  )
  const teamTargets = useMemo(
    () => getScoreboardTargets('teams', players, teams),
    [players, teams],
  )
  const playerStandings = useMemo(
    () => getScoreboardStandings(playerTargets, activeEvents),
    [activeEvents, playerTargets],
  )
  const teamStandings = useMemo(
    () => getScoreboardStandings(teamTargets, activeEvents),
    [activeEvents, teamTargets],
  )
  const targets = activeScoring.mode === 'teams' ? teamTargets : playerTargets
  const standings = activeScoring.mode === 'teams' ? teamStandings : playerStandings
  const rosterPlayers = useMemo(
    () => sortScoreboardPlayers(players, teams, playerStandings),
    [playerStandings, players, teams],
  )
  const history = useMemo(() => getScoreboardHistory(activeEvents), [activeEvents])
  const archivedScorings = useMemo(
    () =>
      scorings
        .filter((scoring) => scoring.status === 'archived')
        .sort(
          (left, right) =>
            Date.parse(right.archivedAtClientIso ?? right.createdAtClientIso) -
            Date.parse(left.archivedAtClientIso ?? left.createdAtClientIso),
        ),
    [scorings],
  )
  const archiveViews = useMemo(
    () =>
      archivedScorings.map((scoring) => {
        const scoringEvents = getScoringEvents(events, scoring.id)
        const scoringTargets = getScoreboardTargets(
          scoring.mode,
          scoring.playerSnapshot,
          scoring.teamSnapshot,
        )

        return {
          scoring,
          events: scoringEvents,
          history: getScoreboardHistory(scoringEvents),
          standings: getScoreboardStandings(scoringTargets, scoringEvents),
        }
      }),
    [archivedScorings, events],
  )

  const addPlayer = () => {
    const player = createScoreboardPlayer(players)
    const { id, ...value } = player

    return playersStore.setItem(id, { ...value, lastUpdatedBy: session.userId })
  }

  const addTeam = () => {
    const team = createScoreboardTeam(teams)
    const { id, ...value } = team

    return teamsStore.setItem(id, { ...value, lastUpdatedBy: session.userId })
  }

  const updatePlayer = (
    playerId: string,
    value: Partial<Pick<ScoreboardPlayer, 'name' | 'color' | 'teamId'>>,
  ) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) return Promise.resolve()

    return playersStore.mergeItem(playerId, {
      ...value,
      name:
        value.name === undefined
          ? player.name
          : sanitizeScoreboardName(value.name, `Spieler ${player.position}`),
      lastUpdatedBy: session.userId,
    })
  }

  const updateTeam = (
    teamId: string,
    value: Partial<Pick<ScoreboardTeam, 'name' | 'color'>>,
  ) => {
    const team = teams.find((entry) => entry.id === teamId)

    if (!team) return Promise.resolve()

    return teamsStore.mergeItem(teamId, {
      ...value,
      name:
        value.name === undefined
          ? team.name
          : sanitizeScoreboardName(value.name, `Team ${team.position}`),
      lastUpdatedBy: session.userId,
    })
  }

  const removePlayer = async (playerId: string) => {
    if (activeScoring.mode === 'individual' && players.length <= 2) return 'minimum' as const
    if (hasTargetEvents(activeEvents, playerId)) return 'scored' as const

    await playersStore.deleteItem(playerId)
    return 'removed' as const
  }

  const removeTeam = async (teamId: string) => {
    if (teams.length <= 2) return 'minimum' as const
    if (hasTeamEvents(activeEvents, teamId)) return 'scored' as const

    await playersStore.saveItems(
      players.map((player) => ({
        ...player,
        teamId: player.teamId === teamId ? null : player.teamId,
        lastUpdatedBy: session.userId,
      })),
    )
    await teamsStore.deleteItem(teamId)
    return 'removed' as const
  }

  const changeMode = async (mode: ScoreboardMode) => {
    if (activeEvents.length > 0) return false

    await scoringsStore.mergeItem(activeScoring.id, {
      mode,
      lastUpdatedBy: session.userId,
    })
    return true
  }

  const addScore = async (
    targetType: ScoreTargetType,
    targetId: string,
    delta: number,
  ) => {
    const target = (targetType === 'team' ? teamTargets : playerTargets).find(
      (entry) => entry.id === targetId,
    )
    const normalizedDelta = Math.trunc(delta)

    if (!target || !isValidScoreDelta(delta) || normalizedDelta !== delta) return false

    const now = new Date()
    const event: ScoreboardScoreEvent = {
      id: `score-${createRandomId()}`,
      scoringId: activeScoring.id,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      targetColor: target.color,
      ...(target.type === 'player'
        ? { creditedTeamId: players.find((player) => player.id === target.id)?.teamId ?? null }
        : {}),
      delta: normalizedDelta,
      createdAtClientIso: now.toISOString(),
      createdAtClientMs: now.getTime(),
      lastUpdatedBy: session.userId,
    }
    const { id, ...value } = event

    await eventsStore.setItem(id, value)
    return true
  }

  const undoLastScore = async () => {
    const latestEvent = activeEvents.at(-1)

    if (!latestEvent) return false

    await eventsStore.deleteItem(latestEvent.id)
    return true
  }

  const updateScoringName = (scoringId: string, name: string) => {
    const scoring = scorings.find((entry) => entry.id === scoringId)

    if (!scoring) return Promise.resolve()

    return scoringsStore.mergeItem(scoringId, {
      name: sanitizeScoreboardName(name, `Scoring ${scoring.position}`),
      lastUpdatedBy: session.userId,
    })
  }

  const archiveAndRestart = async () => {
    if (activeEvents.length === 0) return false

    const now = new Date().toISOString()
    const nextId = `scoring-${createRandomId()}`
    const nextPosition =
      scorings.reduce((max, scoring) => Math.max(max, scoring.position), 0) + 1

    await scoringsStore.saveItems([
      ...scorings.map((scoring) =>
        scoring.id === activeScoring.id
          ? {
              ...scoring,
              status: 'archived' as const,
              archivedAtClientIso: now,
              playerSnapshot: players,
              teamSnapshot: teams,
              lastUpdatedBy: session.userId,
            }
          : scoring,
      ),
      {
        id: nextId,
        name: formatScoringName(now),
        mode: activeScoring.mode,
        status: 'active',
        position: nextPosition,
        createdAtClientIso: now,
        archivedAtClientIso: null,
        playerSnapshot: [],
        teamSnapshot: [],
        lastUpdatedBy: session.userId,
      },
    ])
    await stateStore.save({
      schemaVersion: scoreboardSchemaVersion,
      activeScoringId: nextId,
      updatedBy: session.userId,
    })

    return true
  }

  const deleteArchivedScoring = async (scoringId: string) => {
    const eventIds = events
      .filter((event) => event.scoringId === scoringId)
      .map((event) => event.id)

    await eventsStore.deleteItems(eventIds)
    await scoringsStore.deleteItem(scoringId)
  }

  return {
    activeEvents,
    activeScoring,
    addPlayer,
    addScore,
    addTeam,
    archiveAndRestart,
    archiveViews,
    changeMode,
    deleteArchivedScoring,
    error:
      initializationError ??
      stateStore.error ??
      playersStore.error ??
      teamsStore.error ??
      scoringsStore.error ??
      eventsStore.error,
    history,
    isLoading: storesAreLoading || isInitializing,
    isRealtime:
      stateStore.isRealtime &&
      playersStore.isRealtime &&
      teamsStore.isRealtime &&
      scoringsStore.isRealtime &&
      eventsStore.isRealtime,
    players,
    playerStandings,
    removePlayer,
    removeTeam,
    rosterPlayers,
    standings,
    targets,
    teams,
    teamStandings,
    undoLastScore,
    updatePlayer,
    updateScoringName,
    updateTeam,
  }
}
