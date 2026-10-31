// Gemeinsame, bewusst clientseitige PIN für Spielleitungsbereiche; sie verhindert keine technische Umgehung.
const adminPassword = '5340'

export function isAdminPassword(value: string) {
  return value.trim() === adminPassword
}

export function isAdminUnlocked(storageKey: string) {
  try {
    return window.sessionStorage.getItem(storageKey) === 'true'
  } catch {
    return false
  }
}

export function setAdminUnlocked(storageKey: string, unlocked: boolean) {
  try {
    if (unlocked) window.sessionStorage.setItem(storageKey, 'true')
    else window.sessionStorage.removeItem(storageKey)
  } catch { /* The current page can still be unlocked without storage. */ }
}
