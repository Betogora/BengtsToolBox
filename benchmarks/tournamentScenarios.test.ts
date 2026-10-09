import { describe, expect, it } from 'vitest'

import { getTournamentBenchmarkScenarios } from './tournamentScenarios'

describe('tournament performance scenarios', () => {
  it('covers the agreed deterministic scenarios with stable domain results', () => {
    const scenarios = getTournamentBenchmarkScenarios()
    const firstRun = Object.fromEntries(
      scenarios.map((scenario) => [scenario.id, scenario.execute()]),
    )
    const secondRun = Object.fromEntries(
      scenarios.map((scenario) => [scenario.id, scenario.execute()]),
    )

    expect(firstRun).toEqual(secondRun)
    expect(firstRun).toEqual({
      'swiss-pairing-32-round-9': '16:4c91657b',
      'swiss-pairing-16-tied-round-2': '8:ca6371da',
      'hand-brain-planning-32-round-9': '8:261a4132',
      'round-robin-repair-16-state-limit': '8:92b03b32',
      'mario-kart-planning-30-combination-limit': 'created:1:51ab9c87',
      'swiss-standings-32-rounds-9': '32:d89a0f8a',
      'mario-kart-standings-32-cycles-8': '32:476a049c',
    })
  })
})
