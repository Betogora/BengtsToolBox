import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function DisclosureIndicator({ isOpen, className }: { isOpen?: boolean; className?: string }) {
  return <ChevronDown
    aria-hidden="true"
    data-slot="disclosure-indicator"
    className={cn(
      'size-4 shrink-0 text-subtle-foreground transition-transform',
      isOpen === undefined ? 'group-open:rotate-180' : isOpen && 'rotate-180',
      className,
    )}
  />
}

export function DisclosureSummary({ className, children, ...props }: ComponentProps<'summary'>) {
  return <summary
    {...props}
    data-slot="disclosure-summary"
    className={cn(
      'type-action flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md outline-none hover:[&>[data-slot=disclosure-indicator]]:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden',
      className,
    )}
  >
    <span className="min-w-0">{children}</span>
    <DisclosureIndicator />
  </summary>
}
