import { isPairingComplete } from './pairingSupport'
import {
  addPlayerAfterStart,
  canRemovePlayerFromTournament,
  correctResult,
  createManualHandBrainPairing,
  createManualPairing,
  deleteLatestRound,
  getCurrentDraftRound,
  getNextAllowedRoundNumber,
  removePlayerFromTournament,
  reopenPreviousRound,
  resetTournamentProgress,
  setPlayerStatus,
  updateMarioKartResult,
  updateResult,
  upsertRound,
  willResultCorrectionRegenerateCurrentDraftRound,
} from './tournamentState'
import {
  correctClosedMarioKartLobby,
  deleteLatestEmptyMarioKartLobby,
  getMarioKartPlanningAvailability,
  planNextMarioKartLobby,
  rerollLatestEmptyMarioKartLobby,
  setMarioKartLobbyReservation,
} from '@/apps/swiss-tournaments/marioKart'
import { getTournamentProgress } from './tournamentProgress'
import type { Pairing, Tournament } from '@/apps/swiss-tournaments/types'
import { normalizeTournament } from './tournamentInspection'
import type {
  TournamentCommandEnvelope,
  TournamentDecision,
  TournamentEffect,
  TournamentIssue,
} from './tournamentDomainTypes'

function pairingPlayerIds(pairing: Pairing) {
  return [
    pairing.whitePlayerId,
    pairing.blackPlayerId,
    pairing.byePlayerId,
    pairing.handBrainSides?.white.brainPlayerId,
    pairing.handBrainSides?.white.handPlayerId,
    pairing.handBrainSides?.black.brainPlayerId,
    pairing.handBrainSides?.black.handPlayerId,
    ...(pairing.marioKartRacers?.map((racer) => racer.playerId) ?? []),
  ].filter((playerId): playerId is string => typeof playerId === 'string')
}

function pairingScoringPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  if (pairing.kind === 'marioKart') {
    return (
      pairing.marioKartRacers
        ?.filter((racer) => racer.scoringCycleNumber !== null)
        .map((racer) => racer.playerId) ?? []
    )
  }

  return pairingPlayerIds(pairing)
}

function sameTournament(left: Tournament, right: Tournament) {
  return left === right || JSON.stringify(left) === JSON.stringify(right)
}

function decideChange(
  original: Tournament,
  next: Tournament,
  effects: readonly TournamentEffect[] = [],
): TournamentDecision {
  return sameTournament(normalizeTournament(original), next)
    ? { status: 'unchanged', tournament: original }
    : { status: 'changed', tournament: next, effects }
}

function reject(
  tournament: Tournament,
  issue: TournamentIssue,
): TournamentDecision {
  return { status: 'rejected', tournament, issues: [issue] }
}

function latestRound(tournament: Tournament) {
  return [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]
}

function highestCompletedRoundNumber(tournament: Tournament) {
  return tournament.rounds.reduce(
    (highestRound, round) =>
      round.status === 'completed'
        ? Math.max(highestRound, round.roundNumber)
        : highestRound,
    0,
  )
}

function minimumPlannedUnitCount(tournament: Tournament) {
  return tournament.format === 'marioKart'
    ? getTournamentProgress(tournament).minimumSavableUnitCount
    : highestCompletedRoundNumber(tournament)
}

function configureTournament(
  tournament: Tournament,
  changes: Extract<
    TournamentCommandEnvelope['command'],
    { type: 'tournament.configure' }
  >['changes'],
) {
  const requestedRoundRobinCycles =
    changes.settings?.roundRobinCycles === undefined
      ? tournament.settings.roundRobinCycles
      : Math.max(1, Math.floor(changes.settings.roundRobinCycles) || 1)
  const roundRobinCycles =
    tournament.format === 'roundRobin' && tournament.rounds.length > 0
      ? Math.max(
          tournament.settings.roundRobinCycles ?? 1,
          requestedRoundRobinCycles ?? 1,
        )
      : requestedRoundRobinCycles

  return {
    ...tournament,
    name: changes.name?.trim() || tournament.name,
    numberOfRounds:
      changes.numberOfRounds === undefined
        ? tournament.numberOfRounds
        : Math.max(
            1,
            minimumPlannedUnitCount(tournament),
            Math.floor(changes.numberOfRounds) || 1,
          ),
    settings: {
      ...tournament.settings,
      ...changes.settings,
      roundRobinCycles,
    },
  }
}

