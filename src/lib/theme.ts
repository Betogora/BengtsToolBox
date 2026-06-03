export const themePalette = {
  deepPurple: '#363237',
  indigo: '#2D4262',
  taupe: '#73605B',
  blush: '#D09683',
} as const

export const participantColorPresets = [
  themePalette.indigo,
  themePalette.deepPurple,
  themePalette.taupe,
  themePalette.blush,
] as const

export const teamThemeColors = {
  blue: themePalette.indigo,
  yellow: themePalette.blush,
  unassigned: themePalette.taupe,
} as const

function normalizeHexColor(color: string | undefined) {
  const trimmedColor = color?.trim() ?? ''

  return /^#[0-9a-f]{6}$/i.test(trimmedColor)
    ? trimmedColor.toUpperCase()
    : null
}

export function getThemeColorByIndex(index: number) {
  const normalizedIndex = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0

  return participantColorPresets[normalizedIndex % participantColorPresets.length]
}

export function normalizeThemeColor(color: string | undefined, fallbackIndex = 0) {
  const normalizedColor = normalizeHexColor(color)

  if (!normalizedColor) {
    return getThemeColorByIndex(fallbackIndex)
  }

  const themeColor = participantColorPresets.find(
    (preset) => preset.toUpperCase() === normalizedColor,
  )

  return themeColor ?? getThemeColorByIndex(fallbackIndex)
}

function getRelativeLuminance(color: string) {
  const normalizedColor = normalizeHexColor(color) ?? themePalette.indigo
  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(normalizedColor.slice(start + 1, start + 3), 16) / 255

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function getReadableTextColor(backgroundColor: string) {
  return getRelativeLuminance(backgroundColor) > 0.38
    ? themePalette.deepPurple
    : '#FFFFFF'
}
