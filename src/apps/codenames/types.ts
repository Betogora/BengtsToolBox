import type { Calibration, Reasoning } from '@/apps/codenames/logic/protocol'
import type { PublicView } from '@/apps/codenames/logic/view'

/** Gemeinsamer Zustand (Firestore): versiegelter Spielstand plus öffentliche Sicht. */
export type CodenamesState = {
  /** Versiegelter Spielstand; nur der KI-Proxy kann ihn öffnen. */
  game: string | null
  view: PublicView | null
  /** Trefferquote beendeter Spiele, je Spiel (`createdAt`) höchstens einmal. */
  calibrations: { gameId: string; calibration: Calibration }[]
  updatedBy?: string | null
}

/** Nur auf diesem Gerät: Modellwahl. Der OpenRouter-Schlüssel liegt ausschließlich bei Vercel. */
export type CodenamesAiSettings = {
  model: string
  reasoning: Reasoning
}

export type HintStatus = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }
