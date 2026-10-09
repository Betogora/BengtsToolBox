import type { PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { ColorSchemeProvider } from '@/lib/colorScheme'
import { LanguageProvider } from '@/lib/i18n'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ColorSchemeProvider>
      <LanguageProvider>
        {children}
        <Toaster position="bottom-right" />
      </LanguageProvider>
    </ColorSchemeProvider>
  )
}
