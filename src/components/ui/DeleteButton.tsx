import { Trash2 } from 'lucide-react'
import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Löschen ist im Ruhezustand ein ruhiger Icon-Button; Rot erscheint erst im Bestätigen.
export function DeleteButton({
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
  'aria-label': string
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn('text-subtle-foreground hover:bg-destructive-soft hover:text-destructive', className)}
      {...props}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  )
}
