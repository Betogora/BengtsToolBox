import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'

import type {
  BuzzerPlayer,
  BuzzerRoundResult,
  BuzzerSessionState,
  BuzzerTeamId,
  BuzzerTimestamp,
} from '@/apps/live-buzzer/types'
import { buzzerTeams } from '@/apps/live-buzzer/teams'
import { isTeamId } from '@/apps/shared/teams'
import { createRandomId } from '@/apps/shared/utils'
import {
  ensureAnonymousUser,
  getFirebaseServices,
} from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { readLocalValue, writeLocalValue } from '@/lib/firebase/localStore'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const playerIdKey = 'app-hub:live-buzzer:player-id'

const initialSessionState: BuzzerSessionState = {
  isOpen: false,
  winnerPlayerId: null,
  winnerTeamId: null,
  roundNumber: 0,
  lastBuzzedAt: null,
  lastBuzzedAtClientIso: null,
  history: [],
}

function createLocalPlayerId() {
  return `player-${createRandomId()}`
}

function getOrCreatePlayerId() {
  const legacyIdentity = readLocalValue<{ playerId?: string } | null>(
    'app-hub:live-buzzer:identity',
    null,
  )
  const existing = readLocalValue<string | null>(
    playerIdKey,
    legacyIdentity?.playerId ?? null,
  )

  if (existing) {
    writeLocalValue(playerIdKey, existing)
    return existing
  }

  const playerId = createLocalPlayerId()
  writeLocalValue(playerIdKey, playerId)
  return playerId
}

function fallbackPlayerName(player: Pick<BuzzerPlayer, 'id' | 'position'>) {
  const fallbackPosition = Number.isFinite(player.position)
    ? player.position
    : 1

  return `Person ${fallbackPosition}`
}

