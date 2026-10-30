import type { Pairing, PairingWarning, Player, PlayerScoreSummary, Tournament } from '@/apps/swiss-tournaments/types'
import { getMarioKartExtraRacers, getMarioKartRacers, getMarioKartScoringRacers } from './marioKartFormat'
import { blackSidePlayerIds, countGamesBetweenBeforeRound, getPlayerStatusForRound, hasSameRoleWithTeammateBeforeRound, hasSameTeamBeforeRound, normalizeRoundRobinCycles, pairingKind, sideAveragePoints, warning, wereTeammates, whiteSidePlayerIds } from './pairingSupport'

export function validatePairing(
  tournament: Tournament,
  pairing: Pairing,
  roundNumber: number,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const warnings: PairingWarning[] = []

  if (pairing.isBye) {
    const player = tournament.players.find((entry) => entry.id === pairing.byePlayerId)

    const activePlayers = tournament.players.filter(
      (entry) =>
        entry.addedInRound <= roundNumber &&
        getPlayerStatusForRound(entry, roundNumber) === 'active',
    )
    const fewestByes = Math.min(
      ...activePlayers.map((entry) => summaries[entry.id]?.byes ?? 0),
    )

    if (
      player &&
      summaries[player.id].byes > fewestByes
    ) {
      warnings.push(warning('multiple-byes', `${player.name} hat bereits ein Bye erhalten.`))
    }

    if (getMarioKartRacers(pairing).length > 0) {
      warnings.push(warning('mario-kart-bye-extra', 'Dieses Bye enthält eine optionale Extra-Fahrt ohne Wertung.'))
    }

    return warnings
  }

  if (pairingKind(pairing) === 'marioKart') {
    const scoringRacers = getMarioKartScoringRacers(pairing)
    const extraRacers = getMarioKartExtraRacers(pairing)
    const scoringIds = scoringRacers.map((racer) => racer.playerId)
    const allRacerIds = getMarioKartRacers(pairing).map((racer) => racer.playerId)
    const uniqueScoringIds = new Set(scoringIds)
    const uniqueAllRacerIds = new Set(allRacerIds)

    const minimumScoringRacers = extraRacers.length > 0 ? 1 : 2

    if (scoringRacers.length < minimumScoringRacers || scoringRacers.length > 4) {
      warnings.push(warning('missing-player', 'Diese Mario-Kart-Lobby braucht 2 bis 4 Fahrer und mindestens einen zählenden Fahrer.', 'hard'))
    }

    if (uniqueScoringIds.size !== scoringIds.length || uniqueAllRacerIds.size !== allRacerIds.length) {
      warnings.push(warning('duplicate-round-player', 'Ein Fahrer darf in derselben Lobby nur einmal vorkommen.', 'hard'))
    }

    if (scoringRacers.length + extraRacers.length > 4) {
      warnings.push(warning('missing-player', 'Eine Mario-Kart-Lobby darf maximal 4 Fahrer enthalten.', 'hard'))
    }

    allRacerIds.forEach((playerId) => {
      const player = tournament.players.find((entry) => entry.id === playerId)

      if (!player) {
        warnings.push(warning('missing-player', 'Ein Fahrer fehlt in dieser Lobby.', 'hard'))
        return
      }

      if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
        warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
      }
    })

    if (scoringRacers.length === 3) {
      warnings.push(warning('mario-kart-three-player-lobby', 'Diese Lobby hat nur drei zählende Fahrer.'))
    }

    const scores = scoringIds.map((playerId) => summaries[playerId]?.points ?? 0)
    const scoreGap = Math.max(...scores) - Math.min(...scores)

    if (scores.length > 0 && scoreGap > 1) {
      warnings.push(warning('mario-kart-score-gap', 'Die Score-Differenz dieser Lobby ist ungewöhnlich hoch.'))
    }

    return warnings
  }

  if (pairingKind(pairing) === 'handAndBrain') {
    const whiteIds = whiteSidePlayerIds(pairing)
    const blackIds = blackSidePlayerIds(pairing)
    const playerIds = [...whiteIds, ...blackIds]
    const uniquePlayerIds = new Set(playerIds)

    if (whiteIds.length !== 2 || blackIds.length !== 2 || uniquePlayerIds.size !== 4) {
      warnings.push(warning('missing-player', 'Dieses Hand-and-Brain-Brett ist unvollständig.', 'hard'))
    }

    playerIds.forEach((playerId) => {
      const player = tournament.players.find((entry) => entry.id === playerId)

      if (!player) {
        warnings.push(warning('missing-player', 'Ein Spieler fehlt in diesem Brett.', 'hard'))
        return
      }

      if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
        warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
      }
    })

    if (hasSameTeamBeforeRound(tournament, whiteIds, blackIds, roundNumber)) {
      warnings.push(warning('repeat-hand-brain-team', 'Diese Team-gegen-Team-Konstellation gab es bereits.', 'hard'))
    }

    if (pairing.handBrainSides) {
      ;[pairing.handBrainSides.white, pairing.handBrainSides.black].forEach((side) => {
        if (countTeammateGamesBeforeRound(tournament, side.brainPlayerId, side.handPlayerId, roundNumber) > 0) {
          warnings.push(warning('repeat-hand-brain-partner', 'Diese Spieler waren bereits auf derselben Seite.'))
        }

        if (hasSameRoleWithTeammateBeforeRound(tournament, side, roundNumber)) {
          warnings.push(warning('repeat-hand-brain-roles', 'Dieses Duo hatte bereits dieselbe Hand/Brain-Verteilung.'))
        }
      })
    }

    const pointDiff = Math.abs(
      sideAveragePoints(whiteIds, summaries) - sideAveragePoints(blackIds, summaries),
    )

    if (pointDiff > 1) {
      warnings.push(warning('large-point-gap', 'Die Punktdifferenz der Seiten ist ungewöhnlich hoch.'))
    }

    ;[
      ...whiteIds.map((playerId) => [playerId, 'W' as const] as const),
      ...blackIds.map((playerId) => [playerId, 'B' as const] as const),
    ].forEach(([playerId, color]) => {
      const player = tournament.players.find((entry) => entry.id === playerId)
      const summary = summaries[playerId]

      if (!player || !summary) {
        return
      }

      const recent = summary.colors.filter((entry) => entry !== '-').slice(-2)
      const whiteCount = summary.colors.filter((entry) => entry === 'W').length
      const blackCount = summary.colors.filter((entry) => entry === 'B').length
      const nextColorDiff =
        whiteCount + (color === 'W' ? 1 : 0) - blackCount - (color === 'B' ? 1 : 0)

      if (recent.length === 2 && recent.every((entry) => entry === color)) {
        warnings.push(warning('third-color', `${player.name} würde zum dritten Mal in Folge ${color === 'W' ? 'Weiß' : 'Schwarz'} erhalten.`))
      }

      if (Math.abs(nextColorDiff) > 2) {
        warnings.push(warning('color-imbalance', `${player.name} hätte eine Farbdifferenz größer als 2.`))
      }
    })

    return warnings
  }

  const white = tournament.players.find((player) => player.id === pairing.whitePlayerId)
  const black = tournament.players.find((player) => player.id === pairing.blackPlayerId)

  if (!white || !black) {
    warnings.push(warning('missing-player', 'Diese Paarung ist unvollständig.', 'hard'))
    return warnings
  }

  if (white.id === black.id) {
    warnings.push(warning('same-player', 'Ein Spieler kann nicht gegen sich selbst spielen.', 'hard'))
  }

  for (const player of [white, black]) {
    if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
      warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
    }
  }

  const previousGames = countGamesBetweenBeforeRound(
    tournament,
    white.id,
    black.id,
    roundNumber,
  )
  const targetGames =
    tournament.format === 'roundRobin'
      ? normalizeRoundRobinCycles(tournament.settings.roundRobinCycles)
      : 1

  if (previousGames >= targetGames) {
    warnings.push(warning('repeat-pairing', 'Diese Spieler haben bereits gegeneinander gespielt.', 'hard'))
  }

  const pointDiff = Math.abs(summaries[white.id].points - summaries[black.id].points)

  if (pointDiff > 1) {
    warnings.push(warning('large-point-gap', 'Die Punktdifferenz ist ungewöhnlich hoch.'))
  }

  const nextColors: Array<[Player, 'W' | 'B']> = [
    [white, 'W' as const],
    [black, 'B' as const],
  ]

  nextColors.forEach(([player, color]) => {
    const summary = summaries[player.id]
    const recent = summary.colors.filter((entry) => entry !== '-').slice(-2)
    const whiteCount = summary.colors.filter((entry) => entry === 'W').length
    const blackCount = summary.colors.filter((entry) => entry === 'B').length
    const nextColorDiff =
      whiteCount + (color === 'W' ? 1 : 0) - blackCount - (color === 'B' ? 1 : 0)

    if (recent.length === 2 && recent.every((entry) => entry === color)) {
      warnings.push(warning('third-color', `${player.name} würde zum dritten Mal in Folge ${color === 'W' ? 'Weiß' : 'Schwarz'} erhalten.`))
    }

    if (Math.abs(nextColorDiff) > 2) {
      warnings.push(warning('color-imbalance', `${player.name} hätte eine Farbdifferenz größer als 2.`))
    }
  })

  return warnings
}

function countTeammateGamesBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .reduce(
      (count, round) =>
        count +
        round.pairings.filter(
          (pairing) =>
            !pairing.isBye &&
            wereTeammates(pairing, leftId, rightId),
        ).length,
      0,
    )
}
