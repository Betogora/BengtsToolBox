// Creating an Intl formatter is far more expensive than using one; charts and lists format
// hundreds of values per render. Options come from code, so the caches stay small.
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>()
const numberFormats = new Map<string, Intl.NumberFormat>()

function cacheKey(locale: string, options: object | undefined) {
  return `${locale}|${JSON.stringify(options ?? {})}`
}

export function dateTimeFormat(locale: string, options?: Intl.DateTimeFormatOptions) {
  const key = cacheKey(locale, options)
  let format = dateTimeFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    dateTimeFormats.set(key, format)
  }
  return format
}

export function numberFormat(locale: string, options?: Intl.NumberFormatOptions) {
  const key = cacheKey(locale, options)
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, format)
  }
  return format
}
