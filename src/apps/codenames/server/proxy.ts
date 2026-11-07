// KI-Proxy für Codenames (läuft als Vercel Function, siehe vercelEntry.ts). Zustandslos: Der
// geheime Spielstand reist versiegelt mit jeder Anfrage. Der OpenRouter-Schlüssel liegt nur in
// der Vercel-Umgebung und verlässt den Proxy nie.
import * as engine from '../logic/engine'
import { GameError } from '../logic/engine'
import {
  DEFAULT_MODEL,
  emptyCalibration,
  isModelId,
  REASONING_LEVELS,
  type Calibration,
  type GameResponse,
  type HintResponse,
  type ProxyErrorBody,
  type ProxyErrorCode,
  type Reasoning,
  type RevealResponse,
  type StatusResponse,
} from '../logic/protocol'
import type { RandomInt } from '../logic/random'
import { CONFIDENCE_LEVELS, type GameState } from '../logic/types'
import { publicView } from '../logic/view'
import { drawWords, parseWordlist } from '../logic/wordlist'
import { calibrationFrom, generateClue, HintError } from './hint'
import { SealError, seal, unseal } from './sealing'
import { WORDLIST_TEXT } from './wordlistText'

export type ProxyEnv = {
  /** Server-Geheimnis aus der Vercel-Umgebung (CODENAMES_SECRET). */
  secret: string
  /** OpenRouter-Schlüssel aus der Vercel-Umgebung (OPENROUTER_API_KEY); ohne ihn Platzhalter. */
  openRouterKey?: string
  fetchImpl?: typeof fetch
  randomInt?: RandomInt
  limiter?: RateLimiter
  /** Zusätzlich erlaubte Origins, etwa für Tests. */
  extraOrigins?: readonly string[]
}

const MAX_BODY_BYTES = 256 * 1024
const WORDS = parseWordlist(WORDLIST_TEXT)

const ORIGIN_PATTERNS = [
  /^https:\/\/bengtstoolbox(--[a-z0-9-]+)?\.(web\.app|firebaseapp\.com)$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
]

export function isAllowedOrigin(origin: string | null, extra: readonly string[] = []): origin is string {
  return !!origin && (extra.includes(origin) || ORIGIN_PATTERNS.some((p) => p.test(origin)))
}

/** Gleitendes Fenster je Schlüssel; bewusst einfach, gilt pro Function-Instanz. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>()

  allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 5000) this.hits.clear()
    return true
  }
}

const sharedLimiter = new RateLimiter()

class ProxyError extends Error {
  readonly status: number
  readonly code: ProxyErrorCode

  constructor(status: number, code: ProxyErrorCode, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
  if (origin) headers['Access-Control-Allow-Origin'] = origin
  return new Response(JSON.stringify(body), { status, headers })
}

function clientIp(request: Request): string {
  return request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unbekannt'
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) throw new ProxyError(413, 'bad-request', 'Anfrage zu groß.')
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {
    /* unten */
  }
  throw new ProxyError(400, 'bad-request', 'Ungültige Anfrage.')
}

function readCalibration(raw: unknown): Calibration {
  const result = emptyCalibration()
  if (!raw || typeof raw !== 'object') return result
  for (const level of CONFIDENCE_LEVELS) {
    const pair = (raw as Record<string, unknown>)[level]
    if (!Array.isArray(pair) || pair.length !== 2) continue
    const [hit, all] = pair.map((n) => (Number.isInteger(n) && (n as number) >= 0 ? Math.min(n as number, 100_000) : 0))
    result[level] = [Math.min(hit!, all!), all!]
  }
  return result
}

function addCalibration(a: Calibration, b: Calibration): Calibration {
  const sum = emptyCalibration()
  for (const level of CONFIDENCE_LEVELS) sum[level] = [a[level][0] + b[level][0], a[level][1] + b[level][1]]
  return sum
}

function isGameState(value: unknown): value is GameState {
  const s = value as GameState
  return !!s && s.version === 1 && Array.isArray(s.words) && s.words.length === 25 && Array.isArray(s.colors)
    && Array.isArray(s.revealed) && Array.isArray(s.clues) && Array.isArray(s.undo)
}

async function openGame(box: unknown, secret: string): Promise<GameState> {
  const state = await unseal<unknown>(box, secret, 'codenames-state-v1').catch(() => {
    throw new ProxyError(400, 'invalid-game', 'Der Spielstand ist ungültig oder abgelaufen. Bitte ein neues Spiel starten.')
  })
  if (!isGameState(state)) throw new ProxyError(400, 'invalid-game', 'Der Spielstand ist ungültig.')
  return state
}

async function respondGame(state: GameState, secret: string): Promise<GameResponse> {
  const response: GameResponse = { game: await seal(state, secret, 'codenames-state-v1'), view: publicView(state) }
  if (state.phase === 'ende') response.calibration = calibrationFrom([state])
  return response
}

