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
import {
  ensureAnonymousUser,
  getFirebaseServices,
} from '@/lib/firebase/client'
import { firebasePaths } from '@/lib/firebase/paths'
import { readLocalValue, writeLocalValue } from '@/lib/firebase/localStore'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const minPlayers = 1
const maxPlayers = 20
const defaultPlayerCount = 5
const identityKey = 'app-hub:live-buzzer:identity'

const initialSessionState: BuzzerSessionState = {
  isOpen: false,
  adminPlayerId: null,
  winnerPlayerId: null,
  winnerTeamId: null,
  roundNumber: 0,
  playerCount: defaultPlayerCount,
  lastBuzzedAt: null,
  lastBuzzedAtClientIso: null,
  history: [],
}

const createPlayer = (position: number): BuzzerPlayer => ({
  id: `player-${position}`,
  position,
  name: `Nutzer ${position}`,
  teamId: null,
  isActive: position <= defaultPlayerCount,
  buzzedAt: null,
  buzzedAtClientIso: null,
})

const defaultPlayers = Array.from({ length: defaultPlayerCount }, (_, index) =>
  createPlayer(index + 1),
)

function normalizePlayerCount(value: number) {
  if (!Number.isFinite(value)) {
    return defaultPlayerCount
  }

  return Math.min(maxPlayers, Math.max(minPlayers, Math.floor(value)))
}

function normalizePlayerId(playerId: string, playerCount: number) {
  const position = Number(playerId.replace('player-', ''))

  if (!Number.isFinite(position) || position < 1 || position > playerCount) {
    return 'player-1'
  }

  return playerId
}

function fallbackPlayerName(playerId: string) {
  return `Nutzer ${playerId.replace('player-', '')}`
}

function sanitizeName(name: string, playerId: string) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(playerId)
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
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    roundNumber,
    winnerPlayerId: player.id,
    winnerPlayerName: sanitizeName(player.name, player.id),
    winnerTeamId: player.teamId,
    createdAt: buzzedAtClientIso,
  }
}

type LocalIdentity = {
  playerId: string
  name: string
}

