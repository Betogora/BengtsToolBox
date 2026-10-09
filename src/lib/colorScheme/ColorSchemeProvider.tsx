import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  ColorSchemeContext,
  type ColorScheme,
  type ColorSchemeContextValue,
} from '@/lib/colorScheme/context'
import { localStore } from '@/lib/firebase/localStore'

// Keep the key in sync with the pre-paint script in index.html.
const storageKey = 'bengtstoolbox.colorScheme'
const themeColors: Record<ColorScheme, string> = {
  light: '#063852',
  dark: '#0e141b',
}

// index.html resolves the stored or system scheme before React mounts.
function readInitialColorScheme(): ColorScheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(readInitialColorScheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', colorScheme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeColors[colorScheme])
  }, [colorScheme])

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      colorScheme,
      setColorScheme: (nextColorScheme) => {
        setColorSchemeState(nextColorScheme)
        // Only an explicit choice is stored; until then the system preference applies.
        localStore.writeText(storageKey, nextColorScheme)
      },
    }),
    [colorScheme],
  )

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>
}
