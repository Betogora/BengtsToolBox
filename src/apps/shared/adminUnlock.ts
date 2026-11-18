// Bewusst clientseitige PINs; sie verhindern keine technische Umgehung.
// Spielleitungsbereiche wie Schlag den Raab.
const adminPassword = '5340'
// Getrennte PIN, die Änderungen an geschützten globalen Datensätzen freigibt.
const editPassword = '9696'

export const editUnlockStorageKey = 'bengts-toolbox:edit-protection:unlocked'

export function isAdminPassword(value: string) {
  return value.trim() === adminPassword
}

export function isEditPassword(value: string) {
  return value.trim() === editPassword
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
