// Spiellogik als reine Funktionen, portiert aus dem Skill-Skript `codenames.mjs`.
// Jede Funktion gibt einen neuen Spielstand zurück; der übergebene bleibt unverändert.
import { cryptoRandomInt, shuffle, type RandomInt } from './random'
import {
  OTHER,
  type CardColor,
  type ClueRecord,
  type GameState,
  type Team,
} from './types'
import { displayWord, norm } from './wordlist'

export class GameError extends Error {}

const UNDO_LIMIT = 30

export const remaining = (s: GameState, team: Team) =>
  s.colors.filter((c, i) => c === team && !s.revealed[i]).length
export const total = (s: GameState, team: Team) => s.colors.filter((c) => c === team).length

const clone = (s: GameState): GameState => structuredClone(s)

export function createGame(
  words: readonly string[],
  options: { start?: Team; randomInt?: RandomInt; now?: Date } = {},
): GameState {
  const randomInt = options.randomInt ?? cryptoRandomInt
  if (words.length !== 25) throw new GameError(`Es sind ${words.length} statt 25 Begriffe.`)
  const seen = new Map<string, string>()
  for (const w of words) {
    const key = norm(w)
    if (seen.has(key)) throw new GameError(`Doppelter Begriff: „${seen.get(key)}“ und „${w}“.`)
    seen.set(key, w)
  }
  const start: Team = options.start ?? (randomInt(2) ? 'rot' : 'blau')
  const colors = shuffle<CardColor>(
    [
      ...Array<CardColor>(9).fill(start),
      ...Array<CardColor>(8).fill(OTHER[start]),
      ...Array<CardColor>(7).fill('neutral'),
      'attentaeter',
    ],
    randomInt,
  )
  return {
    version: 1,
    createdAt: (options.now ?? new Date()).toISOString(),
    words: [...words],
    colors,
    revealed: Array<boolean>(25).fill(false),
    start,
    turn: start,
    phase: 'hinweis',
    clue: null,
    clues: [],
    winner: null,
    undo: [],
  }
}

/** Index eines Begriffs (ohne Groß-/Kleinschreibung, Umlaute tolerant) oder -1. */
export function indexOfWord(s: GameState, word: string): number {
  const key = norm(word)
  return s.words.findIndex((w) => norm(w) === key)
}

/** Offene Ziele früherer Hinweise eines Teams (in Reihenfolge, ohne Dubletten). */
export function leftovers(s: GameState, team: Team): string[] {
  const open = new Set<string>()
  for (const c of s.clues) {
    if (c.team !== team) continue
    for (const t of c.targets) {
      const i = indexOfWord(s, t)
      if (i >= 0 && !s.revealed[i]) open.add(s.words[i]!)
    }
  }
  return [...open]
}

export type NewClue = {
  word: string
  number: number
  targets: string[]
}

/** Registriert einen (bereits geprüften) Hinweis und eröffnet die Ratephase. */
export function giveClue(state: GameState, clue: NewClue): GameState {
  if (state.phase !== 'hinweis') {
    throw new GameError(state.phase === 'ende' ? 'Das Spiel ist beendet.' : 'Es läuft bereits ein Hinweis.')
  }
  const s = clone(state)
  const targets = clue.targets.map((t) => {
    const i = indexOfWord(s, t)
    if (i < 0) throw new GameError(`Ziel „${t}“ steht nicht auf dem Brett.`)
    return s.words[i]!
  })
  const record: ClueRecord = {
    team: s.turn,
    word: displayWord(clue.word),
    number: clue.number,
    targets,
    results: [],
  }
  s.clues.push(record)
  s.phase = 'raten'
  s.clue = { guessesLeft: clue.number + 1, guessesMade: 0 }
  return s
}

function snapshot(s: GameState) {
  const { undo, ...rest } = s
  s.undo = [...undo, JSON.stringify(rest)].slice(-UNDO_LIMIT)
}

function endTurn(s: GameState) {
  s.turn = OTHER[s.turn]
  s.phase = 'hinweis'
  s.clue = null
}

function finish(s: GameState, winner: Team | null) {
  s.phase = 'ende'
  s.winner = winner
  s.clue = null
}

export type RevealKind = 'richtig' | 'neutral' | 'gegner' | 'attentaeter'

export type RevealOutcome = {
  word: string
  color: CardColor
  kind: RevealKind
  turnEnded: boolean
}

/** Deckt eine Karte auf und wertet sie nach den Regeln. */
export function reveal(state: GameState, index: number): { state: GameState; outcome: RevealOutcome } {
  if (state.phase !== 'raten') {
    throw new GameError(state.phase === 'ende' ? 'Das Spiel ist beendet.' : 'Erst muss ein Hinweis gegeben werden.')
  }
  if (!Number.isInteger(index) || index < 0 || index >= 25) throw new GameError('Diese Karte gibt es nicht.')
  if (state.revealed[index]) throw new GameError(`„${state.words[index]}“ ist schon aufgedeckt.`)
  const s = clone(state)
  snapshot(s)
  const team = s.turn
  const color = s.colors[index]!
  const word = s.words[index]!
  const clue = s.clue!
  s.revealed[index] = true
  clue.guessesMade++
  clue.guessesLeft--
  s.clues[s.clues.length - 1]!.results.push({ word, color })

  let kind: RevealKind
  if (color === 'attentaeter') {
    kind = 'attentaeter'
    finish(s, OTHER[team])
  } else if (color !== 'neutral' && remaining(s, color) === 0) {
    kind = color === team ? 'richtig' : 'gegner'
    finish(s, color)
  } else if (color === team) {
    kind = 'richtig'
    if (clue.guessesLeft === 0) endTurn(s)
  } else {
    kind = color === 'neutral' ? 'neutral' : 'gegner'
    endTurn(s)
  }

  return { state: s, outcome: { word, color, kind, turnEnded: s.phase !== 'raten' } }
}

/** Beendet den Zug freiwillig; erst nach mindestens einem Rateversuch erlaubt. */
export function pass(state: GameState): GameState {
  if (state.phase !== 'raten') throw new GameError('Passen geht nur während des Ratens.')
  if (state.clue!.guessesMade === 0) throw new GameError('Pro Hinweis ist mindestens ein Rateversuch Pflicht.')
  const s = clone(state)
  snapshot(s)
  endTurn(s)
  return s
}

export const canUndo = (s: GameState) => s.undo.length > 0

/** Nimmt den letzten Rateversuch bzw. das letzte Passen zurück. */
export function undo(state: GameState): GameState {
  if (!state.undo.length) throw new GameError('Es gibt nichts rückgängig zu machen.')
  const stack = [...state.undo]
  const prev = JSON.parse(stack.pop()!) as Omit<GameState, 'undo'>
  return { ...prev, undo: stack }
}
