export type ColorWheelPosition = {
  hue: number
  intensity: number
}

type RgbColor = {
  blue: number
  green: number
  red: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function channelToHex(channel: number) {
  return Math.round(clamp(channel, 0, 255))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

function rgbToHex({ blue, green, red }: RgbColor) {
  return `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`
}

function hueToRgb(hue: number): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360
  const sector = normalizedHue / 60
  const secondary = 255 * (1 - Math.abs((sector % 2) - 1))

  if (sector < 1) return { red: 255, green: secondary, blue: 0 }
  if (sector < 2) return { red: secondary, green: 255, blue: 0 }
  if (sector < 3) return { red: 0, green: 255, blue: secondary }
  if (sector < 4) return { red: 0, green: secondary, blue: 255 }
  if (sector < 5) return { red: secondary, green: 0, blue: 255 }
  return { red: 255, green: 0, blue: secondary }
}

function parseHexColor(color: string): RgbColor | null {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return null
  }

  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  }
}

export function normalizePickerColor(color: string, fallback = '#0D8E90') {
  const normalized = parseHexColor(color.trim())
  return normalized ? rgbToHex(normalized) : fallback.toUpperCase()
}

export function colorFromWheelPosition({
  hue,
  intensity,
}: ColorWheelPosition) {
  const pureColor = hueToRgb(hue)
  const normalizedIntensity = clamp(intensity, 0, 1)

  return rgbToHex({
    red: 255 + (pureColor.red - 255) * normalizedIntensity,
    green: 255 + (pureColor.green - 255) * normalizedIntensity,
    blue: 255 + (pureColor.blue - 255) * normalizedIntensity,
  })
}

export function wheelPositionFromColor(color: string): ColorWheelPosition {
  const { red, green, blue } =
    parseHexColor(normalizePickerColor(color)) ?? hueToRgb(180)
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  const intensity = maximum === 0 ? 0 : delta / maximum
  let hue = 0

  if (delta > 0) {
    if (maximum === red) {
      hue = 60 * (((green - blue) / delta) % 6)
    } else if (maximum === green) {
      hue = 60 * ((blue - red) / delta + 2)
    } else {
      hue = 60 * ((red - green) / delta + 4)
    }
  }

  return {
    hue: (hue + 360) % 360,
    intensity: clamp(intensity, 0, 1),
  }
}

export function wheelPositionFromPoint(
  x: number,
  y: number,
  size: number,
): ColorWheelPosition {
  const radius = Math.max(size / 2, 1)
  const deltaX = x - radius
  const deltaY = y - radius
  const distance = Math.hypot(deltaX, deltaY)

  return {
    hue: ((Math.atan2(deltaX, -deltaY) * 180) / Math.PI + 360) % 360,
    intensity: clamp(distance / radius, 0, 1),
  }
}

export function getWheelMarkerPosition({
  hue,
  intensity,
}: ColorWheelPosition) {
  const radians = (hue * Math.PI) / 180

  return {
    left: 50 + Math.sin(radians) * clamp(intensity, 0, 1) * 50,
    top: 50 - Math.cos(radians) * clamp(intensity, 0, 1) * 50,
  }
}
