export type Team = 'rot' | 'blau'
export type CardColor = Team | 'neutral' | 'attentaeter'
export type Phase = 'hinweis' | 'raten' | 'ende'

export const TEAMS: readonly Team[] = ['rot', 'blau']
export const OTHER: Record<Team, Team> = { rot: 'blau', blau: 'rot' }

export type GuessResult = { word: string; color: CardColor }

/** Ein gegebener Hinweis. */
export type ClueRecord = {
  team: Team
  word: string
  number: number
  targets: string[]
  /** Woher der Hinweis kommt: Modellname oder "platzhalter". */
  results: GuessResult[]
}

export type ActiveClue = {
  /** Verbleibende Rateversuche (ZAHL + 1 zu Beginn). */
  guessesLeft: number
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