function planNextRound(tournament: Tournament): TournamentDecision {
  if (tournament.format === 'marioKart') {
    const result = planNextMarioKartLobby(tournament)

    if (result.blockedReason) {
      return reject(tournament, {
        code: 'planning-blocked',
        reason: result.blockedReason,
      })
    }

    return decideChange(tournament, result.tournament, [
      'mario-kart-lobby-created',
    ])
  }

  const latest = latestRound(tournament)

  if (!latest || latest.status === 'completed') {
    const nextRoundNumber = getNextAllowedRoundNumber(tournament)

    return nextRoundNumber
      ? decideChange(tournament, upsertRound(tournament, nextRoundNumber), [
          'next-round-created',
        ])
      : reject(tournament, { code: 'invalid-state', subject: 'round' })
  }

  if (
    latest.status !== 'draft' ||
    latest.pairings.some((pairing) => !isPairingComplete(pairing))
  ) {
    return reject(tournament, { code: 'invalid-state', subject: 'round' })
  }

  const completedTournament = {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === latest.roundNumber
        ? { ...round, status: 'completed' as const }
        : round,
    ),
  }
  const nextRoundNumber = getNextAllowedRoundNumber(completedTournament)
  const nextTournament = nextRoundNumber
    ? upsertRound(completedTournament, nextRoundNumber)
    : completedTournament

  return decideChange(tournament, nextTournament, [
    'round-completed',
    ...(nextRoundNumber ? (['next-round-created'] as const) : []),
  ])
}

function regenerateLatestRound(tournament: Tournament): TournamentDecision {
  if (tournament.format === 'marioKart') {
    const latestActiveRound = [...tournament.rounds]
      .sort((left, right) => right.roundNumber - left.roundNumber)
      .find((round) => round.status === 'draft')

    return latestActiveRound
      ? decideChange(
          tournament,
          rerollLatestEmptyMarioKartLobby(
            tournament,
            latestActiveRound.roundNumber,
          ),
        )
      : reject(tournament, { code: 'invalid-state', subject: 'round' })
  }

  const existing = getCurrentDraftRound(tournament)
  const latest = latestRound(tournament)

  if (!existing || existing.roundNumber !== latest?.roundNumber) {
    return reject(tournament, { code: 'invalid-state', subject: 'round' })
  }

  return decideChange(
    tournament,
    upsertRound(
      tournament,
      existing.roundNumber,
      existing.pairings.filter((pairing) => pairing.isManual),
    ),
  )
}

