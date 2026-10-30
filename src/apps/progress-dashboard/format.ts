const numberFormat = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export function formatNumber(value: number) {
  return numberFormat.format(value)
}
