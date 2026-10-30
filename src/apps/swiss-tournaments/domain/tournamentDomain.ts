import { createTournament } from './tournamentCreation'
import {
  inspectTournament,
  normalizeTournament,
  summarizeTournamentResults,
} from './tournamentInspection'
import {
  getFixedPairingPlayerIds,
  transitionTournament,
} from './tournamentLifecycle'

export const tournamentDomain = {
  create: createTournament,
  fixedPairingPlayerIds: getFixedPairingPlayerIds,
  inspect: inspectTournament,
  normalize: normalizeTournament,
  summarize: summarizeTournamentResults,
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
export type { TournamentResultSummary } from './tournamentInspection'
