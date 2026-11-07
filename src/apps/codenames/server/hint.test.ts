import { describe, expect, it, vi } from 'vitest'

import { MATADOR, SCHACH } from '../logic/__fixtures__/replay'
import { createGame, giveClue, reveal } from '../logic/engine'
import { seededRandomInt } from '../logic/random'
import {
  buildPromptState,
  calibrationFrom,
  generateClue,
  HintError,
  placeholderClue,
  validateResponse,
} from './hint'

const answer = (wort: string, zahl: number | string, ziele: string[], gefahrenfeld: string[] = []) => ({
  gefahrenfeld,
  hinweis: { wort, zahl, ziele: ziele.map((w) => ({ wort: w, zuversicht: 'sicher' })) },
})

function mockFetch(...bodies: unknown[]) {
  const calls: { body: Record<string, unknown> }[] = []
  const fn = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push({ body: JSON.parse(init.body as string) })
    const next = bodies[calls.length - 1]
    const content = typeof next === 'string' ? next : JSON.stringify(next)
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
  })
  return { fetchImpl: fn as unknown as typeof fetch, calls }
}

const config = (fetchImpl: typeof fetch) => ({ apiKey: 'test-schluessel', model: 'test/modell', fetchImpl })

describe('Prompt-Spielstand', () => {
  it('entspricht für MATADOR dem Beispiel aus dem Vorschlag', () => {
    const p = buildPromptState(MATADOR(), { sicher: [12, 14], wahrscheinlich: [7, 12], wackelig: [2, 8] })
    expect(p.team).toBe('rot')
    expect(p.lage).toMatchObject({
      eigeneOffen: 4,
      gegnerOffen: 1,
      resteEigen: ['Uhr', 'Sekt'],
      resteGegner: [],
      gegnerFertigIn: 1,
      profil: 'LETZTE_CHANCE',
      mindestZahl: 3,
    })
    expect(p.brett).toEqual({
      eigene: ['Uhr', 'Eis', 'Sekt', 'Bulle'],
      gegner: ['Batterie'],
      // ROSE fehlt im Beispiel des Vorschlags, wurde aber erst im MATADOR-Zug aufgedeckt.
      neutral: ['Kompass', 'Rose', 'Brunnen', 'Wüste', 'Schuss'],
      attentaeter: 'Wein',
    })
    expect(p.verlauf.map((v) => v.hinweis)).toEqual(['Laub', 'Umlaufbahn', 'Braut'])
    expect(p.verlauf[2]).toEqual({ team: 'rot', hinweis: 'Braut', zahl: 2, ziele: ['Strauß', 'Sekt'], geraten: ['Strauß', 'Glocke'] })
    expect(p.verwendeteHinweise).toEqual(['Laub', 'Schein', 'Umlaufbahn', 'Post', 'Braut', 'Mähne'])
    expect(p.trefferquote).toEqual({ sicher: '12/14', wahrscheinlich: '7/12', wackelig: '2/8' })
  })

  it('Trefferquote zählt Ziele, die im Zug ihres Hinweises geraten wurden', () => {
    const cal = calibrationFrom([MATADOR()])
    // LAUB: Blatt, Wald sicher getroffen, Strauß wackelig verfehlt; SCHEIN 3 sicher/wahrsch. getroffen …
    expect(cal.wackelig[1]).toBeGreaterThan(0)
    expect(cal.sicher[0]).toBeLessThanOrEqual(cal.sicher[1])
  })
})

