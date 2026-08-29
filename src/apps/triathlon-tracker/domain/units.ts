import type { Discipline } from '@/apps/triathlon-tracker/types'

export function kilometersToMeters(kilometers: number): number {
  return kilometers * 1_000
}

export function metersToKilometers(meters: number): number {
  return meters / 1_000
}

export function minutesToSeconds(minutes: number): number {
  return minutes * 60
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60
}

export function paceSecondsPerKilometer(
  durationSeconds: number,
  distanceMeters: number,
): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return durationSeconds / (distanceMeters / 1_000)
}

export function averagePaceReferenceMeters(discipline: Discipline): number {
  return discipline === 'swim' ? 100 : 1_000
}

export function averagePaceSeconds(
  durationSeconds: number,
  distanceMeters: number,
  discipline: Discipline,
): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return durationSeconds * averagePaceReferenceMeters(discipline) / distanceMeters
}

export function durationSecondsFromAveragePace(
  paceSeconds: number,
  distanceMeters: number,
  discipline: Discipline,
): number | null {
  if (paceSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return paceSeconds * distanceMeters / averagePaceReferenceMeters(discipline)
}

export function formatPace(paceSeconds: number | null): string {
  if (paceSeconds === null || paceSeconds <= 0) {
    return ''
  }

  const roundedSeconds = Math.round(paceSeconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

export function parsePace(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim())
  if (!match) {
    return null
  }

  const seconds = Number(match[1]) * 60 + Number(match[2])
  return seconds > 0 ? seconds : null
}
