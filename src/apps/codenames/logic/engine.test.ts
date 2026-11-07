import { describe, expect, it } from 'vitest'

import { GameError, createGame, giveClue, pass, remaining, reveal, undo } from './engine'
import { seededRandomInt } from './random'
import type { GameState, Team } from './types'

const WORDS = Array.from({ length: 25 }, (_, i) => `WORT${String.fromCharCode(65 + i)}`)

function game(start: Team = 'rot', seed = 1) {
  return createGame(WORDS, { start, randomInt: seededRandomInt(seed) })
}
const idx = (s: GameState, color: string, n = 0) =>
  s.colors.map((c, i) => [c, i] as const).filter(([c, i]) => c === color && !s.revealed[i])[n]![1]
const ownTargets = (s: GameState, k: number) =>
  s.words.filter((_, i) => s.colors[i] === s.turn && !s.revealed[i]).slice(0, k)

describe('createGame', () => {
  it('verteilt 9/8/7/1, das Startteam bekommt 9', () => {
    for (const start of ['rot', 'blau'] as const) {
      const s = game(start, 7)
      const count = (c: string) => s.colors.filter((x) => x === c).length
      expect(count(start)).toBe(9)
      expect(count(start === 'rot' ? 'blau' : 'rot')).toBe(8)
      expect(count('neutral')).toBe(7)
      expect(count('attentaeter')).toBe(1)
      expect(s.turn).toBe(start)
      expect(s.phase).toBe('hinweis')
    }
  })

  it('lost das Startteam mit Krypto-Zufall aus und lehnt Dubletten ab', () => {
    const starts = new Set(Array.from({ length: 40 }, () => createGame(WORDS).start))
    expect(starts).toEqual(new Set(['rot', 'blau']))
    expect(() => createGame([...WORDS.slice(0, 24), 'worta'])).toThrow(GameError)
    expect(() => createGame(WORDS.slice(0, 24))).toThrow(GameError)
  })
})

describe('Raten', () => {
  it('Treffer lässt weiterraten, ZAHL + 1 Versuche, dann Zugende (Zusatzversuch)', () => {
    let s = giveClue(game(), { word: 'HINWEIS', number: 2, targets: ownTargets(game(), 2) })
    expect(s.clue).toEqual({ guessesLeft: 3, guessesMade: 0 })
    for (let k = 0; k < 2; k++) {
      const r = reveal(s, idx(s, 'rot'))
      expect(r.outcome.kind).toBe('richtig')
      expect(r.outcome.turnEnded).toBe(false)
      s = r.state
    }
    expect(s.clue!.guessesLeft).toBe(1)
    const third = reveal(s, idx(s, 'rot'))
    expect(third.outcome.turnEnded).toBe(true)
    expect(third.state.turn).toBe('blau')
    expect(third.state.phase).toBe('hinweis')
    expect(third.outcome.message).toContain('Zug beendet')
  })

  it('Fehlgriff (neutral oder Gegner) beendet den Zug', () => {
    const s = giveClue(game(), { word: 'HINWEIS', number: 2, targets: ownTargets(game(), 2) })
    const neutral = reveal(s, idx(s, 'neutral'))
    expect(neutral.outcome).toMatchObject({ kind: 'neutral', turnEnded: true, message: 'Neutral – Zug beendet' })
    expect(neutral.state.turn).toBe('blau')
    const enemy = reveal(s, idx(s, 'blau'))
    expect(enemy.outcome).toMatchObject({ kind: 'gegner', turnEnded: true })
    expect(remaining(enemy.state, 'blau')).toBe(7)
  })

  it('„unbegrenzt“ erlaubt beliebig viele Versuche', () => {
    let s = giveClue(game(), { word: 'HINWEIS', number: null, targets: ownTargets(game(), 1) })
    for (let k = 0; k < 5; k++) s = reveal(s, idx(s, 'rot')).state
    expect(s.phase).toBe('raten')
    expect(s.clue!.guessesLeft).toBeNull()
  })

  it('Attentäter beendet das Spiel, der Gegner gewinnt', () => {
    const s = giveClue(game(), { word: 'HINWEIS', number: 1, targets: ownTargets(game(), 1) })
    const r = reveal(s, idx(s, 'attentaeter'))
    expect(r.state.phase).toBe('ende')
    expect(r.state.winner).toBe('blau')
    expect(r.outcome.message).toBe('Attentäter – Team Blau gewinnt')
  })

  it('Aufdecken der letzten gegnerischen Karte lässt den Gegner gewinnen', () => {
    let s = game()
    // Blau bis auf eine Karte aufdecken.
    for (let k = 0; k < 7; k++) s = { ...s, revealed: s.revealed.map((v, i) => v || i === idx(s, 'blau')) }
    s = giveClue(s, { word: 'HINWEIS', number: 1, targets: ownTargets(s, 1) })
    const r = reveal(s, idx(s, 'blau'))
    expect(r.state.phase).toBe('ende')
    expect(r.state.winner).toBe('blau')
  })

  it('Aufdecken der letzten eigenen Karte gewinnt', () => {
    let s = game()
    for (let k = 0; k < 8; k++) s = { ...s, revealed: s.revealed.map((v, i) => v || i === idx(s, 'rot')) }
    s = giveClue(s, { word: 'HINWEIS', number: 1, targets: ownTargets(s, 1) })
    expect(reveal(s, idx(s, 'rot')).state.winner).toBe('rot')
  })

  it('Passen erst nach einem Versuch, Doppelklick abgelehnt', () => {
    const s = giveClue(game(), { word: 'HINWEIS', number: 2, targets: ownTargets(game(), 2) })
    expect(() => pass(s)).toThrow('mindestens ein Rateversuch')
    const once = reveal(s, idx(s, 'rot')).state
    expect(() => reveal(once, once.revealed.indexOf(true))).toThrow('schon aufgedeckt')
    const passed = pass(once)
    expect(passed.turn).toBe('blau')
    expect(passed.phase).toBe('hinweis')
    expect(() => reveal(passed, idx(passed, 'blau'))).toThrow('Erst muss ein Hinweis')
  })
})

describe('Rückgängig', () => {
  it('nimmt Aufdecken und Zugende zurück, auch nach Spielende', () => {
    const s = giveClue(game(), { word: 'HINWEIS', number: 2, targets: ownTargets(game(), 2) })
    const neutral = reveal(s, idx(s, 'neutral')).state
    const back = undo(neutral)
    expect(back.phase).toBe('raten')
    expect(back.turn).toBe('rot')
    expect(back.revealed).toEqual(s.revealed)
    expect(back.clues.at(-1)!.results).toEqual([])
    const lost = reveal(s, idx(s, 'attentaeter')).state
    expect(undo(lost).phase).toBe('raten')
    expect(() => undo(s)).toThrow(GameError)
  })
})
