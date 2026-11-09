import { describe, expect, it, vi } from 'vitest'

import { MATADOR, SCHACH } from '../logic/__fixtures__/replay'
import { createGame, giveClue, reveal } from '../logic/engine'
import { seededRandomInt } from '../logic/random'
import {
  buildPromptState,
  generateClue,
  HintError,
  placeholderClue,
  validateResponse,
} from './hint'

const answer = (hinweis: string, zahl: number | string, ziele: string[]) => ({ hinweis, zahl, ziele })

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
  it('nennt alle offenen Begriffe nach Farbe und den Verlauf beider Teams ohne gegnerische Ziele', () => {
    const p = buildPromptState(MATADOR())
    expect(p.team).toBe('rot')
    expect(p.brett).toEqual({
      eigene: ['Uhr', 'Eis', 'Sekt', 'Bulle'],
      gegner: ['Batterie'],
      neutral: ['Kompass', 'Rose', 'Brunnen', 'Wüste', 'Schuss'],
      attentaeter: 'Wein',
    })
    expect(p.lage).toEqual({ eigeneOffen: 4, gegnerOffen: 1, resteEigen: ['Uhr', 'Sekt'] })
    expect(p.verlauf.map((v) => v.hinweis)).toEqual(['Laub', 'Schein', 'Umlaufbahn', 'Post', 'Braut', 'Mähne'])
    expect(p.verlauf[4]).toEqual({ team: 'rot', hinweis: 'Braut', zahl: 2, ziele: ['Strauß', 'Sekt'], geraten: ['Strauß', 'Glocke'] })
    expect(p.verlauf[1]).not.toHaveProperty('ziele')
    expect(p.verwendeteHinweise).toEqual(['Laub', 'Schein', 'Umlaufbahn', 'Post', 'Braut', 'Mähne'])
  })

})

describe('Serverprüfung', () => {
  it('prüft nur Regeln, keine Strategie, und kennt kein „unbegrenzt“', () => {
    // Kurz vor dem Sieg des Gegners ist auch ein kleiner Hinweis zulässig; das Modell entscheidet.
    expect(validateResponse(answer('MATADOR', 1, ['BULLE']), MATADOR())).toMatchObject({ ok: true, clue: { word: 'Matador', number: 1, targets: ['Bulle'] } })
    expect(validateResponse(answer('SCHACH', 1, ['PFERD']), SCHACH()).ok).toBe(true)
    const unlimited = validateResponse(answer('ARKTIS', 'unbegrenzt', ['EIS', 'BULLE']), MATADOR())
    expect(!unlimited.ok && unlimited.error).toMatch(/ganze Zahl von 1 bis 9/)
  })

  it('kurze Hinweise dürfen zufällig in einem offenen Begriff stecken (Eis/Geist)', () => {
    const words = MATADOR().words.map((w) => (w === 'Eis' ? 'Geist' : w))
    const state = createGame(words, { start: 'rot', randomInt: seededRandomInt(4) })
    const own = state.words.find((_, i) => state.colors[i] === 'rot')!
    expect(validateResponse(answer('Eis', 1, [own]), state).ok).toBe(true)
    const long = validateResponse(answer('Geis', 1, [own]), state)
    expect(!long.ok && long.error).toMatch(/überschneidet sich .*Geist/)
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
    expect(err(answer('ARKTIS', 3, ['EIS', 'BATTERIE', 'UHR']))).toMatch(/Batterie.*kein offener eigener/)
    expect(err(answer('ARKTIS', 3, ['EIS', 'BULLE']))).toMatch(/ZAHL 3, aber 2 Ziele/)
    expect(err(answer('ARKTIS', 0, []))).toMatch(/ZAHL muss/)
    expect(err({ foo: 1 })).toMatch(/"hinweis" fehlt/)
  })

  it('Platzhalter-Hinweis ist regelkonform', () => {
    for (const state of [MATADOR(), SCHACH(), createGame(MATADOR().words, { randomInt: seededRandomInt(3) })]) {
      const clue = placeholderClue(state)
      expect(validateResponse(answer(clue.word, clue.number!, clue.targets), state).ok).toBe(true)
    }
  })
})

describe('OpenRouter-Aufruf (gemockt)', () => {
  it('gültige Antwort: ein Aufruf mit Systemprompt, Spielstand und Schema', async () => {
    const { fetchImpl, calls } = mockFetch(answer('ARKTIS', 3, ['EIS', 'BULLE', 'UHR']))
    const clue = await generateClue(MATADOR(), config(fetchImpl))
    expect(calls).toHaveLength(1)
    const body = calls[0]!.body as { model: string; messages: { role: string; content: string }[]; response_format: { type: string } }
    expect(body.model).toBe('test/modell')
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user'])
    expect(JSON.parse(body.messages[1]!.content).lage).toEqual({ eigeneOffen: 4, gegnerOffen: 1, resteEigen: ['Uhr', 'Sekt'] })
    expect(body.response_format.type).toBe('json_schema')
    expect(clue).toMatchObject({ word: 'Arktis', number: 3, attempts: 1, source: 'test/modell' })
  })

  it('Regelverstoß → zweiter Aufruf mit der Fehlermeldung', async () => {
    const { fetchImpl, calls } = mockFetch(answer('WÜSTE', 1, ['BULLE']), answer('ARKTIS', 3, ['EIS', 'BULLE', 'UHR']))
    const clue = await generateClue(MATADOR(), config(fetchImpl))
    expect(calls).toHaveLength(2)
    const messages = (calls[1]!.body as { messages: { role: string; content: string }[] }).messages
    expect(messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
    expect(messages[3]!.content).toMatch(/^Ungültig: .*offener Begriff.* Wähle einen anderen Hinweis\.$/)
    expect(clue).toMatchObject({ word: 'Arktis', number: 3, attempts: 2 })
  })

  it('zwei Verstöße → Fehler, kein dritter Aufruf', async () => {
    const { fetchImpl, calls } = mockFetch('kein json', answer('WÜSTE', 1, ['BULLE']))
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
