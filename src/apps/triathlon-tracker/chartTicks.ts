/**
 * Evenly spaced category ticks anchored on the latest entry. Recharts drops
 * colliding labels irregularly; a fixed step keeps every n-th week labelled.
 */
export function evenlySpacedTicks<T>(values: readonly T[], maxTicks: number): T[] {
  if (values.length === 0) return []
  const step = Math.max(1, Math.ceil(values.length / Math.max(1, Math.floor(maxTicks))))
  return values.filter((_, index) => (values.length - 1 - index) % step === 0)
}

/** Evenly spaced timestamps across a numeric time domain, inclusive. */
export function evenlySpacedTimestamps(
  minimum: number,
  maximum: number,
  maxTicks: number,
): number[] {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return []
  if (maximum <= minimum) return [minimum]
  const count = Math.max(2, Math.floor(maxTicks))
  return Array.from(
    { length: count },
    (_, index) => minimum + ((maximum - minimum) * index) / (count - 1),
  )
}

/** Labels need roughly this many CSS pixels to stay readable side by side. */
export function maxTicksForWidth(width: number, pixelsPerTick = 72) {
  return Math.max(2, Math.floor(width / pixelsPerTick))
}

/**
 * Whole-unit axis ticks from zero with a 1-2-5 step (1, 2, 5, 10, 20, 50 …),
 * so weekly hours or kilometres never show fractions such as 0.95.
 */
export function niceVolumeTicks(maximum: number, maxIntervals = 4): number[] {
  // Without a finite positive maximum the 1-2-5 search would never end.
  if (!Number.isFinite(maximum) || maximum <= 0) return [0, 1]
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const factor of [1, 2, 5]) {
      const step = factor * magnitude
      const intervals = Math.ceil(maximum / step)
      if (intervals <= maxIntervals) {
        return Array.from({ length: intervals + 1 }, (_, index) => index * step)
      }
    }
  }
}
