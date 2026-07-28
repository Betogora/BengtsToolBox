import { describe, expect, it } from 'vitest'

import {
  colorFromWheelPosition,
  getWheelMarkerPosition,
  normalizePickerColor,
  wheelPositionFromColor,
  wheelPositionFromPoint,
} from '@/components/ui/colorPickerLogic'

describe('color picker geometry', () => {
  it('maps the center to white and the outer cardinal points to intense colors', () => {
    expect(colorFromWheelPosition({ hue: 0, intensity: 0 })).toBe('#FFFFFF')
    expect(colorFromWheelPosition({ hue: 0, intensity: 1 })).toBe('#FF0000')
    expect(colorFromWheelPosition({ hue: 120, intensity: 1 })).toBe('#00FF00')
    expect(colorFromWheelPosition({ hue: 240, intensity: 1 })).toBe('#0000FF')
  })

  it('clamps pointer positions to the wheel and preserves their angle', () => {
    expect(wheelPositionFromPoint(50, 0, 100)).toEqual({
      hue: 0,
      intensity: 1,
    })
    expect(wheelPositionFromPoint(150, 50, 100)).toEqual({
      hue: 90,
      intensity: 1,
    })
  })

  it('normalizes stored colors and derives a stable marker position', () => {
    expect(normalizePickerColor('#0d8e90')).toBe('#0D8E90')
    expect(normalizePickerColor('invalid', '#FD7261')).toBe('#FD7261')

    const position = wheelPositionFromColor('#FF0000')
    expect(position).toEqual({ hue: 0, intensity: 1 })
    expect(getWheelMarkerPosition(position)).toEqual({ left: 50, top: 0 })
  })
})
