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
  it('numbers different tournament formats in one daily sequence', () => {
    const tournaments = sequenceTournamentNames([
      tournament('swiss', 'Swiss vom 13.07.2026', 'swiss', 9, 1),
      tournament(
        'round-robin',
        'Round Robin vom 13.07.2026',
        'roundRobin',
        12,
        2,
      ),
      tournament(
        'mario-kart',
        'Mario Kart vom 13.07.2026',
        'marioKart',
        18,
        3,
      ),
    ])

    expect(tournaments.map(({ name }) => name)).toEqual([
      'Swiss vom 13.07.2026 I',
      'Round Robin vom 13.07.2026 II',
      'Mario Kart vom 13.07.2026 III',
    ])
  })

  it('recognizes English defaults and preserves manual tournament names', () => {
    const tournaments = sequenceTournamentNames([
      tournament('manual', 'Sommerturnier', 'swiss', 9, 1),
      tournament(
        'automatic',
        'Hand and Brain on 13/07/2026',
        'handAndBrain',
        12,
        2,
      ),
    ])

    expect(tournaments.map(({ name }) => name)).toEqual([
      'Sommerturnier',
      'Hand and Brain on 13/07/2026 II',
    ])
  })

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
