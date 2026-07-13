export type HistoricalRecordNameSource = {
  id: string
  name: string
  position?: number
}

type HistoricalRecordNameOptions<T extends HistoricalRecordNameSource> = {
  getGeneratedBaseName: (record: T, date: Date) => string | null
  getTimestamp: (record: T) => string | null | undefined
}

function localDateKey(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function toRomanNumeral(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    return ''
  }

  const numerals: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let remaining = value
  let result = ''

  numerals.forEach(([numericValue, numeral]) => {
    while (remaining >= numericValue) {
      result += numeral
      remaining -= numericValue
    }
  })

  return result
}

export function withoutRomanNumeralSuffix(value: string) {
  return value.replace(/ [IVXLCDM]+$/u, '')
}

export function formatScoreboardHistoricalName(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)

  return `Scoring ${day}.${month}.${year}`
}

export function getGeneratedScoreboardBaseName(name: string, date: Date) {
  const baseName = formatScoreboardHistoricalName(date)
  const currentBaseName = withoutRomanNumeralSuffix(name)
  const legacyDate = currentBaseName.match(
    /^Scoring (\d{2}\.\d{2}\.\d{2}),\s*\d{2}:\d{2}$/u,
  )?.[1]

  return currentBaseName === baseName || legacyDate === baseName.slice('Scoring '.length)
    ? baseName
    : null
}

export function formatHistoricalDatasetName(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `Datensatz ${year}-${month}-${day}`
}

export function getGeneratedDatasetBaseName(name: string, date: Date) {
  const baseName = formatHistoricalDatasetName(date)
  const currentBaseName = withoutRomanNumeralSuffix(name)

  return currentBaseName === baseName ||
    currentBaseName.match(/^Datensatz (\d{4}-\d{2}-\d{2}) \d{2}:\d{2}$/u)?.[1] ===
      baseName.slice('Datensatz '.length)
    ? baseName
    : null
}

export function sequenceHistoricalRecordNames<T extends HistoricalRecordNameSource>(
  records: T[],
  options: HistoricalRecordNameOptions<T>,
) {
  const groups = new Map<
    string,
    Array<{ date: Date; record: T; timestamp: number }>
  >()

  records.forEach((record) => {
    const date = new Date(options.getTimestamp(record) ?? '')
    const timestamp = date.getTime()

    if (Number.isNaN(timestamp)) {
      return
    }

    const key = localDateKey(date)
    const group = groups.get(key) ?? []
    group.push({ date, record, timestamp })
    groups.set(key, group)
  })

  const nextNames = new Map<string, string>()

  groups.forEach((group) => {
    const sortedGroup = [...group].sort(
      (left, right) =>
        left.timestamp - right.timestamp ||
        (left.record.position ?? Number.POSITIVE_INFINITY) -
          (right.record.position ?? Number.POSITIVE_INFINITY) ||
        left.record.id.localeCompare(right.record.id),
    )
    const hasMultipleRecords = sortedGroup.length > 1

    sortedGroup.forEach(({ date, record }, index) => {
      const baseName = options.getGeneratedBaseName(record, date)

      if (!baseName) {
        return
      }

      nextNames.set(
        record.id,
        hasMultipleRecords ? `${baseName} ${toRomanNumeral(index + 1)}` : baseName,
      )
    })
  })

  return records.map((record) => {
    const nextName = nextNames.get(record.id)

    return nextName && nextName !== record.name
      ? { ...record, name: nextName }
      : record
  })
}
