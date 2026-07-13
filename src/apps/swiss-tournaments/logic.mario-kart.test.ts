import { describe, expect, it } from 'vitest'

import {
  correctClosedMarioKartLobby,
  createMarioKartBeerStandingRows,
  deleteLatestEmptyMarioKartLobby,
  getMarioKartPlanningAvailability,
  getMarioKartRacers,
  isLatestEmptyMarioKartLobby,
  planNextMarioKartLobby,
  rerollLatestEmptyMarioKartLobby,
  setMarioKartLobbyReservation,
  setMarioKartPlayerStatus,
  updateMarioKartRacer,
} from '@/apps/swiss-tournaments/marioKart'
import {
  addPlayerAfterStart,
  recalculateStandings,
} from '@/apps/swiss-tournaments/logic'
import { getTournamentProgress } from '@/apps/swiss-tournaments/tournamentProgress'
import { makeTournament } from '@/apps/swiss-tournaments/__tests__/fixtures'
import type { Tournament } from '@/apps/swiss-tournaments/types'

function createLobby(tournament: Tournament) {
  return planNextMarioKartLobby(tournament).tournament
}

function latestRound(tournament: Tournament) {
  return [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]
}

function completeRound(tournament: Tournament, roundNumber: number) {
  const round = tournament.rounds.find(
    (entry) => entry.roundNumber === roundNumber,
  )!
  const racers = getMarioKartRacers(round.pairings[0])

  return racers.reduce(
    (current, racer, index) =>
      updateMarioKartRacer(current, roundNumber, racer.playerId, {
        placement: index + 1,
      }),
    tournament,
  )
}

function completeLatest(tournament: Tournament) {
  return completeRound(tournament, latestRound(tournament).roundNumber)
}

function racerIds(tournament: Tournament, roundNumber: number) {
  return getMarioKartRacers(
    tournament.rounds.find((round) => round.roundNumber === roundNumber)!
      .pairings[0],
  ).map((racer) => racer.playerId)
}

