import type { PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ColorSchemeProvider } from '@/lib/colorScheme'
import { LanguageProvider } from '@/lib/i18n'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ColorSchemeProvider>
      <LanguageProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </LanguageProvider>
    </ColorSchemeProvider>
  )
}
