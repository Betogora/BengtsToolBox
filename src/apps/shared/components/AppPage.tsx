import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type AppPageProps = ComponentProps<'div'> & {
  width?: 'default' | 'wide'
}

export function AppPage({ className, width = 'default', ...props }: AppPageProps) {
  return (
    <div
      className={cn(
        'mx-auto flex flex-col gap-6 px-4 pt-3 pb-8 sm:px-6 sm:pt-5 lg:pb-10',
        width === 'wide' ? 'max-w-7xl' : 'max-w-6xl',
        className,
      )}
      {...props}
    />
  )
}