const serverKey = (env: ProxyEnv) => env.openRouterKey?.trim() || undefined

async function giveHint(body: Record<string, unknown>, env: ProxyEnv): Promise<HintResponse> {
  const state = await openGame(body.game, env.secret)
  if (state.phase !== 'hinweis') throw new GameError(state.phase === 'ende' ? 'Das Spiel ist beendet.' : 'Es läuft bereits ein Hinweis.')
  const apiKey = body.placeholder === true ? undefined : serverKey(env)
  const model = isModelId(body.model) ? body.model : DEFAULT_MODEL
  const reasoning = REASONING_LEVELS.includes(body.reasoning as Reasoning) ? (body.reasoning as Reasoning) : undefined
  const calibration = addCalibration(readCalibration(body.calibration), calibrationFrom([state]))
  try {
    const clue = await generateClue(
      state,
      { apiKey, model: apiKey ? model : undefined, reasoning, fetchImpl: env.fetchImpl, timeoutMs: 110_000 },
      calibration,
    )
    const next = engine.giveClue(state, clue)
    return { ...(await respondGame(next, env.secret)), source: clue.source, attempts: clue.attempts, durationMs: clue.durationMs }
  } catch (error) {
    if (error instanceof HintError) throw new ProxyError(502, 'hint-failed', error.message)
    throw error
  }
}

async function dispatch(body: Record<string, unknown>, env: ProxyEnv): Promise<unknown> {
  switch (body.action) {
    case 'new': {
      const start = body.start === 'rot' || body.start === 'blau' ? body.start : undefined
      const words = drawWords(WORDS, env.randomInt)
      return respondGame(engine.createGame(words, { start, randomInt: env.randomInt }), env.secret)
    }
    case 'reveal': {
      const { state, outcome } = engine.reveal(await openGame(body.game, env.secret), Number(body.index))
      const response: RevealResponse = {
        ...(await respondGame(state, env.secret)),
        outcome: { word: outcome.word, color: outcome.color, kind: outcome.kind },
      }
      return response
    }
    case 'pass':
      return respondGame(engine.pass(await openGame(body.game, env.secret)), env.secret)
    case 'undo':
      return respondGame(engine.undo(await openGame(body.game, env.secret)), env.secret)
    case 'hint':
      return giveHint(body, env)
    case 'status': {
      const status: StatusResponse = { aiConfigured: !!serverKey(env) }
      return status
    }
    default:
      throw new ProxyError(400, 'bad-request', 'Unbekannte Aktion.')
  }
}

const LIMITS: Record<string, [number, number]> = {
  all: [120, 60_000],
  hint: [8, 60_000],
  hintDay: [150, 86_400_000],
}

export async function handleCodenamesRequest(request: Request, env: ProxyEnv): Promise<Response> {
  const origin = request.headers.get('origin')
  const allowed = isAllowedOrigin(origin, env.extraOrigins)
  if (request.method === 'OPTIONS') {
    if (!allowed) return new Response(null, { status: 403 })
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    })
  }
  if (!allowed) return json({ error: 'Herkunft nicht erlaubt.', code: 'origin' } satisfies ProxyErrorBody, 403, null)
  if (request.method !== 'POST') return json({ error: 'Nur POST.', code: 'bad-request' } satisfies ProxyErrorBody, 405, origin)

  const limiter = env.limiter ?? sharedLimiter
  const ip = clientIp(request)
  try {
    const body = await readBody(request)
    const action = typeof body.action === 'string' ? body.action : ''
    const checks: [string, [number, number]][] = [['all', LIMITS.all!]]
    if (action === 'hint' && body.placeholder !== true && serverKey(env)) {
      checks.push(['hint', LIMITS.hint!], ['hintDay', LIMITS.hintDay!])
    }
    for (const [name, [limit, windowMs]] of checks) {
      if (!limiter.allow(`${name}:${ip}`, limit, windowMs)) {
        throw new ProxyError(429, 'rate-limit', 'Zu viele Anfragen. Bitte kurz warten.')
      }
    }
    return json(await dispatch(body, env), 200, origin)
  } catch (error) {
    if (error instanceof ProxyError) return json({ error: error.message, code: error.code } satisfies ProxyErrorBody, error.status, origin)
    if (error instanceof GameError) return json({ error: error.message, code: 'game-rule' } satisfies ProxyErrorBody, 409, origin)
    if (error instanceof SealError) return json({ error: 'Der Proxy ist nicht eingerichtet.', code: 'server' } satisfies ProxyErrorBody, 500, origin)
    return json({ error: 'Interner Fehler im Proxy.', code: 'server' } satisfies ProxyErrorBody, 500, origin)
  }
}
