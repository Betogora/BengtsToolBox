import { describe, expect, it } from 'vitest'

import { registeredApps } from '@/apps/registry'
import { firebasePaths } from '@/lib/firebase/paths'

type PathContract = {
  build: (lobbyId?: string) => string
  legacy: string
  scopedSuffix: string
}

const appPathContracts: Record<string, readonly PathContract[]> = {
  'decision-wheel': [
    {
      build: firebasePaths.decisionWheelState,
      legacy: 'apps/decision-wheel/state/default',
      scopedSuffix: 'state/default',
    },
  ],
  coinflip: [
    {
      build: firebasePaths.coinflipState,
      legacy: 'apps/coinflip/state/default',
      scopedSuffix: 'state/default',
    },
  ],
  'progress-dashboard': [
    {
      build: firebasePaths.progressDashboardState,
      legacy: 'apps/progress-dashboard/sessions/default/state/default',
      scopedSuffix: 'state/default',
    },
    {
      build: firebasePaths.progressDashboardPlayers,
      legacy: 'apps/progress-dashboard/sessions/default/players',
      scopedSuffix: 'players',
    },
    {
      build: firebasePaths.progressDashboardDatasets,
      legacy: 'apps/progress-dashboard/sessions/default/datasets',
      scopedSuffix: 'datasets',
    },
  ],
  scoreboard: [
    {
      build: firebasePaths.scoreboardState,
      legacy: 'apps/scoreboard/sessions/default/state/default',
      scopedSuffix: 'state/default',
    },
    {
      build: firebasePaths.scoreboardPlayers,
      legacy: 'apps/scoreboard/sessions/default/players',
      scopedSuffix: 'players',
    },
    {
      build: firebasePaths.scoreboardTeams,
      legacy: 'apps/scoreboard/sessions/default/teams',
      scopedSuffix: 'teams',
    },
    {
      build: firebasePaths.scoreboardScorings,
      legacy: 'apps/scoreboard/sessions/default/scorings',
      scopedSuffix: 'scorings',
    },
    {
      build: firebasePaths.scoreboardEvents,
      legacy: 'apps/scoreboard/sessions/default/events',
      scopedSuffix: 'events',
    },
  ],
  'live-buzzer': [
    {
      build: firebasePaths.liveBuzzerState,
      legacy: 'apps/live-buzzer/sessions/default/state/default',
      scopedSuffix: 'state/default',
    },
    {
      build: firebasePaths.liveBuzzerPlayers,
      legacy: 'apps/live-buzzer/sessions/default/players',
      scopedSuffix: 'players',
    },
  ],
  'territory-map': [
    {
      build: firebasePaths.territoryMapState,
      legacy: 'apps/territory-map/sessions/default/state/default',
      scopedSuffix: 'state/default',
    },
    {
      build: firebasePaths.territoryMapPlayers,
      legacy: 'apps/territory-map/sessions/default/players',
      scopedSuffix: 'players',
    },
    {
      build: firebasePaths.territoryMapDatasets,
      legacy: 'apps/territory-map/sessions/default/datasets',
      scopedSuffix: 'datasets',
    },
  ],
  randomizer: [
    {
      build: firebasePaths.randomizerState,
      legacy: 'apps/randomizer/state/default',
      scopedSuffix: 'state/default',
    },
  ],
  'swiss-tournaments': [
    {
      build: firebasePaths.swissTournamentsState,
      legacy: 'apps/swiss-tournaments/sessions/default/state/default',
      scopedSuffix: 'state/default',
    },
    {
      build: firebasePaths.swissTournamentsTournaments,
      legacy: 'apps/swiss-tournaments/sessions/default/tournaments',
      scopedSuffix: 'tournaments',
    },
  ],
  'next-question': [
    {
      build: firebasePaths.nextQuestionState,
      legacy: 'apps/next-question/state/default',
      scopedSuffix: 'state/default',
    },
  ],
}

function sorted(values: string[]) {
  return [...values].sort()
}

describe('firebase lobby paths', () => {
  it('covers exactly every registered App Hub app', () => {
    expect(sorted(Object.keys(appPathContracts))).toEqual(
      sorted(registeredApps.map((app) => app.id)),
    )
  })

  it('keeps every existing default path stable', () => {
    for (const contracts of Object.values(appPathContracts)) {
      for (const contract of contracts) {
        expect(contract.build()).toBe(contract.legacy)
        expect(contract.build('default')).toBe(contract.legacy)
      }
    }
  })

  it('isolates every resource between custom lobbies and global data', () => {
    const lobbyIds = ['ABC234', 'XYZ789']
    const globalPaths = Object.values(appPathContracts).flatMap((contracts) =>
      contracts.map((contract) => contract.build()),
    )
    const scopedPathsByLobby = lobbyIds.map((lobbyId) =>
      Object.entries(appPathContracts).flatMap(([appId, contracts]) =>
        contracts.map((contract) => {
          const path = contract.build(lobbyId)

          expect(path).toBe(
            `lobbies/${lobbyId}/apps/${appId}/${contract.scopedSuffix}`,
          )
          expect(globalPaths).not.toContain(path)

          return path
        }),
      ),
    )

    expect(scopedPathsByLobby[0]).not.toEqual(scopedPathsByLobby[1])
    expect(scopedPathsByLobby[0].some((path) => scopedPathsByLobby[1].includes(path))).toBe(
      false,
    )
  })
})
