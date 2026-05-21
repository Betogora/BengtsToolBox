import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'

import type {
  BuzzerPlayer,
  BuzzerSessionState,
} from '@/apps/live-buzzer/types'
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
  winnerPlayerId: null,
  roundNumber: 0,
  playerCount: defaultPlayerCount,
  lastBuzzedAt: null,
}

const createPlayer = (position: number): BuzzerPlayer => ({
  id: `player-${position}`,
  position,
  name: `Nutzer ${position}`,
  isActive: position <= defaultPlayerCount,
  buzzedAt: null,
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

function sanitizeName(name: string, playerId: string) {
  const fallbackPosition = playerId.replace('player-', '')
  const trimmedName = name.trim()

  return trimmedName || `Nutzer ${fallbackPosition}`
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
      return byId.get(id) ?? { ...createPlayer(position), isActive: true }
    })
  }, [playerCount, playersStore.data])

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? players[0]
  const winner =
    players.find((player) => player.id === stateStore.data.winnerPlayerId) ??
    null

  useEffect(() => {
    if (playersStore.isLoading) {
      return
    }

    const existingIds = new Set(playersStore.data.map((player) => player.id))

    Array.from({ length: playerCount }, (_, index) => index + 1).forEach(
      (position) => {
        const id = `player-${position}`

        if (!existingIds.has(id)) {
          const player = {
            position,
            name: `Nutzer ${position}`,
            isActive: true,
            buzzedAt: null,
          }
          playersStore.setItem(id, player)
        }
      },
    )
  }, [playerCount, playersStore])

  const choosePlayer = (playerId: string) => {
    const nextPlayerId = normalizePlayerId(playerId, playerCount)
    const playerName =
      players.find((player) => player.id === nextPlayerId)?.name ??
      `Nutzer ${nextPlayerId.replace('player-', '')}`
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

  const buzz = async () => {
    if (
      !stateStore.data.isOpen ||
      stateStore.data.winnerPlayerId ||
      !selectedPlayer
    ) {
      return false
    }

    const buzzedAt = new Date().toISOString()
    const name = sanitizeName(selectedName, selectedPlayerId)
    const services = getFirebaseServices()

    if (!services) {
      await Promise.all([
        playersStore.mergeItem(selectedPlayerId, {
          name,
          isActive: true,
          buzzedAt,
          lastUpdatedBy: session.userId,
        }),
        stateStore.merge({
          isOpen: false,
          winnerPlayerId: selectedPlayerId,
          lastBuzzedAt: buzzedAt,
          updatedBy: session.userId,
        }),
      ])
      return true
    }

    await ensureAnonymousUser()

    return runTransaction(services.db, async (transaction) => {
      const stateRef = doc(services.db, statePath)
      const playerRef = doc(services.db, playerDocPath(selectedPlayerId))
      const stateSnapshot = await transaction.get(stateRef)
      const remoteState = stateSnapshot.data() as
        | BuzzerSessionState
        | undefined

      if (!remoteState?.isOpen || remoteState.winnerPlayerId) {
        return false
      }

      transaction.set(
        playerRef,
        {
          name,
          position: selectedPlayer.position,
          isActive: true,
          buzzedAt,
          lastUpdatedBy: session.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      transaction.set(
        stateRef,
        {
          isOpen: false,
          winnerPlayerId: selectedPlayerId,
          lastBuzzedAt: buzzedAt,
          updatedBy: session.userId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      return true
    })
  }

  const resetVisibleBuzzes = () =>
    playersStore.saveItems(
      [
        ...playersStore.data.filter((player) => player.position > playerCount),
        ...players.map((player) => ({
          ...player,
          buzzedAt: null,
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
      roundNumber: stateStore.data.roundNumber + 1,
      lastBuzzedAt: null,
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
      lastBuzzedAt: null,
      updatedBy: session.userId,
    })
  }

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
          id,
          position,
          name: existingPlayer?.name ?? `Nutzer ${position}`,
          isActive: true,
          buzzedAt: existingPlayer?.buzzedAt ?? null,
          lastUpdatedBy: session.userId,
        }
      }),
      ...playersStore.data
        .filter((player) => player.position > nextCount)
        .map((player) => ({
          ...player,
          isActive: false,
          buzzedAt: null,
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
    clearRound,
    closeRound,
    choosePlayer,
    buzz,
    error: stateStore.error ?? playersStore.error,
    isLoading: stateStore.isLoading || playersStore.isLoading,
    isRealtime: stateStore.isRealtime && playersStore.isRealtime,
    maxPlayers,
    minPlayers,
    openRound,
    playerCount,
    players,
    roundNumber: stateStore.data.roundNumber,
    saveSelectedName,
    selectedName,
    selectedPlayer,
    selectedPlayerId,
    sessionState: stateStore.data,
    setSelectedName,
    updatePlayerCount,
    winner,
  }
}
