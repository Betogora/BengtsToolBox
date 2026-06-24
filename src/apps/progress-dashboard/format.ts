export function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value)
}
