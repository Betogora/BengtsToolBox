import { describe, expect, it } from 'vitest'
import {
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
        expect(draft.duration).toBe(values.duration)
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
    expect(draft.duration).toBe('30')
    draft = updateTrainingMetrics(draft, 'duration', '40', 'run')
    expect(draft.distance).toBe('8')
    draft = updateTrainingMetrics(draft, 'pace', '5:', 'run')
    expect(draft.distance).toBe('')
    expect(draft.duration).toBe('40')
  })
})
