import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

type NoticeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const toneClass: Record<NoticeTone, string> = {
  neutral: 'bg-muted [&>svg]:text-muted-foreground',
  info: 'bg-primary-soft [&>svg]:text-primary',
  success: 'bg-success-soft [&>svg]:text-success',
  warning: 'bg-warning-soft [&>svg]:text-warning',
  danger: 'bg-destructive-soft [&>svg]:text-destructive',
}

const toneIcon: Record<NoticeTone, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
}

// Ein Hinweis ist ein Icon und ein Satz auf weicher Tönung, ohne Rand.
function Notice({
  action,
  children,
  className,
  icon,
  title,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'div'> & {
  action?: React.ReactNode
  icon?: LucideIcon
  title?: React.ReactNode
  tone?: NoticeTone
}) {
  const Icon = icon ?? toneIcon[tone]

  return (
    <div
      data-slot="notice"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'type-label flex items-start gap-2.5 rounded-md px-3 py-2.5 text-foreground [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0',
        toneClass[tone],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <span className="font-[650]">{title} </span>}
        <span className="font-medium">{children}</span>
      </div>
      {action && <div className="-my-1 shrink-0">{action}</div>}
    </div>
  )
}

export { Notice }
