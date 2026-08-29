const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/

function parseLocalDate(localDate: string): Date | null {
  const match = localDatePattern.exec(localDate)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatLocalDate(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-')
}

export function getCurrentLocalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Berlin',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function isValidLocalDate(localDate: string): boolean {
  return parseLocalDate(localDate) !== null
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const date = parseLocalDate(localDate)
  if (!date || !Number.isInteger(days)) {
    throw new Error('Invalid local date or day offset')
  }

  date.setUTCDate(date.getUTCDate() + days)
  return formatLocalDate(date)
}

export function addMonthsToLocalDate(
  localDate: string,
  months: number,
): string {
  const date = parseLocalDate(localDate)
  if (!date || !Number.isInteger(months)) {
    throw new Error('Invalid local date or month offset')
  }

  const originalDay = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate()
  date.setUTCDate(Math.min(originalDay, lastDay))
  return formatLocalDate(date)
}

export function getWeekStartLocalDate(localDate: string): string {
  const date = parseLocalDate(localDate)
  if (!date) {
    throw new Error('Invalid local date')
  }

  const mondayOffset = (date.getUTCDay() + 6) % 7
  return addDaysToLocalDate(localDate, -mondayOffset)
}

export function getWeekLocalDates(localDate: string): string[] {
  const weekStart = getWeekStartLocalDate(localDate)
  return Array.from({ length: 7 }, (_, index) =>
    addDaysToLocalDate(weekStart, index),
  )
}

export function getWeekStartsInRange(from: string, to: string): string[] {
  if (!isValidLocalDate(from) || !isValidLocalDate(to) || from > to) {
    return []
  }

  const firstWeek = getWeekStartLocalDate(from)
  const lastWeek = getWeekStartLocalDate(to)
  const weekStarts: string[] = []
  for (
    let current = firstWeek;
    current <= lastWeek;
    current = addDaysToLocalDate(current, 7)
  ) {
    weekStarts.push(current)
  }
  return weekStarts
}

export function getLocalDateRange(from: string, to: string): string[] {
  if (!isValidLocalDate(from) || !isValidLocalDate(to) || from > to) {
    return []
  }

  const dates: string[] = []
  for (let current = from; current <= to; current = addDaysToLocalDate(current, 1)) {
    dates.push(current)
  }
  return dates
}

export function isInRollingMonthWindow(
  localDate: string,
  asOfLocalDate: string,
  months = 12,
): boolean {
  if (
    !isValidLocalDate(localDate) ||
    !isValidLocalDate(asOfLocalDate) ||
    !Number.isInteger(months) ||
    months <= 0
  ) {
    return false
  }

  const windowStart = addMonthsToLocalDate(asOfLocalDate, -months)
  return localDate >= windowStart && localDate <= asOfLocalDate
}
