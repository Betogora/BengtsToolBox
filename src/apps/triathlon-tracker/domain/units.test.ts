import { describe, expect, it } from 'vitest'
import {
  formatTrainingDurationInput,
  parseTrainingDuration,
  updateTrainingMetrics,
  type TrainingMetricDraft,
  type TrainingMetricField,
} from './units'

const permutations: TrainingMetricField[][] = [
  ['duration', 'distance'],
  ['distance', 'duration'],
  ['pace', 'distance'],
  ['distance', 'pace'],
  ['pace', 'duration'],
  ['duration', 'pace'],
]

describe('Pace, Dauer und Distanz', () => {
  for (const discipline of ['run', 'swim', 'bike'] as const) {
    for (const order of permutations) {
      it(`${discipline}: berechnet das dritte Feld nach ${order.join(' + ')}`, () => {
        const values = {
          duration: '36',
          distance: discipline === 'swim' ? '1.2' : '6',
          pace: discipline === 'swim' ? '3:00' : '6:00',
        }
        let draft: TrainingMetricDraft = {
          duration: '',
          distance: '',
          pace: '',
          inputs: ['duration', 'distance'],
        }
        for (const field of order)
          draft = updateTrainingMetrics(draft, field, values[field], discipline)
        expect(parseTrainingDuration(draft.duration)).toBe(2160)
        expect(draft.distance).toBe(values.distance)
        expect(draft.pace).toBe(values.pace)
      })
    }
  }
  it('behält die beiden zuletzt eingegebenen Werte und entfernt veraltete Berechnungen', () => {
    let draft: TrainingMetricDraft = {
      duration: '36',
      distance: '6',
      pace: '6:00',
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
      duration: '20:35', distance: '5', pace: '4:07', inputs: ['duration', 'distance'],
    }
    expect(updateTrainingMetrics(draft, 'duration', '20:35', 'run').pace).toBe('4:07')
    expect(updateTrainingMetrics(draft, 'pace', '4:01', 'run').duration).toBe('20:05')
    expect(updateTrainingMetrics(draft, 'duration', '20:', 'run').pace).toBe('')
  })
})
