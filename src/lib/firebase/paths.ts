function lobbyAppRoot(lobbyId: string, appId: string) {
  return `lobbies/${lobbyId}/apps/${appId}`
}

function appStatePath(lobbyId: string, appId: string) {
  return `${lobbyAppRoot(lobbyId, appId)}/state/default`
}

function scopedOrLegacy(
  lobbyId: string,
  appId: string,
  legacyPath: string,
  suffix = 'state/default',
) {
  return lobbyId === 'default' ? legacyPath : `${lobbyAppRoot(lobbyId, appId)}/${suffix}`
}

export const firebasePaths = {
  lobbies: () => 'lobbies',
  lobby: (lobbyId: string) => `lobbies/${lobbyId}`,
  lobbyDevices: (lobbyId: string) => `lobbies/${lobbyId}/devices`,
  lobbyDevice: (lobbyId: string, deviceId: string) =>
    `lobbies/${lobbyId}/devices/${deviceId}`,
  randomizerState: (lobbyId = 'default') =>
    scopedOrLegacy(lobbyId, 'randomizer', 'apps/randomizer/state/default'),
  decisionWheelState: (lobbyId = 'default') =>
    scopedOrLegacy(lobbyId, 'decision-wheel', 'apps/decision-wheel/state/default'),
  coinflipState: (lobbyId = 'default') =>
    scopedOrLegacy(lobbyId, 'coinflip', 'apps/coinflip/state/default'),
  nextQuestionState: (lobbyId = 'default') =>
    scopedOrLegacy(lobbyId, 'next-question', 'apps/next-question/state/default'),
  schlagDenRaabState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'schlag-den-raab',
      'apps/schlag-den-raab/sessions/default/state/default',
    ),
  liveBuzzerState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'live-buzzer',
      'apps/live-buzzer/sessions/default/state/default',
    ),
  liveBuzzerPlayers: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'live-buzzer',
      'apps/live-buzzer/sessions/default/players',
      'players',
    ),
  liveBuzzerPlayer: (lobbyId: string, playerId: string) =>
    `${firebasePaths.liveBuzzerPlayers(lobbyId)}/${playerId}`,
  scoreboardState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'scoreboard',
      'apps/scoreboard/sessions/default/state/default',
    ),
  scoreboardPlayers: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'scoreboard',
      'apps/scoreboard/sessions/default/players',
      'players',
    ),
  scoreboardPlayer: (lobbyId: string, playerId: string) =>
    `${firebasePaths.scoreboardPlayers(lobbyId)}/${playerId}`,
  progressDashboardState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'progress-dashboard',
      'apps/progress-dashboard/sessions/default/state/default',
    ),
  progressDashboardPlayers: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'progress-dashboard',
      'apps/progress-dashboard/sessions/default/players',
      'players',
    ),
  progressDashboardDatasets: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'progress-dashboard',
      'apps/progress-dashboard/sessions/default/datasets',
      'datasets',
    ),
  territoryMapState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'territory-map',
      'apps/territory-map/sessions/default/state/default',
    ),
  territoryMapPlayers: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'territory-map',
      'apps/territory-map/sessions/default/players',
      'players',
    ),
  territoryMapDatasets: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'territory-map',
      'apps/territory-map/sessions/default/datasets',
      'datasets',
    ),
  swissTournamentsState: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'swiss-tournaments',
      'apps/swiss-tournaments/sessions/default/state/default',
    ),
  swissTournamentsTournaments: (lobbyId = 'default') =>
    scopedOrLegacy(
      lobbyId,
      'swiss-tournaments',
      'apps/swiss-tournaments/sessions/default/tournaments',
      'tournaments',
    ),
  lobbyAppState: appStatePath,
} as const
