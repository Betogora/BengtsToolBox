import { createContext } from 'react'

export type ColorScheme = 'light' | 'dark'

export type ColorSchemeContextValue = {
  colorScheme: ColorScheme
  setColorScheme: (colorScheme: ColorScheme) => void
}

export const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null)
