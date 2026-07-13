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
      'swiss-pairing-32-round-9': expect.stringMatching(/^16:[0-9a-f]{8}$/),
      'round-robin-repair-16-state-limit': expect.stringMatching(/^8:[0-9a-f]{8}$/),
      'mario-kart-planning-30-combination-limit': expect.stringMatching(
        /^created:1:[0-9a-f]{8}$/,
      ),
      'swiss-standings-32-rounds-9': expect.stringMatching(/^32:[0-9a-f]{8}$/),
      'mario-kart-standings-32-cycles-8': expect.stringMatching(/^32:[0-9a-f]{8}$/),
    })
  })
})