describe('Serverprüfung', () => {
  it('lehnt MATADOR 1 bei LETZTE CHANCE ab und nimmt einen Hinweis mit ZAHL 3 an', () => {
    const state = MATADOR()
    const bad = validateResponse(answer('MATADOR', 1, ['BULLE']), state)
    expect(bad).toMatchObject({ ok: false })
    expect(!bad.ok && bad.error).toMatch(/mindestens 3/)
    const good = validateResponse(answer('ARKTIS', 3, ['EIS', 'BULLE', 'UHR']), state)
    expect(good).toMatchObject({ ok: true, clue: { word: 'Arktis', number: 3, targets: ['Eis', 'Bulle', 'Uhr'] } })
    expect(validateResponse(answer('ARKTIS', 'unbegrenzt', ['EIS', 'BULLE']), state).ok).toBe(true)
  })

  it('lehnt SCHACH 1 → PFERD ab (KRAKE unerreichbar)', () => {
    const r = validateResponse(answer('SCHACH', 1, ['PFERD']), SCHACH())
    expect(!r.ok && r.error).toMatch(/Krake/)
    expect(validateResponse(answer('TINTE', 1, ['KRAKE']), SCHACH()).ok).toBe(true)
  })

  it('prüft Wortregeln, Ziele und Anzahl', () => {
    const s = MATADOR()
    const err = (a: unknown) => {
      const r = validateResponse(a, s)
      return r.ok ? '' : r.error
    }
    expect(err(answer('ZWEI WORTE', 3, ['EIS', 'BULLE', 'UHR']))).toMatch(/mehr als ein Wort/)
    expect(err(answer('123', 3, ['EIS', 'BULLE', 'UHR']))).toMatch(/Buchstaben/)
    expect(err(answer('wüste', 3, ['EIS', 'BULLE', 'UHR']))).toMatch(/offener Begriff/)
    expect(err(answer('EISBÄR', 3, ['EIS', 'BULLE', 'UHR']))).toMatch(/überschneidet sich .*Eis/)
    expect(err(answer('Braut', 3, ['EIS', 'BULLE', 'UHR']))).toMatch(/schon als Hinweis/)
    expect(err(answer('PROSTE', 3, ['EIS', 'BULLE', 'UHR'], ['PROST']))).toMatch(/Gefahrenfeld/)
    expect(err(answer('ARKTIS', 3, ['EIS', 'BATTERIE', 'UHR']))).toMatch(/Batterie.*kein offener eigener/)
    expect(err(answer('ARKTIS', 3, ['EIS', 'BULLE']))).toMatch(/ZAHL 3, aber 2 Ziele/)
    expect(err(answer('ARKTIS', 'viele', ['EIS']))).toMatch(/ZAHL muss/)
    expect(err({ foo: 1 })).toMatch(/"hinweis" fehlt/)
  })

  it('Platzhalter-Hinweis ist regelkonform, auch bei LETZTE CHANCE', () => {
    for (const state of [MATADOR(), SCHACH(), createGame(MATADOR().words, { randomInt: seededRandomInt(3) })]) {
      const clue = placeholderClue(state)
      const r = validateResponse(answer(clue.word, clue.number!, clue.targets), state)
      expect(r.ok).toBe(true)
    }
  })
})

describe('OpenRouter-Aufruf (gemockt)', () => {
  it('gültige Antwort: ein Aufruf mit Systemprompt, Spielstand und Schema', async () => {
    const { fetchImpl, calls } = mockFetch(answer('ARKTIS', 3, ['EIS', 'BULLE', 'UHR'], ['PROST']))
    const clue = await generateClue(MATADOR(), config(fetchImpl))
    expect(calls).toHaveLength(1)
    const body = calls[0]!.body as { model: string; messages: { role: string; content: string }[]; response_format: { type: string } }
    expect(body.model).toBe('test/modell')
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user'])
    expect(JSON.parse(body.messages[1]!.content).lage.profil).toBe('LETZTE_CHANCE')
    expect(body.response_format.type).toBe('json_schema')
    expect(clue).toMatchObject({ word: 'Arktis', number: 3, attempts: 1, source: 'test/modell', dangerField: ['PROST'] })
  })

  it('Regelverstoß → zweiter Aufruf mit der Fehlermeldung', async () => {
    const { fetchImpl, calls } = mockFetch(
      answer('MATADOR', 1, ['BULLE']),
      answer('ARKTIS', 'unbegrenzt', ['EIS', 'BULLE']),
    )
    const clue = await generateClue(MATADOR(), config(fetchImpl))
    expect(calls).toHaveLength(2)
    const messages = (calls[1]!.body as { messages: { role: string; content: string }[] }).messages
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(messages[3]!.content).toMatch(/^Ungültig: .*mindestens 3.* Wähle einen anderen Hinweis\.$/)
    expect(clue).toMatchObject({ word: 'Arktis', number: null, attempts: 2 })
  })

  it('zwei Verstöße → Fehler, kein dritter Aufruf', async () => {
    const { fetchImpl, calls } = mockFetch('kein json', answer('MATADOR', 1, ['BULLE']))
    await expect(generateClue(MATADOR(), config(fetchImpl))).rejects.toThrow(HintError)
    expect(calls).toHaveLength(2)
  })

  it('HTTP-Fehler wird als Meldung ohne Schlüssel weitergereicht', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Rate limit' } }), { status: 429 }))
    const error = await generateClue(MATADOR(), config(fetchImpl as unknown as typeof fetch)).catch((e: Error) => e)
    expect(error).toBeInstanceOf(HintError)
    expect((error as Error).message).toMatch(/429: Rate limit/)
    expect((error as Error).message).not.toContain('test-schluessel')
  })

  it('ohne Schlüssel oder Modell: Platzhalter, kein Netzaufruf', async () => {
    const fetchImpl = vi.fn()
    const clue = await generateClue(MATADOR(), { model: 'x', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(clue.source).toBe('platzhalter')
  })

  it('Spielstand im laufenden Spiel bleibt prüfbar (Smoke)', () => {
    let s = createGame(MATADOR().words, { start: 'rot', randomInt: seededRandomInt(9) })
    s = giveClue(s, placeholderClue(s))
    s = reveal(s, s.colors.indexOf('neutral')).state
    expect(buildPromptState(s).team).toBe('blau')
  })
})
