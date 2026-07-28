import { describe, expect, it } from 'vitest'

import { getAdaptiveStripeWidth } from '@/apps/territory-map/ownershipPattern'

describe('adaptive territory owner stripes', () => {
  it('caps wide-territory stripes at three rendered pixels', () => {
    expect(
      getAdaptiveStripeWidth({
        ownerCount: 3,
        screenHeight: 100,
        screenWidth: 200,
        svgHeight: 50,
        svgWidth: 100,
      }),
    ).toBeCloseTo(1.5)
  })

  it('fits one complete owner cycle into a small territory', () => {
    const stripeWidth = getAdaptiveStripeWidth({
      ownerCount: 3,
      screenHeight: 2.5,
      screenWidth: 5.7,
      svgHeight: 2,
      svgWidth: 4.5,
    })
    const projectedTerritoryWidth = (4.5 + 2) / Math.SQRT2

    expect(stripeWidth * 3).toBeLessThanOrEqual(projectedTerritoryWidth)
  })

  it('uses a stable fallback when no shared territory can be measured', () => {
    expect(
      getAdaptiveStripeWidth({
        ownerCount: 1,
        screenHeight: 0,
        screenWidth: 0,
        svgHeight: 0,
        svgWidth: 0,
      }),
    ).toBe(1)
  })
})
