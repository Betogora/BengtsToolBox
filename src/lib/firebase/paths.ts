export const firebasePaths = {
  realtimeCounterSession: (sessionId = 'default') =>
    `apps/realtime-counter/sessions/${sessionId}`,
  realtimeCounterPlayers: (sessionId = 'default') =>
    `apps/realtime-counter/sessions/${sessionId}/players`,
  realtimeCounterPlayer: (sessionId: string, playerId: string) =>
    `apps/realtime-counter/sessions/${sessionId}/players/${playerId}`,
  randomizerState: (stateId = 'default') =>
    `apps/randomizer/state/${stateId}`,
} as const
