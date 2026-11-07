// Vertrag zwischen App und KI-Proxy. Der Browser kennt nur den versiegelten Spielstand (`game`)
// und die öffentliche Sicht. Der OpenRouter-Schlüssel liegt ausschließlich in der Vercel-Umgebung.
import type { RevealKind } from './engine'
import type { CardColor, Confidence, Team } from './types'
import type { PublicView } from './view'

/** Trefferquote je Zuversichtsstufe: [getroffen, gesamt]. */
export type Calibration = Record<Confidence, [number, number]>

export const REASONING_LEVELS = ['none', 'low', 'medium', 'high'] as const
export type Reasoning = (typeof REASONING_LEVELS)[number]

export const DEFAULT_MODEL = 'openai/gpt-6-luna'
export const DEFAULT_REASONING: Reasoning = 'medium'

export type ProxyRequest =
  | { action: 'new'; start?: Team }
  | { action: 'reveal'; game: string; index: number }
  | { action: 'pass' | 'undo'; game: string }
  | {
      action: 'hint'
      game: string
      /** true erzwingt den Platzhalter-Hinweisgeber, auch wenn ein Schlüssel hinterlegt ist. */
      placeholder?: boolean
      model?: string
      reasoning?: Reasoning
      calibration?: Calibration
    }
  | { action: 'status' }

export type GameResponse = {
  game: string
  view: PublicView
  /** Nur bei Spielende: Trefferquote dieses Spiels für die Eichung künftiger Hinweise. */
  calibration?: Calibration
}

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

export function emptyCalibration(): Calibration {
  return { sicher: [0, 0], wahrscheinlich: [0, 0], wackelig: [0, 0] }
}

export function isModelId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 100 && /^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(value)
}
