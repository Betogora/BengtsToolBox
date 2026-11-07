import { useCallback, useState } from 'react'

import {
  DEFAULT_MODEL,
  DEFAULT_REASONING,
  isModelId,
  REASONING_LEVELS,
  type Reasoning,
} from '@/apps/codenames/logic/protocol'
import type { CodenamesAiSettings } from '@/apps/codenames/types'

// Modell und Denkaufwand gelten pro Gerät; der OpenRouter-Schlüssel liegt nie im Browser.
const storageKey = 'bengtstoolbox:codenames:ai'

const defaults: CodenamesAiSettings = { model: DEFAULT_MODEL, reasoning: DEFAULT_REASONING }

function read(): CodenamesAiSettings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as Partial<CodenamesAiSettings> | null
    if (!raw || typeof raw !== 'object') return defaults
    return {
      model: isModelId(raw.model) ? raw.model : DEFAULT_MODEL,
      reasoning: REASONING_LEVELS.includes(raw.reasoning as Reasoning) ? (raw.reasoning as Reasoning) : DEFAULT_REASONING,
    }
  } catch {
    return defaults
  }
}

export function useCodenamesAiSettings() {
  const [settings, setSettings] = useState(read)

  const update = useCallback((patch: Partial<CodenamesAiSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next))
      } catch { /* Ohne Speicher gilt die Einstellung nur bis zum Neuladen. */ }
      return next
    })
  }, [])

  return { settings, update }
}
