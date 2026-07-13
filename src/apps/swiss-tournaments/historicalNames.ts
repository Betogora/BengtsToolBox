import {
  sequenceHistoricalRecordNames,
  withoutRomanNumeralSuffix,
} from '@/apps/shared/historicalRecordNames'
import type { TournamentFormat } from '@/apps/swiss-tournaments/types'

type TournamentNameRecord = {
  id: string
  name: string
  format?: TournamentFormat
  position: number
  createdAtClientIso: string
}

const formatNames: Record<TournamentFormat, string> = {
  swiss: 'Swiss',
  roundRobin: 'Round Robin',
  handAndBrain: 'Hand and Brain',
  marioKart: 'Mario Kart',
}

function generatedTournamentBaseNames(
  tournament: TournamentNameRecord,
  date: Date,
) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).padStart(4, '0')
  const formatName = formatNames[tournament.format ?? 'swiss']

  return [
    `${formatName} vom ${day}.${month}.${year}`,
    `${formatName} on ${day}/${month}/${year}`,
  ]
}

export function sequenceTournamentNames<T extends TournamentNameRecord>(
  tournaments: T[],
) {
  return sequenceHistoricalRecordNames(tournaments, {
    getGeneratedBaseName: (tournament, date) => {
      const currentBaseName = withoutRomanNumeralSuffix(tournament.name)

      return (
        generatedTournamentBaseNames(tournament, date).find(
          (baseName) => baseName === currentBaseName,
        ) ?? null
      )
    },
    getTimestamp: (tournament) => tournament.createdAtClientIso,
  })
}

export function getNextDefaultTournamentName<T extends TournamentNameRecord>(
  tournaments: T[],
  format: TournamentFormat,
  baseName: string,
  date = new Date(),
) {
  const candidateId = '__new-tournament-name__'
  const candidate = {
    id: candidateId,
    name: baseName,
    format,
    position:
      tournaments.reduce(
        (highestPosition, tournament) =>
          Math.max(highestPosition, tournament.position),
        0,
      ) + 1,
    createdAtClientIso: date.toISOString(),
  }

  return sequenceTournamentNames([...tournaments, candidate]).find(
    (tournament) => tournament.id === candidateId,
  )?.name ?? baseName
}
