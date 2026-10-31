import { describe, expect, it } from 'vitest'
import {
  durationSecondsFromAveragePace,
  formatTrainingDurationInput,
  parsePace,
  parseTrainingDuration,
  updatePlanMetrics,
  updateTrainingMetrics,
  type PlanMetricDraft,
  type TrainingMetricDraft,
  type TrainingMetricField,
} from './units'

const emptyDraft: TrainingMetricDraft = {
  duration: '',
  distance: '',
  pace: '',
  speed: '',
  inputs: ['duration', 'distance'],
}

describe('Pace, Dauer und Distanz', () => {
  it.each<[TrainingMetricField, TrainingMetricField[]]>([
    ['pace', ['duration', 'distance']],
    ['duration', ['pace', 'distance']],
    ['distance', ['pace', 'duration']],
  ])('run: berechnet %s aus %j', (_derived, order) => {
    const values = { duration: '36', distance: '6', pace: '6:00' }
    let draft = emptyDraft
    for (const field of order)
      draft = updateTrainingMetrics(draft, field, values[field], 'run')
    expect(parseTrainingDuration(draft.duration)).toBe(2160)
    expect(draft.distance).toBe('6')
    expect(draft.pace).toBe('6:00')
    expect(draft.speed).toBe('10')
  })
  // Swimming uses 100 m as the pace reference and shows no speed.
  it.each([
    { discipline: 'swim', distance: '1.2', pace: '3:00', speed: '', fasterPace: '1:30', fasterSpeed: '', longerDistance: '2.4' },
    { discipline: 'bike', distance: '6', pace: '6:00', speed: '10', fasterPace: '3:00', fasterSpeed: '20', longerDistance: '12' },
  ] as const)('$discipline: leitet nacheinander Pace, Dauer und Distanz ab', (row) => {
    let draft = updateTrainingMetrics(emptyDraft, 'duration', '36', row.discipline)
    draft = updateTrainingMetrics(draft, 'distance', row.distance, row.discipline)
    expect([draft.pace, draft.speed]).toEqual([row.pace, row.speed])
    expect(
      durationSecondsFromAveragePace(parsePace(draft.pace)!, Number(row.distance) * 1000, row.discipline),
    ).toBe(2160)
    draft = updateTrainingMetrics(draft, 'pace', row.fasterPace, row.discipline)
    expect([draft.duration, draft.speed]).toEqual(['18:00', row.fasterSpeed])
    draft = updateTrainingMetrics(draft, 'duration', '36', row.discipline)
    expect(draft.distance).toBe(row.longerDistance)
  })
  it('verwirft Pace-Angaben ohne zweistellige gültige Sekunden', () => {
    expect(parsePace('5:7')).toBeNull()
    expect(parsePace('5:60')).toBeNull()
  })
  it('behält die beiden zuletzt eingegebenen Werte und entfernt veraltete Berechnungen', () => {
    let draft: TrainingMetricDraft = {
      duration: '36',
      distance: '6',
      pace: '6:00',
      speed: '10',
      inputs: ['duration', 'distance'],
    }
    draft = updateTrainingMetrics(draft, 'pace', '5:00', 'run')
    expect(draft.duration).toBe('30:00')
    draft = updateTrainingMetrics(draft, 'duration', '40', 'run')
    expect(draft.distance).toBe('8')
    draft = updateTrainingMetrics(draft, 'pace', '5:', 'run')
    expect(draft.distance).toBe('')
    expect(draft.duration).toBe('40')
  })
  it.each([
    ['20:35', 1235], ['1:02:03', 3723], ['20.5', 1230], ['20,5', 1230],
    ['0:01', 1], ['', null], ['20:60', null], ['1:99:00', null],
    ['-2', null], ['Infinity', null],
  ])('liest Dauer %s sekundengenau', (value, expected) => {
    expect(parseTrainingDuration(value)).toBe(expected)
  })
  it('erhält Sekunden beim Bearbeiten und berechnet Dauer aus Pace und Distanz', () => {
    expect(formatTrainingDurationInput(1235)).toBe('20:35')
    expect(formatTrainingDurationInput(3723)).toBe('1:02:03')
    const draft: TrainingMetricDraft = {
      duration: '20:35', distance: '5', pace: '4:07', speed: '14.57', inputs: ['duration', 'distance'],
    }
    expect(updateTrainingMetrics(draft, 'duration', '20:35', 'run').pace).toBe('4:07')
    expect(updateTrainingMetrics(draft, 'pace', '4:01', 'run').duration).toBe('20:05')
    expect(updateTrainingMetrics(draft, 'duration', '20:', 'run').pace).toBe('')
  })
  it('koppelt km/h und Pace und rechnet mit der eingegebenen Geschwindigkeit genau', () => {
    let draft: TrainingMetricDraft = {
      duration: '', distance: '', pace: '', speed: '', inputs: ['duration', 'distance'],
    }
    draft = updateTrainingMetrics(draft, 'speed', '6', 'run')
    expect(draft.pace).toBe('10:00')
    draft = updateTrainingMetrics(draft, 'pace', '7:00', 'run')
    expect(draft.speed).toBe('8.57')
    draft = updateTrainingMetrics(draft, 'speed', '8,57', 'run')
    draft = updateTrainingMetrics(draft, 'duration', '60', 'run')
    expect(draft.distance).toBe('8.57')
    expect(draft.pace).toBe('7:00')
    draft = updateTrainingMetrics(draft, 'distance', '10', 'run')
    expect(draft.inputs).toEqual(['duration', 'distance'])
    expect(draft.speed).toBe('10')
  })
})

describe('Planung mit Standardtempo', () => {
  const empty: PlanMetricDraft = { duration: '', distance: '', derived: null }

  it('ergänzt die fehlende Größe und gibt sie bei Überschreiben frei', () => {
    let draft = updatePlanMetrics(empty, 'duration', '60', 600)
    expect(draft).toEqual({ duration: '60', distance: '6', derived: 'distance' })
    draft = updatePlanMetrics(draft, null, '', 420)
    expect(draft.distance).toBe('8.57')
    draft = updatePlanMetrics(draft, 'distance', '7', 420)
    expect(draft).toEqual({ duration: '60', distance: '7', derived: null })
    draft = updatePlanMetrics(draft, 'duration', '', 420)
    expect(draft).toEqual({ duration: '49:00', distance: '7', derived: 'duration' })
  })

  it('leitet ohne Standardtempo nichts ab und entfernt alte Ableitungen', () => {
    const derived = updatePlanMetrics(empty, 'distance', '5', 600)
    expect(derived.duration).toBe('50:00')
    expect(updatePlanMetrics(derived, null, '', null)).toEqual({
      duration: '', distance: '5', derived: null,
    })
    expect(updatePlanMetrics(empty, 'duration', '45', null).distance).toBe('')
  })
})
