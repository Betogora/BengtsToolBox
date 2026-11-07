import { describe, expect, it } from 'vitest'

import { cryptoRandomInt, seededRandomInt } from './random'
import { WORDLIST_TEXT as text } from '../server/wordlistText'
import { displayWord, drawWords, norm, parseWordlist, sameForm } from './wordlist'

const pool = parseWordlist(text)

describe('Wortliste', () => {
  it('hat 1215 Begriffe ohne Dubletten und Plural-/Schreibvarianten', () => {
    expect(text.split(/\r?\n/).filter((l) => l.trim())).toHaveLength(1215)
    expect(pool).toHaveLength(1215)
    expect(new Set(pool.map(norm)).size).toBe(pool.length)
    for (const gone of ['Hosen', 'Alptraum', 'Machine', 'Flugzeuge', 'Schlafen', 'Soldatin']) {
      expect(pool).not.toContain(gone)
    }
    expect(pool).toEqual(expect.arrayContaining(['Hose', 'Albtraum', 'Straße', 'Fuß', 'Strauß', 'Loch Ness', 'Café']))
  })

  it('schreibt jeden Begriff mit großem Anfangsbuchstaben, nicht durchgehend groß', () => {
    for (const w of pool) {
      if (w === 'CD') continue
      expect(w, w).toMatch(/^\p{Lu}[\p{Ll}]+( \p{Lu}\p{Ll}+)?$/u)
    }
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
      const words = drawWords(pool, cryptoRandomInt)
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
