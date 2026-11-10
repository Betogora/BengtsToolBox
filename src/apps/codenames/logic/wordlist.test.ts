import { describe, expect, it } from 'vitest'

import { cryptoRandomInt, seededRandomInt } from './random'
import { WORDLIST_TEXTS } from '../server/wordlists'
import { displayWord, drawWords, norm, parseWordlist, sameForm } from './wordlist'

const original = parseWordlist(WORDLIST_TEXTS.original)
const duett = parseWordlist(WORDLIST_TEXTS.duett)
const pool = original

describe('Wortliste', () => {
  it.each([
    ['Original', WORDLIST_TEXTS.original, original, 400, ['Strauß', 'Loch Ness']],
    ['Duett', WORDLIST_TEXTS.duett, duett, 399, ['Großvater']],
  ])('%s hat die erwartete Zahl Begriffe ohne Dubletten', (_, text, list, count, samples) => {
    expect(text.split(/\r?\n/).filter((l) => l.trim())).toHaveLength(count)
    expect(list).toHaveLength(count)
    expect(new Set(list.map(norm)).size).toBe(count)
    expect(list).toEqual(expect.arrayContaining(samples))
  })

  it('schreibt jeden Begriff mit großem Anfangsbuchstaben, nicht durchgehend groß', () => {
    for (const w of [...original, ...duett]) expect(w, w).toMatch(/^\p{Lu}[\p{Ll}]+( \p{Lu}\p{Ll}+)?$/u)
  })

  it('Anzeigeform: großer Anfangsbuchstabe', () => {
    expect(displayWord('MATADOR')).toBe('Matador')
    expect(displayWord('matador')).toBe('Matador')
    expect(displayWord('ÜBUNG')).toBe('Übung')
    expect(displayWord('McDonald')).toBe('McDonald')
  })

  it('erkennt bloße Wortformen, nicht aber ähnliche Wörter', () => {
    expect(sameForm('HOSE', 'HOSEN')).toBe(true)
    expect(sameForm('KÖNIGIN', 'KÖNIG')).toBe(true)
    expect(sameForm('GERICHT', 'GESICHT')).toBe(false)
    expect(sameForm('RING', 'HERING')).toBe(false)
  })

  it('zieht 25 verschiedene Begriffe, HOSE und HOSEN nie gemeinsam', () => {
    const small = ['Hose', 'Hosen', ...pool.filter((w) => !/^Hose/.test(w)).slice(0, 30)]
    for (let seed = 0; seed < 500; seed++) {
      const words = drawWords(small, seededRandomInt(seed))
      expect(words).toHaveLength(25)
      expect(words.includes('Hose') && words.includes('Hosen')).toBe(false)
    }
    for (let k = 0; k < 200; k++) {
      const words = drawWords(k % 2 ? duett : original, cryptoRandomInt)
      expect(new Set(words).size).toBe(25)
      for (const a of words) for (const b of words) if (a !== b) expect(sameForm(a, b)).toBe(false)
    }
  })

  it('ist gleichverteilt (Chi²-Stichprobe)', () => {
    const draws = 400
    const counts = new Map(pool.map((w) => [w, 0]))
    const random = seededRandomInt(2026)
    for (let k = 0; k < draws; k++) for (const w of drawWords(pool, random)) counts.set(w, counts.get(w)! + 1)
    const expected = (draws * 25) / pool.length
    let chi2 = 0
    for (const c of counts.values()) chi2 += (c - expected) ** 2 / expected
    const df = pool.length - 1
    // Erwartung df, Standardabweichung √(2·df) ≈ 50; 4σ als Grenze.
    expect(chi2).toBeLessThan(df + 4 * Math.sqrt(2 * df))
    expect(chi2).toBeGreaterThan(df - 4 * Math.sqrt(2 * df))
  })

  it('Krypto-Zufall bleibt im Bereich', () => {
    for (let k = 0; k < 1000; k++) {
      const v = cryptoRandomInt(7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(7)
    }
  })
})
