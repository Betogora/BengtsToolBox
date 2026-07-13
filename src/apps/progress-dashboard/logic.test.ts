import { describe, expect, it } from 'vitest'

import {
  createProgressPlayer,
  getPlayerScores,
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
