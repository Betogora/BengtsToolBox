/** Liefert eine ganze Zahl in [0, n). */
export type RandomInt = (n: number) => number

/**
 * Krypto-sicherer, gleichverteilter Zufall über `crypto.getRandomValues`
 * (Browser und Node). Verwerfungsstichprobe gegen Modulo-Verzerrung.
 */
export const cryptoRandomInt: RandomInt = (n) => {
  if (!Number.isInteger(n) || n <= 0 || n > 2 ** 32) throw new RangeError(`Ungültige Obergrenze ${n}`)
  const limit = Math.floor(2 ** 32 / n) * n
  const buffer = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(buffer)
    const value = buffer[0]!
    if (value < limit) return value % n
  }
}

/** Fisher-Yates in place. */
export function shuffle<T>(items: T[], randomInt: RandomInt = cryptoRandomInt): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

/** Reproduzierbarer Zufall für Tests (mulberry32). */
export function seededRandomInt(seed: number): RandomInt {
  let a = seed >>> 0
  return (n) => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
    return Math.floor(r * n)
  }
}
