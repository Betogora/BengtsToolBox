export const firebasePaths = {
  diagnosticsHealth: () => 'apps/diagnostics/health/default',
  randomizerState: (stateId = 'default') =>
    `apps/randomizer/state/${stateId}`,
  decisionWheelState: (stateId = 'default') =>
    `apps/decision-wheel/state/${stateId}`,
  coinflipState: (stateId = 'default') =>
    `apps/schlag-den-rabe/games/coinflip/state/${stateId}`,
  liveBuzzerState: (sessionId = 'default') =>
    `apps/live-buzzer/sessions/${sessionId}/state/default`,
  liveBuzzerPlayers: (sessionId = 'default') =>
    `apps/live-buzzer/sessions/${sessionId}/players`,
  liveBuzzerPlayer: (sessionId: string, playerId: string) =>
    `apps/live-buzzer/sessions/${sessionId}/players/${playerId}`,
  scoreboardState: (sessionId = 'default') =>
    `apps/scoreboard/sessions/${sessionId}/state/default`,
  scoreboardPlayers: (sessionId = 'default') =>
    `apps/scoreboard/sessions/${sessionId}/players`,
  scoreboardPlayer: (sessionId: string, playerId: string) =>
    `apps/scoreboard/sessions/${sessionId}/players/${playerId}`,
  progressDashboardState: (sessionId = 'default') =>
    `apps/progress-dashboard/sessions/${sessionId}/state/default`,
  progressDashboardPlayers: (sessionId = 'default') =>
    `apps/progress-dashboard/sessions/${sessionId}/players`,
  progressDashboardDatasets: (sessionId = 'default') =>
    `apps/progress-dashboard/sessions/${sessionId}/datasets`,
} as const
