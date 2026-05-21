import type { PropsWithChildren } from 'react'

import { Toaster } from '@/components/ui/sonner'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" />
    </>
  )
}
