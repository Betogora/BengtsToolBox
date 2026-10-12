import { describe, expect, it } from 'vitest'
import { estimateCyclingPowerWatts } from './cyclingPower'

describe('geschätzte Radleistung', () => {
  const ride = { discipline: 'bike' as const, durationSeconds: 2_728, distanceMeters: 20_000 }

  it('schätzt aus Tempo und Gewicht mit Standard-Straßenphysik', () => {
    // 26,4 km/h bei 85 kg: Roll- plus Luftwiderstand.
    expect(estimateCyclingPowerWatts(ride, 85)).toBeCloseTo(114, 0)
  })

  it('schätzt ohne Gewicht, Distanz oder für andere Disziplinen nichts', () => {
    expect(estimateCyclingPowerWatts(ride, null)).toBeNull()
    expect(estimateCyclingPowerWatts({ ...ride, distanceMeters: null }, 85)).toBeNull()
    expect(estimateCyclingPowerWatts({ ...ride, discipline: 'run' }, 85)).toBeNull()
  })
})
