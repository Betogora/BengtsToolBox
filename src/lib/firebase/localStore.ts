export function readLocalValue<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocalValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getOrCreateLocalId(key: string) {
  const existing = window.localStorage.getItem(key)

  if (existing) {
    return existing
  }

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(key, id)
  return id
}
