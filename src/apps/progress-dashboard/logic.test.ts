import { describe, expect, it } from 'vitest'

import {
  createProgressPlayer,
  getPlayerScores,
  getPlayerStandings,
  rankPlayerScores,
} from '@/apps/progress-dashboard/logic'
import type {
  ProgressEvent,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'

const remainingPlayer: ProgressPlayer = {
  id: 'person-1',
  name: 'Hannes',
  position: 1,
  color: '#0d8e90',
  defaultEventIcon: 'beer',
}

const deletedPlayerEvents: ProgressEvent[] = [
  {
    id: 'event-old-1',
    playerId: 'person-2',
    playerName: 'Bengt',
    playerColor: '#f76f61',
    valueDelta: 1,
    icon: 'beer',
    createdAtClientIso: '2026-07-08T09:39:00.000Z',
    createdAtLabel: '2026-07-08T09:39:00.000Z',
    position: 1,
  },
  {
    id: 'event-old-2',
    playerId: 'person-2',
    playerName: 'Bengt',
    playerColor: '#f76f61',
    valueDelta: 1,
    icon: 'beer',
    createdAtClientIso: '2026-07-08T09:40:00.000Z',
    createdAtLabel: '2026-07-08T09:40:00.000Z',
    position: 2,
  },
]

describe('progress dashboard player identity', () => {
  it('does not assign a deleted player\'s events to a replacement at the same position', () => {
    const replacement = createProgressPlayer(
      [remainingPlayer],
      () => 'replacement-id',
    )

    expect(replacement).toMatchObject({
      id: 'person-replacement-id',
      name: 'Person 2',
      position: 2,
      defaultEventIcon: 'beer',
    })

    const replacementScore = getPlayerScores(
      [remainingPlayer, replacement],
      deletedPlayerEvents,
    ).find(({ player }) => player.id === replacement.id)

    expect(replacementScore?.score).toBe(0)
  })
})

describe('progress dashboard ranking', () => {
  const players: ProgressPlayer[] = ['Anna', 'Ben', 'Cleo', 'Dana'].map((name, index) => ({
    id: `person-${index + 1}`,
    name,
    position: index + 1,
    color: '#0d8e90',
  }))
  const event = (playerId: string, minute: number, valueDelta = 1): ProgressEvent => ({
    id: `event-${minute}`,
    playerId,
    playerName: playerId,
    playerColor: '#0d8e90',
    valueDelta,
    icon: valueDelta < 0 ? 'minus' : 'beer',
    createdAtClientIso: `2026-10-31T20:${String(minute).padStart(2, '0')}:00.000Z`,
    createdAtLabel: '',
    position: minute,
  })

  it('shares tied ranks, skips the following rank and lists who got there first on top', () => {
    // Cleo erreicht 2 vor Ben, Anna fällt von 3 auf 2 zurück und kommt damit zuletzt auf 2.
    const events = [
      event('person-1', 1),
      event('person-1', 2),
      event('person-1', 3),
      event('person-3', 4),
      event('person-3', 5),
      event('person-2', 6),
      event('person-2', 7),
      event('person-1', 8, -1),
      event('person-4', 9),
      // Ein Minus bei 0 ändert den Stand nicht und verschiebt Dana nicht.
      event('person-4', 10, -1),
      event('person-4', 11, -1),
    ]
    const scores = getPlayerScores(players, events)

    expect(
      rankPlayerScores(scores).map(({ player, rank, score }) => [player.name, rank, score]),
    ).toEqual([
      ['Cleo', 1, 2],
      ['Ben', 1, 2],
      ['Anna', 1, 2],
      ['Dana', 4, 0],
    ])
    expect(getPlayerStandings(scores, events).get('person-2')).toMatchObject({
      rank: 1,
      rival: { name: 'Cleo', gap: 0 },
    })
  })
})
