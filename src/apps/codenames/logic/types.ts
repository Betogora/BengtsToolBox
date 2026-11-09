export type Team = 'rot' | 'blau'
export type CardColor = Team | 'neutral' | 'attentaeter'
export type Phase = 'hinweis' | 'raten' | 'ende'

export const TEAMS: readonly Team[] = ['rot', 'blau']
export const OTHER: Record<Team, Team> = { rot: 'blau', blau: 'rot' }
export const TEAM_NAME: Record<Team, string> = { rot: 'Team Rot', blau: 'Team Blau' }

export type GuessResult = { word: string; color: CardColor }

/** Ein gegebener Hinweis. `number` ist null bei „unbegrenzt“. */
export type ClueRecord = {
  team: Team
  word: string
  /** Anzeige der Zahl wie im Skill-Archiv: "3" oder "∞". */
  label: string
  number: number | null
  targets: string[]
  /** Woher der Hinweis kommt: Modellname oder "platzhalter". */
  source?: string
  durationMs?: number
  attempts?: number
  results: GuessResult[]
}

export type ActiveClue = {
  /** Verbleibende Rateversuche; null = beliebig viele. */
  guessesLeft: number | null
  guessesMade: number
}

/** Vollständiger, geheimer Spielstand. Liegt nur auf dem Server. */
export type GameState = {
  version: 1
  createdAt: string
  words: string[]
  colors: CardColor[]
  revealed: boolean[]
  start: Team
  turn: Team
  phase: Phase
  clue: ActiveClue | null
  clues: ClueRecord[]
  winner: Team | null
  undo: string[]
}
