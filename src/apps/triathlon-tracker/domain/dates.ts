import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getWeekStartLocalDate,
  isValidLocalDate,
} from '@/lib/localDates'

export {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
  getWeekStartLocalDate,
  isValidLocalDate,
} from '@/lib/localDates'

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
