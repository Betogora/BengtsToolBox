import { describe, expect, it } from 'vitest'
import {
  climbMeters,
  estimateRunningPowerWatts,
  flatRunningEquivalentSpeed,
  getTrainingIntensity,
  oxygenCost,
} from './incline'

const kmh = (value: number) => value / 3.6

describe('Steigung im Laufkontinuum', () => {
  it('rechnet Gehen und Laufen nach ACSM auf dieselbe Achse um', () => {
    expect(oxygenCost(kmh(6), 0, true)).toBeCloseTo(13.5)
    expect(oxygenCost(kmh(6), 5, true)).toBeCloseTo(22.5)
    // Flaches Laufen ist bereits seine eigene Äquivalenzgeschwindigkeit.
    expect(flatRunningEquivalentSpeed(kmh(9), 0, false)).toBeCloseTo(kmh(9))
    // 6 km/h mit 10 % kosten so viel wie flaches Laufen mit 8,4 km/h.
    expect(flatRunningEquivalentSpeed(kmh(6), 10, true) * 3.6).toBeCloseTo(8.4)
  })

  it('liefert MET und Höhenmeter nur für Lauf- und Gehen-Einheiten mit Dauer und Distanz', () => {
    const walk = {
      discipline: 'run' as const,
      isWalk: true,
      inclinePercent: 5,
      durationSeconds: 3_600,
      distanceMeters: 6_000,
    }
    const intensity = getTrainingIntensity(walk)
    expect(intensity?.metabolicEquivalent).toBeCloseTo(6.43, 2)
    expect(intensity?.climbMeters).toBeCloseTo(299.6, 1)
    expect(climbMeters(1_000, 0)).toBe(0)
    expect(getTrainingIntensity({ ...walk, discipline: 'bike' })).toBeNull()
    expect(getTrainingIntensity({ ...walk, distanceMeters: null })).toBeNull()
    // 6 km/h mit 5 % entsprechen 5,7 km/h flach: 80 kg × 1,583 m/s × 1,04.
    expect(estimateRunningPowerWatts(walk, 80)).toBeCloseTo(131.7, 1)
    expect(estimateRunningPowerWatts(walk, null)).toBeNull()
  })
})
