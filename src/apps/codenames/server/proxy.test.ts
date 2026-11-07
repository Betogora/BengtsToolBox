import { describe, expect, it, vi } from 'vitest'

import type { GameResponse, HintResponse, ProxyErrorBody, RevealResponse, StatusResponse } from '../logic/protocol'
import { seededRandomInt } from '../logic/random'
import type { GameState } from '../logic/types'
import { handleCodenamesRequest, RateLimiter, type ProxyEnv } from './proxy'
import { unseal } from './sealing'

const SECRET = 'test-geheimnis-mit-mindestens-32-zeichen'
const ORIGIN = 'https://bengtstoolbox.web.app'

function setup(fetchImpl?: typeof fetch, openRouterKey?: string) {
  const env: ProxyEnv = { secret: SECRET, randomInt: seededRandomInt(42), limiter: new RateLimiter(), fetchImpl, openRouterKey }
  async function call<T>(body: unknown, origin: string | null = ORIGIN): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (origin) headers.Origin = origin
    const response = await handleCodenamesRequest(
      new Request('https://proxy.test/api/codenames', { method: 'POST', headers, body: JSON.stringify(body) }),
      env,
    )
    return { status: response.status, data: (await response.json()) as T }
  }
  return { call }
}

const secretOf = (game: string) => unseal<GameState>(game, SECRET, 'codenames-state-v1')

/** Die öffentliche Sicht verrät weder Farben offener Karten noch Ziele, Zuversicht oder Undo-Stände. */
async function assertNoSecrets({ game, view }: GameResponse) {
  expect(game).not.toMatch(/rot|blau|neutral|attentaeter/)
  if (view.phase === 'ende') return
  const secret = await secretOf(game)
  view.cards.forEach((card, i) => {
    expect(card.revealed).toBe(secret.revealed[i])
    if (!card.revealed) expect(card.color).toBeNull()
  })
  expect(JSON.stringify(view)).not.toMatch(/"targets"|"confidence"|"colors"|"dangerField"|"undo"/)
}

describe('Codenames-Proxy', () => {
  it('spielt mit Platzhalter bis zum Sieg, ohne Geheimnisse herauszugeben', async () => {
    const { call } = setup()
    let current = (await call<GameResponse>({ action: 'new', start: 'rot' })).data
    await assertNoSecrets(current)
    for (let step = 0; step < 200 && current.view.phase !== 'ende'; step++) {
      if (current.view.phase === 'hinweis') {
        current = (await call<HintResponse>({ action: 'hint', game: current.game })).data
        expect((current as HintResponse).source).toBe('platzhalter')
        await assertNoSecrets(current)
        continue
      }
      const index = current.view.cards.findIndex((c) => !c.revealed)
      const revealed = (await call<RevealResponse>({ action: 'reveal', game: current.game, index })).data
      expect(revealed.outcome.word).toBe(current.view.cards[index]!.word)
      current = revealed
      await assertNoSecrets(current)
      if (current.view.phase === 'raten' && current.view.clue!.guessesMade >= 1 && step % 3 === 0) {
        current = (await call<GameResponse>({ action: 'pass', game: current.game })).data
      }
    }
    expect(current.view.phase).toBe('ende')
    expect(current.view.winner).toMatch(/rot|blau/)
    expect(current.view.cards.every((c) => c.color !== null)).toBe(true)
    expect(current.view.history.every((c) => Array.isArray(c.targets))).toBe(true)
    expect(current.calibration?.wahrscheinlich[1]).toBeGreaterThan(0)

    const back = (await call<GameResponse>({ action: 'undo', game: current.game })).data
    expect(back.view.phase).toBe('raten')
    expect(back.calibration).toBeUndefined()
    await assertNoSecrets(back)
  })

  it('lehnt fremde Herkunft, manipulierte Spielstände und Regelverstöße ab', async () => {
    const { call } = setup()
    expect((await call<ProxyErrorBody>({ action: 'new' }, 'https://example.com')).status).toBe(403)
    expect((await call<ProxyErrorBody>({ action: 'new' }, null)).status).toBe(403)
    const preview = await call<GameResponse>({ action: 'new' }, 'https://bengtstoolbox--pr-12-abc.web.app')
    expect(preview.status).toBe(200)

    const tampered = preview.data.game.slice(0, -4) + (preview.data.game.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    const bad = await call<ProxyErrorBody>({ action: 'pass', game: tampered })
    expect(bad).toMatchObject({ status: 400, data: { code: 'invalid-game' } })

    const early = await call<ProxyErrorBody>({ action: 'reveal', game: preview.data.game, index: 0 })
    expect(early).toMatchObject({ status: 409, data: { code: 'game-rule' } })
  })

  it('nutzt nur den Schlüssel aus der Server-Umgebung und gibt ihn nie heraus', async () => {
    const apiKey = 'sk-or-v1-0123456789abcdef0123456789abcdef'
    const requests: { auth: string | null; body: Record<string, unknown> }[] = []
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string) as Record<string, unknown>
      requests.push({ auth: new Headers(init?.headers).get('Authorization'), body })
      const prompt = JSON.parse((body.messages as { content: string }[])[1]!.content)
      const target = prompt.brett.eigene[0] as string
      const content = JSON.stringify({ gefahrenfeld: [], hinweis: { wort: 'Zebrastreifen', zahl: 1, ziele: [{ wort: target, zuversicht: 'sicher' }] } })
      return Response.json({ choices: [{ message: { content } }] })
    }) as unknown as typeof fetch

    const without = setup(fetchImpl)
    expect((await without.call<StatusResponse>({ action: 'status' })).data).toEqual({ aiConfigured: false })
    const placeholderGame = (await without.call<GameResponse>({ action: 'new' })).data
    const placeholder = await without.call<HintResponse>({ action: 'hint', game: placeholderGame.game })
    expect(placeholder.data.source).toBe('platzhalter')
    expect(requests).toHaveLength(0)

    const { call } = setup(fetchImpl, apiKey)
    const status = await call<StatusResponse>({ action: 'status' })
    expect(status.data).toEqual({ aiConfigured: true })
    expect(JSON.stringify(status.data)).not.toContain('cdef')

    const game = (await call<GameResponse>({ action: 'new' })).data
    const hint = await call<HintResponse>({ action: 'hint', game: game.game, model: 'test/modell', reasoning: 'low' })
    expect(hint.status).toBe(200)
    expect(hint.data).toMatchObject({ source: 'test/modell', attempts: 1 })
    expect(hint.data.view.clue?.word).toBe('Zebrastreifen')
    expect(JSON.stringify(hint.data)).not.toContain(apiKey)
    expect(requests).toEqual([expect.objectContaining({ auth: `Bearer ${apiKey}` })])
    expect(requests[0]!.body).toMatchObject({ model: 'test/modell', reasoning: { effort: 'low' } })

    const forced = await call<HintResponse>({ action: 'hint', game: game.game, placeholder: true })
    expect(forced.data.source).toBe('platzhalter')
    expect(requests).toHaveLength(1)
  })

  it('begrenzt Modellaufrufe je Adresse', async () => {
    const limiter = new RateLimiter()
    expect(Array.from({ length: 9 }, () => limiter.allow('hint:1.2.3.4', 8, 60_000, 1000))).toEqual([
      ...Array(8).fill(true),
      false,
    ])
    expect(limiter.allow('hint:1.2.3.4', 8, 60_000, 62_000)).toBe(true)
  })
})