function sanitizeName(
  name: string,
  player: Pick<BuzzerPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

function timestampToMillis(value: BuzzerTimestamp, fallbackIso?: string | null) {
  if (typeof value === 'string') {
    return Date.parse(value)
  }

  if (value && 'toMillis' in value) {
    return value.toMillis()
  }

  return fallbackIso ? Date.parse(fallbackIso) : Number.NaN
}

function createRoundResult(
  state: BuzzerSessionState | undefined,
  player: BuzzerPlayer,
  buzzedAtClientIso: string,
): BuzzerRoundResult {
  const roundNumber = state?.roundNumber ?? initialSessionState.roundNumber

  return {
    id: createRandomId(),
    roundNumber,
    winnerPlayerId: player.id,
    winnerPlayerName: sanitizeName(player.name, player),
    winnerTeamId: player.teamId,
    createdAt: buzzedAtClientIso,
  }
}

function normalizePlayer(player: BuzzerPlayer, index: number): BuzzerPlayer {
  const position = Number.isFinite(player.position)
    ? Number(player.position)
    : index + 1

  return {
    ...player,
    position,
    name: sanitizeName(player.name ?? '', { id: player.id, position }),
    teamId: isTeamId(player.teamId) ? player.teamId : null,
    isActive: player.isActive ?? true,
    buzzedAt: player.buzzedAt ?? null,
    buzzedAtClientIso: player.buzzedAtClientIso ?? null,
  }
}

export function useLiveBuzzer(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const [selectedPlayerId, setSelectedPlayerId] = useState(getOrCreatePlayerId)
  const statePath = useMemo(
    () => firebasePaths.liveBuzzerState(activeLobbyId),
    [activeLobbyId],
  )
  const playersPath = useMemo(
    () => firebasePaths.liveBuzzerPlayers(activeLobbyId),
    [activeLobbyId],
  )
  const playerDocPath = (playerId: string) =>
    firebasePaths.liveBuzzerPlayer(activeLobbyId, playerId)

  const stateStore = useFirestoreDoc<BuzzerSessionState>(
    statePath,
    initialSessionState,
  )
  const playersStore = useFirestoreCollection<BuzzerPlayer>(playersPath, [])

  const sessionState: BuzzerSessionState = {
    ...initialSessionState,
    ...stateStore.data,
    winnerPlayerId: stateStore.data.winnerPlayerId ?? null,
    winnerTeamId: isTeamId(stateStore.data.winnerTeamId)
      ? stateStore.data.winnerTeamId
      : null,
    lastBuzzedAt: stateStore.data.lastBuzzedAt ?? null,
    lastBuzzedAtClientIso: stateStore.data.lastBuzzedAtClientIso ?? null,
    history: stateStore.data.history ?? [],
  }

  const players = useMemo(
    () =>
      playersStore.data
        .map(normalizePlayer)
        .filter((player) => player.isActive !== false),
    [playersStore.data],
  )

  useEffect(() => {
    if (playersStore.isLoading) {
      return
    }

    if (playersStore.data.some((player) => player.id === selectedPlayerId)) {
      return
    }

    const nextPosition =
      playersStore.data.reduce(
        (max, player) => Math.max(max, Number(player.position) || 0),
        0,
      ) + 1

    playersStore.setItem(selectedPlayerId, {
      position: nextPosition,
      name: `Person ${nextPosition}`,
      teamId: null,
      isActive: true,
      buzzedAt: null,
      buzzedAtClientIso: null,
      lastUpdatedBy: session.userId,
    })
  }, [playersStore, selectedPlayerId, session.userId])

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null
  const winner =
    players.find((player) => player.id === sessionState.winnerPlayerId) ?? null
  const winnerTeam =
    buzzerTeams.find((team) => team.id === sessionState.winnerTeamId) ?? null
  const selectedTeam =
    buzzerTeams.find((team) => team.id === selectedPlayer?.teamId) ?? null

  const buzzRanks = useMemo(() => {
    const buzzedPlayers = players
      .map((player) => ({
        playerId: player.id,
        value: timestampToMillis(player.buzzedAt, player.buzzedAtClientIso),
      }))
      .filter((entry) => Number.isFinite(entry.value))
      .sort((left, right) => left.value - right.value)

    return new Map(
      buzzedPlayers.map((entry, index) => [entry.playerId, index + 1]),
    )
  }, [players])

  const teamSummaries = useMemo(
    () =>
      buzzerTeams.map((team) => ({
        ...team,
        memberCount: players.filter((player) => player.teamId === team.id)
          .length,
        isWinner: sessionState.winnerTeamId === team.id,
      })),
    [players, sessionState.winnerTeamId],
  )

  const updatePlayerName = (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      name: sanitizeName(name, player),
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerTeam = (playerId: string, teamId: BuzzerTeamId | null) =>
    playersStore.mergeItem(playerId, {
      teamId,
      isActive: true,
      lastUpdatedBy: session.userId,
    })

  const removePlayer = async (playerId: string) => {
    await playersStore.deleteItem(playerId)

    if (playerId === selectedPlayerId) {
      const nextPlayerId = createLocalPlayerId()
      writeLocalValue(playerIdKey, nextPlayerId)
      setSelectedPlayerId(nextPlayerId)
    }
  }

  const buzz = async () => {
    if (!sessionState.isOpen || !selectedPlayer?.isActive) {
      return 'blocked' as const
    }

    if (selectedPlayer.buzzedAt || selectedPlayer.buzzedAtClientIso) {
      return 'already-buzzed' as const
    }

    const buzzedAtClientIso = new Date().toISOString()
    const name = sanitizeName(selectedPlayer.name, selectedPlayer)
    const services = getFirebaseServices()

    if (!services) {
      await playersStore.mergeItem(selectedPlayerId, {
        name,
        isActive: true,
        buzzedAt: buzzedAtClientIso,
        buzzedAtClientIso,
        lastUpdatedBy: session.userId,
      })

      if (!sessionState.winnerPlayerId) {
        await stateStore.merge({
          winnerPlayerId: selectedPlayerId,
          winnerTeamId: selectedPlayer.teamId,
          lastBuzzedAt: buzzedAtClientIso,
          lastBuzzedAtClientIso: buzzedAtClientIso,
          history: [
            createRoundResult(sessionState, selectedPlayer, buzzedAtClientIso),
            ...sessionState.history,
          ].slice(0, 5),
          updatedBy: session.userId,
        })
        return 'winner' as const
      }

      return 'late' as const
    }

    await ensureAnonymousUser()

    return runTransaction(services.db, async (transaction) => {
      const stateRef = doc(services.db, statePath)
      const playerRef = doc(services.db, playerDocPath(selectedPlayerId))
      const stateSnapshot = await transaction.get(stateRef)
      const playerSnapshot = await transaction.get(playerRef)
      const remoteState = stateSnapshot.data() as
        | BuzzerSessionState
        | undefined
      const remotePlayer =
        (playerSnapshot.data() as BuzzerPlayer | undefined) ?? selectedPlayer

      if (!remoteState?.isOpen || remotePlayer.buzzedAt) {
        return 'blocked' as const
      }

      const isWinnerBuzz = !remoteState.winnerPlayerId
      const nextHistory = isWinnerBuzz
        ? [
            createRoundResult(remoteState, selectedPlayer, buzzedAtClientIso),
            ...(remoteState.history ?? []),
          ].slice(0, 5)
        : remoteState.history ?? []

      transaction.set(
        playerRef,
        {
          name,
          teamId: selectedPlayer.teamId,
          position: selectedPlayer.position,
          isActive: true,
          buzzedAt: serverTimestamp(),
          buzzedAtClientIso,
          lastUpdatedBy: session.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      if (isWinnerBuzz) {
        transaction.set(
          stateRef,
          {
            winnerPlayerId: selectedPlayerId,
            winnerTeamId: selectedPlayer.teamId,
            lastBuzzedAt: serverTimestamp(),
            lastBuzzedAtClientIso: buzzedAtClientIso,
            history: nextHistory,
            updatedBy: session.userId,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }

      return isWinnerBuzz ? ('winner' as const) : ('late' as const)
    })
  }

  const resetVisibleBuzzes = () =>
    playersStore.saveItems(
      playersStore.data.map((player, index) => ({
        ...normalizePlayer(player, index),
        buzzedAt: null,
        buzzedAtClientIso: null,
        isActive: true,
        lastUpdatedBy: session.userId,
      })),
    )

  const openRound = async () => {
    await resetVisibleBuzzes()
    await stateStore.merge({
      isOpen: true,
      winnerPlayerId: null,
      winnerTeamId: null,
      roundNumber: sessionState.roundNumber + 1,
      lastBuzzedAt: null,
      lastBuzzedAtClientIso: null,
      updatedBy: session.userId,
    })
  }

  const closeRound = () =>
    stateStore.merge({
      isOpen: false,
      updatedBy: session.userId,
    })

  const clearRound = async () => {
    await resetVisibleBuzzes()
    await stateStore.merge({
      isOpen: false,
      winnerPlayerId: null,
      winnerTeamId: null,
      lastBuzzedAt: null,
      lastBuzzedAtClientIso: null,
      updatedBy: session.userId,
    })
  }

  const resetAndOpenRound = async () => {
    await resetVisibleBuzzes()
    await stateStore.merge({
      isOpen: true,
      winnerPlayerId: null,
      winnerTeamId: null,
      roundNumber: sessionState.roundNumber + 1,
      lastBuzzedAt: null,
      lastBuzzedAtClientIso: null,
      updatedBy: session.userId,
    })
  }

  const clearHistory = () =>
    stateStore.merge({
      history: [],
      roundNumber: 1,
      updatedBy: session.userId,
    })

  return {
    buzz,
    buzzRanks,
    buzzerTeams,
    clearHistory,
    clearRound,
    closeRound,
    error: stateStore.error ?? playersStore.error,
    isLoading: stateStore.isLoading || playersStore.isLoading,
    isRealtime: stateStore.isRealtime && playersStore.isRealtime,
    openRound,
    players,
    removePlayer,
    resetAndOpenRound,
    roundNumber: sessionState.roundNumber,
    selectedPlayer,
    selectedPlayerId,
    selectedTeam,
    sessionState,
    teamSummaries,
    updatePlayerName,
    updatePlayerTeam,
    winner,
    winnerTeam,
  }
}
