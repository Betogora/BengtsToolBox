export type VotingPersonSource = 'self' | 'admin' | 'write-in'

export type VotingPerson = {
  id: string
  name: string
  color: string
  position: number
  source: VotingPersonSource
  // Zusammengeführte Schreibweisen bleiben als Alias erhalten und zählen für die Zielperson.
  mergedIntoId: string | null
  createdAtClientIso: string
  lastUpdatedBy?: string
}

export type VotingBallot = {
  // Eine Stimme je Person und Runde: Die Dokument-ID ist die Personen-ID der wählenden Person.
  id: string
  // Firestore sortiert Collections nach `position`; Stimmen nutzen dafür ihren Zeitstempel.
  position: number
  roundKey: string
  voterId: string
  candidateId: string
  updatedAtClientIso: string
  lastUpdatedBy?: string
}

export type VotingRoundStatus = 'open' | 'closed' | 'archived'

export type VotingResultEntry = {
  personId: string
  name: string
  color: string
  votes: number
  rank: number
  voterNames: string[]
}

export type VotingRound = {
  id: string
  // Neue Runden erhalten einen neuen Schlüssel; Stimmen älterer Runden zählen dadurch nie mit.
  key: string
  position: number
  title: string
  status: VotingRoundStatus
  votersVisible: boolean
  createdAtClientIso: string
  closedAtClientIso: string | null
  archivedAtClientIso: string | null
  ballotCount: number
  results: VotingResultEntry[]
  lastUpdatedBy?: string
}

export type VotingState = {
  activeRoundId: string
  dismissedDuplicateKeys?: string[]
  updatedBy?: string
}

export type VotingTally = {
  ballotCount: number
  results: VotingResultEntry[]
  // Aufgelöste Wahl je wählender Person, nur für die Spielleitung bestimmt.
  choiceByVoterId: Map<string, string>
}

export type VotingDuplicateHint = {
  keepId: string
  mergeId: string
}
