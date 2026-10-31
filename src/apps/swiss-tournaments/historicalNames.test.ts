import { describe, expect, it } from 'vitest'

import {
  getNextDefaultTournamentName,
  sequenceTournamentNames,
} from '@/apps/swiss-tournaments/historicalNames'
import type { TournamentFormat } from '@/apps/swiss-tournaments/types'

function tournament(
  id: string,
  name: string,
  format: TournamentFormat,
  hour: number,
  position: number,
) {
  return {
    id,
    name,
    format,
    position,
    createdAtClientIso: new Date(2026, 6, 13, hour).toISOString(),
  }
}

describe('Swiss tournament history names', () => {
  it.each<[string, [string, TournamentFormat][], string[]]>([
    [
      'German',
      [
        ['Swiss vom 13.07.2026', 'swiss'],
        ['Round Robin vom 13.07.2026', 'roundRobin'],
        ['Mario Kart vom 13.07.2026', 'marioKart'],
      ],
      [
        'Swiss vom 13.07.2026 I',
        'Round Robin vom 13.07.2026 II',
        'Mario Kart vom 13.07.2026 III',
      ],
    ],
    [
      'English',
      [
        ['Swiss on 13/07/2026', 'swiss'],
        ['Hand and Brain on 13/07/2026', 'handAndBrain'],
      ],
      ['Swiss on 13/07/2026 I', 'Hand and Brain on 13/07/2026 II'],
    ],
  ])(
    'numbers %s defaults of different formats in one daily sequence',
    (_language, defaults, expectedNames) => {
      const tournaments = sequenceTournamentNames(
        defaults.map(([name, format], index) =>
          tournament(format, name, format, 9 + index * 3, index + 1),
        ),
      )

      expect(tournaments.map(({ name }) => name)).toEqual(expectedNames)
    },
  )

  it('previews the next chronological default name', () => {
    const tournaments = [
      tournament('existing', 'Swiss vom 13.07.2026', 'swiss', 9, 1),
    ]

    expect(
      getNextDefaultTournamentName(
        tournaments,
        'marioKart',
        'Mario Kart vom 13.07.2026',
        new Date(2026, 6, 13, 12),
      ),
    ).toBe('Mario Kart vom 13.07.2026 II')
  })
})
