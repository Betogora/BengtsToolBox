import { Trash2 } from 'lucide-react'
import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Die zwei Mülleimer-Varianten der Toolbox: rot gefüllt für Zeilen,
// dezent (grau, beim Hovern rot) für Kopfzeilen und Verwaltungslisten.
export function DeleteButton({
  className,
  tone = 'solid',
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
  'aria-label': string
  tone?: 'solid' | 'quiet'
}) {
  return (
    <Button
      size="icon"
      variant={tone === 'solid' ? 'destructive' : 'ghost'}
      className={cn(tone === 'quiet' && 'hover:text-destructive', className)}
      {...props}
    >
      <Trash2 aria-hidden="true" />
    </Button>
  )
}
