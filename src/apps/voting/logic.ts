import type {
  VotingBallot,
  VotingDuplicateHint,
  VotingPerson,
  VotingPersonSource,
  VotingResultEntry,
  VotingRound,
  VotingRoundStatus,
  VotingTally,
} from '@/apps/voting/types'
import { colorPickerPresets } from '@/components/ui/colorPickerLogic'
import { normalizeParticipantColor } from '@/lib/theme'

export const maxVotingNameLength = 40
export const defaultVotingRoundTitle = 'Bestes Kostüm'

const personSources: readonly VotingPersonSource[] = ['self', 'admin', 'write-in']
const roundStatuses: readonly VotingRoundStatus[] = ['open', 'closed', 'archived']

export function sanitizeVotingName(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, maxVotingNameLength)
}

// Vergleichsform: Groß- und Kleinschreibung sowie Leerzeichen spielen keine Rolle.
export function normalizeVotingName(value: string) {
  return sanitizeVotingName(value).toLocaleLowerCase('de')
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toIsoString(value: unknown, fallback: string) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}

export function normalizePerson(person: VotingPerson, index: number): VotingPerson {
  const fallbackColor = colorPickerPresets[index % colorPickerPresets.length]

  return {
    ...person,
    name: sanitizeVotingName(typeof person.name === 'string' ? person.name : '') || `Person ${index + 1}`,
    color: normalizeParticipantColor(person.color, fallbackColor),
    position: toFiniteNumber(person.position, index + 1),
    source: personSources.includes(person.source) ? person.source : 'admin',
    mergedIntoId: typeof person.mergedIntoId === 'string' && person.mergedIntoId !== person.id
      ? person.mergedIntoId
      : null,
    createdAtClientIso: toIsoString(person.createdAtClientIso, new Date(0).toISOString()),
  }
}

export function normalizeBallot(ballot: VotingBallot): VotingBallot | null {
  if (
    typeof ballot.roundKey !== 'string' ||
    typeof ballot.voterId !== 'string' ||
    typeof ballot.candidateId !== 'string'
  ) {
    return null
  }

  return {
    ...ballot,
    updatedAtClientIso: toIsoString(ballot.updatedAtClientIso, new Date(0).toISOString()),
  }
}

export function normalizeRound(round: VotingRound, index: number): VotingRound {
  const createdAtClientIso = toIsoString(round.createdAtClientIso, new Date(0).toISOString())

  return {
    ...round,
    key: typeof round.key === 'string' && round.key ? round.key : round.id,
    position: toFiniteNumber(round.position, index + 1),
    title: sanitizeVotingName(typeof round.title === 'string' ? round.title : '') || defaultVotingRoundTitle,
    status: roundStatuses.includes(round.status) ? round.status : 'open',
    votersVisible: round.votersVisible === true,
    createdAtClientIso,
    closedAtClientIso: typeof round.closedAtClientIso === 'string' ? round.closedAtClientIso : null,
    archivedAtClientIso: typeof round.archivedAtClientIso === 'string' ? round.archivedAtClientIso : null,
    ballotCount: toFiniteNumber(round.ballotCount, 0),
    results: Array.isArray(round.results) ? round.results : [],
  }
}

export function sortPeople(people: VotingPerson[]) {
  return [...people].sort(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id),
  )
}

// Folgt Aliasketten bis zur sichtbaren Person; gelöschte Ziele ergeben null.
export function resolvePersonId(peopleById: ReadonlyMap<string, VotingPerson>, id: string | null | undefined) {
  let currentId = id ?? null
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) return null
    visited.add(currentId)
    const person = peopleById.get(currentId)
    if (!person) return null
    if (!person.mergedIntoId) return person.id
    currentId = person.mergedIntoId
  }

  return null
}

export function getVisiblePeople(people: VotingPerson[]) {
  const peopleById = new Map(people.map((person) => [person.id, person]))

  return sortPeople(people).filter((person) => resolvePersonId(peopleById, person.id) === person.id)
}

export function getAliases(people: VotingPerson[], personId: string) {
  const peopleById = new Map(people.map((person) => [person.id, person]))

  return sortPeople(people).filter(
    (person) => person.id !== personId && resolvePersonId(peopleById, person.id) === personId,
  )
}

// Findet auch Aliasnamen, damit eine bekannte Schreibweise wieder bei der richtigen Person landet.
export function findPersonIdByName(people: VotingPerson[], name: string) {
  const normalizedName = normalizeVotingName(name)
  if (!normalizedName) return null
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const visibleMatch = getVisiblePeople(people).find(
    (person) => normalizeVotingName(person.name) === normalizedName,
  )
  if (visibleMatch) return visibleMatch.id
  const aliasMatch = sortPeople(people).find(
    (person) => normalizeVotingName(person.name) === normalizedName,
  )

  return aliasMatch ? resolvePersonId(peopleById, aliasMatch.id) : null
}

export function getNextPersonPosition(people: VotingPerson[]) {
  return people.reduce((max, person) => Math.max(max, person.position), 0) + 1
}