function pinPairing(
  tournament: Tournament,
  command: Extract<
    TournamentCommandEnvelope['command'],
    { type: 'pairing.pin' }
  >,
): TournamentDecision {
  const existing = tournament.rounds.find(
    (round) => round.roundNumber === command.roundNumber,
  )
  const latest = latestRound(tournament)

  if (
    !existing ||
    existing.status !== 'draft' ||
    existing.roundNumber !== getCurrentDraftRound(tournament)?.roundNumber ||
    existing.roundNumber !== latest?.roundNumber
  ) {
    return reject(tournament, { code: 'invalid-state', subject: 'round' })
  }

  const fixedPlayerIds = new Set(
    existing.pairings
      .filter((pairing) => pairing.isManual)
      .flatMap(pairingScoringPlayerIds),
  )
  const requestedPlayerIds =
    command.assignment.kind === 'standard'
      ? [
          command.assignment.whitePlayerId,
          command.assignment.blackPlayerId,
        ]
      : [
          command.assignment.sides.white.brainPlayerId,
          command.assignment.sides.white.handPlayerId,
          command.assignment.sides.black.brainPlayerId,
          command.assignment.sides.black.handPlayerId,
        ]

  if (
    new Set(requestedPlayerIds).size !== requestedPlayerIds.length ||
    requestedPlayerIds.some((playerId) => fixedPlayerIds.has(playerId))
  ) {
    return reject(tournament, {
      code: 'invalid-input',
      subject: 'pairing',
    })
  }

  const pairing =
    command.assignment.kind === 'standard'
      ? createManualPairing(
          tournament,
          command.roundNumber,
          command.assignment.whitePlayerId,
          command.assignment.blackPlayerId,
        )
      : createManualHandBrainPairing(
          tournament,
          command.roundNumber,
          command.assignment.sides,
        )
  const fixedPairings = [
    ...existing.pairings.filter((entry) => entry.isManual),
    pairing,
  ]

  return decideChange(
    tournament,
    upsertRound(tournament, command.roundNumber, fixedPairings),
  )
}

