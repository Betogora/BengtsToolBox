// Vertrag zwischen App und KI-Proxy. Der Browser kennt nur den versiegelten Spielstand (`game`)
// und die öffentliche Sicht. Der OpenRouter-Schlüssel liegt ausschließlich in der Vercel-Umgebung.
import type { RevealKind } from './engine'
import type { CardColor, Team } from './types'
import type { PublicView } from './view'

export const REASONING_LEVELS = ['none', 'low', 'medium', 'high'] as const
export type Reasoning = (typeof REASONING_LEVELS)[number]

export const DEFAULT_MODEL = 'openai/gpt-6-luna'
export const DEFAULT_REASONING: Reasoning = 'medium'

export const WORDLIST_IDS = ['original', 'duett', 'alle'] as const
export type WordlistId = (typeof WORDLIST_IDS)[number]
export const DEFAULT_WORDLIST: WordlistId = 'original'

export function isWordlistId(value: unknown): value is WordlistId {
  return WORDLIST_IDS.includes(value as WordlistId)
}

export type ProxyRequest =
  | { action: 'new'; start?: Team; wordlist?: WordlistId }
  | { action: 'reveal'; game: string; index: number }
  | { action: 'pass' | 'undo'; game: string }
  | {
      action: 'hint'
      game: string
      model?: string
      reasoning?: Reasoning
    }
  | { action: 'status' }

export type GameResponse = { game: string; view: PublicView }

export type RevealResponse = GameResponse & {
  outcome: { word: string; color: CardColor; kind: RevealKind }
}

export type HintResponse = GameResponse & { source: string; attempts: number; durationMs: number }

/** Ob in der Vercel-Umgebung ein OpenRouter-Schlüssel hinterlegt ist; der Schlüssel selbst nie. */
export type StatusResponse = { aiConfigured: boolean }

export type ProxyErrorCode =
  | 'origin'
  | 'rate-limit'
  | 'bad-request'
  | 'invalid-game'
  | 'game-rule'
  | 'hint-failed'
  | 'server'

export type ProxyErrorBody = { error: string; code: ProxyErrorCode }

export function isModelId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 100 && /^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(value)
}
