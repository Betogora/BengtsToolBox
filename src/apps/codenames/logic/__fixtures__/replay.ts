import type { ClueRecord, GameState } from '../types'
import runde2 from './runde2-schach.json'
import runde3 from './runde3-matador.json'

type Archive = typeof runde2 | typeof runde3

/** Spielstand unmittelbar vor dem Hinweis Nr. `clueIndex` (0-basiert) eines archivierten Spiels. */
export function stateBefore(archive: Archive, clueIndex: number): GameState {
  const clues: ClueRecord[] = archive.clues.slice(0, clueIndex).map((c) => ({
    team: c.team as ClueRecord['team'],
    word: c.word,
    label: c.label,
    number: c.label === '∞' ? null : Number(c.label),
    targets: c.targets,
    results: c.results as ClueRecord['results'],
  }))
  const revealed = archive.words.map((w) => clues.some((c) => c.results.some((r) => r.word === w)))
  return {
    version: 1,
    createdAt: archive.createdAt,
    words: archive.words,
    colors: archive.colors as GameState['colors'],
    revealed,
    start: archive.start as GameState['start'],
    turn: archive.clues[clueIndex]!.team as GameState['turn'],
    phase: 'hinweis',
    clue: null,
    clues,
    winner: null,
    undo: [],
  }
}

export const SCHACH = () => stateBefore(runde2, 5)
export const MATADOR = () => stateBefore(runde3, 6)
