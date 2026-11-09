// Öffentliche Sicht: alles, was der Browser sehen darf. Farben offener Karten, Ziele und
// Zuversicht bleiben im versiegelten Spielstand – Ziele erscheinen erst in der Auflösung.
import { canUndo, remaining, total } from './engine'
import type { CardColor, GameState, GuessResult, Phase, Team } from './types'

export type PublicCard = { word: string; revealed: boolean; color: CardColor | null }

export type PublicClue = {
  team: Team
  word: string
  number: number
  results: GuessResult[]
  /** Nur nach Spielende gesetzt. */
  targets?: string[]
}

export type PublicView = {
  createdAt: string
  phase: Phase
  start: Team
  turn: Team
  winner: Team | null
  cards: PublicCard[]
  score: Record<Team, { remaining: number; total: number }>
  clue: (PublicClue & { guessesLeft: number; guessesMade: number }) | null
  history: PublicClue[]
  canUndo: boolean
}

export function publicView(state: GameState): PublicView {
  const ended = state.phase === 'ende'
  const history: PublicClue[] = state.clues.map((c) => ({
    team: c.team,
    word: c.word,
    number: c.number,
    results: c.results.map((r) => ({ word: r.word, color: r.color })),
    ...(ended ? { targets: [...c.targets] } : {}),
  }))
  const last = history[history.length - 1]
  return {
    createdAt: state.createdAt,
    phase: state.phase,
    start: state.start,
    turn: state.turn,
    winner: state.winner,
    cards: state.words.map((word, i) => ({
      word,
      revealed: state.revealed[i]!,
      color: state.revealed[i] || ended ? state.colors[i]! : null,
    })),
    score: {
      rot: { remaining: remaining(state, 'rot'), total: total(state, 'rot') },
      blau: { remaining: remaining(state, 'blau'), total: total(state, 'blau') },
    },
    clue: state.phase === 'raten' && state.clue && last
      ? { ...last, guessesLeft: state.clue.guessesLeft, guessesMade: state.clue.guessesMade }
      : null,
    history,
    canUndo: canUndo(state),
  }
}
