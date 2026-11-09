import type { Reasoning } from '@/apps/codenames/logic/protocol'
import type { PublicView } from '@/apps/codenames/logic/view'

/** Gemeinsamer Zustand (Firestore): versiegelter Spielstand plus öffentliche Sicht. */
export type CodenamesState = {
  /** Versiegelter Spielstand; nur der KI-Proxy kann ihn öffnen. */
  game: string | null
  view: PublicView | null
  updatedBy?: string | null
}

/** Nur auf diesem Gerät: Modellwahl. Der OpenRouter-Schlüssel liegt ausschließlich bei Vercel. */
export type CodenamesAiSettings = {
  model: string
  reasoning: Reasoning
}

export type HintStatus = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }
