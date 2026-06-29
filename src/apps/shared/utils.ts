export function createRandomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getColorWithAlpha(color: string, alphaHex: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color
}
