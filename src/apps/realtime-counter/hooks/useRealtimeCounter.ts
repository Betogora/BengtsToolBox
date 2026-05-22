import { useMemo } from 'react'

import type { CounterPlayer } from '@/apps/realtime-counter/types'
import type { TeamId } from '@/apps/shared/teams'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'

const defaultPlayers: CounterPlayer[] = [
  { id: 'person-1', name: 'Person 1', score: 0, teamId: null, position: 1 },
  { id: 'person-2', name: 'Person 2', score: 0, teamId: null, position: 2 },
  { id: 'person-3', name: 'Person 3', score: 0, teamId: null, position: 3 },
  { id: 'person-4', name: 'Person 4', score: 0, teamId: null, position: 4 },
  { id: 'person-5', name: 'Person 5', score: 0, teamId: null, position: 5 },
]

function fallbackPlayerName(player: Pick<CounterPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Person ${Number.isFinite(position) ? position : 1}`
}

function sanitizeName(
  name: string,
  player: Pick<CounterPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

export function useRealtimeCounter(sessionId = 'default') {
  const session = useAnonymousSession()
  const collectionPath = useMemo(
    () => firebasePaths.realtimeCounterPlayers(sessionId),
    [sessionId],
  )
  const counter = useFirestoreCollection<CounterPlayer>(
    collectionPath,
    defaultPlayers,
  )

  const players = useMemo(
    () =>
      counter.data.map((player) => ({
        ...player,
        score: Math.max(0, Number(player.score) || 0),
        teamId: player.teamId ?? null,
      })),
    [counter.data],
  )

  const addPlayer = () => {
    const nextPosition =
      players.reduce((max, player) => Math.max(max, player.position), 0) + 1
    const id = `person-${nextPosition}`

    return counter.setItem(id, {
      name: `Person ${nextPosition}`,
      score: 0,
      teamId: null,
      position: nextPosition,
      lastUpdatedBy: session.userId,
    })
  }

  const removePlayer = (playerId: string) => counter.deleteItem(playerId)

  const incrementPlayer = (player: CounterPlayer) =>
    counter.mergeItem(player.id, {
      score: player.score + 1,
      lastUpdatedBy: session.userId,
    })

  const decrementPlayer = (player: CounterPlayer) =>
    counter.mergeItem(player.id, {
      score: Math.max(0, player.score - 1),
      lastUpdatedBy: session.userId,
    })

  const updatePlayerName = (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return counter.mergeItem(playerId, {
      name: sanitizeName(name, player),
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerTeam = (playerId: string, teamId: TeamId | null) =>
    counter.mergeItem(playerId, {
      teamId,
      lastUpdatedBy: session.userId,
    })

  const resetScores = () =>
    counter.saveItems(
      players.map((player) => ({
        ...player,
        score: 0,
        lastUpdatedBy: session.userId,
      })),
    )

  return {
    ...counter,
    addPlayer,
    decrementPlayer,
    incrementPlayer,
    players,
    removePlayer,
    resetScores,
    session,
    updatePlayerName,
    updatePlayerTeam,
  }
}
