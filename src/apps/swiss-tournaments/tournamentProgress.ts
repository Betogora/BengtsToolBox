import {
  isPairingComplete,
} from '@/apps/swiss-tournaments/logic'
import { getMarioKartCycleProgress } from '@/apps/swiss-tournaments/marioKart'
import type {
  Round,
  Tournament,
} from '@/apps/swiss-tournaments/types'

type TournamentProgress = {
  completedUnitCount: number
  completionRoundNumber: number | null
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
    return getMarioKartCycleProgress(tournament).completedCycleCount
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
  const completedUnitCount = getCompletedUnitCount(tournament)
  const currentUnitCount = getCurrentUnitCount(tournament, completedUnitCount)
  const marioKartProgress =
    tournament.format === 'marioKart'
      ? getMarioKartCycleProgress(tournament)
      : null

  return {
    completedUnitCount,
    completionRoundNumber:
      marioKartProgress?.completionRoundNumber ??
      (completedUnitCount >= tournament.numberOfRounds
        ? getHighestCompletedRoundNumber(tournament, isRoundCompleteForProgress)
        : null),
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
        ? (marioKartProgress?.highestCompletedCycle ?? 0)
        : getHighestCompletedRoundNumber(
            tournament,
            (round) => round.status === 'completed',
          ),
  }
}
