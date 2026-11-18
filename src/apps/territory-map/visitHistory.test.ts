import { describe, expect, it } from 'vitest'

import type { TerritoryVisitEvent } from '@/apps/territory-map/types'
import { getTerritoryVisitHistory } from '@/apps/territory-map/visitHistory'

function visit(
  position: number,
  playerId: string,
  day: string,
  territoryId = 'DE-BW',
): TerritoryVisitEvent {
  return {
    id: `event-${position}`,
    mapId: 'germany',
    territoryId,
    territoryName: territoryId,
    playerId,
    playerName: playerId === 'paul' ? 'Paul' : 'Bengt',
    playerColor: '#000000',
    createdAtClientIso: `${day}T12:00:00`,
    createdAtLabel: day,
    position,
  }
}

describe('territory visit history', () => {
  it('groups players per day, newest day first, and ignores other territories', () => {
    const history = getTerritoryVisitHistory(
      [
        visit(1, 'paul', '2026-06-03'),
        visit(2, 'bengt', '2026-11-18'),
        visit(3, 'paul', '2026-11-18'),
        visit(4, 'bengt', '2026-11-18'),
        visit(5, 'bengt', '2026-10-14', 'DE-HE'),
      ],
      'germany',
      'DE-BW',
    )

    expect(history.days.map((day) => [day.dayKey, day.playerNames])).toEqual([
      ['2026-11-18', ['Bengt', 'Paul']],
      ['2026-06-03', ['Paul']],
    ])
    expect(history.hiddenDayCount).toBe(0)
  })

  it('cuts the list after the visible limit and counts the hidden days', () => {
    const events = Array.from({ length: 8 }, (_, index) =>
      visit(index, 'bengt', `2026-0${index + 1}-15`),
    )

    const history = getTerritoryVisitHistory(events, 'germany', 'DE-BW', 5)

    expect(history.days).toHaveLength(5)
    expect(history.days[0].dayKey).toBe('2026-08-15')
    expect(history.hiddenDayCount).toBe(3)
  })
})
