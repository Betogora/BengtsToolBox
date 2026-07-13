import { describe, expect, it } from 'vitest'

import { firebasePaths } from '@/lib/firebase/paths'

describe('firebase lobby paths', () => {
  it('keeps existing default paths stable', () => {
    expect(firebasePaths.randomizerState()).toBe('apps/randomizer/state/default')
    expect(firebasePaths.scoreboardPlayers()).toBe(
      'apps/scoreboard/sessions/default/players',
    )
    expect(firebasePaths.scoreboardTeams()).toBe(
      'apps/scoreboard/sessions/default/teams',
    )
    expect(firebasePaths.scoreboardScorings()).toBe(
      'apps/scoreboard/sessions/default/scorings',
    )
    expect(firebasePaths.scoreboardEvents()).toBe(
      'apps/scoreboard/sessions/default/events',
    )
    expect(firebasePaths.swissTournamentsState()).toBe(
      'apps/swiss-tournaments/sessions/default/state/default',
    )
  })

  it('scopes all custom lobby data below the lobby document', () => {
    expect(firebasePaths.randomizerState('ABC234')).toBe(
      'lobbies/ABC234/apps/randomizer/state/default',
    )
    expect(firebasePaths.scoreboardPlayers('ABC234')).toBe(
      'lobbies/ABC234/apps/scoreboard/players',
    )
    expect(firebasePaths.scoreboardTeams('ABC234')).toBe(
      'lobbies/ABC234/apps/scoreboard/teams',
    )
    expect(firebasePaths.scoreboardScorings('ABC234')).toBe(
      'lobbies/ABC234/apps/scoreboard/scorings',
    )
    expect(firebasePaths.scoreboardEvents('ABC234')).toBe(
      'lobbies/ABC234/apps/scoreboard/events',
    )
    expect(firebasePaths.swissTournamentsTournaments('ABC234')).toBe(
      'lobbies/ABC234/apps/swiss-tournaments/tournaments',
    )
  })
})
