import { createTournament } from './tournamentCreation'
import { inspectTournament } from './tournamentInspection'
import { transitionTournament } from './tournamentLifecycle'

export const tournamentDomain = {
  create: createTournament,
  inspect: inspectTournament,
  transition: transitionTournament,
}

export type {
  BeerStandingRow,
  InspectedPairing,
  InspectedPlayer,
  InspectedRound,
  TournamentCommand,
  TournamentCommandEnvelope,
  TournamentDecision,
  TournamentEffect,
  TournamentInspection,
  TournamentIssue,
  TournamentNoticeCode,
  TournamentPlanningAvailability,
  TournamentProgress,
} from './tournamentDomainTypes'
