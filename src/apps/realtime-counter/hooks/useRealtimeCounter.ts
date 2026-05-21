import { useEffect, useMemo, useRef } from 'react'

import type { CounterPlayer } from '@/apps/realtime-counter/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'

const defaultPlayers: CounterPlayer[] = [
  { id: 'person-1', name: 'Person 1', score: 0, position: 1 },
  { id: 'person-2', name: 'Person 2', score: 0, position: 2 },
  { id: 'person-3', name: 'Person 3', score: 0, position: 3 },
  { id: 'person-4', name: 'Person 4', score: 0, position: 4 },
  { id: 'person-5', name: 'Person 5', score: 0, position: 5 },
]

export function useRealtimeCounter(sessionId = 'default') {
  const session = useAnonymousSession()
  const hasSeededEmptySession = useRef(false)
  const collectionPath = useMemo(
    () => firebasePaths.realtimeCounterPlayers(sessionId),
    [sessionId],
  )
  const counter = useFirestoreCollection<CounterPlayer>(
    collectionPath,
    defaultPlayers,
  )

  useEffect(() => {
    if (
      counter.isLoading ||
      counter.data.length > 0 ||
      hasSeededEmptySession.current
    ) {
      return
    }

    hasSeededEmptySession.current = true
    defaultPlayers.forEach((player) => {
      const { id, ...value } = player
      counter.setItem(id, value)
    })
  }, [counter])

  const incrementPlayer = (player: CounterPlayer) =>
    counter.mergeItem(player.id, {
      score: player.score + 1,
      lastUpdatedBy: session.userId,
    })

  const resetScores = () =>
    Promise.all(
      counter.data.map((player) =>
        counter.mergeItem(player.id, {
          score: 0,
          lastUpdatedBy: session.userId,
        }),
      ),
    )

  return {
    ...counter,
    players: counter.data,
    incrementPlayer,
    resetScores,
    session,
  }
}