describe('Mario-Kart-Lobbyplanung', () => {
  it('blockiert unter vier geeigneten Fahrern', () => {
    const tournament = makeTournament('marioKart', 3)
    const result = planNextMarioKartLobby(tournament)

    expect(result.tournament).toBe(tournament)
    expect(result.blockedReason).toBe('not-enough-eligible-players')
    expect(getMarioKartPlanningAvailability(tournament).canCreate).toBe(false)
  })

  it.each([4, 5, 6, 8, 10])(
    'erzeugt bei %i Fahrern pro Klick genau eine Viererlobby',
    (playerCount) => {
      const tournament = createLobby(
        makeTournament('marioKart', playerCount, { numberOfRounds: 2 }),
      )

      expect(tournament.rounds).toHaveLength(1)
      expect(tournament.rounds[0].pairings).toHaveLength(1)
      expect(getMarioKartRacers(tournament.rounds[0].pairings[0])).toHaveLength(4)
    },
  )

  it('bewahrt am Kombinationslimit die deterministische Auswahlreihenfolge', () => {
    const result = planNextMarioKartLobby(makeTournament('marioKart', 30))

    expect(racerIds(result.tournament, 1)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('begrenzt Gleichstandsauswahl auf die ersten 25.000 Kombinationen', () => {
    const tournament = makeTournament('marioKart', 30)
    tournament.players = tournament.players.map((player) => ({
      ...player,
      initialSeed: 1,
    }))
    const avoidedPlayerIds = new Set(
      tournament.players.slice(0, 13).map((player) => player.id),
    )
    const result = planNextMarioKartLobby(tournament, avoidedPlayerIds)

    expect(racerIds(result.tournament, 1)).toEqual([
      'p1',
      'p14',
      'p15',
      'p16',
    ])
  })

  it('reserviert Fahrer über alle aktiven Lobbys hinweg', () => {
    const first = createLobby(makeTournament('marioKart', 8))
    const second = createLobby(first)
    const firstIds = new Set(racerIds(second, 1))
    const secondIds = racerIds(second, 2)
    const blocked = planNextMarioKartLobby(second)

    expect(secondIds.every((playerId) => !firstIds.has(playerId))).toBe(true)
    expect(blocked.tournament).toBe(second)
    expect(blocked.blockedReason).toBe('not-enough-unreserved-players')
  })

  it('bildet den verbindlichen Zehn-Spieler-Fall mit 1.3 und paralleler 2.1 ab', () => {
    let tournament = makeTournament('marioKart', 10, { numberOfRounds: 2 })

    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)

    const lobby13 = latestRound(tournament).pairings[0]
    const cycle13 = getMarioKartRacers(lobby13).map(
      (racer) => racer.scoringCycleNumber,
    )

    expect(lobby13.marioKartCycleNumber).toBe(1)
    expect(lobby13.marioKartCycleLobbyNumber).toBe(3)
    expect(cycle13.filter((cycle) => cycle === 1)).toHaveLength(2)
    expect(cycle13.filter((cycle) => cycle === 2)).toHaveLength(2)

    tournament = createLobby(tournament)

    const lobby21 = latestRound(tournament).pairings[0]
    const activeIds = tournament.rounds
      .filter((round) => round.status === 'draft')
      .flatMap((round) => getMarioKartRacers(round.pairings[0]))
      .map((racer) => racer.playerId)

    expect(lobby21.marioKartCycleNumber).toBe(2)
    expect(lobby21.marioKartCycleLobbyNumber).toBe(1)
    expect(getMarioKartRacers(lobby21).every(
      (racer) => racer.scoringCycleNumber === 2,
    )).toBe(true)
    expect(new Set(activeIds).size).toBe(8)
    expect(planNextMarioKartLobby(tournament).blockedReason).toBe(
      'not-enough-unreserved-players',
    )
  })

  it('berücksichtigt aktive Wertungszuweisungen bereits für die nächste Planung', () => {
    let tournament = makeTournament('marioKart', 8, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)

    const secondCycleAssignments = getMarioKartRacers(
      latestRound(tournament).pairings[0],
    )
      .filter((racer) => racer.scoringCycleNumber === 2)
      .map((racer) => racer.playerId)
    tournament = createLobby(tournament)
    const nextIds = racerIds(tournament, latestRound(tournament).roundNumber)

    expect(nextIds.every((playerId) => !secondCycleAssignments.includes(playerId))).toBe(
      true,
    )
  })

  it('nimmt einen Neuzugang beim Neu-Erzeugen vor einem Füller in die laufende Wertungsrunde', () => {
    let tournament = makeTournament('marioKart', 6, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)
    tournament = addPlayerAfterStart(tournament, 'Späteinsteiger')
    const newcomer = tournament.players.at(-1)!

    expect(newcomer.marioKartEligibleFromCycle).toBe(1)

    tournament = rerollLatestEmptyMarioKartLobby(
      tournament,
      latestRound(tournament).roundNumber,
    )
    const newcomerRacer = getMarioKartRacers(latestRound(tournament).pairings[0]).find(
      (racer) => racer.playerId === newcomer.id,
    )

    expect(newcomerRacer?.scoringCycleNumber).toBe(1)
    expect(
      getMarioKartRacers(latestRound(tournament).pairings[0]).filter(
        (racer) => racer.scoringCycleNumber === 2,
      ),
    ).toHaveLength(1)
  })

  it('startet einen Neuzugang nach einem begonnenen Ergebnis erst in der nächsten Runde', () => {
    let tournament = makeTournament('marioKart', 6, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)
    const activeRound = latestRound(tournament)
    const firstRacer = getMarioKartRacers(activeRound.pairings[0])[0]
    tournament = updateMarioKartRacer(
      tournament,
      activeRound.roundNumber,
      firstRacer.playerId,
      { placement: 1 },
    )
    tournament = addPlayerAfterStart(tournament, 'Später Neuzugang')

    expect(tournament.players.at(-1)?.marioKartEligibleFromCycle).toBe(2)
    expect(isLatestEmptyMarioKartLobby(tournament, activeRound.roundNumber)).toBe(false)
  })

  it('erzwingt eine Fixierung mit zwei Fahrern und füllt sie regulär auf', () => {
    let tournament = makeTournament('marioKart', 8, { numberOfRounds: 2 })
    const fixedIds = tournament.players.slice(0, 2).map((player) => player.id)
    tournament = setMarioKartLobbyReservation(tournament, fixedIds)
    tournament = createLobby(tournament)
    const racers = getMarioKartRacers(latestRound(tournament).pairings[0])

    expect(racers).toHaveLength(4)
    expect(
      racers.filter((racer) => racer.isFixed).map((racer) => racer.playerId),
    ).toEqual(fixedIds)
    expect(racers.every((racer) => racer.scoringCycleNumber !== null)).toBe(true)
    expect(tournament.marioKartLobbyReservation).toBeUndefined()

    tournament = deleteLatestEmptyMarioKartLobby(
      tournament,
      latestRound(tournament).roundNumber,
    )
    expect(tournament.marioKartLobbyReservation?.playerIds).toEqual(fixedIds)
  })

  it('kennzeichnet einen vorgezogenen fixierten Fahrer zusätzlich als echten Füller', () => {
    let tournament = makeTournament('marioKart', 6, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    const completedIds = racerIds(tournament, 1)
    const waitingId = tournament.players.find(
      (player) => !completedIds.includes(player.id),
    )!.id
    const fixedIds = [completedIds[0], waitingId]
    tournament = setMarioKartLobbyReservation(tournament, fixedIds)
    tournament = createLobby(tournament)
    const pairing = latestRound(tournament).pairings[0]
    const fixedFillIn = getMarioKartRacers(pairing).find(
      (racer) => racer.playerId === completedIds[0],
    )

    expect(pairing.marioKartCycleNumber).toBe(1)
    expect(fixedFillIn).toMatchObject({
      isFixed: true,
      scoringCycleNumber: 2,
    })
  })

  it('verteilt vorgezogene Wertungsrennen statt fixierte Fahrer ungewertet zu wiederholen', () => {
    let tournament = makeTournament('marioKart', 10, { numberOfRounds: 3 })

    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))

    const fixedIds = tournament.rounds
      .flatMap((round) => getMarioKartRacers(round.pairings[0]))
      .filter((racer) => racer.scoringCycleNumber === 2)
      .map((racer) => racer.playerId)
      .slice(0, 2)

    tournament = setMarioKartLobbyReservation(tournament, fixedIds)
    tournament = completeLatest(createLobby(tournament))

    const fixedLobby = latestRound(tournament).pairings[0]
    const fixedFillers = getMarioKartRacers(fixedLobby).filter(
      (racer) => racer.isFixed,
    )

    expect(fixedLobby.marioKartCycleNumber).toBe(2)
    expect(fixedFillers.map((racer) => racer.playerId)).toEqual(fixedIds)
    expect(
      fixedFillers.every((racer) => racer.scoringCycleNumber === 3),
    ).toBe(true)

    tournament = createLobby(tournament)

    const finalCycleTwoLobby = latestRound(tournament).pairings[0]
    const nextFillers = getMarioKartRacers(finalCycleTwoLobby).filter(
      (racer) => racer.scoringCycleNumber === 3,
    )

    expect(finalCycleTwoLobby.marioKartCycleNumber).toBe(2)
    expect(nextFillers).toHaveLength(2)
    expect(
      nextFillers.every((racer) => !fixedIds.includes(racer.playerId)),
    ).toBe(true)
  })

  it('lässt eine Fixierung auf inaktive Fahrer warten und plant andere Fahrer weiter', () => {
    let tournament = makeTournament('marioKart', 8, { numberOfRounds: 2 })
    const fixedIds = tournament.players.slice(0, 2).map((player) => player.id)
    tournament = setMarioKartLobbyReservation(tournament, fixedIds)
    tournament = setMarioKartPlayerStatus(tournament, fixedIds[0], 'inactive')
    tournament = createLobby(tournament)
    const plannedIds = racerIds(tournament, latestRound(tournament).roundNumber)

    expect(plannedIds.some((playerId) => fixedIds.includes(playerId))).toBe(false)
    expect(tournament.marioKartLobbyReservation?.playerIds).toEqual(fixedIds)
  })

  it('blockiert fair, wenn eine vollständige Fixierung dem restlichen Feld voraus ist', () => {
    let tournament = makeTournament('marioKart', 7, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    const fixedIds = racerIds(tournament, 1)
    tournament = setMarioKartLobbyReservation(tournament, fixedIds)

    expect(getMarioKartPlanningAvailability(tournament)).toMatchObject({
      canCreate: false,
      blockedReason: 'fixed-lobby-waiting',
    })
    expect(planNextMarioKartLobby(tournament).tournament).toBe(tournament)
  })
})

describe('Mario-Kart-Wertung und Extras', () => {
  it('zählt die physische Teilnahme sofort und die wertende erst nach Abschluss', () => {
    let tournament = createLobby(makeTournament('marioKart', 4))
    const playerId = racerIds(tournament, 1)[0]
    let row = recalculateStandings(tournament).find(
      (entry) => entry.playerId === playerId,
    )!

    expect(row.marioKartPhysicalRaces).toBe(1)
    expect(row.marioKartScoringRaces).toBe(0)
    expect(row.points).toBe(0)

    tournament = completeLatest(tournament)
    row = recalculateStandings(tournament).find(
      (entry) => entry.playerId === playerId,
    )!

    expect(row.marioKartPhysicalRaces).toBe(1)
    expect(row.marioKartScoringRaces).toBe(1)
  })

  it('zieht Füller in die richtige zukünftige Wertungsrunde vor', () => {
    let tournament = makeTournament('marioKart', 6, { numberOfRounds: 2 })
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)
    const pairing = latestRound(tournament).pairings[0]
    const cycles = getMarioKartRacers(pairing).map(
      (racer) => racer.scoringCycleNumber,
    )

    expect(cycles.filter((cycle) => cycle === 1)).toHaveLength(2)
    expect(cycles.filter((cycle) => cycle === 2)).toHaveLength(2)
  })

  it('lässt echte Extras zunächst vollständig ungewertet', () => {
    let tournament = makeTournament('marioKart', 5, { numberOfRounds: 1 })
    tournament = completeLatest(createLobby(tournament))
    tournament = createLobby(tournament)
    const extraIds = getMarioKartRacers(latestRound(tournament).pairings[0])
      .filter((racer) => racer.scoringCycleNumber === null)
      .map((racer) => racer.playerId)
    tournament = completeLatest(tournament)

    extraIds.forEach((playerId) => {
      const row = recalculateStandings(tournament).find(
        (entry) => entry.playerId === playerId,
      )!

      expect(row.marioKartPhysicalRaces).toBe(2)
      expect(row.marioKartScoringRaces).toBe(1)
      expect(row.marioKartExtraRides).toBe(1)
    })
  })

  it('wertet frühere Extras beim Start einer Bonusrunde rückwirkend', () => {
    let tournament = makeTournament('marioKart', 5, { numberOfRounds: 1 })
    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    const priorExtraIds = tournament.rounds
      .flatMap((round) => getMarioKartRacers(round.pairings[0]))
      .filter((racer) => racer.scoringCycleNumber === null)
      .map((racer) => racer.playerId)

    tournament = createLobby(tournament)

    const promoted = tournament.rounds
      .slice(0, -1)
      .flatMap((round) => getMarioKartRacers(round.pairings[0]))
      .filter(
        (racer) =>
          priorExtraIds.includes(racer.playerId) &&
          racer.scoringCycleNumber === 2,
      )
      .map((racer) => racer.playerId)

    expect(tournament.numberOfRounds).toBe(1)
    expect(promoted).toHaveLength(1)
    expect(
      recalculateStandings(tournament).find(
        (row) => row.playerId === promoted[0],
      )?.marioKartScoringRaces,
    ).toBe(2)
  })

  it('wertet einen Einstieg ab Runde 3 genau einmal je verbleibender Runde', () => {
    let tournament = makeTournament('marioKart', 4, { numberOfRounds: 4 })
    tournament = completeLatest(createLobby(tournament))
    tournament = completeLatest(createLobby(tournament))
    tournament = addPlayerAfterStart(tournament, 'Einstieg Runde 3')
    const newcomer = tournament.players.at(-1)!

    expect(newcomer.marioKartEligibleFromCycle).toBe(3)

    for (let lobby = 0; lobby < 5 && !getTournamentProgress(tournament).isComplete; lobby += 1) {
      tournament = completeLatest(createLobby(tournament))
    }

    const newcomerCycles = tournament.rounds
      .flatMap((round) => getMarioKartRacers(round.pairings[0]))
      .filter((racer) => racer.playerId === newcomer.id)
      .flatMap((racer) =>
        racer.scoringCycleNumber === null ? [] : [racer.scoringCycleNumber],
      )

    expect(newcomerCycles.sort((left, right) => left - right)).toEqual([3, 4])
    expect(new Set(newcomerCycles).size).toBe(newcomerCycles.length)
    expect(getTournamentProgress(tournament).isComplete).toBe(true)
    expect(
      tournament.rounds.flatMap((round) => getMarioKartRacers(round.pairings[0])).some(
        (racer) => (racer.scoringCycleNumber ?? 0) > 4,
      ),
    ).toBe(false)
  })
})

describe('Mario-Kart-Lebenszyklus', () => {
  it('schließt bei vier eindeutigen Plätzen bis 24 und wertet sie relativ', () => {
    let tournament = createLobby(makeTournament('marioKart', 4))
    const ids = racerIds(tournament, 1)

    tournament = updateMarioKartRacer(tournament, 1, ids[0], {
      placement: 1,
    })
    tournament = updateMarioKartRacer(tournament, 1, ids[1], {
      placement: 1,
    })
    tournament = updateMarioKartRacer(tournament, 1, ids[2], {
      placement: 25,
    })
    tournament = updateMarioKartRacer(tournament, 1, ids[3], {
      placement: 10,
    })

    expect(tournament.rounds[0].status).toBe('draft')

    tournament = updateMarioKartRacer(tournament, 1, ids[1], {
      placement: 2,
    })
    tournament = updateMarioKartRacer(tournament, 1, ids[2], {
      placement: 5,
    })

    expect(tournament.rounds[0].status).toBe('completed')
    const standings = recalculateStandings(tournament)

    expect(ids.map((id) => standings.find((row) => row.playerId === id)?.points)).toEqual([
      1,
      0.7,
      0.3,
      0,
    ])
    expect(
      ids.map(
        (id) => standings.find((row) => row.playerId === id)?.marioKartAveragePlacement,
      ),
    ).toEqual([1, 2, 5, 10])
  })

  it('lässt nur die jüngste vollständig leere aktive Lobby neu auslosen oder löschen', () => {
    let tournament = createLobby(makeTournament('marioKart', 8))
    tournament = createLobby(tournament)

    expect(isLatestEmptyMarioKartLobby(tournament, 1)).toBe(false)
    expect(isLatestEmptyMarioKartLobby(tournament, 2)).toBe(true)
    expect(deleteLatestEmptyMarioKartLobby(tournament, 1)).toBe(tournament)

    const rerolled = rerollLatestEmptyMarioKartLobby(tournament, 2)
    expect(rerolled.rounds).toHaveLength(2)

    const deleted = deleteLatestEmptyMarioKartLobby(rerolled, 2)
    expect(deleted.rounds).toHaveLength(1)
  })

  it('korrigiert eine geschlossene Lobby atomar ohne spätere Aufstellungen zu ändern', () => {
    let tournament = completeLatest(
      createLobby(makeTournament('marioKart', 8, { numberOfRounds: 2 })),
    )
    tournament = createLobby(tournament)
    const laterLineup = racerIds(tournament, 2)
    const firstRacers = getMarioKartRacers(tournament.rounds[0].pairings[0])
    const correction = firstRacers.map((racer, index) => ({
      playerId: racer.playerId,
      placement: 4 - index,
      event: index === 0,
    }))

    const corrected = correctClosedMarioKartLobby(tournament, 1, correction)

    expect(racerIds(corrected, 2)).toEqual(laterLineup)
    expect(
      getMarioKartRacers(corrected.rounds[0].pairings[0]).map(
        (racer) => racer.placement,
      ),
    ).toEqual([4, 3, 2, 1])
  })

  it('behält aktive Aufstellungen bei Statuswechseln stabil und holt alte Runden nicht nach', () => {
    let tournament = createLobby(
      makeTournament('marioKart', 5, { numberOfRounds: 2 }),
    )
    const activeLineup = racerIds(tournament, 1)
    const activePlayerId = activeLineup[0]
    const waitingPlayerId = tournament.players.find(
      (player) => !activeLineup.includes(player.id),
    )!.id

    tournament = setMarioKartPlayerStatus(tournament, activePlayerId, 'inactive')
    expect(racerIds(tournament, 1)).toEqual(activeLineup)
    tournament = setMarioKartPlayerStatus(tournament, waitingPlayerId, 'inactive')

    tournament = completeLatest(tournament)
    tournament = setMarioKartPlayerStatus(tournament, activePlayerId, 'active')
    tournament = createLobby(tournament)
    tournament = setMarioKartPlayerStatus(tournament, waitingPlayerId, 'active')
    const player = tournament.players.find(
      (entry) => entry.id === waitingPlayerId,
    )!

    expect(player.status).toBe('active')
    expect(player.marioKartEligibleFromCycle).toBeGreaterThanOrEqual(2)
    expect(player.marioKartSkippedCycleNumbers).toContain(1)
  })

  it('lässt Bier in geschlossenen Lobbys ändern, aber keine Platzierung', () => {
    let tournament = completeLatest(
      createLobby(makeTournament('marioKart', 4)),
    )
    const playerId = racerIds(tournament, 1)[0]
    const placement = getMarioKartRacers(tournament.rounds[0].pairings[0])[0]
      .placement

    tournament = updateMarioKartRacer(tournament, 1, playerId, { event: true })
    expect(tournament.rounds[0].status).toBe('completed')
    expect(getMarioKartRacers(tournament.rounds[0].pairings[0])[0].event).toBe(true)

    tournament = updateMarioKartRacer(tournament, 1, playerId, { placement: 15 })
    expect(getMarioKartRacers(tournament.rounds[0].pairings[0])[0].placement).toBe(
      placement,
    )

    tournament = updateMarioKartRacer(tournament, 1, playerId, { event: false })
    expect(getMarioKartRacers(tournament.rounds[0].pairings[0])[0].event).toBeUndefined()
  })

  it('akzeptiert Platz 24, lehnt 25 ab und schließt mit der letzten gültigen Eingabe ab', () => {
    let tournament = createLobby(
      makeTournament('marioKart', 4, { numberOfRounds: 1 }),
    )
    const ids = racerIds(tournament, 1)
    const placements = [1, 7, 13, 24]

    tournament = updateMarioKartRacer(tournament, 1, ids[3], { placement: 25 })
    expect(tournament.rounds[0].status).toBe('draft')

    tournament = placements.reduce(
      (current, placement, index) =>
        updateMarioKartRacer(current, 1, ids[index], { placement }),
      tournament,
    )

    expect(tournament.rounds[0].status).toBe('completed')
    expect(getTournamentProgress(tournament)).toMatchObject({
      completedUnitCount: 1,
      completionRoundNumber: 1,
      isComplete: true,
    })
    expect(
      recalculateStandings(tournament).every(
        (row) => row.marioKartScoringRaces === 1,
      ),
    ).toBe(true)
  })

  it.each([
    ['inactive', 'withdrawn'],
    ['withdrawn', 'inactive'],
    ['inactive', 'active'],
    ['withdrawn', 'active'],
  ] as const)('erlaubt den Statuswechsel %s → %s', (from, to) => {
    let tournament = makeTournament('marioKart', 4)
    const playerId = tournament.players[0].id

    tournament = setMarioKartPlayerStatus(tournament, playerId, from)
    tournament = setMarioKartPlayerStatus(tournament, playerId, to)

    expect(tournament.players[0].status).toBe(to)
  })
})

describe('Mario-Kart-Ranglisten', () => {
  it('ordnet ohne Ingame-Punkte und vergibt geteilte Wettkampfränge', () => {
    let tournament = makeTournament('marioKart', 4, { numberOfRounds: 2 })
    tournament = createLobby(tournament)
    const firstIds = racerIds(tournament, 1)
    tournament = firstIds.reduce(
      (current, playerId, index) =>
        updateMarioKartRacer(current, 1, playerId, {
          placement: index + 1,
        }),
      tournament,
    )
    tournament = createLobby(tournament)
    const secondPlacements = [2, 1, 3, 4]
    tournament = firstIds.reduce(
      (current, playerId, index) =>
        updateMarioKartRacer(current, 2, playerId, {
          placement: secondPlacements[index],
        }),
      tournament,
    )

    const rows = recalculateStandings(tournament)

    expect(rows.map((row) => row.rank)).toEqual([1, 1, 3, 4])
    expect(rows.slice(0, 2).map((row) => row.playerId).sort()).toEqual(
      firstIds.slice(0, 2).sort(),
    )
  })

  it('teilt auch Bier-Ränge bei gleicher Bieranzahl', () => {
    let tournament = createLobby(makeTournament('marioKart', 4))
    const ids = racerIds(tournament, 1)
    tournament = updateMarioKartRacer(tournament, 1, ids[0], {
      event: true,
    })
    tournament = updateMarioKartRacer(tournament, 1, ids[1], {
      event: true,
    })

    const beerRows = createMarioKartBeerStandingRows(tournament)

    expect(beerRows.map((row) => row.rank)).toEqual([1, 1, 3, 3])
  })
})