export function useLiveBuzzer(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.liveBuzzerState(sessionId),
    [sessionId],
  )
  const playersPath = useMemo(
    () => firebasePaths.liveBuzzerPlayers(sessionId),
    [sessionId],
  )
  const playerDocPath = (playerId: string) =>
    firebasePaths.liveBuzzerPlayer(sessionId, playerId)

  const stateStore = useFirestoreDoc<BuzzerSessionState>(
    statePath,
    initialSessionState,
  )
  const playersStore = useFirestoreCollection<BuzzerPlayer>(
    playersPath,
    defaultPlayers,
  )

  const [localIdentity, setLocalIdentity] = useState<LocalIdentity>(() =>
    readLocalValue<LocalIdentity>(identityKey, {
      playerId: 'player-1',
      name: 'Nutzer 1',
    }),
  )

  const playerCount = normalizePlayerCount(stateStore.data.playerCount)
  const sessionState: BuzzerSessionState = {
    ...initialSessionState,
    ...stateStore.data,
    adminPlayerId: stateStore.data.adminPlayerId ?? null,
    winnerPlayerId: stateStore.data.winnerPlayerId ?? null,
    winnerTeamId: stateStore.data.winnerTeamId ?? null,
    lastBuzzedAt: stateStore.data.lastBuzzedAt ?? null,
    lastBuzzedAtClientIso: stateStore.data.lastBuzzedAtClientIso ?? null,
    history: stateStore.data.history ?? [],
  }
  const selectedPlayerId = normalizePlayerId(
    localIdentity.playerId,
    playerCount,
  )
  const selectedName = localIdentity.name

  const players = useMemo(() => {
    const byId = new Map(playersStore.data.map((player) => [player.id, player]))

    return Array.from({ length: playerCount }, (_, index) => {
      const position = index + 1
      const id = `player-${position}`
      const player = byId.get(id)

      return {
        ...createPlayer(position),
        ...player,
        teamId: player?.teamId ?? null,
        buzzedAt: player?.buzzedAt ?? null,
        buzzedAtClientIso: player?.buzzedAtClientIso ?? null,
        isActive: true,
      }
    })
  }, [playerCount, playersStore.data])

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? players[0]
  const winner =
    players.find((player) => player.id === sessionState.winnerPlayerId) ?? null
  const admin =
    players.find((player) => player.id === sessionState.adminPlayerId) ?? null
  const winnerTeam =
    buzzerTeams.find((team) => team.id === sessionState.winnerTeamId) ?? null
  const selectedTeam =
    buzzerTeams.find((team) => team.id === selectedPlayer?.teamId) ?? null
  const isAdmin = sessionState.adminPlayerId === selectedPlayerId
  const canClaimAdmin =
    !sessionState.adminPlayerId || sessionState.adminPlayerId === selectedPlayerId

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

  useEffect(() => {
    if (playersStore.isLoading) {
      return
    }

    const existingIds = new Set(playersStore.data.map((player) => player.id))

    Array.from({ length: playerCount }, (_, index) => index + 1).forEach(
      (position) => {
        const id = `player-${position}`

        if (!existingIds.has(id)) {
          const player = createPlayer(position)
          playersStore.setItem(id, {
            position: player.position,
            name: player.name,
            teamId: player.teamId,
            isActive: player.isActive,
            buzzedAt: player.buzzedAt,
            buzzedAtClientIso: player.buzzedAtClientIso,
          })
        }
      },
    )
  }, [playerCount, playersStore])

  const choosePlayer = (playerId: string) => {
    const nextPlayerId = normalizePlayerId(playerId, playerCount)
    const playerName =
      players.find((player) => player.id === nextPlayerId)?.name ??
      fallbackPlayerName(nextPlayerId)
    const nextIdentity = {
      playerId: nextPlayerId,
      name: playerName,
    }

    setLocalIdentity(nextIdentity)
    writeLocalValue(identityKey, nextIdentity)
  }

  const setSelectedName = (name: string) => {
    const nextIdentity = {
      playerId: selectedPlayerId,
      name,
    }

    setLocalIdentity(nextIdentity)
    writeLocalValue(identityKey, nextIdentity)
  }

  const saveSelectedName = () => {
    const name = sanitizeName(selectedName, selectedPlayerId)
    setSelectedName(name)

    return playersStore.mergeItem(selectedPlayerId, {
      name,
      isActive: true,
      lastUpdatedBy: session.userId,
    })
  }

  const updateSelectedTeam = (teamId: BuzzerTeamId | null) =>
    playersStore.mergeItem(selectedPlayerId, {
      teamId,
      isActive: true,
      lastUpdatedBy: session.userId,
    })

  const claimAdmin = async () => {
    const services = getFirebaseServices()

    if (!services) {
      if (!sessionState.adminPlayerId || isAdmin) {
        await stateStore.merge({
          adminPlayerId: selectedPlayerId,
          updatedBy: session.userId,
        })
        return true
      }

      return false
    }

    await ensureAnonymousUser()

    return runTransaction(services.db, async (transaction) => {
      const stateRef = doc(services.db, statePath)
      const stateSnapshot = await transaction.get(stateRef)
      const remoteState = stateSnapshot.data() as
        | BuzzerSessionState
        | undefined
      const adminPlayerId = remoteState?.adminPlayerId ?? null

      if (adminPlayerId && adminPlayerId !== selectedPlayerId) {
        return false
      }

      transaction.set(
        stateRef,
        {
          adminPlayerId: selectedPlayerId,
          updatedBy: session.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      return true
    })
  }

  const releaseAdmin = () => {
    if (!isAdmin) {
      return Promise.resolve(false)
    }

    return stateStore
      .merge({
        adminPlayerId: null,
        updatedBy: session.userId,
      })
      .then(() => true)
  }

  const buzz = async () => {
    if (!sessionState.isOpen || !selectedPlayer?.isActive) {
      return 'blocked' as const
    }

    if (selectedPlayer.buzzedAt || selectedPlayer.buzzedAtClientIso) {
      return 'already-buzzed' as const
    }

    const buzzedAtClientIso = new Date().toISOString()
    const name = sanitizeName(selectedName, selectedPlayerId)
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
      [
        ...playersStore.data.filter((player) => player.position > playerCount),
        ...players.map((player) => ({
          ...player,
          buzzedAt: null,
          buzzedAtClientIso: null,
          isActive: true,
          lastUpdatedBy: session.userId,
        })),
      ],
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

  const clearHistory = () =>
    stateStore.merge({
      history: [],
      updatedBy: session.userId,
    })

  const updatePlayerCount = async (value: number) => {
    const nextCount = normalizePlayerCount(value)
    const existingPlayers = new Map(
      playersStore.data.map((player) => [player.id, player]),
    )
    const nextPlayers = [
      ...Array.from({ length: nextCount }, (_, index) => {
        const position = index + 1
        const id = `player-${position}`
        const existingPlayer = existingPlayers.get(id)

        return {
          ...createPlayer(position),
          ...existingPlayer,
          id,
          position,
          name: existingPlayer?.name ?? fallbackPlayerName(id),
          teamId: existingPlayer?.teamId ?? null,
          isActive: true,
          buzzedAt: existingPlayer?.buzzedAt ?? null,
          buzzedAtClientIso: existingPlayer?.buzzedAtClientIso ?? null,
          lastUpdatedBy: session.userId,
        }
      }),
      ...playersStore.data
        .filter((player) => player.position > nextCount)
        .map((player) => ({
          ...player,
          isActive: false,
          buzzedAt: null,
          buzzedAtClientIso: null,
          lastUpdatedBy: session.userId,
        })),
    ]

    await playersStore.saveItems(nextPlayers)
    await stateStore.merge({
      playerCount: nextCount,
      updatedBy: session.userId,
    })
  }

  return {
    admin,
    buzz,
    buzzRanks,
    buzzerTeams,
    canClaimAdmin,
    claimAdmin,
    clearHistory,
    clearRound,
    closeRound,
    choosePlayer,
    error: stateStore.error ?? playersStore.error,
    isAdmin,
    isLoading: stateStore.isLoading || playersStore.isLoading,
    isRealtime: stateStore.isRealtime && playersStore.isRealtime,
    maxPlayers,
    minPlayers,
    openRound,
    playerCount,
    players,
    releaseAdmin,
    roundNumber: sessionState.roundNumber,
    saveSelectedName,
    selectedName,
    selectedPlayer,
    selectedPlayerId,
    selectedTeam,
    sessionState,
    setSelectedName,
    teamSummaries,
    updatePlayerCount,
    updateSelectedTeam,
    winner,
    winnerTeam,
  }
}
