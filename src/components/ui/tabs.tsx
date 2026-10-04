import * as TabsPrimitive from '@radix-ui/react-tabs'
import type * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSlidingIndicator } from './useSlidingIndicator'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: 'default' | 'icon-tabs'
}) {
  const { listRef, indicatorRef } = useSlidingIndicator()
  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        'selection-track',
        className,
      )}
      {...props}
    >
      <span ref={indicatorRef} className="selection-indicator" aria-hidden="true" />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  children,
  icon: Icon,
  label,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  icon?: LucideIcon
  label?: string
}) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      aria-label={label}
      className={cn(
        'selection-item type-action',
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {Icon ? <span className="selection-label"><span>{label ?? children}</span></span> : children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
