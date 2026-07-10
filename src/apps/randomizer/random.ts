export type RandomSource = () => number

export type RandomizerRange = {
  min: number
  max: number
}

export function normalizeRandomizerRange(min: number, max: number): RandomizerRange {
  const normalizedMin = Number.isFinite(min) ? Math.floor(min) : 1
  const normalizedMax = Number.isFinite(max) ? Math.floor(max) : 6

  return {
    min: Math.min(normalizedMin, normalizedMax),
    max: Math.max(normalizedMin, normalizedMax),
  }
}

export function rollRandomInteger(
  min: number,
  max: number,
  random: RandomSource = Math.random,
) {
  const safeMin = Math.min(min, max)
  const safeMax = Math.max(min, max)

  return Math.floor(random() * (safeMax - safeMin + 1)) + safeMin
}
