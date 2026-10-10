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
