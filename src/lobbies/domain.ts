const lobbyAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const lobbyNameMaxLength = 60
export const deviceNameMaxLength = 40
export const lobbyCodeLength = 6

export function normalizeLobbyName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeDeviceName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function isValidLobbyName(value: string) {
  const normalized = normalizeLobbyName(value)
  return normalized.length > 0 && normalized.length <= lobbyNameMaxLength
}

export function isValidDeviceName(value: string) {
  const normalized = normalizeDeviceName(value)
  return normalized.length > 0 && normalized.length <= deviceNameMaxLength
}

export function isValidLobbyId(value: string) {
  return value === 'default' || new RegExp(`^[${lobbyAlphabet}]{${lobbyCodeLength}}$`).test(value)
}

export function createLobbyCode(randomValues?: Uint32Array) {
  const values = randomValues ?? crypto.getRandomValues(new Uint32Array(lobbyCodeLength))

  if (values.length < lobbyCodeLength) {
    throw new Error('Für einen Lobbycode werden sechs Zufallswerte benötigt.')
  }

  return Array.from(values.slice(0, lobbyCodeLength), (value) =>
    lobbyAlphabet[value % lobbyAlphabet.length],
  ).join('')
}

export function defaultDeviceName(deviceId: string) {
  return `Gerät ${deviceId.slice(0, 6).toUpperCase()}`
}
