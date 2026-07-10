import {
  isPairingComplete,
  recalculateStandings,
} from '@/apps/swiss-tournaments/logic'
import type {
  Round,
  Tournament,
} from '@/apps/swiss-tournaments/types'

type TournamentProgress = {
  completedUnitCount: number
  currentUnitCount: number
  isComplete: boolean
  minimumEditableUnitCount: number
  minimumSavableUnitCount: number
}

function isRoundCompleteForProgress(round: Round) {
  return (
    round.status === 'completed' ||
    (round.pairings.length > 0 && round.pairings.every(isPairingComplete))
  )
}

function getCompletedUnitCount(
  tournament: Tournament,
) {
  if (tournament.format === 'marioKart') {
    const activeRows = recalculateStandings(tournament).filter(
      (row) => row.status === 'active',
    )

    return activeRows.length > 0
      ? Math.min(
          tournament.numberOfRounds,
          ...activeRows.map((row) => row.marioKartScoringRaces),
        )
      : 0
  }

  const completedRegularRounds = new Set(
    tournament.rounds
      .filter((round) => round.roundNumber <= tournament.numberOfRounds)
      .filter(isRoundCompleteForProgress)
      .map((round) => round.roundNumber),
  )

  return Math.min(completedRegularRounds.size, tournament.numberOfRounds)
}

function getCurrentUnitCount(
  tournament: Tournament,
  completedUnitCount: number,
) {
  if (tournament.format !== 'marioKart') {
    return tournament.currentRound
  }

  const currentRound = tournament.rounds.find(
    (round) => round.roundNumber === tournament.currentRound,
  )
  const currentLobbyRace =
    currentRound?.pairings.reduce(
      (highestRaceCount, pairing) =>
        pairing.kind === 'marioKart'
          ? Math.max(highestRaceCount, pairing.marioKartCycleNumber ?? 0)
          : highestRaceCount,
      0,
    ) ?? 0

  return currentLobbyRace > 0 ? currentLobbyRace : completedUnitCount
}

function getHighestCompletedRoundNumber(
  tournament: Tournament,
  isComplete: (round: Round) => boolean,
) {
  return tournament.rounds.reduce(
    (highestRound, round) =>
      isComplete(round)
        ? Math.max(highestRound, round.roundNumber)
        : highestRound,
    0,
  )
}

export function getTournamentProgress(
  tournament: Tournament,
): TournamentProgress {
  const standings =
    tournament.format === 'marioKart'
      ? recalculateStandings(tournament)
      : []
  const completedUnitCount = getCompletedUnitCount(tournament)
  const currentUnitCount = getCurrentUnitCount(tournament, completedUnitCount)
  const highestPlayedMarioKartRaceCount = standings.reduce(
    (highestRaceCount, row) =>
      Math.max(highestRaceCount, row.marioKartScoringRaces),
    0,
  )

  return {
    completedUnitCount,
    currentUnitCount,
    isComplete:
      tournament.numberOfRounds > 0 &&
      completedUnitCount >= tournament.numberOfRounds,
    // The input follows the progress shown to the user, including fully scored drafts.
    minimumEditableUnitCount:
      tournament.format === 'marioKart'
        ? completedUnitCount
        : getHighestCompletedRoundNumber(
            tournament,
            isRoundCompleteForProgress,
          ),
    // Saving must not truncate any officially completed round or played race.
    minimumSavableUnitCount:
      tournament.format === 'marioKart'
        ? highestPlayedMarioKartRaceCount
        : getHighestCompletedRoundNumber(
            tournament,
            (round) => round.status === 'completed',
          ),
  }
}