// Neue Personen erhalten reihum die Schnellwahlfarben des Farbwählers, zuerst die kräftigen.
export function pickNextColor(people: VotingPerson[]) {
  const usage = new Map<string, number>(colorPickerPresets.map((color) => [color, 0]))

  for (const person of getVisiblePeople(people)) {
    const color = person.color.toUpperCase()
    if (usage.has(color)) usage.set(color, (usage.get(color) ?? 0) + 1)
  }

  return colorPickerPresets.reduce((best, color) =>
    (usage.get(color) ?? 0) < (usage.get(best) ?? 0) ? color : best,
  )
}

// Wettkampfrangfolge: Gleichstand teilt den Platz, der nächste Platz wird übersprungen.
export function rankResults(entries: Omit<VotingResultEntry, 'rank'>[]): VotingResultEntry[] {
  const sorted = [...entries].sort(
    (left, right) => right.votes - left.votes || left.name.localeCompare(right.name, 'de'),
  )

  return sorted.map((entry, index) => {
    const firstEqual = sorted.findIndex((candidate) => candidate.votes === entry.votes)
    return { ...entry, rank: firstEqual === -1 ? index + 1 : firstEqual + 1 }
  })
}

export function tallyVotes(
  people: VotingPerson[],
  ballots: VotingBallot[],
  roundKey: string,
): VotingTally {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const latestByVoter = new Map<string, { candidateId: string; updatedAt: number }>()

  for (const ballot of ballots) {
    if (ballot.roundKey !== roundKey) continue
    const voterId = resolvePersonId(peopleById, ballot.voterId)
    const candidateId = resolvePersonId(peopleById, ballot.candidateId)
    if (!voterId || !candidateId) continue
    const updatedAt = Date.parse(ballot.updatedAtClientIso) || 0
    const previous = latestByVoter.get(voterId)
    // Zusammengeführte Personen behalten nur ihre jüngste Stimme.
    if (!previous || updatedAt >= previous.updatedAt) {
      latestByVoter.set(voterId, { candidateId, updatedAt })
    }
  }

  const voterIdsByCandidate = new Map<string, string[]>()
  for (const [voterId, { candidateId }] of latestByVoter) {
    voterIdsByCandidate.set(candidateId, [...(voterIdsByCandidate.get(candidateId) ?? []), voterId])
  }

  const results = rankResults(
    [...voterIdsByCandidate].map(([candidateId, voterIds]) => {
      const candidate = peopleById.get(candidateId) as VotingPerson
      return {
        personId: candidate.id,
        name: candidate.name,
        color: candidate.color,
        votes: voterIds.length,
        voterNames: voterIds
          .map((voterId) => peopleById.get(voterId)?.name ?? '')
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right, 'de')),
      }
    }),
  )

  return {
    ballotCount: latestByVoter.size,
    results,
    choiceByVoterId: new Map([...latestByVoter].map(([voterId, { candidateId }]) => [voterId, candidateId])),
  }
}

// Alle Personen, die auf eine der Quellen zeigen, wandern direkt zur Zielperson.
export function getMergeUpdates(people: VotingPerson[], targetId: string, sourceIds: string[]) {
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const sourceSet = new Set(sourceIds.filter((id) => id !== targetId))

  return people
    .filter((person) => {
      const rootId = resolvePersonId(peopleById, person.id)
      return person.id !== targetId && rootId !== null && sourceSet.has(rootId)
    })
    .map((person) => person.id)
}

function editDistanceAtMostOne(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false
  let leftIndex = 0
  let rightIndex = 0
  let edits = 0

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }

  return edits + (left.length - leftIndex) + (right.length - rightIndex) <= 1
}

function looksLikeSamePerson(left: string, right: string) {
  if (left === right) return true
  const leftWords = left.split(' ')
  const rightWords = right.split(' ')
  // „Heinz“ und „Heinz Müller“: Vorname plus Nachname.
  if (leftWords[0] === rightWords[0] && leftWords[0].length >= 3 && leftWords.length !== rightWords.length) {
    return true
  }
  // Ein vergessener oder vertauschter Buchstabe bei längeren Namen.
  return Math.min(left.length, right.length) >= 4 && editDistanceAtMostOne(left, right)
}

export function getDuplicateHintKey(hint: VotingDuplicateHint) {
  return [hint.keepId, hint.mergeId].sort().join('|')
}

// Ähnliche Schreibweisen als Vorschlag; zusammengeführt wird nur nach Bestätigung.
export function findDuplicateHints(people: VotingPerson[], dismissedKeys: readonly string[] = []) {
  const visiblePeople = getVisiblePeople(people)
  const dismissed = new Set(dismissedKeys)
  const hints: VotingDuplicateHint[] = []

  visiblePeople.forEach((left, leftIndex) => {
    for (const right of visiblePeople.slice(leftIndex + 1)) {
      if (!looksLikeSamePerson(normalizeVotingName(left.name), normalizeVotingName(right.name))) continue
      // Selbst angemeldete Personen behalten ihren Namen; sonst gewinnt der ausführlichere.
      const keepLeft =
        left.source === 'self' && right.source !== 'self' ? true
          : right.source === 'self' && left.source !== 'self' ? false
            : left.name.length >= right.name.length
      const hint = keepLeft
        ? { keepId: left.id, mergeId: right.id }
        : { keepId: right.id, mergeId: left.id }
      if (!dismissed.has(getDuplicateHintKey(hint))) hints.push(hint)
    }
  })

  return hints
}

export function getLeaders(results: VotingResultEntry[]) {
  return results.filter((entry) => entry.rank === 1 && entry.votes > 0)
}