function transitionNormalizedTournament(
  value: Tournament,
  envelope: TournamentCommandEnvelope,
): TournamentDecision {
  const tournament = normalizeTournament(value)
  const command = envelope.command

  switch (command.type) {
    case 'tournament.configure':
      return decideChange(
        value,
        normalizeTournament(configureTournament(tournament, command.changes)),
      )

    case 'round-bye-score.set':
      return decideChange(value, {
        ...tournament,
        settings: {
          ...tournament.settings,
          roundByeScores: {
            ...tournament.settings.roundByeScores,
            [command.roundNumber]: command.byeScore,
          },
        },
      })

    case 'tournament.reset-progress':
      return decideChange(value, resetTournamentProgress(tournament))

    case 'player.add':
      return command.name.trim()
        ? decideChange(
            value,
            addPlayerAfterStart(tournament, command.name, command.rating),
          )
        : reject(value, { code: 'invalid-input', subject: 'player' })

    case 'player.update': {
      const player = tournament.players.find(
        (entry) => entry.id === command.playerId,
      )

      if (!player) {
        return reject(value, { code: 'not-found', subject: 'player' })
      }

      const nextPlayer = {
        ...player,
        name: command.changes.name?.trim() || player.name,
      }

      if (
        command.changes.rating === undefined ||
        !Number.isFinite(command.changes.rating)
      ) {
        delete nextPlayer.rating
      } else {
        nextPlayer.rating = Math.round(command.changes.rating)
      }

      return decideChange(value, {
        ...tournament,
        players: tournament.players.map((entry) =>
          entry.id === command.playerId ? nextPlayer : entry,
        ),
      })
    }

    case 'player.set-status':
      return tournament.players.some((player) => player.id === command.playerId)
        ? decideChange(
            value,
            setPlayerStatus(
              tournament,
              command.playerId,
              command.status,
              command.fromRound,
            ),
          )
        : reject(value, { code: 'not-found', subject: 'player' })

    case 'player.remove':
      return tournament.players.some((player) => player.id === command.playerId)
        ? canRemovePlayerFromTournament(tournament, command.playerId)
          ? decideChange(
              value,
              removePlayerFromTournament(tournament, command.playerId),
            )
          : reject(value, { code: 'invalid-state', subject: 'player' })
        : reject(value, { code: 'not-found', subject: 'player' })

    case 'round.plan-next':
      return planNextRound(tournament)

    case 'round.regenerate-latest':
      return regenerateLatestRound(tournament)

    case 'round.complete': {
      const latest = latestRound(tournament)

      if (
        !latest ||
        latest.roundNumber !== command.roundNumber ||
        latest.status !== 'draft' ||
        latest.pairings.some((pairing) => !isPairingComplete(pairing))
      ) {
        return reject(value, { code: 'invalid-state', subject: 'round' })
      }

      return decideChange(
        value,
        {
          ...tournament,
          rounds: tournament.rounds.map((round) =>
            round.roundNumber === command.roundNumber
              ? { ...round, status: 'completed' as const }
              : round,
          ),
        },
        ['round-completed'],
      )
    }

    case 'round.reopen-previous':
      return decideChange(value, reopenPreviousRound(tournament))

    case 'round.delete-latest': {
      if (tournament.rounds.length === 0) {
        return reject(value, { code: 'not-found', subject: 'round' })
      }

      if (tournament.format === 'marioKart') {
        const latestActiveRound = [...tournament.rounds]
          .sort((left, right) => right.roundNumber - left.roundNumber)
          .find((round) => round.status === 'draft')

        return latestActiveRound
          ? decideChange(
              value,
              deleteLatestEmptyMarioKartLobby(
                tournament,
                latestActiveRound.roundNumber,
              ),
            )
          : reject(value, { code: 'invalid-state', subject: 'round' })
      }

      return decideChange(value, deleteLatestRound(tournament))
    }

    case 'pairing.pin':
      return pinPairing(tournament, command)

    case 'pairing.unpin': {
      const round = tournament.rounds.find(
        (entry) => entry.roundNumber === command.roundNumber,
      )

      if (!round?.pairings.some((pairing) => pairing.id === command.pairingId)) {
        return reject(value, { code: 'not-found', subject: 'pairing' })
      }

      const fixedPairings = round.pairings.filter(
        (pairing) => pairing.isManual && pairing.id !== command.pairingId,
      )

      return decideChange(
        value,
        upsertRound(tournament, command.roundNumber, fixedPairings),
      )
    }

    case 'result.set':
      return decideChange(
        value,
        updateResult(
          tournament,
          command.roundNumber,
          command.pairingId,
          command.result,
        ),
      )

    case 'result.correct': {
      const notice = 'correction-regenerates-current-draft' as const
      const requiresConfirmation =
        willResultCorrectionRegenerateCurrentDraftRound(
          tournament,
          command.roundNumber,
          command.pairingId,
          command.result,
        )

      if (
        requiresConfirmation &&
        !envelope.acknowledged?.includes(notice)
      ) {
        return {
          status: 'confirmation-required',
          tournament: value,
          notices: [notice],
          retry: {
            command,
            acknowledged: [notice],
          },
        }
      }

      return decideChange(
        value,
        correctResult(
          tournament,
          command.roundNumber,
          command.pairingId,
          command.result,
        ),
        requiresConfirmation ? ['current-draft-regenerated'] : [],
      )
    }

    case 'mario-kart.reserve-next-lobby':
      return tournament.format === 'marioKart'
        ? decideChange(
            value,
            setMarioKartLobbyReservation(
              tournament,
              command.playerIds ? [...command.playerIds] : null,
            ),
          )
        : reject(value, { code: 'unsupported-format' })

    case 'mario-kart.set-racer':
      return tournament.format === 'marioKart'
        ? decideChange(
            value,
            updateMarioKartResult(
              tournament,
              command.roundNumber,
              command.pairingId,
              command.playerId,
              command.changes,
            ),
          )
        : reject(value, { code: 'unsupported-format' })

    case 'mario-kart.correct-lobby':
      return tournament.format === 'marioKart'
        ? decideChange(
            value,
            correctClosedMarioKartLobby(
              tournament,
              command.roundNumber,
              command.racers.map((racer) => ({ ...racer })),
            ),
          )
        : reject(value, { code: 'unsupported-format' })
  }
}

export function transitionTournament(
  value: Tournament,
  envelope: TournamentCommandEnvelope,
): TournamentDecision {
  const decision = transitionNormalizedTournament(value, envelope)

  return decision.status === 'changed'
    ? decision
    : { ...decision, tournament: value }
}

export function getCurrentPlanningAvailability(tournament: Tournament) {
  return tournament.format === 'marioKart'
    ? getMarioKartPlanningAvailability(tournament)
    : null
}
