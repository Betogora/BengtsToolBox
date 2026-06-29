export const themePalette = {
  teal: '#0D8E90',
  mint: '#A9DFDA',
  coral: '#FD7261',
  apricot: '#FAC889',
  fog: '#D7DDDE',
  darkNavy: '#06344F',
  skyBlue: '#A9DFDA',
  blueberry: '#0D8E90',
  tangerine: '#FD7261',
  daffodil: '#FAC889',
} as const

export const participantColorPresets = [
  themePalette.teal,
  themePalette.coral,
  themePalette.apricot,
  themePalette.mint,
  themePalette.darkNavy,
] as const

export const teamThemeColors = {
  blue: themePalette.teal,
  yellow: themePalette.coral,
  unassigned: themePalette.apricot,
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

export function getParticipantColorByPosition(position: number) {
  return getThemeColorByIndex(position - 1)
}

export function normalizeThemeColor(color: string | undefined, fallbackIndex = 0) {
  const normalizedColor = normalizeHexColor(color)

  if (!normalizedColor) {
    return getThemeColorByIndex(fallbackIndex)
  }

  const legacyColorMap: Record<string, string> = {
    '#011A27': themePalette.darkNavy,
    '#063852': themePalette.teal,
    '#47BFFF': themePalette.mint,
    '#E6DF44': themePalette.apricot,
    '#F0810F': themePalette.coral,
  }

  if (legacyColorMap[normalizedColor]) {
    return legacyColorMap[normalizedColor]
  }

  return normalizedColor
}

export function normalizeParticipantColor(
  color: string | undefined,
  fallbackColor: string,
) {
  const fallbackIndex = participantColorPresets.findIndex(
    (preset) => preset.toLowerCase() === fallbackColor.toLowerCase(),
  )

  return normalizeThemeColor(color, fallbackIndex >= 0 ? fallbackIndex : 0)
}

function getRelativeLuminance(color: string) {
  const normalizedColor = normalizeHexColor(color) ?? themePalette.blueberry
  const channels = [0, 2, 4].map((start) => {
    const value = Number.parseInt(normalizedColor.slice(start + 1, start + 3), 16) / 255

    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function getReadableTextColor(backgroundColor: string) {
  return getRelativeLuminance(backgroundColor) > 0.25
    ? themePalette.darkNavy
    : '#FFFFFF'
}
