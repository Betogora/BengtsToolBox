import type { PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/lib/i18n'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <LanguageProvider>
      {children}
      <Toaster position="bottom-right" />
    </LanguageProvider>
  )
}
